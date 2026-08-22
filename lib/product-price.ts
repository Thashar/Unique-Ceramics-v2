// Rabat procentowy ustawiany na pojedynczym produkcie (pole `discountPercent`).
//
// Rabat schodzi z **ceny bazowej** produktu i dopiero na tak policzoną cenę
// nakłada się promocja „Wielosztuki" (narzut na wysyłkę i rabat koszykowy) –
// dzięki temu obie promocje się sumują, a nie wykluczają.
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
