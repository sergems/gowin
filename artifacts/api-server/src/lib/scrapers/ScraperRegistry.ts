/**
 * Registry of all available scraper classes.
 *
 * Adding a new lottery only requires:
 *  1. Creating a new scraper class in this directory
 *  2. Registering it here
 *  3. Adding a database record with the scraper_class name
 *
 * No changes to the core engine are needed.
 */
import type { BaseScraper } from "./BaseScraper";
import {
  TheLotterPowerballScraper,
  TheLotterMegaMillionsScraper,
  TheLotterAusOzLottoScraper,
  TheLotterAusPowerballScraper,
  TheLotterAusSaturdayLottoScraper,
  TheLotterAusWeekdayWindfallScraper,
  TheLotterAustriaLottoScraper,
  TheLotterEuroDreamsScraper,
  TheLotterSpainElGordoScraper,
  TheLotterGermanyLottoScraper,
  TheLotterItalySuperEnalottoScraper,
  TheLotterCanadaLotto649Scraper,
  TheLotterCanadaOntario49Scraper,
  TheLotterNZPowerballScraper,
} from "./TheLotterScraper";
import { EuroMillionsScraper } from "./EuroMillionsScraper";
import { EuroJackpotScraper } from "./EuroJackpotScraper";
import { UKLottoScraper } from "./UKLottoScraper";
import { SALottoScraper } from "./SALottoScraper";
import { DailyLottoScraper } from "./DailyLottoScraper";
import { SALotteryScraper } from "./SALotteryScraper";
import { IrishLottoScraper } from "./IrishLottoScraper";
import { FrenchLotoScraper } from "./FrenchLotoScraper";
import { UK49sBrunchtimeScraper, UK49sLunchtimeScraper, UK49sDrivetimeScraper, UK49sTeatimeScraper } from "./UK49sScraper";
import { UKNationalLottoScraper, UKEuroMillionsScraper, UKThunderballScraper, UKSetForLifeScraper } from "./UKNationalLotteryScraper";
import {
  GosLoto645Scraper,
  GosLoto645PlusScraper,
  GosLoto749Scraper,
  GosLoto420Field1Scraper,
  GosLoto420Field2Scraper,
  GosLoto550Scraper,
  GosLoto636Scraper,
} from "./GosLotoScraper";

/** Map of scraper_class column value → BaseScraper instance */
const REGISTRY: Record<string, BaseScraper> = {
  // ── TheLotter-backed scrapers ─────────────────────────────────────────────
  TheLotterPowerballScraper:           new TheLotterPowerballScraper(),
  TheLotterMegaMillionsScraper:        new TheLotterMegaMillionsScraper(),
  TheLotterAusOzLottoScraper:          new TheLotterAusOzLottoScraper(),
  TheLotterAusPowerballScraper:        new TheLotterAusPowerballScraper(),
  TheLotterAusSaturdayLottoScraper:    new TheLotterAusSaturdayLottoScraper(),
  TheLotterAusWeekdayWindfallScraper:  new TheLotterAusWeekdayWindfallScraper(),
  TheLotterAustriaLottoScraper:        new TheLotterAustriaLottoScraper(),
  TheLotterEuroDreamsScraper:          new TheLotterEuroDreamsScraper(),
  TheLotterSpainElGordoScraper:        new TheLotterSpainElGordoScraper(),
  TheLotterGermanyLottoScraper:        new TheLotterGermanyLottoScraper(),
  TheLotterItalySuperEnalottoScraper:  new TheLotterItalySuperEnalottoScraper(),
  TheLotterCanadaLotto649Scraper:      new TheLotterCanadaLotto649Scraper(),
  TheLotterCanadaOntario49Scraper:     new TheLotterCanadaOntario49Scraper(),
  TheLotterNZPowerballScraper:         new TheLotterNZPowerballScraper(),
  // ── Other scrapers (own sources) ─────────────────────────────────────────
  EuroMillionsScraper:      new EuroMillionsScraper(),
  EuroJackpotScraper:       new EuroJackpotScraper(),
  UKLottoScraper:           new UKLottoScraper(),
  SALottoScraper:           new SALottoScraper(),
  DailyLottoScraper:        new DailyLottoScraper(),
  SALotteryScraper:         new SALotteryScraper(),
  IrishLottoScraper:        new IrishLottoScraper(),
  FrenchLotoScraper:        new FrenchLotoScraper(),
  UK49sBrunchtimeScraper:   new UK49sBrunchtimeScraper(),
  UK49sLunchtimeScraper:    new UK49sLunchtimeScraper(),
  UK49sDrivetimeScraper:    new UK49sDrivetimeScraper(),
  UK49sTeatimeScraper:      new UK49sTeatimeScraper(),
  // UK National Lottery games
  UKNationalLottoScraper:   new UKNationalLottoScraper(),
  UKEuroMillionsScraper:    new UKEuroMillionsScraper(),
  UKThunderballScraper:     new UKThunderballScraper(),
  UKSetForLifeScraper:      new UKSetForLifeScraper(),
  // Russian Gosloto games
  GosLoto645Scraper:        new GosLoto645Scraper(),
  GosLoto645PlusScraper:    new GosLoto645PlusScraper(),
  GosLoto749Scraper:        new GosLoto749Scraper(),
  GosLoto420Field1Scraper:  new GosLoto420Field1Scraper(),
  GosLoto420Field2Scraper:  new GosLoto420Field2Scraper(),
  GosLoto550Scraper:        new GosLoto550Scraper(),
  GosLoto636Scraper:        new GosLoto636Scraper(),
};

export function getScraperByClass(className: string): BaseScraper | null {
  return REGISTRY[className] ?? null;
}

export function listRegisteredScrapers(): string[] {
  return Object.keys(REGISTRY);
}
