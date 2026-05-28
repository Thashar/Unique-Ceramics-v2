import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import ProductCard from "@/components/ui/ProductCard";

export default async function FeaturedProducts() {
  let products: Awaited<ReturnType<typeof db.product.findMany>> = [];
  try {
    products = await db.product.findMany({
      where: { featured: true, active: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    });
  } catch {
    // Baza niedostępna — sekcja nie wyświetla produktów
  }

  if (products.length === 0) return null;

  return (
    <section
      className="px-6 lg:px-10 bg-warm-white flex flex-col justify-center py-16"
      style={{ scrollSnapAlign: "start", minHeight: "100svh" }}
    >
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Kolekcja</p>
            <h2 className="font-serif text-4xl md:text-5xl text-espresso leading-tight">
              Wybrane prace
            </h2>
          </div>
          <Link
            href="/sklep"
            className="inline-flex items-center gap-2 text-sm tracking-widest uppercase text-clay hover:text-espresso transition-colors group"
          >
            Cały sklep
            <ArrowRight
              size={15}
              className="group-hover:translate-x-1 transition-transform"
              strokeWidth={1.5}
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
