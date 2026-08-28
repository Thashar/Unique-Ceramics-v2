import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Truck, Clock, AlertTriangle } from "lucide-react";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import DishwasherIcon from "@/components/ui/DishwasherIcon";
import ProductGallery from "./ProductGallery";
import AddToCartSection from "./AddToCartSection";
import { db, withDbRetry } from "@/lib/db";
import { getSettings, settingNumber } from "@/lib/settings";
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
import { absoluteUrl, metaDescription } from "@/lib/seo";
import { categoryPath } from "@/lib/category-seo";

export const revalidate = 60;

export async function generateStaticParams() {
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

const getProduct = cache(async (slug: string) => {
  try {
    return await db.product.findUnique({ where: { slug, active: true } });
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Produkt nie istnieje", robots: { index: false, follow: false } };

  const url = `https://uniqueceramics.pl/sklep/${slug}`;
  // Opis z panelu bywa kilkusetznakowy – do meta idzie przycięty na granicy słowa
  const description = metaDescription(
    product.description?.trim() ||
      `${product.name} – ręcznie robiona ceramika artystyczna. Każdy egzemplarz jest niepowtarzalny.`
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
    alternates: { canonical: url },
    // Uwaga: `openGraph` ze strony zastępuje ten z layoutu w całości,
    // więc siteName/locale/type trzeba powtórzyć tutaj
    openGraph: {
      type: "website",
      siteName: "Unique Ceramics",
      locale: "pl_PL",
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

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hold = { holdMs: DISCOUNT_HOLD_CATALOG_MS };
  const [product, settings, categories, quantityPromoRow, freeShippingRow] = await Promise.all([
    getProduct(slug),
    getSettings(["shipping_time", "shipping_cost", "shipping_cost_parcel_locker"]),
    getCategories(),
    findActiveQuantityPromo(hold),
    findActiveFreeShipping(hold),
  ]);

  if (!product) notFound();

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

  const BASE = "https://uniqueceramics.pl";
  const priceValidUntil = priceValidUntilDate(discountEndsAt);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description
      ?? `${product.name} – ręcznie robiona ceramika artystyczna. Każdy egzemplarz jest unikalny.`,
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
      url: `${BASE}/sklep/${product.slug}`,
      // Cena dla wyszukiwarek to kwota za jedną sztukę: po rabacie produktowym.
      // Rabatu ilościowego tu nie uwzględniamy – zależy od zawartości koszyka,
      // a wyszukiwarka porównuje cenę pojedynczego produktu
      price: discountedPrice(product.price, discountPercent).toFixed(2),
      priceCurrency: "PLN",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Sklep", path: "/sklep" },
          ...(category
            ? [{ name: category.label, path: categoryPath(category.slug) }]
            : []),
          { name: product.name, path: `/sklep/${product.slug}` },
        ]}
      />
      <Header />
      <main className="min-h-[100svh] bg-warm-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-2">
          {/* Okruszki: droga powrotna dla klienta i link do kategorii z każdej
              karty produktu. Nazwa produktu dopiero od `sm:` – na telefonie
              łamałaby się na drugi wiersz */}
          <nav aria-label="Okruszki">
            <ol className="flex items-center gap-2 text-xs tracking-widest uppercase text-clay">
              <li>
                <Link href="/sklep" className="hover:text-espresso transition-colors">
                  Sklep
                </Link>
              </li>
              {category && (
                <>
                  <li aria-hidden="true" className="text-charcoal/80">/</li>
                  <li>
                    <Link
                      href={categoryPath(category.slug)}
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
                  href={categoryPath(category.slug)}
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
              />
            </p>

            {/* Rabat z terminem – klient ma wiedzieć, do kiedy obowiązuje cena.
                Godzina jest czasem polskim (tak samo, jak ustawia ją panel). */}
            {discountEndsAt && (
              <p className="-mt-4 mb-6 flex items-center gap-2 text-xs text-green-700">
                <Clock size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
                <span>Promocyjna cena obowiązuje do {formatWarsaw(discountEndsAt)}</span>
              </p>
            )}

            {product.description && (
              // whitespace-pre-line: opis wpisywany jest w zwykłym textarea w panelu,
              // więc entery z kreatora muszą zostać enterami także tutaj
              <p className="text-charcoal/80 leading-relaxed text-sm mb-3 whitespace-pre-line">
                {product.description}
              </p>
            )}

            {/* Mycie w zmywarce – tuż pod opisem i nieco większe niż informacje
                o wysyłce niżej (tam ikona 14 i text-xs), bo to cecha produktu,
                o którą klienci pytają najczęściej */}
            <div className="mb-6 flex items-center gap-2.5 text-sm text-charcoal/80">
              <DishwasherIcon size={18} className="shrink-0 text-clay" />
              <span>Można myć w zmywarce</span>
            </div>

            {/* Komunikat o unikalności ceramiki */}
            {product.variesFromPhoto && (
              <div className="mb-6 flex gap-3 bg-amber-50 border border-amber-200/70 px-4 py-3.5">
                <AlertTriangle
                  size={16}
                  strokeWidth={1.5}
                  className="text-amber-700 shrink-0 mt-0.5"
                />
                <div className="text-xs text-amber-800 leading-relaxed space-y-1">
                  <p className="font-medium">Każdy egzemplarz jest niepowtarzalny</p>
                  <p className="text-amber-700">
                    Z uwagi na ręczne wykonanie i naturalny charakter gliny, produkt może
                    nieznacznie różnić się od zdjęcia – w odcieniu, fakturze lub kształcie.
                    Zachowuje jednak wszystkie cechy jakościowe i nie odbiega znacząco od
                    pierwowzoru.
                  </p>
                </div>
              </div>
            )}

            {/* Dostępność */}
            <div className="mb-6 text-sm">
              {product.stock > 0 ? (
                product.stock <= 3 ? (
                  <p className="text-amber-700">
                    Ostatnie{" "}
                    {product.stock === 1
                      ? "sztuki"
                      : `${product.stock} sztuki`}
                  </p>
                ) : (
                  <p className="text-green-700">Dostępny</p>
                )
              ) : (
                <p className="text-charcoal/80">Wyprzedano</p>
              )}
            </div>

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
                  {cheapestShipping.toFixed(2).replace(".", ",")} zł
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
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
