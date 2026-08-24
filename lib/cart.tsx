"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  /** Cena do zapłaty za sztukę – już po rabacie produktowym. */
  price: number;
  /** Cena podstawowa (sprzed rabatu produktowego) – tylko do pokazania upustu. */
  basePrice?: number;
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
      // Starsze wpisy w localStorage nie mają ceny podstawowej – wtedy koszyk
      // pokazuje sam rabat za wielosztuki, tak jak przed tą zmianą
      ...(Number.isFinite(Number(item.basePrice)) && Number(item.basePrice) > 0
        ? { basePrice: Number(item.basePrice) }
        : {}),
      image:    String(item.image ?? ""),
      quantity: Number(item.quantity ?? 1),
      // Stare wpisy w localStorage nie mają stock – defaultujemy do dużej liczby
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
  // Pierwsza subskrypcja po hydratacji – React sam wykryje zmianę snapshotu
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

/** Świeże dane produktu z serwera – kształt odpowiedzi `/api/cart/prices`. */
export type CartPriceUpdate = {
  id: string;
  name?: string;
  price: number;
  basePrice?: number;
  stock: number;
};

/**
 * Wyrównuje koszyk do cen i stanów z serwera.
 *
 * Koszyk zapisuje cenę z chwili dodania produktu, a rabat produktowy ma własne
 * okno czasu – bez tej synchronizacji klient widziałby cenę, której
 * `/api/checkout` już nie policzy, i płacił inną kwotę, niż zobaczył.
 * Produkty, których serwer nie zna (usunięte) albo które zeszły do zera sztuk,
 * z koszyka wypadają. Zwraca `true`, gdy cokolwiek się zmieniło.
 */
function syncPricesInStore(updates: CartPriceUpdate[]): boolean {
  if (!loaded || items.length === 0) return false;
  const map = new Map(updates.map((u) => [u.id, u]));
  let changed = false;

  const next: CartItem[] = [];
  for (const item of items) {
    const fresh = map.get(item.id);
    // Brak produktu w odpowiedzi = nie ma go już w sprzedaży
    if (!fresh || fresh.stock < 1) {
      changed = true;
      continue;
    }
    const quantity = Math.min(item.quantity, fresh.stock);
    const basePrice =
      typeof fresh.basePrice === "number" && Number.isFinite(fresh.basePrice)
        ? fresh.basePrice
        : item.basePrice;
    if (
      fresh.price !== item.price ||
      fresh.stock !== item.stock ||
      quantity !== item.quantity ||
      basePrice !== item.basePrice ||
      (fresh.name && fresh.name !== item.name)
    ) {
      changed = true;
    }
    next.push({
      ...item,
      name: fresh.name || item.name,
      price: fresh.price,
      ...(typeof basePrice === "number" ? { basePrice } : {}),
      stock: fresh.stock,
      quantity,
    });
  }

  if (changed) setItems(next);
  return changed;
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
  const syncPrices = useCallback(
    (updates: CartPriceUpdate[]) => syncPricesInStore(updates),
    []
  );

  const count = current.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = current.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    items: current,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    syncPrices,
    count,
    subtotal,
  };
}

/**
 * Odświeża ceny koszyka z serwera raz po wejściu na stronę.
 *
 * Bez tego klient ogląda cenę zapamiętaną w chwili dodania produktu – po
 * wygaśnięciu przeceny rozjeżdża się ona z kwotą, którą policzy `/api/checkout`.
 * Zwraca `true`, gdy coś się zmieniło, żeby strona mogła o tym uprzedzić.
 *
 * Błąd sieci celowo przechodzi bez śladu: kwoty i tak weryfikuje serwer przy
 * składaniu zamówienia, a straszenie komunikatem przy chwilowym braku sieci
 * tylko blokowałoby zakupy.
 */
export function useCartPriceSync(): boolean {
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ids = getSnapshot().map((i) => i.id);
    if (ids.length === 0) return;

    fetch("/api/cart/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: ids }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.products) return;
        if (syncPricesInStore(data.products)) setChanged(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return changed;
}
