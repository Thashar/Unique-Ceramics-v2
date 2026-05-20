import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/ui/ProductCard";
import { products, categories } from "@/lib/data";

export const metadata: Metadata = {
  title: "Sklep",
  description: "Ręcznie robiona ceramika użytkowa i dekoracyjna. Miski, kubki, talerze, wazony.",
};

export default function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string }>;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 pt-20">
        {/* Nagłówek */}
        <div className="bg-cream px-6 lg:px-10 py-20">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Kolekcja</p>
            <h1 className="font-serif text-5xl md:text-6xl text-espresso">Sklep</h1>
          </div>
        </div>

        {/* Filtry */}
        <div className="sticky top-20 z-40 bg-warm-white/95 backdrop-blur-md border-b border-sand">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex items-center gap-6 overflow-x-auto">
            <a
              href="/sklep"
              className="text-xs tracking-widest uppercase whitespace-nowrap text-clay border-b border-clay pb-0.5"
            >
              Wszystkie
            </a>
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`/sklep?kategoria=${cat.slug}`}
                className="text-xs tracking-widest uppercase whitespace-nowrap text-charcoal/60 hover:text-clay transition-colors"
              >
                {cat.name}
              </a>
            ))}
          </div>
        </div>

        {/* Siatka produktów */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
