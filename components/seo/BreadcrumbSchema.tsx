import { SITE_URL } from "@/lib/seo";
import { jsonLdHtml } from "@/lib/escape-html";

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
}: {
  /** Kolejne poziomy po stronie głównej, np. `[{ name: "Sklep", path: "/sklep" }]`. */
  items: { name: string; path: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Strona główna", item: SITE_URL },
      ...items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: item.name,
        item: `${SITE_URL}${item.path}`,
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
