import { ShoppingBag } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import type { getShopProducts } from "@/lib/products";

type Product = Awaited<ReturnType<typeof getShopProducts>>["inStock"][0];

interface Props {
  products: Product[];
  kategoria?: string;
  dbError: boolean;
}

export default function ProductGrid({ products, kategoria, dbError }: Props) {
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

  return (
    <>
      <p className="text-xs text-charcoal/40 tracking-widests uppercase mb-8">
        {products.length}{" "}
        {products.length === 1 ? "produkt" : products.length < 5 ? "produkty" : "produktów"}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}
