import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import ProductCarousel from "@/components/home/ProductCarousel";
import DesktopCarousel from "@/components/home/DesktopCarousel";

export default async function FeaturedProducts() {
  let products: Awaited<ReturnType<typeof db.product.findMany>> = [];
  try {
    products = await db.product.findMany({
      where: { featured: true, active: true, stock: { gt: 0 } },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Baza niedostępna — sekcja nie wyświetla produktów
  }

  if (products.length === 0) return null;

  return (
    <section
      className="bg-warm-white overflow-hidden flex flex-col pt-14 md:pt-20"
      style={{ height: "100svh" }}
      data-snap
    >
      <div className="flex-1 flex flex-col justify-center pb-10 lg:pb-14">
        <div className="max-w-7xl mx-auto w-full px-6 lg:px-10">
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
        </div>

        {/* Mobile: karuzel z sinusoidalną animacją, wyśrodkowane karty */}
        <div className="lg:hidden">
          <ProductCarousel products={products} />
        </div>

        {/* Desktop: 4 kolumny, gdy >4 produktów — carousel z nawigacją */}
        <div className="hidden lg:block max-w-7xl mx-auto w-full px-16">
          <DesktopCarousel products={products} />
        </div>
      </div>
    </section>
  );
}
