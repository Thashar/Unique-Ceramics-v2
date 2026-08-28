import { permanentRedirect } from "next/navigation";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import { getCategories } from "@/lib/categories";
import { findActiveFreeShipping, findActiveQuantityPromo, toQuantityConfig } from "@/lib/promos";
import { quantityPromoTeaser } from "@/lib/quantity-promo";
import { getSetting } from "@/lib/settings";
import { DISCOUNT_HOLD_CATALOG_MS } from "@/lib/product-price";
import { categoryPath } from "@/lib/category-seo";
import ProductGrid from "./ProductGrid";
import CategoryBar from "./CategoryBar";
import FloatingOrderButton from "./FloatingOrderButton";
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

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string }>;
}) {
  const { kategoria } = await searchParams;

  // Zapytania sekwencyjne – każde zwalnia połączenie przed kolejnym,
  // co chroni przed wyczerpaniem puli (Supabase: 15 połączeń w trybie sesji).
  const dbCategories = await getCategories();

  // Stare adresy filtra (`/sklep?kategoria=kubki`) prowadzą teraz na własną
  // stronę kategorii – ten wariant nie mógł trafić do wyników wyszukiwania,
  // bo canonicalizował się do `/sklep`. Nieznana kategoria po prostu pokazuje
  // pełny katalog, zamiast zostawiać klienta z pustą listą
  if (kategoria && kategoria !== "wszystkie") {
    const known = dbCategories.some((c) => c.slug === kategoria);
    // 308, nie 307 – ten schemat adresów jest wycofany na stałe, więc stary
    // link ma przekazać swoje sygnały nowej stronie
    permanentRedirect(known ? categoryPath(kategoria) : "/sklep");
  }

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
        <h1 className="sr-only">Sklep ceramiczny – sklep z ceramiką ręcznie robioną, Gliwice</h1>
        <CategoryBar
          categories={dbCategories}
          activeSlug={null}
          vacationEnabled={vacationEnabled}
        />

        {/* Siatka produktów */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-3 pb-16 md:pt-8 md:pb-16">
          <ProductGrid products={products} dbError={dbError} categories={dbCategories} quantityTeaser={quantityTeaser} freeShippingNote={freeShippingNote} />
        </div>
      </div>

      {/* Pływający przycisk zamówień indywidualnych */}
      <FloatingOrderButton />

      <Footer />
    </>
  );
}
