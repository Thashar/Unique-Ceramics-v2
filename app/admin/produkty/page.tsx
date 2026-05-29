export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Plus, Pencil, ShoppingBag, Star } from "lucide-react";
import ProductsSearch from "@/components/admin/ProductsSearch";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kat?: string; status?: string }>;
}) {
  const { q, kat, status } = await searchParams;

  const products = await db.product.findMany({
    where: {
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(kat ? { category: kat } : {}),
      ...(status === "active" ? { active: true } : {}),
      ...(status === "inactive" ? { active: false } : {}),
      ...(status === "outofstock" ? { active: true, stock: 0 } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-espresso">Produkty</h1>
          <p className="text-sm text-charcoal/45 mt-0.5">{products.length} wyników</p>
        </div>
        <Link
          href="/admin/produkty/nowy"
          className="flex items-center gap-2 bg-clay hover:bg-terracotta text-warm-white text-xs tracking-widest uppercase px-4 py-2.5 transition-colors"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Dodaj produkt</span>
          <span className="sm:hidden">Dodaj</span>
        </Link>
      </div>

      <Suspense fallback={null}>
        <ProductsSearch />
      </Suspense>

      {products.length === 0 ? (
        <div className="bg-cream text-center py-16 text-charcoal/50">
          <ShoppingBag size={36} strokeWidth={1} className="mx-auto mb-4 text-sand" />
          <p className="text-sm">
            {q || kat || status
              ? "Brak produktów pasujących do filtrów."
              : <>Brak produktów. <Link href="/admin/produkty/nowy" className="text-clay hover:underline">Dodaj pierwszy</Link></>
            }
          </p>
        </div>
      ) : (
        <div className="bg-cream">
          {/* Nagłówek tabeli — tylko desktop */}
          <div className="hidden md:grid md:grid-cols-[72px_1fr_120px_96px_100px_72px] text-[11px] tracking-widest uppercase text-charcoal/45 px-4 py-3 border-b border-sand">
            <span>Zdjęcie</span>
            <span>Nazwa</span>
            <span className="text-right">Cena</span>
            <span className="text-center">Stan</span>
            <span className="text-center">Status</span>
            <span className="text-right">Akcja</span>
          </div>

          {products.map((product) => (
            <div key={product.id} className="border-b border-sand/60 last:border-0 hover:bg-warm-white transition-colors">

              {/* Mobile */}
              <div className="md:hidden flex items-center gap-3 px-4 py-3">
                <div className="w-14 h-14 bg-warm-white relative overflow-hidden shrink-0">
                  {product.images[0] ? (
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={16} strokeWidth={1} className="text-sand" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-espresso truncate">{product.name}</p>
                    {product.featured && <Star size={11} className="text-terracotta shrink-0 fill-terracotta" />}
                  </div>
                  <p className="text-xs text-charcoal/45 capitalize">{product.category}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-[10px] tracking-wide uppercase px-1.5 py-0.5 rounded-sm ${
                      !product.active
                        ? "bg-charcoal/8 text-charcoal/50"
                        : product.stock === 0
                        ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                        : "bg-green-50 text-green-700 ring-1 ring-green-200"
                    }`}>
                      {!product.active ? "Ukryty" : product.stock === 0 ? "Brak" : `${product.stock} szt.`}
                    </span>
                    <span className="text-sm text-espresso tabular-nums">
                      {product.price.toFixed(2).replace(".", ",")} zł
                    </span>
                  </div>
                </div>
                <Link href={`/admin/produkty/${product.id}`}
                  className="shrink-0 p-2 text-clay hover:text-espresso transition-colors">
                  <Pencil size={16} />
                </Link>
              </div>

              {/* Desktop */}
              <div className="hidden md:grid md:grid-cols-[72px_1fr_120px_96px_100px_72px] items-center px-4 py-3 gap-x-2">
                <div className="w-14 h-12 bg-warm-white relative overflow-hidden">
                  {product.images[0] ? (
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={14} strokeWidth={1} className="text-sand" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-espresso truncate">{product.name}</p>
                    {product.featured && <Star size={11} className="text-terracotta shrink-0 fill-terracotta" />}
                  </div>
                  <p className="text-xs text-charcoal/45 capitalize mt-0.5">{product.category}</p>
                </div>
                <div className="text-right text-sm text-espresso tabular-nums">
                  {product.price.toFixed(2).replace(".", ",")} zł
                </div>
                <div className="text-center text-sm text-espresso tabular-nums">
                  {product.stock}
                </div>
                <div className="text-center">
                  <span className={`text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-sm ${
                    !product.active
                      ? "bg-charcoal/8 text-charcoal/50"
                      : product.stock === 0
                      ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                      : "bg-green-50 text-green-700 ring-1 ring-green-200"
                  }`}>
                    {!product.active ? "Ukryty" : product.stock === 0 ? "Brak" : "Aktywny"}
                  </span>
                </div>
                <div className="text-right">
                  <Link
                    href={`/admin/produkty/${product.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-clay hover:text-espresso transition-colors"
                  >
                    <Pencil size={12} />
                    Edytuj
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
