"use client";

import { useCallback, useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
};

const STORAGE_KEY = "uc-cart";

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

// ── Store modułowy (localStorage) czytany przez useSyncExternalStore ─────────
// Koszyk żyje poza Reactem; komponenty subskrybują zmiany. Dzięki temu
// hydratacja z localStorage nie wymaga setState w useEffect.

const EMPTY: CartItem[] = [];
let items: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) items = normalize(JSON.parse(stored));
  } catch {}
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function setItems(next: CartItem[]) {
  items = next;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  // Pierwsza subskrypcja po hydratacji — React sam wykryje zmianę snapshotu
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CartItem[] {
  return items;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function addItemToStore(item: Omit<CartItem, "quantity">, quantity = 1) {
  const qty = Math.max(1, quantity);
  const existing = items.find((i) => i.id === item.id);
  if (existing) {
    const newQty = Math.min(existing.quantity + qty, item.stock);
    if (newQty === existing.quantity) return;
    setItems(
      items.map((i) =>
        i.id === item.id ? { ...i, quantity: newQty, stock: item.stock } : i
      )
    );
    return;
  }
  if (item.stock < 1) return;
  setItems([...items, { ...item, quantity: Math.min(qty, item.stock) }]);
}

function removeItemFromStore(id: string) {
  setItems(items.filter((i) => i.id !== id));
}

function updateQuantityInStore(id: string, qty: number) {
  if (qty < 1) return;
  setItems(
    items.map((i) => (i.id !== id ? i : { ...i, quantity: Math.min(qty, i.stock) }))
  );
}

function clearCartStore() {
  setItems([]);
}

export function useCart() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => addItemToStore(item, quantity),
    []
  );
  const removeItem = useCallback((id: string) => removeItemFromStore(id), []);
  const updateQuantity = useCallback(
    (id: string, qty: number) => updateQuantityInStore(id, qty),
    []
  );
  const clearCart = useCallback(() => clearCartStore(), []);

  const count = current.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = current.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return { items: current, addItem, removeItem, updateQuantity, clearCart, count, subtotal };
}
