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
      className="bg-warm-white overflow-hidden flex flex-col pt-20"
      style={{ height: "100svh" }}
      data-snap
    >
      {/* Treść wyśrodkowana w obszarze poniżej headera */}
      <div className="flex-1 flex flex-col justify-center px-6 lg:px-10 pb-10 lg:pb-14">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 lg:mb-12">
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

          {/* Na mobile pokazujemy tylko 2 karty (1 rząd), na desktop 4 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {products.map((product, i) => (
              <div key={product.id} className={i >= 2 ? "hidden lg:block" : ""}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
