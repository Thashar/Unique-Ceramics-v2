import type { Metadata } from "next";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import ClayRule from "@/components/ui/ClayRule";
import { getCategories } from "@/lib/categories";
import { findActiveFreeShipping, findActiveQuantityPromo, toQuantityConfig } from "@/lib/promos";
import { quantityPromoTeaser } from "@/lib/quantity-promo";
import { getSetting } from "@/lib/settings";
import { DISCOUNT_HOLD_CATALOG_MS } from "@/lib/product-price";
import ProductGrid from "./ProductGrid";
import CategoryBar from "./CategoryBar";
import { loadCatalog } from "./catalog";
import { pageMetadata } from "@/lib/seo";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import { t } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import { englishContentFor } from "@/lib/content-translations";
import { localizeCategories, localizeProduct } from "@/lib/i18n-content";

export function shopMetadata(locale: Locale): Metadata {
  const m = t(locale).meta;
  return pageMetadata({
    title: m.shopTitle,
    description: m.shopDescription,
    path: "/sklep",
    ogTitle: m.shopOgTitle,
    locale,
  });
}

/**
 * Katalog – wspólny dla `/sklep` i `/en/sklep`. Po angielsku produkty
 * i kategorie dostają nazwy z panelu (bez tłumaczenia zostaje polska), a
 * zachęty promocyjne pod cenami znikają – na wersji angielskiej nie da się
 * kupować, więc rabat ilościowy i darmowa wysyłka nie mają tam sensu.
 */
export default async function ShopPage({ locale = "pl" }: { locale?: Locale }) {
  const d = t(locale);
  // Zapytania sekwencyjne – każde zwalnia połączenie przed kolejnym,
  // co chroni przed wyczerpaniem puli (Supabase: 15 połączeń w trybie sesji).
  const dbCategories = await getCategories();

  const vacationEnabled = (await getSetting("vacation_enabled")) === "true";
  const lowStockBadge = (await getSetting("low_stock_badge_enabled")) !== "false";
  // Trwające promocje – w katalogu pokazujemy je jako zachęty pod ceną.
  // `holdMs` = okno ISR tej strony: promocji kończącej się w czasie życia
  // zapisanego HTML-a nie reklamujemy, bo checkout już by jej nie policzył
  const hold = { holdMs: DISCOUNT_HOLD_CATALOG_MS };
  const quantityTeaser =
    locale === "pl" ? quantityPromoTeaser(toQuantityConfig(await findActiveQuantityPromo(hold))) : null;
  const freeShippingNote = locale === "pl" && (await findActiveFreeShipping(hold)) !== null;

  const { products: rawProducts, dbError } = await loadCatalog();
  const en = await englishContentFor(locale);
  const products = rawProducts.map((p) => localizeProduct(locale, p, en));
  const categories = localizeCategories(locale, dbCategories, en);

  return (
    <>
      <BreadcrumbSchema locale={locale} items={[{ name: d.nav.shop, path: "/sklep" }]} />
      <Header locale={locale} />
      <div className="min-h-[100svh] bg-warm-white">
        <CategoryBar
          categories={categories}
          activeSlug={null}
          vacationEnabled={vacationEnabled}
          locale={locale}
        />

        {/* Nagłówek katalogu – ten sam układ co na stronach kategorii:
            ozdobnik i widoczny h1, bez akapitu wstępu (opis idzie do metadanych).
            Wcześniej h1 był `sr-only` */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 md:pt-12">
          {/* Nagłówek na linii ozdobnej – po prawej od mozaiki, przerywa kreskę
              (decyzja właściciela 16.09.2026) */}
          <ClayRule>
            <h1 className="font-serif text-3xl md:text-4xl text-espresso leading-tight">{d.shop.title}</h1>
          </ClayRule>
        </div>

        {/* Siatka produktów */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-16 md:pt-8 md:pb-16">
          <ProductGrid products={products} dbError={dbError} categories={categories} quantityTeaser={quantityTeaser} freeShippingNote={freeShippingNote} lowStockBadge={lowStockBadge} />
        </div>
      </div>

      <Footer locale={locale} />
    </>
  );
}
