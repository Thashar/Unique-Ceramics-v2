import { enSettingKey } from "@/lib/i18n-content";

/**
 * Klucze ustawień, które mają angielską wersję, per zakładka panelu. Pole
 * angielskie zapisuje się pod `en_{klucz}` (patrz `lib/i18n-content.ts`);
 * puste = strona `/en` pokazuje polski oryginał albo angielski domyślny z kodu.
 *
 * Moduł neutralny (bez `"use client"`): czyta go serwerowa strona ustawień
 * i kliencki `SettingsEnglish`. ⚠️ Nie przenoś tych stałych z powrotem do
 * komponentu klienckiego – z pliku `"use client"` serwer dostaje **referencję
 * klienta zamiast tablicy** i `getSettings([...ENGLISH_SETTING_KEYS_ALL])`
 * wywracało cały panel ustawień (17.09.2026).
 */
export const ENGLISH_SETTING_KEYS: Record<string, string[]> = {
  strona_glowna: [
    "home_hero_eyebrow", "home_hero_title", "home_hero_text",
    "home_hero_cta_primary", "home_hero_cta_secondary", "home_hero_scroll",
    "home_about_eyebrow", "home_about_title", "home_about_text", "home_about_cta",
    "home_workshops_eyebrow", "home_workshops_title", "home_workshops_text", "home_workshops_cta",
  ],
  omnie: ["about_story", "about_values_title", "about_values"],
  warsztaty: ["workshops_intro", "workshops_offers", "workshops_includes", "workshops_faq"],
  kontakt: ["contact_hours"],
  urlop: ["vacation_message"],
};

/** Wszystkie klucze `en_*` czytane przez stronę ustawień – do jednego `getSettings`. */
export const ENGLISH_SETTING_KEYS_ALL = Object.values(ENGLISH_SETTING_KEYS)
  .flat()
  .map(enSettingKey);

/** Zakładki ustawień, które w ogóle mają przełącznik PL / EN. */
export function hasEnglishSection(section: string): boolean {
  return section in ENGLISH_SETTING_KEYS;
}
