import Link from "next/link";
import { PenLine } from "lucide-react";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import { getCategories } from "@/lib/categories";
import { getShopProducts } from "@/lib/products";
import ProductGrid from "./ProductGrid";

export const metadata = {
  title: "Sklep",
  description:
    "Ręcznie robiona ceramika użytkowa i dekoracyjna. Miski, kubki, talerze, wazony — każdy przedmiot tworzony jest ręcznie z lokalnej gliny.",
  alternates: { canonical: "https://uniqueceramics.pl/sklep" },
  openGraph: {
    title: "Sklep — Unique Ceramics",
    description:
      "Ręcznie robiona ceramika użytkowa i dekoracyjna. Każdy przedmiot jest unikalny.",
    url: "https://uniqueceramics.pl/sklep",
    images: [
      {
        url: "/images/OpenGraph.webp",
        width: 1200,
        height: 630,
        alt: "Ceramika ręcznie robiona — sklep Unique Ceramics",
      },
    ],
  },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string }>;
}) {
  const { kategoria } = await searchParams;

  // Zapytania sekwencyjne — każde zwalnia połączenie przed kolejnym,
  // co chroni przed wyczerpaniem puli (Supabase: 15 połączeń w trybie sesji).
  const dbCategories = await getCategories();

  let products: Awaited<ReturnType<typeof getShopProducts>>["inStock"] = [];
  let dbError = false;
  try {
    const { inStock, soldOut } = await getShopProducts();
    const filterFn =
      kategoria && kategoria !== "wszystkie"
        ? (p: (typeof inStock)[0]) => p.category === kategoria
        : () => true;
    products = [...inStock.filter(filterFn), ...soldOut.filter(filterFn)];
  } catch (e) {
    dbError = true;
    console.error("DB error in /sklep:", e);
  }

  const CATEGORIES = [
    { value: "wszystkie", label: "Wszystkie" },
    ...dbCategories.map((c) => ({ value: c.slug, label: c.label })),
  ];

  const activeCategory = kategoria ?? "wszystkie";

  return (
    <>
      <Header />
      <div className="min-h-[100svh] bg-warm-white pt-[100px]">
        <h1 className="sr-only">Sklep ceramiczny — ręcznie robiona ceramika Gliwice</h1>
        {/* Filtry kategorii */}
        <div className="border-b border-sand bg-cream sticky top-[100px] z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 flex gap-2 overflow-x-auto py-4 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={cat.value === "wszystkie" ? "/sklep" : `/sklep?kategoria=${cat.value}`}
                className={`shrink-0 px-5 py-2 text-xs tracking-widest uppercase transition-all duration-200 ${
                  activeCategory === cat.value
                    ? "bg-espresso text-warm-white"
                    : "bg-cream text-charcoal border border-terracotta/40 hover:border-terracotta/70"
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Siatka produktów */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 pb-16 md:py-16">
          <ProductGrid products={products} kategoria={kategoria} dbError={dbError} />
        </div>
      </div>

      {/* Pływający przycisk zamówień indywidualnych */}
      <Link
        href="/zamowienie-indywidualne"
        className="fixed bottom-6 right-5 z-40 flex items-center gap-2 bg-espresso hover:bg-clay text-cream text-[11px] tracking-widest uppercase px-4 py-3 shadow-md hover:shadow-lg transition-colors duration-200"
      >
        <PenLine size={13} strokeWidth={1.5} />
        <span>Zamów indywidualnie</span>
      </Link>

      <Footer />
    </>
  );
}
