import { db } from "@/lib/db";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/ui/ProductCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sklep | Unique Ceramics",
  description: "Ręcznie robiona ceramika użytkowa i dekoracyjna. Miski, kubki, talerze, wazony.",
};

const CATEGORIES = [
  { value: "wszystkie", label: "Wszystkie" },
  { value: "kubki",     label: "Kubki" },
  { value: "miski",     label: "Miski" },
  { value: "wazy",      label: "Wazy" },
  { value: "talerze",   label: "Talerze" },
  { value: "inne",      label: "Inne" },
];

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string }>;
}) {
  const { kategoria } = await searchParams;

  let products: Awaited<ReturnType<typeof db.product.findMany>> = [];
  let dbError: string | null = null;
  try {
    const filterByCategory = kategoria && kategoria !== "wszystkie"
      ? { category: kategoria }
      : {};

    // Dostępne produkty — filtrowane wg kategorii
    const inStock = await db.product.findMany({
      where: { active: true, stock: { gt: 0 }, ...filterByCategory },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });

    // Wyprzedane — zawsze z całego sklepu, doklejone na końcu każdego widoku
    const soldOut = await db.product.findMany({
      where: { active: true, stock: { lte: 0 } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });

    products = [...inStock, ...soldOut];
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
    console.error("DB error in /sklep:", e);
  }

  const activeCategory = kategoria ?? "wszystkie";

  return (
    <>
      <Header />
      <div className="min-h-[100svh] bg-warm-white pt-20">
        {/* Hero nagłówek */}
        <div className="bg-cream py-20 px-6 text-center border-b border-sand">
          <p className="text-xs tracking-[0.3em] uppercase text-clay mb-4">Kolekcja</p>
          <h1 className="font-serif text-5xl md:text-6xl text-espresso">Sklep</h1>
          <p className="mt-4 text-charcoal/55 max-w-md mx-auto text-sm">
            Każdy przedmiot jest unikalny — tworzony ręcznie z lokalnej gliny.
          </p>
        </div>

        {/* Filtry kategorii */}
        <div className="border-b border-sand bg-warm-white sticky top-20 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 flex gap-2 overflow-x-auto py-4 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={cat.value === "wszystkie" ? "/sklep" : `/sklep?kategoria=${cat.value}`}
                className={`shrink-0 px-5 py-2 text-xs tracking-widest uppercase transition-all duration-200 ${
                  activeCategory === cat.value
                    ? "bg-espresso text-warm-white"
                    : "bg-cream text-charcoal hover:bg-sand border border-transparent hover:border-sand"
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Siatka produktów */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
          {dbError ? (
            <div className="text-center py-24">
              <ShoppingBag size={48} strokeWidth={1} className="mx-auto text-sand mb-6" />
              <p className="font-serif text-2xl text-espresso mb-2">Błąd połączenia z bazą</p>
              <p className="text-charcoal/50 text-xs font-mono mt-2 max-w-lg mx-auto break-all">{dbError}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24">
              <ShoppingBag size={48} strokeWidth={1} className="mx-auto text-sand mb-6" />
              <p className="font-serif text-2xl text-espresso mb-2">Brak produktów</p>
              <p className="text-charcoal/50 text-sm">
                {kategoria ? "Brak produktów w tej kategorii." : "Sklep jest w przygotowaniu."}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-charcoal/40 tracking-widest uppercase mb-8">
                {products.length} {products.length === 1 ? "produkt" : products.length < 5 ? "produkty" : "produktów"}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
