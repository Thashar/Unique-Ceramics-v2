// Wspólna walidacja danych produktu dla tras admina (POST/PUT).
// Granica zaufania to admin, ale walidujemy defensywnie: ujemna/NaN cena
// trafiłaby do checkoutu (kwoty liczone z ceny produktu), a nieprawidłowe
// `images`/`slug` na publiczne strony. Zwraca znormalizowane, bezpieczne dane.

import { MAX_DISCOUNT_PERCENT } from "@/lib/product-price";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MAX_PRICE = 1_000_000;
const MAX_STOCK = 1_000_000;
/** Limit zdjęć na produkt – używany też przez formularz w panelu admina. */
export const PRODUCT_MAX_IMAGES = 30;
const MAX_IMAGES = PRODUCT_MAX_IMAGES;
const MAX_IMAGE_LEN = 1000;

export type ValidProduct = {
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  featured: boolean;
  active: boolean;
  variesFromPhoto: boolean;
  discountPercent: number;
  /** Okno obowiązywania rabatu w UTC (null = bez ograniczenia). */
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
};

/** Znacznik nieprawidłowej daty – odróżnia błąd od „pola nie podano". */
const INVALID_DATE = Symbol("invalid-date");

/** Data z body: brak/pusty string → null, ISO → Date, śmieci → INVALID_DATE. */
function parseDateField(value: unknown): Date | null | typeof INVALID_DATE {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? INVALID_DATE : value;
  if (typeof value !== "string") return INVALID_DATE;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? INVALID_DATE : date;
}

export function validateProduct(
  body: unknown
): { ok: true; data: ValidProduct } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Nieprawidłowe dane produktu." };
  }
  const b = body as Record<string, unknown>;

  // Nazwa
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name || name.length > 200) {
    return { ok: false, error: "Nazwa jest wymagana (maks. 200 znaków)." };
  }

  // Slug
  const slug = typeof b.slug === "string" ? b.slug.trim().toLowerCase() : "";
  if (!slug || slug.length > 200 || !SLUG_RE.test(slug)) {
    return { ok: false, error: "Slug może zawierać tylko małe litery, cyfry i myślniki." };
  }

  // Opis (opcjonalny)
  const descRaw = b.description;
  if (descRaw != null && typeof descRaw !== "string") {
    return { ok: false, error: "Nieprawidłowy opis." };
  }
  const description = typeof descRaw === "string" ? descRaw.slice(0, 20_000) : "";

  // Cena
  const price = Number(b.price);
  if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) {
    return { ok: false, error: "Cena musi być liczbą z zakresu 0–1 000 000." };
  }

  // Stan magazynowy
  const stock = Number(b.stock);
  if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
    return { ok: false, error: "Stan magazynowy musi być liczbą całkowitą ≥ 0." };
  }

  // Rabat produktowy (opcjonalny, 0 = brak przeceny)
  const discountPercent = b.discountPercent == null || b.discountPercent === ""
    ? 0
    : Number(b.discountPercent);
  if (
    !Number.isInteger(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > MAX_DISCOUNT_PERCENT
  ) {
    return {
      ok: false,
      error: `Rabat musi być liczbą całkowitą z zakresu 0–${MAX_DISCOUNT_PERCENT}%.`,
    };
  }

  // Kategoria
  const category = typeof b.category === "string" ? b.category.trim() : "";
  if (!category || category.length > 100) {
    return { ok: false, error: "Kategoria jest wymagana." };
  }

  // Obrazy – tablica niepustych stringów
  if (!Array.isArray(b.images)) {
    return { ok: false, error: "Pole obrazów ma nieprawidłowy format." };
  }
  if (b.images.length > MAX_IMAGES) {
    return { ok: false, error: `Maksymalnie ${MAX_IMAGES} zdjęć na produkt.` };
  }
  const images: string[] = [];
  for (const img of b.images) {
    if (typeof img !== "string" || !img.trim() || img.length > MAX_IMAGE_LEN) {
      return { ok: false, error: "Nieprawidłowy adres zdjęcia." };
    }
    images.push(img.trim());
  }

  // Okno obowiązywania rabatu – formularz przysyła ISO (czas polski przeliczony
  // na UTC już po stronie panelu), więc tutaj sprawdzamy tylko sensowność dat
  const startsRaw = parseDateField(b.discountStartsAt);
  if (startsRaw === INVALID_DATE) {
    return { ok: false, error: "Nieprawidłowa data rozpoczęcia rabatu." };
  }
  const endsRaw = parseDateField(b.discountEndsAt);
  if (endsRaw === INVALID_DATE) {
    return { ok: false, error: "Nieprawidłowa data zakończenia rabatu." };
  }
  if (startsRaw && endsRaw && endsRaw.getTime() <= startsRaw.getTime()) {
    return { ok: false, error: "Koniec rabatu musi być późniejszy niż jego początek." };
  }
  // Bez rabatu daty nie mają znaczenia – czyścimy je, żeby po powrocie przeceny
  // nie odżyło stare okno
  const discountStartsAt = discountPercent > 0 ? startsRaw : null;
  const discountEndsAt = discountPercent > 0 ? endsRaw : null;

  return {
    ok: true,
    data: {
      name,
      slug,
      description,
      price: Math.round(price * 100) / 100,
      images,
      category,
      stock,
      featured: Boolean(b.featured),
      active: Boolean(b.active),
      variesFromPhoto: Boolean(b.variesFromPhoto),
      discountPercent,
      discountStartsAt,
      discountEndsAt,
    },
  };
}
