// Shared country-flag helpers (used by sports.tsx and fixture-detail.tsx).

export const COUNTRY_ISO2: Record<string, string> = {
  "afghanistan":"af","albania":"al","algeria":"dz","angola":"ao","argentina":"ar",
  "armenia":"am","australia":"au","austria":"at","azerbaijan":"az","bahrain":"bh",
  "bangladesh":"bd","belarus":"by","belgium":"be","bolivia":"bo",
  "bosnia":"ba","bosnia and herzegovina":"ba","botswana":"bw","brazil":"br",
  "bulgaria":"bg","cambodia":"kh","cameroon":"cm","canada":"ca","chile":"cl",
  "china":"cn","colombia":"co","costa rica":"cr","croatia":"hr","cyprus":"cy",
  "czech republic":"cz","czechia":"cz","denmark":"dk","ecuador":"ec","egypt":"eg",
  "el salvador":"sv","england":"gb-eng","estonia":"ee","ethiopia":"et","europe":"eu",
  "finland":"fi","france":"fr","georgia":"ge","germany":"de","ghana":"gh",
  "greece":"gr","guatemala":"gt","honduras":"hn","hong kong":"hk","hungary":"hu",
  "iceland":"is","india":"in","indonesia":"id","iran":"ir","iraq":"iq",
  "ireland":"ie","israel":"il","italy":"it","ivory coast":"ci","jamaica":"jm",
  "japan":"jp","jordan":"jo","kazakhstan":"kz","kenya":"ke","kosovo":"xk",
  "kuwait":"kw","latvia":"lv","lebanon":"lb","libya":"ly","lithuania":"lt",
  "luxembourg":"lu","malaysia":"my","malta":"mt","mexico":"mx","moldova":"md",
  "montenegro":"me","morocco":"ma","mozambique":"mz","namibia":"na",
  "netherlands":"nl","new zealand":"nz","nicaragua":"ni","nigeria":"ng",
  "north korea":"kp","north macedonia":"mk","northern ireland":"gb-nir",
  "norway":"no","oman":"om","pakistan":"pk","palestine":"ps","panama":"pa",
  "paraguay":"py","peru":"pe","philippines":"ph","poland":"pl","portugal":"pt",
  "qatar":"qa","romania":"ro","russia":"ru","saudi arabia":"sa","scotland":"gb-sct",
  "senegal":"sn","serbia":"rs","singapore":"sg","slovakia":"sk","slovenia":"si",
  "south africa":"za","south korea":"kr","spain":"es","sudan":"sd","sweden":"se",
  "switzerland":"ch","syria":"sy","taiwan":"tw","tanzania":"tz","thailand":"th",
  "tunisia":"tn","turkey":"tr","uganda":"ug","ukraine":"ua",
  "united arab emirates":"ae","united states":"us","usa":"us","uruguay":"uy",
  "uzbekistan":"uz","venezuela":"ve","vietnam":"vn","wales":"gb-wls",
  "yemen":"ye","zambia":"zm","zimbabwe":"zw",
  "congo dr":"cd","democratic republic of congo":"cd","dr congo":"cd",
  "united kingdom":"gb","uk":"gb","great britain":"gb",
};

// AllSportsAPI's `country_logo` for the four UK home nations is the Union Jack,
// not each nation's own flag (England = St George's Cross, Scotland = Saltire,
// Wales = Y Ddraig Goch, Northern Ireland = Ulster Banner). Always use flagcdn's
// ISO-2 flag for these, ignoring whatever logo the DB has stored.
const FORCE_ISO2_FLAG = new Set(["england", "scotland", "wales", "northern ireland"]);

export function countryFlagUrl(name: string | null | undefined): string | null {
  if (!name) return null;
  const iso2 = COUNTRY_ISO2[name.toLowerCase().trim()];
  return iso2 ? `https://flagcdn.com/40x30/${iso2}.png` : null;
}

/**
 * Resolve the flag/crest to show for a country group, preferring the correct
 * per-nation flag over AllSportsAPI's DB-stored logo when it's known to be wrong.
 */
export function resolveCountryFlagUrl(name: string | null | undefined, dbLogo: string | null | undefined): string | null {
  const key = (name ?? "").toLowerCase().trim();
  if (FORCE_ISO2_FLAG.has(key)) return countryFlagUrl(name);
  return dbLogo || countryFlagUrl(name);
}
