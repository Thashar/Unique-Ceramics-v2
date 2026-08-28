import { permanentRedirect } from "next/navigation";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import ClayRule from "@/components/ui/ClayRule";
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
        <CategoryBar
          categories={dbCategories}
          activeSlug={null}
          vacationEnabled={vacationEnabled}
        />

        {/* Nagłówek katalogu – ten sam układ co na stronach kategorii
            (ozdobnik, widoczny h1, zdanie wstępu). Wcześniej h1 był `sr-only`;
            widoczny nagłówek czyta się tak samo dobrze dla klienta i dla
            wyszukiwarki, a strony sklepu nie odstają od siebie */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 md:pt-12">
          <ClayRule className="mb-6" />
          <h1 className="font-serif text-3xl md:text-4xl text-espresso mb-4">Sklep</h1>
          <p className="text-charcoal/80 leading-relaxed max-w-2xl">
            Ceramika użytkowa i dekoracyjna wykonana ręcznie w pracowni pod Gliwicami.
            Każdą sztukę formuję i szkliwię pojedynczo, więc dwie nigdy nie są
            identyczne – wybierz kategorię albo przejrzyj wszystko, co jest teraz dostępne.
          </p>
        </div>

        {/* Siatka produktów */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-16 md:pt-8 md:pb-16">
          <ProductGrid products={products} dbError={dbError} categories={dbCategories} quantityTeaser={quantityTeaser} freeShippingNote={freeShippingNote} />
        </div>
      </div>

      {/* Pływający przycisk zamówień indywidualnych */}
      <FloatingOrderButton />

      <Footer />
    </>
  );
}
