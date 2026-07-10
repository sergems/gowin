import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { translate, formatCurrencyValue, parseCurrencyInput, type Language, type TranslationKey } from "@/lib/i18n";

interface SiteSettings {
  currency: string;
  language: Language;
  exchangeRate: number;
  maxWin: number;
}

interface SiteSettingsContextValue {
  currency: string;
  language: Language;
  exchangeRate: number;
  maxWin: number;
  t: (key: TranslationKey) => string;
  formatCurrency: (amount: number | string) => string;
  // Use for amounts tied to a historical record (a placed bet, a past transaction) that
  // stored its own exchangeRate snapshot — pass that snapshot so the displayed CDF value
  // never drifts if the site-wide rate changes later. Falls back to the live rate when
  // `rateOverride` is null/undefined (e.g. legacy records with no stored snapshot).
  formatCurrencyAt: (amount: number | string, rateOverride?: number | string | null) => string;
  parseAmount: (amount: number | string) => number;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  currency: "USD",
  language: "en",
  exchangeRate: 2800,
  maxWin: 1_000_000,
  t: (key) => key,
  formatCurrency: (amount) => `${Number(amount).toFixed(2)}`,
  formatCurrencyAt: (amount) => `${Number(amount).toFixed(2)}`,
  parseAmount: (amount) => Number(amount),
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
    queryFn: async () => {
      const res = await fetch("/api/site-settings");
      if (!res.ok) return { currency: "USD", language: "en" as Language, exchangeRate: 2800, maxWin: 1_000_000 };
      return res.json();
    },
    staleTime: 0,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
  });

  const currency = data?.currency ?? "USD";
  const language: Language = data?.language ?? "en";
  const exchangeRate = data?.exchangeRate ?? 2800;
  const maxWin = data?.maxWin ?? 1_000_000;

  const t = (key: TranslationKey) => translate(key, language);
  const formatCurrency = (amount: number | string) =>
    formatCurrencyValue(Number(amount), currency, language, exchangeRate);
  const formatCurrencyAt = (amount: number | string, rateOverride?: number | string | null) => {
    const rate = rateOverride !== undefined && rateOverride !== null && Number(rateOverride) > 0
      ? Number(rateOverride)
      : exchangeRate;
    return formatCurrencyValue(Number(amount), currency, language, rate);
  };
  // Converts a value the user typed while viewing the site in the active currency
  // back into the USD figure the backend expects (wallet balances/bet stakes are USD-only).
  const parseAmount = (amount: number | string) =>
    parseCurrencyInput(Number(amount), currency, exchangeRate);

  return (
    <SiteSettingsContext.Provider value={{ currency, language, exchangeRate, maxWin, t, formatCurrency, formatCurrencyAt, parseAmount }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
