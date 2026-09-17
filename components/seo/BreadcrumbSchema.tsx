import { SITE_URL } from "@/lib/seo";
import { jsonLdHtml } from "@/lib/escape-html";
import { localePath, type Locale } from "@/lib/i18n";
import { t } from "@/lib/dictionary";

/**
 * Okruszki (BreadcrumbList) w danych strukturalnych – dzięki nim wyszukiwarka
 * pokazuje ścieżkę zamiast surowego adresu URL.
 *
 * „Strona główna" jest dokładana automatycznie jako pierwszy element, więc
 * podajemy tylko kolejne poziomy. Komponent jest synchroniczny i bezstanowy –
 * można go wstawić na dowolnej stronie serwerowej.
 */
export default function BreadcrumbSchema({
  items,
  locale = "pl",
}: {
  /** Kolejne poziomy po stronie głównej, np. `[{ name: "Sklep", path: "/sklep" }]` (ścieżki bez prefiksu języka). */
  items: { name: string; path: string }[];
  locale?: Locale;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t(locale).common.home, item: `${SITE_URL}${localePath(locale, "/")}` },
      ...items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: item.name,
        item: `${SITE_URL}${localePath(locale, item.path)}`,
      })),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(schema) }}
    />
  );
}
