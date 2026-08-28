import { db, withDbRetry } from "@/lib/db";

/** Liczniki do czerwonych znaczków w menu panelu. */
export type AdminBadgeCounts = {
  /** Zamówienia sklepowe ze statusem „Nowe" (`PENDING`). */
  orders: number;
  /** Zamówienia indywidualne ze statusem „Nowe" (`NEW`). */
  customOrders: number;
};

/**
 * Ile zamówień czeka na zajęcie się nimi. Liczymy **tylko pierwszy status**
 * każdego przepływu, bo znaczek ma odpowiadać na pytanie „czy przyszło coś
 * nowego", a nie „ile jest w toku".
 *
 * Zapytania idą sekwencyjnie – każde zwalnia połączenie przed kolejnym, co
 * chroni pulę Supabase (patrz `lib/db.ts`). Całość w `try/catch`: licznik przy
 * pozycji menu nie może wywrócić panelu, więc przy błędzie bazy pokazujemy zera.
 */
export async function getNewOrderCounts(): Promise<AdminBadgeCounts> {
  try {
    const orders = await withDbRetry(() => db.order.count({ where: { status: "PENDING" } }));
    const customOrders = await withDbRetry(() => db.customOrder.count({ where: { status: "NEW" } }));
    return { orders, customOrders };
  } catch (e) {
    console.error("[admin-badges] nie udało się policzyć nowych zamówień:", e);
    return { orders: 0, customOrders: 0 };
  }
}
