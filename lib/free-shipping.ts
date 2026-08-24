// Promocja „Darmowa wysyłka” – z oknem czasu, zarządzana jak kody rabatowe.
//
// Zastąpiła stałe ustawienia `shipping_free_enabled` / `shipping_free_from`,
// które dawały tylko jeden bezterminowy próg. Teraz to samo da się włączyć na
// weekend, na okres świąteczny albo bezterminowo – i osobno dla kuriera
// i paczkomatu.
//
// **Odbiór osobisty jest bezpłatny zawsze**, niezależnie od promocji – tego
// modułu nawet nie pytamy (patrz `shippingFor` w `lib/discount-code.ts`).
//
// Moduł jest neutralny (same funkcje, bez bazy) – używa go serwer, panel
// i komponenty klienckie.

import { isWithinWindow } from "@/lib/product-price";

export type ShippingMethodName = "courier" | "parcel_locker";

export const SHIPPING_METHOD_NAMES: ShippingMethodName[] = ["courier", "parcel_locker"];

export const SHIPPING_METHOD_LABEL: Record<ShippingMethodName, string> = {
  courier: "Kurier",
  parcel_locker: "Paczkomat InPost",
};

export type FreeShippingConfig = {
  name: string;
  active: boolean;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  /** Próg wartości koszyka; 0 = darmowa wysyłka niezależnie od kwoty. */
  minOrderValue: number;
  methods: string[];
};

/** Kwoty są typu Float – każdy wynik zaokrąglamy do groszy (patrz CLAUDE.md). */
const money = (value: number): number => Math.round(value * 100) / 100;

/** Promocja obowiązująca w tej chwili – `null`, gdy wyłączona albo poza oknem. */
export function activeFreeShipping<T extends FreeShippingConfig>(
  promo: T | null | undefined,
  { now, holdMs = 0 }: { now?: Date; holdMs?: number } = {}
): T | null {
  if (!promo || !promo.active) return null;
  if (normalizeMethods(promo.methods).length === 0) return null;
  return isWithinWindow(promo.startsAt, promo.endsAt, { now, holdMs }) ? promo : null;
}

/** Metody sprowadzone do znanych wartości (nieznane odpadają). */
export function normalizeMethods(raw: unknown): ShippingMethodName[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<ShippingMethodName>();
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const value = entry.trim() as ShippingMethodName;
    if (SHIPPING_METHOD_NAMES.includes(value)) out.add(value);
  }
  return SHIPPING_METHOD_NAMES.filter((m) => out.has(m));
}

/**
 * Czy przy tej metodzie i wartości koszyka wysyłka jest darmowa.
 *
 * `itemsTotal` to wartość koszyka **po wszystkich rabatach** – tak samo, jak
 * liczył to poprzedni próg z ustawień; klient nie może odblokować darmowej
 * wysyłki kwotą, której realnie nie zapłacił.
 */
export function isShippingFree(
  promo: FreeShippingConfig | null,
  method: string,
  itemsTotal: number
): boolean {
  if (!promo) return false;
  if (!normalizeMethods(promo.methods).includes(method as ShippingMethodName)) return false;
  return itemsTotal >= money(promo.minOrderValue);
}

/** Ile brakuje do darmowej wysyłki (0 = już przysługuje albo promocji nie ma). */
export function freeShippingMissing(
  promo: FreeShippingConfig | null,
  method: string,
  itemsTotal: number
): number {
  if (!promo) return 0;
  if (!normalizeMethods(promo.methods).includes(method as ShippingMethodName)) return 0;
  return Math.max(0, money(promo.minOrderValue - itemsTotal));
}

// ── Walidacja danych z panelu ────────────────────────────────────────────────

export type ValidFreeShippingPromo = {
  name: string;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  minOrderValue: number;
  methods: ShippingMethodName[];
};

const INVALID_DATE = Symbol("invalid-date");

function parseDateField(value: unknown): Date | null | typeof INVALID_DATE {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? INVALID_DATE : value;
  if (typeof value !== "string") return INVALID_DATE;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? INVALID_DATE : date;
}

export function validateFreeShippingPromo(
  body: unknown
): { ok: true; data: ValidFreeShippingPromo } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Nieprawidłowe dane promocji." };
  }
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name || name.length > 100) {
    return { ok: false, error: "Nazwa promocji jest wymagana (maks. 100 znaków)." };
  }

  const methods = normalizeMethods(b.methods);
  if (methods.length === 0) {
    return { ok: false, error: "Wybierz co najmniej jedną metodę wysyłki." };
  }

  // Zero jest poprawne – oznacza darmową wysyłkę bez progu
  const rawValue = b.minOrderValue;
  const minOrderValue = rawValue == null || rawValue === "" ? 0 : Number(rawValue);
  if (!Number.isFinite(minOrderValue) || minOrderValue < 0) {
    return { ok: false, error: "Próg darmowej wysyłki musi być liczbą ≥ 0." };
  }

  const startsRaw = parseDateField(b.startsAt);
  if (startsRaw === INVALID_DATE) {
    return { ok: false, error: "Nieprawidłowa data rozpoczęcia." };
  }
  const endsRaw = parseDateField(b.endsAt);
  if (endsRaw === INVALID_DATE) {
    return { ok: false, error: "Nieprawidłowa data zakończenia." };
  }
  if (startsRaw && endsRaw && endsRaw.getTime() <= startsRaw.getTime()) {
    return { ok: false, error: "Koniec musi być późniejszy niż początek." };
  }

  return {
    ok: true,
    data: {
      name,
      active: b.active !== false,
      startsAt: startsRaw,
      endsAt: endsRaw,
      minOrderValue: money(minOrderValue),
      methods,
    },
  };
}
