// Galeria zdjęć przy opisie (/o-mnie, /warsztaty) – wspólny format i parser.
// Ustawienie trzyma JSON: [{ "url": "/images/x.webp", "position": "50% 50%" }]

export type GalleryImage = { url: string; position: string };

export const GALLERY_MAX_IMAGES = 30;
export const GALLERY_DEFAULT_POSITION = "50% 50%";

/**
 * Zamienia JSON z ustawień na listę zdjęć. Gdy wartość jest pusta lub uszkodzona,
 * wraca do pojedynczego zdjęcia ze starych kluczy `*_content_image` – dzięki temu
 * strony działają bez migracji danych.
 */
export function parseGallery(
  json: string,
  legacyUrl = "",
  legacyPosition = GALLERY_DEFAULT_POSITION
): GalleryImage[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json || "[]");
  } catch {
    raw = null;
  }

  const images = Array.isArray(raw)
    ? raw
        .flatMap((entry): GalleryImage[] => {
          // Dopuszczamy też gołe stringi – wygodne przy ręcznej edycji w bazie
          if (typeof entry === "string") {
            const url = entry.trim();
            return url ? [{ url, position: GALLERY_DEFAULT_POSITION }] : [];
          }
          if (!entry || typeof entry !== "object") return [];
          const { url, position } = entry as { url?: unknown; position?: unknown };
          if (typeof url !== "string" || !url.trim()) return [];
          return [{
            url: url.trim(),
            position:
              typeof position === "string" && position.trim()
                ? position.trim()
                : GALLERY_DEFAULT_POSITION,
          }];
        })
        .slice(0, GALLERY_MAX_IMAGES)
    : [];

  if (images.length > 0) return images;
  return legacyUrl
    ? [{ url: legacyUrl, position: legacyPosition || GALLERY_DEFAULT_POSITION }]
    : [];
}

/** Pierwsze zdjęcie galerii – używane do synchronizacji starych kluczy `*_content_image`. */
export function galleryHead(json: string): GalleryImage {
  return parseGallery(json)[0] ?? { url: "", position: GALLERY_DEFAULT_POSITION };
}
