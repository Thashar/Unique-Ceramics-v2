// Promocje po stronie serwera: odczyt z bazy dla rabatu ilościowego
// i darmowej wysyłki.
//
// **Brak tabel nie może wywrócić sklepu.** Migracja `manual_add_promotions.sql`
// jest uruchamiana ręcznie na Supabase, więc każdy odczyt jest w try/catch:
// gdy tabel nie ma, promocje po prostu nie obowiązują (zamówienie liczy się jak
// bez nich), a panel pokazuje instrukcję zamiast listy. Ten sam wzorzec co
// w `lib/discount-codes.ts`.

import { db, withDbRetry } from "@/lib/db";
import {
  activeQuantityPromo,
  normalizeTiers,
  type QuantityPromoConfig,
  type QuantityTier,
} from "@/lib/quantity-promo";
import {
  activeFreeShipping,
  normalizeMethods,
  type FreeShippingConfig,
} from "@/lib/free-shipping";

export type QuantityPromoRow = {
  id: string;
  name: string;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  stackable: boolean;
  includeDiscountedProducts: boolean;
  minItemPrice: number;
  maxDiscount: number | null;
  tiers: QuantityTier[];
  createdAt: Date;
  updatedAt: Date;
};

export type FreeShippingPromoRow = {
  id: string;
  name: string;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  minOrderValue: number;
  methods: string[];
  createdAt: Date;
  updatedAt: Date;
};

/** Wiersz z bazy → kształt używany przez `lib/quantity-promo.ts` (tiers z JSON-a). */
function toQuantityRow(row: {
  id: string;
  name: string;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  stackable: boolean;
  includeDiscountedProducts: boolean;
  minItemPrice: number;
  maxDiscount: number | null;
  tiers: unknown;
  createdAt: Date;
  updatedAt: Date;
}): QuantityPromoRow {
  return { ...row, tiers: normalizeTiers(row.tiers) };
}

// ── Rabat ilościowy ──────────────────────────────────────────────────────────

export async function listQuantityPromos(): Promise<{
  available: boolean;
  promos: QuantityPromoRow[];
}> {
  try {
    const rows = await withDbRetry(() =>
      db.quantityPromo.findMany({ orderBy: { createdAt: "desc" } })
    );
    return { available: true, promos: rows.map(toQuantityRow) };
  } catch (e) {
    console.error("[promos] odczyt rabatów ilościowych nieudany:", e);
    return { available: false, promos: [] };
  }
}

export async function getQuantityPromo(id: string): Promise<QuantityPromoRow | null> {
  try {
    const row = await db.quantityPromo.findUnique({ where: { id } });
    return row ? toQuantityRow(row) : null;
  } catch (e) {
    console.error("[promos] odczyt rabatu ilościowego nieudany:", e);
    return null;
  }
}

/**
 * Rabat ilościowy obowiązujący **w tej chwili** – dokładnie jeden albo żaden.
 *
 * Wolno mieć kilka wierszy (np. zaplanowaną promocję świąteczną), ale
 * jednocześnie działa tylko jeden. Przy nachodzących oknach wygrywa ten
 * o **najpóźniejszym `startsAt`** (najświeższa decyzja właściciela); panel
 * ostrzega, gdy okna się nakładają.
 *
 * `holdMs` przekazuj na stronach z cache'em – patrz `DISCOUNT_HOLD_*`
 * w `lib/product-price.ts`: nigdy nie reklamujemy rabatu, który wygaśnie,
 * zanim klient dojdzie do kasy.
 */
export async function findActiveQuantityPromo(
  { now, holdMs = 0 }: { now?: Date; holdMs?: number } = {}
): Promise<QuantityPromoRow | null> {
  try {
    const rows = await withDbRetry(() =>
      db.quantityPromo.findMany({ where: { active: true } })
    );
    const active = rows
      .map(toQuantityRow)
      .filter((row): row is QuantityPromoRow => activeQuantityPromo(row, { now, holdMs }) !== null)
      .sort((a, b) => (b.startsAt?.getTime() ?? 0) - (a.startsAt?.getTime() ?? 0));
    return active[0] ?? null;
  } catch (e) {
    console.error("[promos] weryfikacja rabatu ilościowego nieudana:", e);
    return null;
  }
}

// ── Darmowa wysyłka ──────────────────────────────────────────────────────────

export async function listFreeShippingPromos(): Promise<{
  available: boolean;
  promos: FreeShippingPromoRow[];
}> {
  try {
    const promos = await withDbRetry(() =>
      db.freeShippingPromo.findMany({ orderBy: { createdAt: "desc" } })
    );
    return { available: true, promos };
  } catch (e) {
    console.error("[promos] odczyt darmowej wysyłki nieudany:", e);
    return { available: false, promos: [] };
  }
}

export async function getFreeShippingPromo(id: string): Promise<FreeShippingPromoRow | null> {
  try {
    return await db.freeShippingPromo.findUnique({ where: { id } });
  } catch (e) {
    console.error("[promos] odczyt promocji wysyłki nieudany:", e);
    return null;
  }
}

/**
 * Promocja darmowej wysyłki obowiązująca w tej chwili. Przy kilku aktywnych
 * wygrywa **najkorzystniejsza dla klienta** – czyli o najniższym progu; metody
 * są wtedy sumowane z tego jednego wiersza, więc panel ostrzega przy nakładaniu.
 */
export async function findActiveFreeShipping(
  { now, holdMs = 0 }: { now?: Date; holdMs?: number } = {}
): Promise<FreeShippingPromoRow | null> {
  try {
    const rows = await withDbRetry(() =>
      db.freeShippingPromo.findMany({ where: { active: true } })
    );
    const active = rows
      .filter((row) => activeFreeShipping(row, { now, holdMs }) !== null)
      .sort((a, b) => a.minOrderValue - b.minOrderValue);
    return active[0] ?? null;
  } catch (e) {
    console.error("[promos] weryfikacja darmowej wysyłki nieudana:", e);
    return null;
  }
}

// ── Kształty przekazywane do warstwy liczącej ────────────────────────────────

/** Wiersz z bazy sprowadzony do konfiguracji rozumianej przez `applyQuantityDiscount`. */
export function toQuantityConfig(row: QuantityPromoRow | null): QuantityPromoConfig | null {
  return row;
}

/** Wiersz z bazy sprowadzony do konfiguracji rozumianej przez `isShippingFree`. */
export function toFreeShippingConfig(
  row: FreeShippingPromoRow | null
): FreeShippingConfig | null {
  if (!row) return null;
  return { ...row, methods: normalizeMethods(row.methods) };
}
