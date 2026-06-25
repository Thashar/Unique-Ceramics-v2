// Wspólna walidacja danych produktu dla tras admina (POST/PUT).
// Granica zaufania to admin, ale walidujemy defensywnie: ujemna/NaN cena
// trafiłaby do checkoutu (kwoty liczone z ceny produktu), a nieprawidłowe
// `images`/`slug` na publiczne strony. Zwraca znormalizowane, bezpieczne dane.

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MAX_PRICE = 1_000_000;
const MAX_STOCK = 1_000_000;
const MAX_IMAGES = 30;
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
};

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

  // Kategoria
  const category = typeof b.category === "string" ? b.category.trim() : "";
  if (!category || category.length > 100) {
    return { ok: false, error: "Kategoria jest wymagana." };
  }

  // Obrazy — tablica niepustych stringów
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
    },
  };
}
