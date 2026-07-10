export interface PrintSelection {
  fixtureName?: string;
  selection: string;
  market?: string;
  odds: number | string;
  competitionName?: string;
  startTime?: string;
}

export interface PrintBetData {
  code?: string | null;
  placedAt: string | Date;
  selections: PrintSelection[];
  totalOdds: number | string;
  stake: number | string;
  potentialWin: number | string;
  status?: string;
  // USD→CDF rate snapshot from when the bet was placed; takes priority over the
  // live `exchangeRate` passed to printBetSlip so the receipt never drifts.
  exchangeRate?: number | string | null;
}

export function printBetSlip(bet: PrintBetData, currency = "USD", exchangeRate = 1) {
  const win = window.open("", "_blank", "width=360,height=680");
  if (!win) return;

  const fmtOdds = (v: number | string) => Number(v).toFixed(2);
  // All amounts on `bet` (stake/potentialWin) are stored in USD; when the active
  // display currency is CDF, convert using the exchange rate before formatting —
  // otherwise the raw USD figure gets mislabeled as CDF. Prefer the rate snapshot
  // stored on the bet itself (locked at placement) over the live site-wide rate.
  const rateToUse = bet.exchangeRate !== undefined && bet.exchangeRate !== null && Number(bet.exchangeRate) > 0
    ? Number(bet.exchangeRate)
    : exchangeRate;
  const validRate = Number.isFinite(rateToUse) && rateToUse > 0 ? rateToUse : 1;
  const fmtMoney = (v: number | string) => {
    const displayAmount = currency === "CDF" ? Number(v) * validRate : Number(v);
    if (currency === "CDF") {
      const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0, maximumFractionDigits: 0,
      }).format(displayAmount);
      return `CDF ${formatted}`;
    }
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency", currency,
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      }).format(displayAmount);
    } catch {
      return `${displayAmount.toFixed(2)} ${currency}`;
    }
  };
  const fmtDate = (s: string | Date) => {
    try { return new Date(s).toLocaleString(); } catch { return String(s); }
  };
  const fmtShort = (s?: string) => {
    if (!s) return "";
    try {
      const d = new Date(s);
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
    } catch { return s; }
  };

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>GoWin — ${bet.code || "Bet Slip"}</title>
  <style>
    @page { margin: 4mm; size: 80mm auto; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      color: #000;
      background: #fff;
      width: 302px;
      font-size: 11px;
      padding: 8px 10px;
    }
    .center { text-align: center; }
    .logo { font-size: 18px; font-weight: 900; letter-spacing: 3px; }
    .sub { font-size: 9px; color: #555; margin-top: 1px; }
    .divider { border: none; border-top: 1px dashed #999; margin: 6px 0; }
    .divider-solid { border: none; border-top: 1px solid #000; margin: 6px 0; }
    .label { font-size: 9px; color: #777; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .code-box { text-align: center; border: 1px dashed #000; border-radius: 3px; padding: 5px 8px; margin: 5px 0; }
    .code-box .code { font-size: 18px; font-weight: bold; letter-spacing: 5px; }
    .sel { margin-bottom: 6px; }
    .sel-pick { font-weight: bold; font-size: 11px; }
    .sel-fixture { font-size: 10px; color: #333; }
    .sel-meta { font-size: 9px; color: #666; }
    .row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
    .row.bold { font-weight: bold; }
    .row.total { font-size: 13px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
    .footer { font-size: 8px; color: #999; text-align: center; margin-top: 8px; }
    @media print {
      @page { margin: 4mm; size: 80mm auto; }
      body { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="logo">★ GoWin ★</div>
    <div class="sub">Sports Betting — Official Receipt</div>
  </div>
  <hr class="divider-solid" style="margin-top:8px"/>

  ${bet.code ? `
  <div class="label center">Bet Code</div>
  <div class="code-box"><div class="code">${bet.code}</div></div>
  ` : ""}

  <div class="row"><span class="label">Date</span><span>${fmtDate(bet.placedAt)}</span></div>
  ${bet.status ? `<div class="row"><span class="label">Status</span><span style="font-weight:bold;text-transform:uppercase">${bet.status}</span></div>` : ""}

  <hr class="divider"/>

  <div class="label">Selections (${bet.selections.length})</div>
  <div style="margin-top:4px">
  ${bet.selections.map((s, i) => `
    <div class="sel">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span class="sel-pick">${i + 1}. ${s.selection}</span>
        <span style="font-weight:bold">${fmtOdds(s.odds)}</span>
      </div>
      <div class="sel-fixture">${s.fixtureName || ""}</div>
      <div class="sel-meta">${[s.market, s.competitionName, fmtShort(s.startTime)].filter(Boolean).join(" · ")}</div>
    </div>
  `).join('<hr class="divider"/>')}
  </div>

  <hr class="divider-solid"/>

  <div class="row bold"><span>Total Odds</span><span>${fmtOdds(bet.totalOdds)}</span></div>
  <div class="row"><span>Stake</span><span>${fmtMoney(bet.stake)}</span></div>
  <div class="row total"><span>Potential Win</span><span>${fmtMoney(bet.potentialWin)}</span></div>

  <hr class="divider" style="margin-top:8px"/>
  <div class="footer">
    Please gamble responsibly. 18+ only.<br/>
    GoWin
  </div>

  <script>window.onload = function(){ window.print(); };<\/script>
</body>
</html>`);
  win.document.close();
}

export function historyBetToPrintData(bet: any): PrintBetData {
  return {
    code: bet.code ?? null,
    placedAt: bet.createdAt,
    status: bet.status,
    totalOdds: bet.totalOdds,
    stake: bet.stake,
    potentialWin: bet.potentialWin,
    exchangeRate: bet.exchangeRate ?? null,
    selections: (bet.selections || []).map((sel: any) => ({
      fixtureName: sel.fixture
        ? `${sel.fixture.homeTeam?.name ?? "?"} vs ${sel.fixture.awayTeam?.name ?? "?"}`
        : "Unknown Fixture",
      selection: sel.selection,
      market: sel.market?.replace(/_/g, " "),
      odds: sel.odds,
      competitionName: sel.fixture?.league?.name,
      startTime: sel.fixture?.startTime,
    })),
  };
}
