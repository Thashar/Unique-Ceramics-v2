"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, Grid3X3, ShoppingBag } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import type { getShopProducts } from "@/lib/products";

type Product = Awaited<ReturnType<typeof getShopProducts>>["inStock"][0];
type Layout = "standard" | "compact";

interface Props {
  products: Product[];
  kategoria?: string;
  dbError: boolean;
}

export default function ProductGrid({ products, kategoria, dbError }: Props) {
  const [layout, setLayout] = useState<Layout>("standard");

  useEffect(() => {
    const saved = localStorage.getItem("sklep-layout") as Layout | null;
    if (saved === "standard" || saved === "compact") setLayout(saved);
  }, []);

  function changeLayout(l: Layout) {
    setLayout(l);
    localStorage.setItem("sklep-layout", l);
  }

  if (dbError) {
    return (
      <div className="text-center py-24">
        <ShoppingBag size={48} strokeWidth={1} className="mx-auto text-sand mb-6" />
        <p className="font-serif text-2xl text-espresso mb-2">Sklep chwilowo niedostępny</p>
        <p className="text-charcoal/50 text-sm">Spróbuj ponownie za chwilę.</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-24">
        <ShoppingBag size={48} strokeWidth={1} className="mx-auto text-sand mb-6" />
        <p className="font-serif text-2xl text-espresso mb-2">Brak produktów</p>
        <p className="text-charcoal/50 text-sm">
          {kategoria ? "Brak produktów w tej kategorii." : "Sklep jest w przygotowaniu."}
        </p>
      </div>
    );
  }

  const compact = layout === "compact";

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <p className="text-xs text-charcoal/40 tracking-widest uppercase">
          {products.length}{" "}
          {products.length === 1 ? "produkt" : products.length < 5 ? "produkty" : "produktów"}
        </p>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => changeLayout("standard")}
            className={`p-1.5 transition-colors ${
              !compact ? "text-espresso" : "text-charcoal/30 hover:text-charcoal/60"
            }`}
            aria-label="Widok standardowy"
            title="Widok standardowy"
          >
            <LayoutGrid size={18} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => changeLayout("compact")}
            className={`p-1.5 transition-colors ${
              compact ? "text-espresso" : "text-charcoal/30 hover:text-charcoal/60"
            }`}
            aria-label="Widok kompaktowy"
            title="Widok kompaktowy"
          >
            <Grid3X3 size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div
        className={
          compact
            ? "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4"
            : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8"
        }
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} compact={compact} />
        ))}
      </div>
    </>
  );
}
