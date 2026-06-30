import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { translate, formatCurrencyValue, type Language, type TranslationKey } from "@/lib/i18n";

interface SiteSettings {
  currency: string;
  language: Language;
  exchangeRate: number;
}

interface SiteSettingsContextValue {
  currency: string;
  language: Language;
  exchangeRate: number;
  t: (key: TranslationKey) => string;
  formatCurrency: (amount: number | string) => string;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  currency: "USD",
  language: "en",
  exchangeRate: 2800,
  t: (key) => key,
  formatCurrency: (amount) => `$${Number(amount).toFixed(2)}`,
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
    queryFn: async () => {
      const res = await fetch("/api/site-settings");
      if (!res.ok) return { currency: "USD", language: "en" as Language, exchangeRate: 2800 };
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

  const t = (key: TranslationKey) => translate(key, language);
  const formatCurrency = (amount: number | string) =>
    formatCurrencyValue(Number(amount), currency, language, exchangeRate);

  return (
    <SiteSettingsContext.Provider value={{ currency, language, exchangeRate, t, formatCurrency }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
