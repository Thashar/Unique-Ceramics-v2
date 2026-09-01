// Sprzedaż poza sklepem – dostęp do bazy (tylko serwer).
//
// Ręczne wpisy właściciela (jarmark, sprzedaż bezpośrednia, zamówienie dogadane
// poza sklepem) doliczane do analityki, raportów PDF i limitu działalności
// nierejestrowanej. Migracja jest ręczna (`manual_add_external_sales.sql`),
// więc **każdy odczyt jest w try/catch** – brak tabeli nie może wywrócić panelu
// analityk, a formularz pokazuje wtedy instrukcję migracji zamiast listy.

import { db } from "@/lib/db";

export type ExternalSaleRow = {
  id: string;
  soldAt: Date;
  description: string;
  amount: number;
  note: string | null;
};

/** Ile wpisów wciągamy do analityki – ręcznych sprzedaży są dziesiątki, nie tysiące. */
export const EXTERNAL_SALES_LIMIT = 2000;

/** `available: false` = brak tabeli w bazie (migracja niewykonana). */
export async function listExternalSales(): Promise<{ available: boolean; sales: ExternalSaleRow[] }> {
  try {
    const sales = await db.externalSale.findMany({
      orderBy: { soldAt: "desc" },
      take: EXTERNAL_SALES_LIMIT,
      select: { id: true, soldAt: true, description: true, amount: true, note: true },
    });
    return { available: true, sales };
  } catch (e) {
    console.error("[external-sales] odczyt listy nieudany:", e);
    return { available: false, sales: [] };
  }
}

/** Wpisy z zadanego okresu (raport PDF za miesiąc). Pusta lista przy braku tabeli. */
export async function getExternalSalesBetween(start: Date, end: Date): Promise<ExternalSaleRow[]> {
  try {
    return await db.externalSale.findMany({
      where: { soldAt: { gte: start, lt: end } },
      orderBy: { soldAt: "asc" },
      select: { id: true, soldAt: true, description: true, amount: true, note: true },
    });
  } catch (e) {
    console.error("[external-sales] odczyt okresu nieudany:", e);
    return [];
  }
}
