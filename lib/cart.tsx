"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextType | null>(null);

export const SHIPPING = 18;
export const FREE_SHIPPING_THRESHOLD = 300;

function normalize(raw: unknown[]): CartItem[] {
  return raw.map((i) => {
    const item = i as Record<string, unknown>;
    return {
      id:       String(item.id ?? ""),
      slug:     String(item.slug ?? ""),
      name:     String(item.name ?? ""),
      price:    Number(item.price ?? 0),
      image:    String(item.image ?? ""),
      quantity: Number(item.quantity ?? 1),
      // Stare wpisy w localStorage nie mają stock — defaultujemy do dużej liczby
      // żeby nie blokować działania istniejących koszyków
      stock:    typeof item.stock === "number" ? item.stock : 9999,
    };
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("uc-cart");
      if (stored) setItems(normalize(JSON.parse(stored)));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("uc-cart", JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        // Nie przekraczaj stanu magazynowego
        if (newQty > item.stock) return prev;
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, quantity: newQty, stock: item.stock }
            : i
        );
      }
      if (item.stock < 1) return prev;
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, qty: number) => {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        return { ...i, quantity: Math.min(qty, i.stock) };
      })
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, count, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
