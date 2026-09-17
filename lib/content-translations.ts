import { unstable_cache } from "next/cache";
import { db, withDbRetry } from "@/lib/db";
import { EMPTY_ENGLISH, EN_KEY_PREFIX, parseEnglishRows, type EnglishContent } from "@/lib/i18n-content";
import type { Locale } from "@/lib/i18n";

/**
 * Angielskie wersje treści z bazy (serwer) – jedno zapytanie o wszystkie
 * klucze `en_*` z `Setting`, cachowane pod tagiem `settings`, który zapis
 * w `/api/admin/settings` i tak unieważnia (tam idą także tłumaczenia).
 *
 * Odczyt jest w try/catch: bez bazy (build) wersja angielska pokazuje polskie
 * oryginały zamiast wywracać stronę.
 */
export const getEnglishContent = unstable_cache(
  async (): Promise<EnglishContent> => {
    try {
      const rows = await withDbRetry(() =>
        db.setting.findMany({
          where: { key: { startsWith: EN_KEY_PREFIX } },
          select: { key: true, value: true },
        })
      );
      return parseEnglishRows(rows);
    } catch (e) {
      console.error("[content-translations] odczyt tłumaczeń nie powiódł się:", e);
      return EMPTY_ENGLISH;
    }
  },
  ["english-content"],
  { revalidate: 3600, tags: ["settings"] }
);

/** Tłumaczenia tylko wtedy, gdy strona jest po angielsku – po polsku bez zapytania. */
export async function englishContentFor(locale: Locale): Promise<EnglishContent> {
  return locale === "en" ? getEnglishContent() : EMPTY_ENGLISH;
}
