// Rabat procentowy ustawiany na pojedynczym produkcie (pola `discountPercent`,
// `discountStartsAt`, `discountEndsAt`).
//
// Rabat schodzi z **ceny bazowej** produktu i dopiero na tak policzoną cenę
// nakłada się promocja „Wielosztuki" (narzut na wysyłkę i rabat koszykowy) –
// dzięki temu obie promocje się sumują, a nie wykluczają.
//
// Rabat może obowiązywać w wyznaczonym oknie czasu (panel ustawia je w czasie
// polskim, w bazie leży UTC). Poza oknem produkt sprzedaje się w cenie
// podstawowej – decyduje o tym `activeDiscountPercent`, a **nie** samo pole
// `discountPercent`, więc wszędzie, gdzie liczymy albo pokazujemy cenę,
// pytamy o rabat tą funkcją.
//
// Moduł jest neutralny (same funkcje) – używa go serwer, panel admina
// i komponenty klienckie.

/** Górna granica rabatu – 100% oznaczałoby produkt za darmo. */
export const MAX_DISCOUNT_PERCENT = 90;

/** Kwoty są typu Float – każdy wynik zaokrąglamy do groszy (patrz CLAUDE.md). */
const money = (value: number): number => Math.round(value * 100) / 100;

/** Rabat sprowadzony do liczby całkowitej z zakresu 0–90 (nieprawidłowe dane → 0). */
export function normalizeDiscountPercent(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, MAX_DISCOUNT_PERCENT);
}

/** Czy produkt jest przeceniony. */
export function hasProductDiscount(discountPercent?: number | null): boolean {
  return normalizeDiscountPercent(discountPercent) > 0;
}

/**
 * Cena po rabacie produktowym – **to ona jest ceną bazową** wszędzie dalej:
 * w koszyku, w promocji „Wielosztuki" i w kwotach liczonych przez `/api/checkout`.
 */
export function discountedPrice(price: number, discountPercent?: number | null): number {
  const percent = normalizeDiscountPercent(discountPercent);
  return percent > 0 ? money(price * (1 - percent / 100)) : money(price);
}

/**
 * Procent między dwiema **pokazywanymi** kwotami. Przy włączonej promocji
 * „Wielosztuki" obie ceny niosą ten sam narzut na wysyłkę, więc realna obniżka
 * jest niższa niż nominalny rabat (100 zł −20% przy narzucie 18 zł to 118 → 98,
 * czyli −17%). Klientowi pokazujemy procent policzony z tych kwot, żeby liczby
 * na karcie produktu się zgadzały.
 */
export function shownDiscountPercent(before: number, after: number): number {
  if (before <= 0 || after >= before) return 0;
  return Math.round(((before - after) / before) * 100);
}

/** Produkt w zakresie potrzebnym do rozstrzygnięcia rabatu (pola z bazy). */
export type DiscountWindow = {
  discountPercent?: number | null;
  discountStartsAt?: Date | string | null;
  discountEndsAt?: Date | string | null;
};

/**
 * Ile czasu wynik musi jeszcze być prawdziwy na stronach z cache'em.
 * Zapisany HTML bywa serwowany do końca okna rewalidacji, a nigdy nie chcemy
 * pokazać ceny niższej niż ta, którą policzy `/api/checkout`. Rabat kończący
 * się w trakcie okna pokazujemy więc jako już nieaktywny (klient zobaczy cenę
 * podstawową i najwyżej zapłaci mniej – nigdy więcej, niż widział).
 */
export const DISCOUNT_HOLD_CATALOG_MS = 60_000;      // /sklep i /sklep/[slug] – 60 s
export const DISCOUNT_HOLD_HOME_MS = 3_600_000;      // strona główna – ISR 3600 s

function timestamp(value: Date | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Rabat **obowiązujący w tej chwili** – 0, gdy produkt nie jest przeceniony
 * albo gdy okno rabatu jeszcze się nie zaczęło lub już minęło.
 *
 * `holdMs` (patrz stałe wyżej) przesuwa koniec okna: rabat wygasający w czasie
 * życia cache'u strony traktujemy jak nieaktywny.
 */
export function activeDiscountPercent(
  product: DiscountWindow,
  { now, holdMs = 0 }: { now?: Date; holdMs?: number } = {}
): number {
  const percent = normalizeDiscountPercent(product.discountPercent);
  if (percent === 0) return 0;
  return isWithinWindow(product.discountStartsAt, product.discountEndsAt, { now, holdMs })
    ? percent
    : 0;
}

/**
 * Czy dana chwila mieści się w oknie obowiązywania.
 *
 * Wspólne dla przecen produktów, kodów rabatowych i promocji (rabat ilościowy,
 * darmowa wysyłka) – wszystkie używają tej samej konwencji: `null` z którejkolwiek
 * strony oznacza brak ograniczenia, a `holdMs` przesuwa koniec okna dla stron
 * z cache'em (patrz stałe `DISCOUNT_HOLD_*`).
 */
export function isWithinWindow(
  startsAt: Date | string | null | undefined,
  endsAt: Date | string | null | undefined,
  { now, holdMs = 0 }: { now?: Date; holdMs?: number } = {}
): boolean {
  const nowMs = now?.getTime() ?? Date.now();
  const start = timestamp(startsAt);
  const end = timestamp(endsAt);

  if (start !== null && start > nowMs) return false;
  if (end !== null && end <= nowMs + Math.max(0, holdMs)) return false;
  return true;
}

/**
 * Stan okna obowiązywania – do opisów w panelu (rabat ilościowy, darmowa
 * wysyłka). Domyślne `now` liczone jest **wewnątrz funkcji**, żeby komponenty
 * nie wołały `Date.now()` w trakcie renderu (reguła `react-hooks/purity`).
 */
export type WindowState = "scheduled" | "active" | "expired";

export function windowState(
  startsAt: Date | string | null | undefined,
  endsAt: Date | string | null | undefined,
  now: Date = new Date()
): WindowState {
  const nowMs = now.getTime();
  const start = timestamp(startsAt);
  const end = timestamp(endsAt);
  if (end !== null && end <= nowMs) return "expired";
  if (start !== null && start > nowMs) return "scheduled";
  return "active";
}

/** Stan rabatu – do opisów w panelu admina. */
export type DiscountState = "none" | "scheduled" | "active" | "expired";

export function discountState(product: DiscountWindow, now: Date = new Date()): DiscountState {
  if (normalizeDiscountPercent(product.discountPercent) === 0) return "none";
  const nowMs = now.getTime();
  const startsAt = timestamp(product.discountStartsAt);
  const endsAt = timestamp(product.discountEndsAt);
  if (endsAt !== null && endsAt <= nowMs) return "expired";
  if (startsAt !== null && startsAt > nowMs) return "scheduled";
  return "active";
}
