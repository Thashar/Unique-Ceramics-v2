// Walidacja danych projektu portfolio (POST/PUT). Treść trafia na publiczną
// stronę, więc walidujemy defensywnie typy, długości i tablicę zdjęć.

const MAX_IMAGES = 30;
const MAX_IMAGE_LEN = 1000;

export type ValidProject = {
  title: string;
  description: string;
  images: string[];
  order: number;
  active: boolean;
};

export function validateProjectInput(
  body: unknown
): { ok: true; data: ValidProject } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Nieprawidłowe dane projektu." };
  }
  const b = body as Record<string, unknown>;

  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title || title.length > 200) {
    return { ok: false, error: "Tytuł jest wymagany (maks. 200 znaków)." };
  }

  if (b.description != null && typeof b.description !== "string") {
    return { ok: false, error: "Nieprawidłowy opis." };
  }
  const description = typeof b.description === "string" ? b.description.slice(0, 20_000) : "";

  const imagesRaw = b.images ?? [];
  if (!Array.isArray(imagesRaw)) {
    return { ok: false, error: "Pole obrazów ma nieprawidłowy format." };
  }
  if (imagesRaw.length > MAX_IMAGES) {
    return { ok: false, error: `Maksymalnie ${MAX_IMAGES} zdjęć w projekcie.` };
  }
  const images: string[] = [];
  for (const img of imagesRaw) {
    if (typeof img !== "string" || !img.trim() || img.length > MAX_IMAGE_LEN) {
      return { ok: false, error: "Nieprawidłowy adres zdjęcia." };
    }
    images.push(img.trim());
  }

  const orderNum = Number(b.order);
  const order = Number.isFinite(orderNum) ? Math.trunc(orderNum) : 0;

  return {
    ok: true,
    data: { title, description, images, order, active: b.active == null ? true : Boolean(b.active) },
  };
}
