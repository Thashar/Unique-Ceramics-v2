// Czysta logika koszyka: wyrównanie do stanu z serwera i scalanie z koszykiem
// zapisanym na koncie.
//
// Moduł jest neutralny (same funkcje, bez Reacta i bez bazy), bo obie operacje
// decydują o tym, co klient zobaczy i kupi – i obie mają przypadki brzegowe,
// które łatwo zepsuć: wyprzedany produkt musi **zniknąć z koszyka i zostać
// nazwany** w komunikacie, a scalanie po zalogowaniu nie może zsumować tego
// samego koszyka dwa razy.

/** Pozycja koszyka – ten sam kształt co `CartItem` w `lib/cart.tsx`. */
export type SyncCartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  basePrice?: number;
  image: string;
  quantity: number;
  stock: number;
};

/** Świeże dane produktu z serwera – kształt odpowiedzi `/api/cart/prices`. */
export type CartPriceUpdate = {
  id: string;
  name?: string;
  price: number;
  basePrice?: number;
  stock: number;
};

export type CartSyncResult = {
  items: SyncCartItem[];
  /** Czy cokolwiek się zmieniło – jeśli nie, nie ruszamy store'u ani localStorage. */
  changed: boolean;
  /** Pozycje, które wypadły z koszyka (wyprzedane albo wycofane ze sprzedaży). */
  soldOut: string[];
  /** Pozycje, w których zmniejszyliśmy ilość do dostępnego stanu. */
  reduced: { name: string; quantity: number }[];
  /** Czy zmieniła się którakolwiek cena. */
  priceChanged: boolean;
};

/**
 * Wyrównuje koszyk do cen i stanów z serwera.
 *
 * Koszyk zapisuje cenę z chwili dodania produktu, a rabat produktowy ma własne
 * okno czasu – bez tej synchronizacji klient widziałby cenę, której
 * `/api/checkout` już nie policzy, i płacił inną kwotę, niż zobaczył.
 *
 * Produkt, którego serwer nie zna (usunięty), wycofany ze sprzedaży albo z zerowym
 * stanem, **wypada z koszyka** i trafia na listę `soldOut` – dzięki temu sklep może
 * powiedzieć klientowi, **co dokładnie** zniknęło, zamiast po cichu zmienić sumę.
 */
export function syncCartWithServer(
  items: SyncCartItem[],
  updates: CartPriceUpdate[]
): CartSyncResult {
  const map = new Map(updates.map((u) => [u.id, u]));
  const next: SyncCartItem[] = [];
  const soldOut: string[] = [];
  const reduced: { name: string; quantity: number }[] = [];
  let changed = false;
  let priceChanged = false;

  for (const item of items) {
    const fresh = map.get(item.id);
    if (!fresh || fresh.stock < 1) {
      soldOut.push(item.name);
      changed = true;
      continue;
    }

    const quantity = Math.min(item.quantity, fresh.stock);
    if (quantity < item.quantity) {
      reduced.push({ name: fresh.name || item.name, quantity });
    }

    const basePrice =
      typeof fresh.basePrice === "number" && Number.isFinite(fresh.basePrice)
        ? fresh.basePrice
        : item.basePrice;

    if (fresh.price !== item.price) {
      priceChanged = true;
      changed = true;
    }
    if (
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

  return { items: next, changed, soldOut, reduced, priceChanged };
}

/**
 * Scala koszyk z urządzenia z koszykiem zapisanym na koncie (po zalogowaniu).
 *
 * Ilości **bierzemy większą z dwóch, nie sumujemy** – ten sam koszyk bywa
 * zapisany po obu stronach (klient dodał produkt, zalogował się, wrócił),
 * a sumowanie podwajałoby go przy każdym logowaniu. Ilość jest przycinana do
 * znanego stanu magazynowego; twardą weryfikację i tak robi serwer.
 *
 * Dane pozycji (nazwa, cena, zdjęcie) bierzemy z koszyka **lokalnego**, gdy
 * pozycja jest w obu – jest świeższy, bo powstał w tej sesji.
 */
export function mergeCarts(
  local: SyncCartItem[],
  saved: SyncCartItem[]
): SyncCartItem[] {
  const merged = new Map<string, SyncCartItem>();

  for (const item of saved) {
    if (item.id) merged.set(item.id, { ...item });
  }

  for (const item of local) {
    if (!item.id) continue;
    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, { ...item });
      continue;
    }
    const stock = Math.max(item.stock, existing.stock);
    merged.set(item.id, {
      ...existing,
      ...item,
      stock,
      quantity: Math.min(Math.max(item.quantity, existing.quantity), stock),
    });
  }

  return [...merged.values()].filter((i) => i.quantity > 0);
}

/** Komunikat o wyprzedanych pozycjach – jeden dla dowolnej ich liczby. */
export function soldOutMessage(names: string[]): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) {
    return `„${names[0]}” został sprzedany, zanim dokończyłeś zakupy – usunęliśmy go z koszyka.`;
  }
  return `Te produkty zostały sprzedane i zniknęły z koszyka: ${names
    .map((n) => `„${n}”`)
    .join(", ")}.`;
}

/** Komunikat o zmniejszonych ilościach. */
export function reducedMessage(
  reduced: { name: string; quantity: number }[]
): string | null {
  if (reduced.length === 0) return null;
  return reduced
    .map((r) => `Zostało tylko ${r.quantity} szt. produktu „${r.name}” – tyle jest w koszyku.`)
    .join(" ");
}
