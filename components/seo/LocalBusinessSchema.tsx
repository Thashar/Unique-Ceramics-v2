import { getContactSettings } from "@/lib/settings";
import { parseOpeningHours, parseCityLine } from "@/lib/opening-hours";

const BASE = "https://uniqueceramics.pl";

const AREA_SERVED = [
  { "@type": "City", name: "Kleszczów" },
  { "@type": "City", name: "Gliwice" },
  { "@type": "City", name: "Knurów" },
  { "@type": "City", name: "Pyskowice" },
  { "@type": "City", name: "Zabrze" },
  { "@type": "City", name: "Tarnowskie Góry" },
  { "@type": "City", name: "Bytom" },
  { "@type": "City", name: "Piekary Śląskie" },
  { "@type": "City", name: "Chorzów" },
  { "@type": "City", name: "Ruda Śląska" },
  { "@type": "City", name: "Świętochłowice" },
  { "@type": "City", name: "Siemianowice Śląskie" },
  { "@type": "City", name: "Katowice" },
  { "@type": "City", name: "Mikołów" },
  { "@type": "City", name: "Tychy" },
  { "@type": "City", name: "Mysłowice" },
  { "@type": "City", name: "Sosnowiec" },
  { "@type": "City", name: "Dąbrowa Górnicza" },
  { "@type": "AdministrativeArea", name: "Śląsk" },
  { "@type": "Country", name: "Polska" },
];

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BASE}/#website`,
  name: "Unique Ceramics",
  url: BASE,
  description: "Sklep z ręcznie robioną ceramiką artystyczną",
  inLanguage: "pl-PL",
  publisher: { "@id": `${BASE}/#business` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE}/sklep?kategoria={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

/**
 * Dane strukturalne LocalBusiness + WebSite.
 * Adres, telefon, e-mail i godziny otwarcia pochodzą z ustawień edytowanych
 * w /admin/ustawienia → Kontakt, żeby JSON-LD nie rozjeżdżał się z tym, co
 * widzi użytkownik w stopce i na /kontakt. Osobny komponent (async), dzięki
 * czemu `app/layout.tsx` pozostaje synchroniczny.
 */
export default async function LocalBusinessSchema() {
  const s = await getContactSettings();

  const { postalCode, locality } = parseCityLine(s.contact_address_city);
  const openingHours = parseOpeningHours(s.contact_hours);
  const mapQuery = encodeURIComponent(
    [s.contact_address_street, s.contact_address_city].filter(Boolean).join(", ")
  );

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "Store"],
    "@id": `${BASE}/#business`,
    name: "Unique Ceramics",
    description:
      "Pracownia ceramiki artystycznej tworząca ręcznie robione naczynia użytkowe i dekoracyjne. Kubki, filiżanki, miski, talerze i świeczniki wykonywane z pasją – każdy egzemplarz jest niepowtarzalny.",
    url: BASE,
    logo: `${BASE}/images/logo.webp`,
    image: `${BASE}/images/OpenGraph.webp`,
    telephone: s.contact_phone.replace(/\s/g, ""),
    email: s.contact_email,
    address: {
      "@type": "PostalAddress",
      streetAddress: s.contact_address_street.replace(/^ul\.\s*/i, ""),
      ...(postalCode ? { postalCode } : {}),
      addressLocality: locality,
      addressRegion: "Śląskie",
      addressCountry: "PL",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 50.3482019,
      longitude: 18.5182082,
    },
    hasMap: `https://maps.google.com/?q=${mapQuery}`,
    priceRange: "$$",
    currenciesAccepted: "PLN",
    paymentAccepted: "Bank Transfer, BLIK",
    // Pomijamy klucz, gdy godzin nie da się sparsować – lepiej brak danych
    // niż błędne godziny w wynikach wyszukiwania
    ...(openingHours.length ? { openingHoursSpecification: openingHours } : {}),
    areaServed: AREA_SERVED,
    sameAs: [
      `https://www.instagram.com/${s.contact_instagram.replace(/^@/, "")}`,
      ...(s.contact_facebook ? [s.contact_facebook] : []),
      ...(s.contact_youtube ? [s.contact_youtube] : []),
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Ceramika artystyczna",
      itemListElement: [
        { "@type": "OfferCatalog", name: "Kubki ceramiczne" },
        { "@type": "OfferCatalog", name: "Filiżanki ceramiczne" },
        { "@type": "OfferCatalog", name: "Miski i naczynia" },
        { "@type": "OfferCatalog", name: "Talerze ceramiczne" },
        { "@type": "OfferCatalog", name: "Świeczniki ceramiczne" },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}
