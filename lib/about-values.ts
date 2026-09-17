/**
 * Sekcja „Jak pracuję” na stronie /o-mnie – karty z krótkimi hasłami.
 * Moduł neutralny (bez bazy i bez Reacta): korzysta z niego strona,
 * defaulty ustawień i edytor w panelu.
 */

export type AboutValue = {
  id: number;
  title: string;
  text: string;
};

/** Nagłówek sekcji; puste ustawienie ukrywa sam nagłówek, nie karty. */
export const ABOUT_VALUES_TITLE_DEFAULT = "Jak pracuję";

/** Treść, którą sekcja miała wpisaną w kodzie do 31.08.2026 – teraz tylko default. */
export const ABOUT_VALUES_DEFAULT: AboutValue[] = [
  { id: 1, title: "Ręcznie", text: "Każdy przedmiot tworzę osobiście. Nie korzystam z produkcji seryjnej ani odlewów." },
  { id: 2, title: "Z uwagą", text: "Dbam o każdy detal – od kształtu, przez glazurę, aż po opakowanie." },
  { id: 3, title: "Z pasją", text: "Ceramika to nie tylko zawód – to sposób, w jaki postrzegam i tworzę piękno." },
];

export const ABOUT_VALUES_DEFAULT_JSON = JSON.stringify(ABOUT_VALUES_DEFAULT);

/** Te same domyślne karty po angielsku – dla `/en/o-mnie`, dopóki panel nie ma własnych. */
export const ABOUT_VALUES_TITLE_DEFAULT_EN = "How I work";
export const ABOUT_VALUES_DEFAULT_EN: AboutValue[] = [
  { id: 1, title: "By hand", text: "I make every piece myself. No mass production, no casting." },
  { id: 2, title: "With care", text: "I pay attention to every detail – from the shape, through the glaze, to the packaging." },
  { id: 3, title: "With passion", text: "Ceramics is not just a job – it is the way I see and create beauty." },
];
export const ABOUT_VALUES_DEFAULT_EN_JSON = JSON.stringify(ABOUT_VALUES_DEFAULT_EN);

/** Więcej kart nie zmieściłoby się w siatce bez rozjeżdżania układu. */
export const MAX_ABOUT_VALUES = 6;

/**
 * Bezpieczny odczyt ustawienia `about_values`. Wpis bez tytułu i bez treści
 * jest pomijany – pusta tablica oznacza „ukryj całą sekcję”.
 */
export function parseAboutValues(json: string | null | undefined): AboutValue[] {
  if (!json) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  const out: AboutValue[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const v = item as Partial<AboutValue>;
    const title = typeof v.title === "string" ? v.title.trim() : "";
    const text = typeof v.text === "string" ? v.text.trim() : "";
    if (!title && !text) continue;
    out.push({ id: typeof v.id === "number" ? v.id : out.length + 1, title, text });
    if (out.length >= MAX_ABOUT_VALUES) break;
  }
  return out;
}
