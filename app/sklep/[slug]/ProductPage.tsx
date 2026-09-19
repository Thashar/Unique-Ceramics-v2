import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Truck, Clock, AlertTriangle } from "lucide-react";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import DishwasherIcon from "@/components/ui/DishwasherIcon";
import ProductDimensions from "@/components/ui/ProductDimensions";
import ProductGallery from "@/components/ui/ProductGallery";
import SimilarProducts from "@/components/ui/SimilarProducts";
import AddToCartSection from "./AddToCartSection";
import { db, withDbRetry } from "@/lib/db";
import { getSettings, settingNumber } from "@/lib/settings";
import { splitProductDescription } from "@/lib/product-description";
import {
  dimensionRows,
  parseProductDimensions,
  productDimensionsKey,
  rowsFromDescription,
} from "@/lib/product-dimensions";
import { getCategories, categoryLabel } from "@/lib/categories";
import ProductPriceTag from "@/components/ui/ProductPriceTag";
import QuantityPromoNotes from "@/components/ui/QuantityPromoNotes";
import {
  findActiveFreeShipping,
  findActiveQuantityPromo,
  toFreeShippingConfig,
  toQuantityConfig,
} from "@/lib/promos";
import {
  DISCOUNT_HOLD_CATALOG_MS,
  activeDiscountPercent,
  discountedPrice,
} from "@/lib/product-price";
import { formatWarsaw } from "@/lib/warsaw-time";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import { absoluteUrl, languageAlternates, metaDescription } from "@/lib/seo";
import { categoryPath } from "@/lib/category-seo";
import { getShopProducts } from "@/lib/products";
import { SIMILAR_MIN_SCORE_KEY, normalizeMinScore, similarProducts } from "@/lib/similar-products";
import { jsonLdHtml } from "@/lib/escape-html";
import { OG_LOCALE, SCHEMA_LANG, formatPrice, localePath, type Locale } from "@/lib/i18n";
import { t } from "@/lib/dictionary";
import { englishContentFor } from "@/lib/content-translations";
import { localizeCategories, localizeProduct } from "@/lib/i18n-content";
import CustomOrderBanner from "./CustomOrderBanner";

export async function productStaticParams() {
  try {
    // Ponowienia, bo przy wyczerpanym poolerze pusta lista oznacza brak
    // pre-generowanych kart produktów w całym buildzie
    const products = await withDbRetry(() =>
      db.product.findMany({
        where: { active: true },
        select: { slug: true },
      })
    );
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

/**
 * Data ważności ceny w danych strukturalnych: koniec przeceny, a gdy jej nie ma –
 * rok do przodu. Google ostrzega o ofercie bez `priceValidUntil`, a data
 * z przeszłości każe mu uznać cenę za nieaktualną.
 *
 * Osobna funkcja, bo `Date.now()` nie może paść w ciele komponentu
 * (reguła `react-hooks/purity`).
 */
function priceValidUntilDate(endsAt: Date | null): string {
  const YEAR_MS = 365 * 24 * 3600 * 1000;
  return (endsAt ?? new Date(Date.now() + YEAR_MS)).toISOString().slice(0, 10);
}

/**
 * Data, od której obowiązuje pokazana cena (`Offer.validFrom` – Google wymienia je
 * w raporcie „Merchant listings” jako pole opcjonalne). Przy działającej przecenie
 * jest to jej start, poza nią – ostatnia zmiana produktu, czyli i jego ceny.
 * Nigdy nie podajemy daty z przyszłości: oferta obowiązuje już teraz.
 */
function priceValidFromDate(startsAt: Date | null, updatedAt: Date): string {
  return (startsAt ?? updatedAt).toISOString().slice(0, 10);
}

// Produkt z nazwą i opisem w języku strony (angielskie z panelu, jeśli są).
// `cache` deduplikuje odczyt między metadanymi a stroną
const getProduct = cache(async (slug: string, locale: Locale) => {
  try {
    const product = await db.product.findUnique({ where: { slug, active: true } });
    if (!product) return null;
    return localizeProduct(locale, product, await englishContentFor(locale));
  } catch {
    return null;
  }
});

export async function productMetadata(slug: string, locale: Locale): Promise<Metadata> {
  const d = t(locale);
  const product = await getProduct(slug, locale);
  if (!product) return { title: d.meta.productMissing, robots: { index: false, follow: false } };

  const url = `https://uniqueceramics.pl${localePath(locale, `/sklep/${slug}`)}`;
  // Opis z panelu bywa kilkusetznakowy – do meta idzie przycięty na granicy słowa
  const description = metaDescription(
    product.description?.trim() || d.product.defaultDescription(product.name)
  );

  // Podgląd linku bierze zdjęcie z /api/og/[slug]: zdjęcia produktów są w WebP,
  // którego WhatsApp nie renderuje, a trasa oddaje kadr 1200×630 w JPEG.
  // Wymiary i typ podajemy jawnie – bez nich część komunikatorów pokazuje
  // mały kafelek zamiast dużego podglądu.
  const image = product.images[0]
    ? [{
        url: `https://uniqueceramics.pl/api/og/${slug}`,
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: product.name,
      }]
    : [];

  return {
    // Bez marki – dokłada ją szablon tytułu z layoutu („%s | Unique Ceramics”).
    // Wpisana tutaj drugi raz dawała „… – Unique Ceramics | Unique Ceramics”
    title: product.name,
    description,
    alternates: { canonical: url, languages: languageAlternates(`/sklep/${slug}`) },
    // Uwaga: `openGraph` ze strony zastępuje ten z layoutu w całości,
    // więc siteName/locale/type trzeba powtórzyć tutaj
    openGraph: {
      type: "website",
      siteName: "Unique Ceramics",
      locale: OG_LOCALE[locale],
      url,
      title: product.name,
      description,
      images: image,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: image.map((i) => i.url),
    },
  };
}

/**
 * Karta produktu – wspólna dla `/sklep/[slug]` i `/en/sklep/[slug]`.
 *
 * Po angielsku **nie da się kupić**: zamiast przycisku koszyka, informacji
 * o wysyłce i zachęt promocyjnych stoi baner o zamówieniu indywidualnym
 * (`CustomOrderBanner`) – sklep prowadzi sprzedaż tylko w Polsce (decyzja
 * właściciela 17.09.2026). Cena zostaje widoczna, w PLN.
 */
export default async function ProductPage({ slug, locale = "pl" }: { slug: string; locale?: Locale }) {
  const d = t(locale);
  const hold = { holdMs: DISCOUNT_HOLD_CATALOG_MS };
  const [product, settings, rawCategories, quantityPromoRow, freeShippingRow, catalog, en] = await Promise.all([
    getProduct(slug, locale),
    getSettings(["shipping_time", "shipping_cost", "shipping_cost_parcel_locker", SIMILAR_MIN_SCORE_KEY, "low_stock_badge_enabled"]),
    getCategories(),
    findActiveQuantityPromo(hold),
    findActiveFreeShipping(hold),
    // Katalog jest już cachowany pod tagiem `products` – podobne produkty
    // liczymy z niego w pamięci, bez dodatkowego zapytania do bazy
    getShopProducts(),
    englishContentFor(locale),
  ]);

  if (!product) notFound();
  const categories = localizeCategories(locale, rawCategories, en);

  // Wymiary produktu (`product_dims_{id}` w `Setting` – patrz `lib/product-dimensions.ts`).
  // Osobne zapytanie, bo klucz zna się dopiero po odczytaniu produktu; strona
  // jest ISR-owa, więc idzie ono raz na okno cache
  const dimensionSetting = await getSettings([productDimensionsKey(product.id)]);
  // Opis rozdzielamy na prozę i wymiary **zawsze** – produkty dodane przed
  // 19.09.2026 mają je w tekście, a pokazane obok wierszy z ikonami
  // dublowałyby się. Pola produktu są ważniejsze od tekstu w opisie
  const parts = splitProductDescription(product.description ?? "");
  const fieldRows = dimensionRows(parseProductDimensions(dimensionSetting[productDimensionsKey(product.id)]), locale);
  const dimensions = fieldRows.length > 0
    ? fieldRows
    : rowsFromDescription(parts.dimensions, parts.capacity, locale);

  // Kategoria produktu jako pozycja z listy – potrzebny jest jej adres, nie
  // sama etykieta. `null` = kategoria usunięta po przypisaniu produktu;
  // wtedy okruszki mają o jeden poziom mniej, zamiast prowadzić donikąd
  const category = categories.find((c) => c.slug === product.category) ?? null;

  const quantityPromo = toQuantityConfig(quantityPromoRow);
  const freeShipping = toFreeShippingConfig(freeShippingRow);
  // Rabat produktowy liczymy raz – ta sama wartość idzie do ceny, danych
  // strukturalnych i koszyka. Poza oknem obowiązywania (patrz `lib/product-price`)
  // wychodzi 0, więc karta wraca do ceny podstawowej sama
  const discountPercent = activeDiscountPercent(product, hold);
  // Termin pokazujemy tylko przy realnie działającym rabacie
  const discountEndsAt = discountPercent > 0 ? product.discountEndsAt : null;
  const shippingTime = settings.shipping_time || "2–4 dni robocze";
  // Klient nie wybrał jeszcze metody dostawy, więc podajemy **najtańszą** stawkę
  // i piszemy „od” – wcześniej karta pokazywała samą cenę kuriera jako jedyną
  const shippingCostCourier = settingNumber(settings.shipping_cost, 18);
  const shippingCostParcel = settingNumber(settings.shipping_cost_parcel_locker, 18);
  const cheapestShipping = Math.min(shippingCostCourier, shippingCostParcel);
  const shippingVaries = shippingCostCourier !== shippingCostParcel;

  // Karuzela „Mogą Ci się spodobać" – punktacja w `lib/similar-products.ts`
  // (kategoria, zbliżona cena, wyróżnienie, trwająca przecena). Wyprzedanych
  // nie pokazujemy, więc bierzemy wyłącznie `inStock`
  const similar = similarProducts(catalog.inStock, product, {
    // Próg punktowy z panelu (Ustawienia → Proponowane); 0 = bez progu
    minScore: normalizeMinScore(settings[SIMILAR_MIN_SCORE_KEY]),
    isDiscounted: (candidate) => activeDiscountPercent(candidate, hold) > 0,
  }).map((p) => localizeProduct(locale, p, en));

  const BASE = "https://uniqueceramics.pl";
  const productUrl = `${BASE}${localePath(locale, `/sklep/${product.slug}`)}`;
  const priceValidUntil = priceValidUntilDate(discountEndsAt);
  const priceValidFrom = priceValidFromDate(
    discountPercent > 0 ? product.discountStartsAt : null,
    product.updatedAt,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? d.product.defaultDescription(product.name),
    inLanguage: SCHEMA_LANG[locale],
    // Absolutne adresy – zdjęcia z `public/` są zapisane jako `/images/...`,
    // a Google odrzuca w danych strukturalnych ścieżki względne
    image: product.images.map(absoluteUrl),
    sku: product.slug,
    brand: {
      "@type": "Brand",
      name: "Unique Ceramics",
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      // Cena dla wyszukiwarek to kwota za jedną sztukę: po rabacie produktowym.
      // Rabatu ilościowego tu nie uwzględniamy – zależy od zawartości koszyka,
      // a wyszukiwarka porównuje cenę pojedynczego produktu
      price: discountedPrice(product.price, discountPercent).toFixed(2),
      priceCurrency: "PLN",
      validFrom: priceValidFrom,
      priceValidUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability: product.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "Unique Ceramics",
        url: BASE,
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          // Najtańsza dostępna metoda – to samo, co pokazuje karta produktu.
          // Trwająca promocja „Darmowa wysyłka” bez progu zeruje stawkę
          value: (freeShipping && freeShipping.minOrderValue === 0 ? 0 : cheapestShipping).toFixed(2),
          currency: "PLN",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "PL",
        },
      },
      // Zwroty zgodnie z regulaminem: 14 dni na odstąpienie, odesłanie pocztą,
      // koszt zwrotu po stronie kupującego. Bez tego Google zgłasza brak
      // zasad zwrotów w raporcie „Merchant listings”
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "PL",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      <BreadcrumbSchema
        locale={locale}
        items={[
          { name: d.nav.shop, path: "/sklep" },
          ...(category
            ? [{ name: category.label, path: categoryPath(category.slug) }]
            : []),
          { name: product.name, path: `/sklep/${product.slug}` },
        ]}
      />
      <Header locale={locale} />
      <main className="min-h-[100svh] bg-warm-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-2">
          {/* Okruszki: droga powrotna dla klienta i link do kategorii z każdej
              karty produktu. Nazwa produktu dopiero od `sm:` – na telefonie
              łamałaby się na drugi wiersz */}
          <nav aria-label={d.common.breadcrumbs}>
            <ol className="flex items-center gap-2 text-xs tracking-widest uppercase text-clay">
              <li>
                <Link href={localePath(locale, "/sklep")} className="hover:text-espresso transition-colors">
                  {d.nav.shop}
                </Link>
              </li>
              {category && (
                <>
                  <li aria-hidden="true" className="text-charcoal/80">/</li>
                  <li>
                    <Link
                      href={localePath(locale, categoryPath(category.slug))}
                      className="hover:text-espresso transition-colors"
                    >
                      {category.label}
                    </Link>
                  </li>
                </>
              )}
              <li aria-hidden="true" className="hidden sm:block text-charcoal/80">/</li>
              <li className="hidden sm:block text-charcoal/80 truncate max-w-xs">
                {product.name}
              </li>
            </ol>
          </nav>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
          {/* Galeria */}
          <ProductGallery images={product.images} name={product.name} />

          {/* Informacje */}
          <div className="lg:pt-4 flex flex-col">
            {/* Etykieta kategorii z panelu – w `Product.category` siedzi slug,
                więc bez tego mapowania nazwa traciła polskie znaki. Prowadzi do
                strony kategorii: klient ma drogę do podobnych rzeczy, a kategoria
                dostaje link z każdej karty produktu */}
            <p className="text-xs tracking-[0.25em] uppercase text-clay mb-3">
              {category ? (
                <Link
                  href={localePath(locale, categoryPath(category.slug))}
                  className="hover:text-espresso transition-colors"
                >
                  {category.label}
                </Link>
              ) : (
                categoryLabel(product.category, categories)
              )}
            </p>
            <h1 className="font-serif text-3xl md:text-4xl text-espresso leading-tight mb-4">
              {product.name}
            </h1>
            <p className="font-serif text-2xl text-espresso mb-6">
              {/* Przeceniony produkt pokazuje cenę przekreśloną, nową i procent */}
              <ProductPriceTag
                price={product.price}
                discountPercent={discountPercent}
                size="lg"
                locale={locale}
              />
            </p>

            {/* Rabat z terminem – klient ma wiedzieć, do kiedy obowiązuje cena.
                Godzina jest czasem polskim (tak samo, jak ustawia ją panel). */}
            {discountEndsAt && (
              <p className="-mt-4 mb-6 flex items-center gap-2 text-xs text-green-700">
                <Clock size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
                <span>{d.product.discountUntil} {formatWarsaw(discountEndsAt)}</span>
              </p>
            )}

            {parts.text && (
              // whitespace-pre-line: opis wpisywany jest w zwykłym textarea w panelu,
              // więc entery z kreatora muszą zostać enterami także tutaj
              <p className="text-charcoal/80 leading-relaxed text-sm mb-3 whitespace-pre-line">
                {parts.text}
              </p>
            )}

            {/* Wymiary – wiersz na wypełnione pole, z ikoną po lewej.
                Pusta wartość nie daje wiersza: produkt z samą pojemnością
                pokazuje samą pojemność */}
            <ProductDimensions rows={dimensions} />

            {/* Mycie w zmywarce – tuż pod opisem i nieco większe niż informacje
                o wysyłce niżej (tam ikona 14 i text-xs), bo to cecha produktu,
                o którą klienci pytają najczęściej */}
            <div className="mb-6 flex items-center gap-2.5 text-sm text-charcoal/80">
              <DishwasherIcon size={18} className="shrink-0 text-clay" />
              <span>{d.product.dishwasher}</span>
            </div>

            {/* Komunikat o unikalności ceramiki */}
            {product.variesFromPhoto && (
              <div className="mb-6 flex gap-3 bg-amber-50 border border-amber-200/70 px-4 py-3.5 rounded-md">
                <AlertTriangle
                  size={16}
                  strokeWidth={1.5}
                  className="text-amber-700 shrink-0 mt-0.5"
                />
                <div className="text-xs text-amber-800 leading-relaxed space-y-1">
                  <p className="font-medium">{d.product.uniqueTitle}</p>
                  <p className="text-amber-700">{d.product.uniqueText}</p>
                </div>
              </div>
            )}

            {/* Dostępność */}
            <div className="mb-6 text-sm">
              {product.stock > 0 ? (
                product.stock <= 3 ? (
                  <p className="text-amber-700">
                    {product.stock === 1 ? d.product.lastOne : d.product.lastN(product.stock)}
                  </p>
                ) : (
                  <p className="text-green-700">{d.product.available}</p>
                )
              ) : (
                <p className="text-charcoal/80">{d.product.soldOut}</p>
              )}
            </div>

            {locale === "en" ? (
              // Wersja angielska: bez koszyka i bez informacji o wysyłce –
              // tylko baner o zamówieniu indywidualnym (sprzedaż wyłącznie w Polsce)
              <CustomOrderBanner slug={product.slug} locale={locale} />
            ) : (
              <>
                {/* Dodaj do koszyka */}
                {/* Do koszyka trafia cena po rabacie produktowym – tę samą kwotę
                    liczy serwer w /api/checkout */}
                <AddToCartSection product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  price: discountedPrice(product.price, discountPercent),
                  basePrice: product.price,
                  images: product.images,
                  stock: product.stock,
                }} />

                {/* Wysyłka */}
                <div className="mt-6 pt-6 border-t border-sand space-y-3">
                  {/* „od”, bo koszt zależy od metody wybieranej dopiero przy
                      zamówieniu – karta pokazuje najtańszą dostępną stawkę.
                      Gdy obie metody kosztują tyle samo, „od” byłoby mylące. */}
                  <div className="flex items-center gap-3 text-xs text-charcoal/80">
                    <Truck size={14} strokeWidth={1.5} className="shrink-0 text-clay" />
                    <span>
                      Wysyłka {shippingVaries ? "od " : ""}
                      {formatPrice("pl", cheapestShipping)}
                    </span>
                  </div>
                  {/* Trwające promocje – darmowa wysyłka i zachęta do rabatu
                      ilościowego, obie na zielono, pod przyciskiem koszyka */}
                  <QuantityPromoNotes quantityPromo={quantityPromo} freeShipping={freeShipping} />
                  <div className="flex items-center gap-3 text-xs text-charcoal/80">
                    <Clock size={14} strokeWidth={1.5} className="shrink-0 text-clay" />
                    <span>Czas realizacji: {shippingTime}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <SimilarProducts
          products={similar.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            category: p.category,
            price: p.price,
            images: p.images,
            stock: p.stock,
            discountPercent: activeDiscountPercent(p, hold),
          }))}
          categories={categories}
          lowStockBadge={settings.low_stock_badge_enabled !== "false"}
        />
      </main>
      <Footer locale={locale} />
    </>
  );
}
