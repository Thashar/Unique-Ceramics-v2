export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, ShoppingBag } from "lucide-react";

export default async function AdminProductsPage() {
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-espresso">Produkty</h1>
        <Link
          href="/admin/produkty/nowy"
          className="flex items-center gap-2 bg-terracotta hover:bg-clay text-warm-white text-xs tracking-widest uppercase px-4 py-2.5 transition-colors"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Dodaj produkt</span>
          <span className="sm:hidden">Dodaj</span>
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-cream text-center py-16 text-charcoal/50">
          <ShoppingBag size={40} strokeWidth={1} className="mx-auto mb-4 text-sand" />
          <p>Brak produktów. <Link href="/admin/produkty/nowy" className="text-clay hover:underline">Dodaj pierwszy</Link></p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Nagłówek — tylko desktop */}
          <div className="hidden md:grid md:grid-cols-[auto_1fr_auto_auto_auto] text-xs tracking-widest uppercase text-charcoal/50 bg-cream px-4 py-3 border-b border-sand">
            <span className="w-16">Zdjęcie</span>
            <span>Nazwa</span>
            <span className="w-24 text-right">Cena</span>
            <span className="w-20 text-center">Stan</span>
            <span className="w-20 text-right">Akcje</span>
          </div>

          {products.map((product) => (
            <div key={product.id} className="bg-cream hover:bg-warm-white transition-colors border-b border-sand last:border-0">

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
                  <p className="text-sm font-medium text-espresso truncate">{product.name}</p>
                  <p className="text-xs text-charcoal/50">{product.category}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[10px] tracking-widest uppercase px-1.5 py-0.5 ${
                      !product.active ? "bg-red-100 text-red-600" :
                      product.stock === 0 ? "bg-sand text-charcoal/50" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {!product.active ? "Ukryty" : product.stock === 0 ? "Brak" : `${product.stock} szt.`}
                    </span>
                    <span className="text-sm text-espresso">{product.price.toFixed(2).replace(".", ",")} zł</span>
                  </div>
                </div>
                <Link href={`/admin/produkty/${product.id}`}
                  className="shrink-0 p-2 text-clay hover:text-espresso transition-colors">
                  <Pencil size={16} />
                </Link>
              </div>

              {/* Desktop */}
              <div className="hidden md:grid md:grid-cols-[auto_1fr_auto_auto_auto] items-center px-4 py-3">
                <div className="w-16 h-14 bg-warm-white relative overflow-hidden mr-4">
                  {product.images[0] ? (
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={16} strokeWidth={1} className="text-sand" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-espresso">{product.name}</p>
                  <p className="text-xs text-charcoal/50">{product.category}</p>
                </div>
                <div className="w-24 text-right text-sm text-espresso">
                  {product.price.toFixed(2).replace(".", ",")} zł
                </div>
                <div className="w-20 text-center">
                  <span className={`text-[10px] tracking-widest uppercase px-2 py-1 ${
                    !product.active ? "bg-red-100 text-red-600" :
                    product.stock === 0 ? "bg-sand text-charcoal/50" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {!product.active ? "Ukryty" : product.stock === 0 ? "Brak" : `${product.stock} szt.`}
                  </span>
                </div>
                <div className="w-20 text-right">
                  <Link href={`/admin/produkty/${product.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-clay hover:text-espresso transition-colors">
                    <Pencil size={13} />
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
