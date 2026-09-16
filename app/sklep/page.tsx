// ISR jak strony kategorii – siatka pochodzi z `getShopProducts` (cache 60 s).
// ⚠️ **Nie czytaj tu `searchParams`** – samo ich odczytanie robi ze strony
// w pełni dynamiczną i każde wejście do sklepu renderuje się od zera (zimny
// start + trzy zapytania do bazy: 2,2 s TTFB zamiast 0,15 s z cache, zmierzone
// 16.09.2026). Stare przekierowanie `?kategoria=` siedzi w `next.config.ts`.
export const revalidate = 60;

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
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";

export const metadata: Metadata = pageMetadata({
  title: "Sklep ceramiczny – ceramika ręcznie robiona",
  description:
    "Sklep z ceramiką ręcznie robioną z okolic Gliwic. Miski, kubki, talerze, wazony – każdy przedmiot tworzony jest ręcznie z lokalnej gliny.",
  path: "/sklep",
  ogTitle: "Sklep ceramiczny – Unique Ceramics",
});

export default async function ShopPage() {
  // Zapytania sekwencyjne – każde zwalnia połączenie przed kolejnym,
  // co chroni przed wyczerpaniem puli (Supabase: 15 połączeń w trybie sesji).
  const dbCategories = await getCategories();

  const vacationEnabled = (await getSetting("vacation_enabled")) === "true";
  // Trwające promocje – w katalogu pokazujemy je jako zachęty pod ceną.
  // `holdMs` = okno ISR tej strony: promocji kończącej się w czasie życia
  // zapisanego HTML-a nie reklamujemy, bo checkout już by jej nie policzył
  const hold = { holdMs: DISCOUNT_HOLD_CATALOG_MS };
  const quantityTeaser = quantityPromoTeaser(toQuantityConfig(await findActiveQuantityPromo(hold)));
  const freeShippingNote = (await findActiveFreeShipping(hold)) !== null;

  const { products, dbError } = await loadCatalog();

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Sklep", path: "/sklep" }]} />
      <Header />
      <div className="min-h-[100svh] bg-warm-white">
        <CategoryBar
          categories={dbCategories}
          activeSlug={null}
          vacationEnabled={vacationEnabled}
        />

        {/* Nagłówek katalogu – ten sam układ co na stronach kategorii:
            ozdobnik i widoczny h1, bez akapitu wstępu (opis idzie do metadanych).
            Wcześniej h1 był `sr-only` */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 md:pt-12">
          {/* Nagłówek na linii ozdobnej – po prawej od mozaiki, przerywa kreskę
              (decyzja właściciela 16.09.2026) */}
          <ClayRule>
            <h1 className="font-serif text-3xl md:text-4xl text-espresso leading-tight">Sklep</h1>
          </ClayRule>
        </div>

        {/* Siatka produktów */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-16 md:pt-8 md:pb-16">
          <ProductGrid products={products} dbError={dbError} categories={dbCategories} quantityTeaser={quantityTeaser} freeShippingNote={freeShippingNote} />
        </div>
      </div>

      <Footer />
    </>
  );
}
