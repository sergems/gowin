import { logger } from "./logger";

interface RateCache {
  rate: number;
  timestamp: number;
}

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
let cache: RateCache | null = null;

export const FALLBACK_RATE = 2800; // approximate CDF per 1 USD

export async function getUsdToCdfRate(): Promise<number> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.rate;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as any;
    const rate = data?.rates?.CDF;
    if (typeof rate === "number" && rate > 0) {
      cache = { rate, timestamp: Date.now() };
      logger.info({ rate }, "USD→CDF exchange rate updated");
      return rate;
    }
    throw new Error("CDF rate missing from API response");
  } catch (err: any) {
    logger.warn({ err: err.message }, "Exchange rate fetch failed — using cached/fallback");
    return cache?.rate ?? FALLBACK_RATE;
  }
}

export function getCacheInfo(): { rate: number; cachedAt: number | null; isFallback: boolean } {
  return {
    rate: cache?.rate ?? FALLBACK_RATE,
    cachedAt: cache?.timestamp ?? null,
    isFallback: !cache,
  };
}
