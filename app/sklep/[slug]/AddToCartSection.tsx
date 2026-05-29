"use client";

import { useState } from "react";
import { Check, ShoppingBag, Plus, Minus } from "lucide-react";
import { useCart } from "@/lib/cart";

type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  images: string[];
  stock: number;
};

export default function AddToCartSection({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);

  const cartItem = items.find((i) => i.id === product.id);
  const inCartQty = cartItem?.quantity ?? 0;
  const canAddMore = Math.max(0, product.stock - inCartQty);
  const atStockLimit = canAddMore === 0;

  function handleAddToCart() {
    addItem(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images[0] ?? "",
        stock: product.stock,
      },
      qty
    );
    setAdded(true);
    setQty(1);
    setTimeout(() => setAdded(false), 2000);
  }

  if (product.stock === 0) {
    return (
      <button
        disabled
        className="w-full flex items-center justify-center gap-3 text-sm tracking-widest uppercase py-5 bg-sand text-charcoal/40"
      >
        <ShoppingBag size={18} strokeWidth={1.5} />
        Wyprzedano
      </button>
    );
  }

  return (
    <>
      {!atStockLimit && (
        <div className="flex items-center gap-4 mb-4">
          <span className="text-xs tracking-widest uppercase text-charcoal/80">Ilość</span>
          <div className="flex items-center border border-sand">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="w-10 h-10 flex items-center justify-center text-charcoal hover:text-clay disabled:text-sand transition-colors"
            >
              <Minus size={14} strokeWidth={1.5} />
            </button>
            <span className="w-10 text-center text-sm font-medium text-espresso">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(q + 1, canAddMore))}
              disabled={qty >= canAddMore}
              className="w-10 h-10 flex items-center justify-center text-charcoal hover:text-clay disabled:text-sand transition-colors"
            >
              <Plus size={14} strokeWidth={1.5} />
            </button>
          </div>
          {inCartQty > 0 && (
            <span className="text-xs text-charcoal/50">w koszyku: {inCartQty}</span>
          )}
        </div>
      )}

      <button
        onClick={handleAddToCart}
        disabled={atStockLimit}
        className={`w-full flex items-center justify-center gap-3 text-sm tracking-widest uppercase py-5 transition-all duration-300 ${
          added
            ? "bg-green-600 text-white"
            : "bg-clay hover:bg-terracotta disabled:bg-sand disabled:text-charcoal/40 text-warm-white"
        }`}
      >
        {added ? (
          <>
            <Check size={18} strokeWidth={2} />
            Dodano do koszyka
          </>
        ) : (
          <>
            <ShoppingBag size={18} strokeWidth={1.5} />
            {atStockLimit ? "Maks. ilość w koszyku" : "Dodaj do koszyka"}
          </>
        )}
      </button>
    </>
  );
}
