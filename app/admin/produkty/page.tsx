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
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl text-espresso">Produkty</h1>
        <Link
          href="/admin/produkty/nowy"
          className="flex items-center gap-2 bg-terracotta hover:bg-clay text-warm-white text-xs tracking-widest uppercase px-5 py-3 transition-colors"
        >
          <Plus size={15} />
          Dodaj produkt
        </Link>
      </div>

      <div className="bg-cream">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 text-xs tracking-widest uppercase text-charcoal/50 px-4 py-3 border-b border-sand">
          <span className="w-16">Zdjęcie</span>
          <span>Nazwa</span>
          <span className="w-24 text-right">Cena</span>
          <span className="w-20 text-center">Stan</span>
          <span className="w-20 text-right">Akcje</span>
        </div>
        {products.length === 0 ? (
          <div className="text-center py-16 text-charcoal/50">
            <ShoppingBag size={40} strokeWidth={1} className="mx-auto mb-4 text-sand" />
            <p>Brak produktów. <Link href="/admin/produkty/nowy" className="text-clay hover:underline">Dodaj pierwszy</Link></p>
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id}
              className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 items-center px-4 py-3 border-b border-sand hover:bg-warm-white transition-colors">
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
          ))
        )}
      </div>
    </div>
  );
}
