// Kody rabatowe po stronie serwera: odczyt z bazy i walidacja danych z panelu.
//
// **Brak tabeli nie może wywrócić sklepu.** Migracja `manual_add_discount_codes.sql`
// jest uruchamiana ręcznie na Supabase, więc każdy odczyt jest w try/catch:
// gdy tabeli nie ma, kody po prostu nie działają (zamówienie liczy się jak
// dotąd), a panel pokazuje instrukcję zamiast listy.

import { db, withDbRetry } from "@/lib/db";
import {
  MAX_CODE_PERCENT,
  isValidCodeFormat,
  normalizeCode,
  activeCodePercent,
  codeHasEffect,
  isCodeActive,
  type DiscountCodeInfo,
} from "@/lib/discount-code";

export type DiscountCodeRow = {
  id: string;
  code: string;
  percent: number;
  freeShipping: boolean;
  active: boolean;
  stackable: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
};

/** Lista kodów do panelu; `available: false` = brak tabeli (patrz migracja). */
export async function listDiscountCodes(): Promise<{
  available: boolean;
  codes: DiscountCodeRow[];
}> {
  try {
    const codes = await withDbRetry(() =>
      db.discountCode.findMany({ orderBy: { createdAt: "desc" } })
    );
    return { available: true, codes };
  } catch (e) {
    console.error("[discount-codes] odczyt listy nieudany:", e);
    return { available: false, codes: [] };
  }
}

export async function getDiscountCode(id: string): Promise<DiscountCodeRow | null> {
  try {
    return await db.discountCode.findUnique({ where: { id } });
  } catch (e) {
    console.error("[discount-codes] odczyt kodu nieudany:", e);
    return null;
  }
}

/**
 * Kod obowiązujący w tej chwili – po nim liczymy kwoty. Zwraca `null`, gdy kodu
 * nie ma, jest wyłączony, poza oknem albo gdy tabela jeszcze nie istnieje.
 */
export async function findActiveCode(raw: unknown): Promise<DiscountCodeInfo | null> {
  const code = normalizeCode(raw);
  if (!code || !isValidCodeFormat(code)) return null;
  try {
    const row = await db.discountCode.findUnique({ where: { code } });
    if (!row) return null;
    // O tym, czy kod działa, decyduje okno – **nie procent**. Kod na samą
    // darmową wysyłkę ma `percent = 0` i nadal jest ważny.
    if (!isCodeActive(row)) return null;
    const info: DiscountCodeInfo = {
      code: row.code,
      percent: activeCodePercent(row),
      freeShipping: row.freeShipping,
      stackable: row.stackable,
    };
    return codeHasEffect(info) ? info : null;
  } catch (e) {
    console.error("[discount-codes] weryfikacja kodu nieudana:", e);
    return null;
  }
}

/**
 * Ile zamówień faktycznie skorzystało z kodu – liczone **wprost z zamówień**,
 * nie z licznika `usedCount`.
 *
 * Licznik był podbijany w chwili utworzenia zamówienia, więc rósł także przy
 * płatnościach kartą, które klient porzucał, i nigdy nie malał. Zamówienia
 * anulowane pomijamy, bo kod się w nich nie „zużył”.
 *
 * Zwraca mapę `KOD → liczba zamówień`; przy niedostępnej bazie – pustą mapę.
 */
export async function countCodeUsage(): Promise<Map<string, number>> {
  try {
    const rows = await withDbRetry(() =>
      db.order.groupBy({
        by: ["discountCode"],
        where: { discountCode: { not: null }, status: { not: "CANCELLED" } },
        _count: { _all: true },
      })
    );
    return new Map(
      rows
        .filter((r): r is typeof r & { discountCode: string } => r.discountCode !== null)
        .map((r) => [r.discountCode, r._count._all])
    );
  } catch (e) {
    console.error("[discount-codes] zliczenie użyć nieudane:", e);
    return new Map();
  }
}

/** Użycia jednego kodu – ta sama zasada co w `countCodeUsage`. */
export async function countCodeUsageFor(code: string): Promise<number> {
  try {
    return await withDbRetry(() =>
      db.order.count({
        where: { discountCode: code, status: { not: "CANCELLED" } },
      })
    );
  } catch (e) {
    console.error("[discount-codes] zliczenie użyć kodu nieudane:", e);
    return 0;
  }
}

// ── Walidacja danych z panelu ────────────────────────────────────────────────

export type ValidDiscountCode = {
  code: string;
  percent: number;
  freeShipping: boolean;
  active: boolean;
  stackable: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

const INVALID_DATE = Symbol("invalid-date");

function parseDateField(value: unknown): Date | null | typeof INVALID_DATE {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? INVALID_DATE : value;
  if (typeof value !== "string") return INVALID_DATE;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? INVALID_DATE : date;
}

export function validateDiscountCode(
  body: unknown
): { ok: true; data: ValidDiscountCode } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Nieprawidłowe dane kodu." };
  }
  const b = body as Record<string, unknown>;

  const code = normalizeCode(b.code);
  if (!isValidCodeFormat(code)) {
    return {
      ok: false,
      error: "Kod może mieć 3–32 znaki: wielkie litery, cyfry i myślniki w środku.",
    };
  }

  const freeShipping = b.freeShipping === true;

  // Zero jest dozwolone **tylko** przy darmowej wysyłce – wtedy kod działa samą
  // wysyłką. Bez niej kod bez rabatu nie dawałby klientowi nic
  const percent = b.percent == null || b.percent === "" ? 0 : Number(b.percent);
  if (!Number.isInteger(percent) || percent < 0 || percent > MAX_CODE_PERCENT) {
    return {
      ok: false,
      error: `Rabat musi być liczbą całkowitą z zakresu 0–${MAX_CODE_PERCENT}%.`,
    };
  }
  if (percent === 0 && !freeShipping) {
    return {
      ok: false,
      error: "Kod musi coś dawać – ustaw rabat procentowy albo darmową wysyłkę.",
    };
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
      code,
      percent,
      freeShipping,
      active: b.active !== false,
      // Domyślnie kod łączy się z innymi rabatami
      stackable: b.stackable !== false,
      startsAt: startsRaw,
      endsAt: endsRaw,
    },
  };
}
