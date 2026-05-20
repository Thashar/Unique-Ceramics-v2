import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { featuredProducts } from "@/lib/data";
import ProductCard from "@/components/ui/ProductCard";

export default function FeaturedProducts() {
  return (
    <section className="py-28 px-6 lg:px-10 bg-warm-white">
      <div className="max-w-7xl mx-auto">
        {/* Nagłówek sekcji */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
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

        {/* Siatka produktów */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
