import { createRequire } from "module";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { db, fixturesTable, leaguesTable, teamsTable, marketsTable, oddsTable } from "@workspace/db";
import { eq, and, gte, lte, asc, inArray } from "drizzle-orm";
import { logger } from "./logger";

const _require = createRequire(import.meta.url);

const OUTPUT_DIR = join(process.cwd(), "uploads", "fixtures");
const PDF_PATH = join(OUTPUT_DIR, "daily-fixtures.pdf");

const C = {
  primary: "#1a6b3c",
  accent: "#0d4a28",
  gold: "#f0b429",
  headerBg: "#1a2332",
  rowEven: "#f5f9f6",
  leagueBg: "#e8f4ed",
  text: "#1a1a1a",
  muted: "#888888",
  white: "#ffffff",
  border: "#d0d8e0",
  groupLine: "#1a6b3c",
};

const MAJOR_LEAGUE_KEYWORDS = [
  "champions league", "europa league", "conference league",
  "premier league", "la liga", "serie a", "bundesliga", "ligue 1",
  "world cup", "euro ", "copa america", "africa cup", "afcon",
  "nations league", "super cup", "fa cup", "copa del rey", "dfb pokal",
  "coupe de france", "mls", "liga mx", "brasileirao", "primeira liga",
  "eredivisie", "scottish premiership", "süper lig", "saudi pro league",
  "first division", "pro league", "epl",
];

function isMajorLeague(name: string): boolean {
  const l = name.toLowerCase();
  return MAJOR_LEAGUE_KEYWORDS.some((kw) => l.includes(kw));
}

function getLogoBase64(): string | null {
  const candidates = [
    join(process.cwd(), "..", "gowin", "src", "assets", "logo.png"),
    join(process.cwd(), "..", "..", "artifacts", "gowin", "src", "assets", "logo.png"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      return readFileSync(p).toString("base64");
    }
  }
  return null;
}

const FONT_DESCRIPTORS = {
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
};

interface OddsRow {
  "1x2_home"?: string;
  "1x2_draw"?: string;
  "1x2_away"?: string;
  over15?: string;
  under15?: string;
  over25?: string;
  under25?: string;
  btts_yes?: string;
  btts_no?: string;
  dc_1x?: string;
  dc_12?: string;
  dc_x2?: string;
}

interface FixtureEntry {
  id: number;
  time: string;
  event: string;
  leagueName: string;
  countryName: string;
  startTime: Date;
  odds: OddsRow;
}

interface LeagueGroup {
  key: string;
  leagueName: string;
  countryName: string;
  isMajor: boolean;
  fixtures: FixtureEntry[];
}

async function fetchFixtureData(): Promise<LeagueGroup[]> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const end7days = new Date(now);
  end7days.setDate(end7days.getDate() + 7);
  end7days.setHours(23, 59, 59, 999);

  const filtered: any[] = await db
    .select({
      id: fixturesTable.id,
      startTime: fixturesTable.startTime,
      homeTeamId: fixturesTable.homeTeamId,
      awayTeamId: fixturesTable.awayTeamId,
      leagueName: leaguesTable.name,
      countryName: leaguesTable.countryName,
    })
    .from(fixturesTable)
    .leftJoin(leaguesTable, eq(leaguesTable.id, fixturesTable.leagueId))
    .where(and(eq(fixturesTable.status, "upcoming"), gte(fixturesTable.startTime, todayStart), lte(fixturesTable.startTime, end7days)))
    .orderBy(asc(fixturesTable.startTime));

  if (filtered.length === 0) return [];

  const allTeamIds = [...new Set([...filtered.map((r) => r.homeTeamId), ...filtered.map((r) => r.awayTeamId)])] as number[];
  const teamRows = allTeamIds.length > 0 ? await db.select().from(teamsTable).where(inArray(teamsTable.id, allTeamIds)) : [];
  const teamMap = new Map(teamRows.map((t) => [t.id, t.name]));

  const fixtureIds = filtered.map((r) => r.id) as number[];
  const allMarkets = fixtureIds.length > 0
    ? await db.select().from(marketsTable).where(and(
        inArray(marketsTable.fixtureId, fixtureIds),
        inArray(marketsTable.marketType, ["1X2", "Over/Under 1.5", "Over/Under 2.5", "Both Teams To Score", "Double Chance"])
      ))
    : [];

  const marketIds = allMarkets.map((m) => m.id);
  const allOdds = marketIds.length > 0 ? await db.select().from(oddsTable).where(inArray(oddsTable.marketId, marketIds)) : [];

  type OddsMap = Map<string, Map<string, string>>;
  const oddsLookup = new Map<number, OddsMap>();
  for (const m of allMarkets) {
    if (!oddsLookup.has(m.fixtureId)) oddsLookup.set(m.fixtureId, new Map());
    oddsLookup.get(m.fixtureId)!.set(m.marketType, new Map());
  }
  for (const odd of allOdds) {
    const mkt = allMarkets.find((m) => m.id === odd.marketId);
    if (!mkt) continue;
    oddsLookup.get(mkt.fixtureId)?.get(mkt.marketType)?.set(odd.selection, parseFloat(odd.oddsValue).toFixed(2));
  }

  function fmtTime(d: Date): string {
    const utc2 = new Date(d.getTime() + 2 * 60 * 60 * 1000);
    const dd = String(utc2.getDate()).padStart(2, "0");
    const mm = String(utc2.getMonth() + 1).padStart(2, "0");
    const hh = utc2.toTimeString().slice(0, 5);
    return `${dd}/${mm}\n${hh}`;
  }

  const leagueMap = new Map<string, LeagueGroup>();
  for (const r of filtered) {
    const lg = r.leagueName ?? "Unknown";
    const cn = r.countryName ?? "";
    const key = `${cn}__${lg}`;
    if (!leagueMap.has(key)) {
      leagueMap.set(key, { key, leagueName: lg, countryName: cn, isMajor: isMajorLeague(lg), fixtures: [] });
    }
    const oMap = oddsLookup.get(r.id);
    const o1 = oMap?.get("1X2");
    const o15 = oMap?.get("Over/Under 1.5");
    const o25 = oMap?.get("Over/Under 2.5");
    const oB = oMap?.get("Both Teams To Score");
    const oD = oMap?.get("Double Chance");
    leagueMap.get(key)!.fixtures.push({
      id: r.id,
      time: fmtTime(r.startTime),
      event: `${teamMap.get(r.homeTeamId) ?? "?"} - ${teamMap.get(r.awayTeamId) ?? "?"}`,
      leagueName: lg,
      countryName: cn,
      startTime: r.startTime,
      odds: {
        "1x2_home": o1?.get("Home"),
        "1x2_draw": o1?.get("Draw"),
        "1x2_away": o1?.get("Away"),
        over15: o15?.get("Over 1.5"),
        under15: o15?.get("Under 1.5"),
        over25: o25?.get("Over 2.5"),
        under25: o25?.get("Under 2.5"),
        btts_yes: oB?.get("Yes"),
        btts_no: oB?.get("No"),
        dc_1x: oD?.get("1X"),
        dc_12: oD?.get("12"),
        dc_x2: oD?.get("X2"),
      },
    });
  }

  return Array.from(leagueMap.values());
}

function cell(val: string | undefined): any {
  return { text: val ?? "-", fontSize: 7.5, alignment: "center", color: val ? C.text : "#cccccc", margin: [0, 2, 0, 2] };
}

export async function generateFixturesPdf(): Promise<string> {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const pdfmakeLib = _require("pdfmake");
  const baseVfs: Record<string, string> = _require("pdfmake/build/vfs_fonts");

  const logoBase64 = getLogoBase64();
  const vfs: Record<string, string> = { ...baseVfs };

  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(now);

  const groups = await fetchFixtureData();
  const totalGames = groups.reduce((s, g) => s + g.fixtures.length, 0);

  // ── Table body ────────────────────────────────────────────────────────────
  const rowColors: Array<string | null> = [];

  const headerRow1: any[] = [
    { text: "Code", style: "th", rowSpan: 2, alignment: "center" },
    { text: "Time", style: "th", rowSpan: 2, alignment: "center" },
    { text: "Event", style: "th", rowSpan: 2, alignment: "left", margin: [4, 6, 0, 0] },
    { text: "1x2", style: "thGroup", colSpan: 3, alignment: "center" }, {}, {},
    { text: "Total (1.5)", style: "thGroup", colSpan: 2, alignment: "center" }, {},
    { text: "Total (2.5)", style: "thGroup", colSpan: 2, alignment: "center" }, {},
    { text: "Both Teams\nTo Score", style: "thGroup", colSpan: 2, alignment: "center" }, {},
    { text: "Double\nChance", style: "thGroup", colSpan: 3, alignment: "center" }, {}, {},
  ];
  const headerRow2: any[] = [
    {}, {}, {},
    { text: "1", style: "thSub" }, { text: "X", style: "thSub" }, { text: "2", style: "thSub" },
    { text: "Over", style: "thSub" }, { text: "Under", style: "thSub" },
    { text: "Over", style: "thSub" }, { text: "Under", style: "thSub" },
    { text: "Yes", style: "thSub" }, { text: "No", style: "thSub" },
    { text: "1X", style: "thSub" }, { text: "12", style: "thSub" }, { text: "X2", style: "thSub" },
  ];

  rowColors.push(C.headerBg, C.headerBg);
  const tableBody: any[][] = [headerRow1, headerRow2];

  let dataRowIdx = 0;
  for (const group of groups) {
    const lbl = group.countryName ? `${group.countryName}  ›  ${group.leagueName}` : group.leagueName;
    rowColors.push(C.leagueBg);
    tableBody.push([
      {
        text: lbl,
        colSpan: 15,
        fontSize: 8,
        bold: true,
        color: C.primary,
        alignment: "left",
        margin: [6, 4, 0, 4],
        border: [false, false, false, false],
      },
      {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {},
    ]);

    for (const f of group.fixtures) {
      rowColors.push(dataRowIdx % 2 === 0 ? C.rowEven : null);
      tableBody.push([
        { text: String(f.id), fontSize: 7, alignment: "center", color: C.muted, margin: [0, 2, 0, 2] },
        { text: f.time, fontSize: 7.5, alignment: "center", bold: true, margin: [0, 2, 0, 2] },
        { text: f.event, fontSize: 7.5, alignment: "left", margin: [4, 2, 2, 2] },
        cell(f.odds["1x2_home"]),
        cell(f.odds["1x2_draw"]),
        cell(f.odds["1x2_away"]),
        cell(f.odds.over15),
        cell(f.odds.under15),
        cell(f.odds.over25),
        cell(f.odds.under25),
        cell(f.odds.btts_yes),
        cell(f.odds.btts_no),
        cell(f.odds.dc_1x),
        cell(f.odds.dc_12),
        cell(f.odds.dc_x2),
      ]);
      dataRowIdx++;
    }
  }

  // ── Cover page ────────────────────────────────────────────────────────────
  const coverContent: any[] = [];

  const logoDataUrl = logoBase64 ? `data:image/png;base64,${logoBase64}` : null;
  if (logoDataUrl) {
    coverContent.push({ image: logoDataUrl, width: 220, alignment: "center", margin: [0, 80, 0, 32] });
  } else {
    coverContent.push({ text: "GoWin", fontSize: 52, bold: true, color: C.white, alignment: "center", margin: [0, 100, 0, 32] });
  }

  coverContent.push(
    { text: "DAILY FIXTURES COUPON", fontSize: 26, bold: true, color: C.white, alignment: "center", characterSpacing: 3, margin: [0, 0, 0, 14] },
    { canvas: [{ type: "line", x1: 80, y1: 0, x2: 720, y2: 0, lineWidth: 1.5, lineColor: C.gold }], margin: [0, 0, 0, 16] },
    { text: dateLabel, fontSize: 15, color: C.gold, alignment: "center", margin: [0, 0, 0, 6] },
    { text: `Generated at ${timeLabel}`, fontSize: 10, color: "#99ccaa", alignment: "center", margin: [0, 0, 0, 40] },
    {
      columns: [
        { stack: [{ text: String(totalGames), fontSize: 42, bold: true, color: C.white, alignment: "center" }, { text: "Fixtures", fontSize: 12, color: "#99ccaa", alignment: "center" }], width: "*" },
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: 0, y2: 80, lineWidth: 1, lineColor: C.gold }], width: 1, margin: [0, 10, 0, 0] },
        { stack: [{ text: String(groups.length), fontSize: 42, bold: true, color: C.white, alignment: "center" }, { text: "Competitions", fontSize: 12, color: "#99ccaa", alignment: "center" }], width: "*" },
      ],
      margin: [80, 0, 80, 50],
    },
    { canvas: [{ type: "line", x1: 80, y1: 0, x2: 720, y2: 0, lineWidth: 1, lineColor: C.gold }], margin: [0, 0, 0, 30] },
    { text: "\u201cPari ya mayele, mbongo ya solo!\u201d", fontSize: 18, italics: true, color: C.gold, alignment: "center", margin: [0, 0, 0, 14] },
    { text: "www.gowinrdc.com", fontSize: 12, color: "#99ccaa", alignment: "center" },
  );

  // ── Document definition ───────────────────────────────────────────────────
  const docDef: any = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [18, 48, 18, 36],

    background(currentPage: number) {
      if (currentPage !== 1) return null;
      return {
        canvas: [
          { type: "rect", x: 0, y: 0, w: 841.89, h: 595.28, color: C.primary },
          { type: "rect", x: 0, y: 480, w: 841.89, h: 115.28, color: C.accent },
          { type: "rect", x: 0, y: 478, w: 841.89, h: 4, color: C.gold },
        ],
      };
    },

    header(currentPage: number) {
      if (currentPage === 1) return null;
      return {
        margin: [18, 6, 18, 0],
        columns: [
          logoDataUrl
            ? { image: logoDataUrl, width: 55, margin: [0, 2, 0, 0] }
            : { text: "GoWin", bold: true, fontSize: 16, color: C.primary, margin: [0, 6, 0, 0] },
          { text: "", width: "*" },
          {
            stack: [
              { text: "www.gowinrdc.com", fontSize: 8.5, bold: true, color: C.primary },
              { text: dateLabel, fontSize: 7.5, color: C.muted },
            ],
            alignment: "right",
            margin: [0, 4, 0, 0],
          },
        ],
      };
    },

    footer(currentPage: number, pageCount: number) {
      if (currentPage === 1) return null;
      return {
        margin: [18, 4, 18, 0],
        columns: [
          { text: "\u201cPari ya mayele, mbongo ya solo!\u201d", fontSize: 7.5, italics: true, color: C.muted },
          { text: `Page ${currentPage - 1} of ${pageCount - 1}`, fontSize: 7.5, color: C.muted, alignment: "right" },
        ],
      };
    },

    content: [
      ...coverContent,
      { text: "", pageBreak: "after" },
      {
        table: {
          headerRows: 2,
          widths: [36, 38, "*", 28, 28, 28, 28, 28, 28, 28, 24, 24, 26, 26, 26],
          body: tableBody,
          keepWithHeaderRows: true,
          dontBreakRows: false,
        },
        layout: {
          fillColor(rowIndex: number) {
            return rowColors[rowIndex] ?? null;
          },
          hLineWidth: (i: number, node: any) => {
            if (i === 0 || i === node.table.body.length) return 0.5;
            return 0.3;
          },
          vLineWidth: (i: number, node: any) => {
            if (i === 0 || i === node.table.widths.length) return 0.5;
            if ([3, 6, 8, 10, 12].includes(i)) return 0.8;
            return 0.25;
          },
          hLineColor: () => C.border,
          vLineColor: (i: number) => ([3, 6, 8, 10, 12].includes(i) ? C.groupLine : C.border),
          paddingLeft: () => 1,
          paddingRight: () => 1,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
    ],

    styles: {
      th: { fontSize: 8, bold: true, color: C.white, margin: [0, 5, 0, 5] },
      thGroup: { fontSize: 7.5, bold: true, color: C.gold, margin: [0, 3, 0, 3] },
      thSub: { fontSize: 7, bold: true, color: "#99bbcc", alignment: "center", margin: [0, 2, 0, 2] },
    },

    defaultStyle: {
      font: "Roboto",
      fontSize: 8,
      color: C.text,
    },
  };

  pdfmakeLib.fonts = FONT_DESCRIPTORS;
  for (const [filename, b64] of Object.entries(vfs)) {
    pdfmakeLib.virtualfs.writeFileSync(filename, Buffer.from(b64 as string, "base64"));
  }
  pdfmakeLib.setUrlAccessPolicy(() => false);
  pdfmakeLib.setLocalAccessPolicy(() => true);

  const pdfDoc = pdfmakeLib.createPdf(docDef);
  const buffer: Buffer = await pdfDoc.getBuffer();
  writeFileSync(PDF_PATH, buffer);
  logger.info({ path: PDF_PATH, fixtures: totalGames, leagues: groups.length }, "Fixtures PDF generated");
  return PDF_PATH;
}

export function getPdfPath(): string {
  return PDF_PATH;
}

export function pdfExists(): boolean {
  return existsSync(PDF_PATH);
}
