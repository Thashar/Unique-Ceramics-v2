// Miesięczne przychody z trzech źródeł (serwer): zamówienia sklepowe (tylko
// opłacone, wg daty wpłaty), zamówienia indywidualne (Opłacone/Zrealizowane,
// wg daty złożenia) i sprzedaż poza sklepem (wpisy ręczne). Wspólne dla
// `/admin/analityki` i raportu PDF – skala w działalności gospodarczej liczy
// zaliczki narastająco, więc raport za maj musi znać styczeń–kwiecień z tych
// samych liczb, które widać w panelu.

import { db } from "@/lib/db";
import { getExternalSalesBetween } from "@/lib/external-sales";

export type MonthTotals = { yr: number; mo: number; cnt: number; rev: number; ship: number };

type RawMonthRow = { yr: number; mo: number; cnt: number; rev: number; ship: number };

export function monthKey(yr: number, mo: number): string {
  return `${yr}-${mo}`;
}

/**
 * Sumy miesięczne dla `from ≤ data < to`. Brakujące miesiące nie mają wpisu –
 * wywołujący dokłada zera. Każde źródło ma własny `catch`, żeby awaria jednego
 * (np. brak tabeli `ExternalSale`) nie wyzerowała reszty.
 */
export async function getMonthlyTotals(from: Date, to: Date): Promise<Map<string, MonthTotals>> {
  const map = new Map<string, MonthTotals>();
  const add = (yr: number, mo: number, cnt: number, rev: number, ship: number) => {
    const key = monthKey(yr, mo);
    const cur = map.get(key) ?? { yr, mo, cnt: 0, rev: 0, ship: 0 };
    cur.cnt += cnt;
    cur.rev += rev;
    cur.ship += ship;
    map.set(key, cur);
  };

  // Sklep – przychód rozpoznawany wg daty wpłaty (paidAt → createdAt dla starych zamówień)
  const shop = await db.$queryRaw<RawMonthRow[]>`
    SELECT
      EXTRACT(YEAR  FROM rec)::int   AS yr,
      EXTRACT(MONTH FROM rec)::int   AS mo,
      COUNT(*)::int                  AS cnt,
      COALESCE(SUM(total), 0)::float AS rev,
      COALESCE(SUM(ship), 0)::float  AS ship
    FROM (
      SELECT total, "shippingCost" AS ship, COALESCE("paidAt", "createdAt") AS rec
      FROM "Order"
      WHERE status != 'CANCELLED' AND "paymentStatus" = 'PAID'
    ) t
    WHERE rec >= ${from} AND rec < ${to}
    GROUP BY yr, mo
  `.catch((e) => { console.error("[revenue] sklep:", e); return [] as RawMonthRow[]; });
  for (const r of shop) add(Number(r.yr), Number(r.mo), Number(r.cnt), Number(r.rev), Number(r.ship));

  // Zamówienia indywidualne – cena + wysyłka pobrana od klienta
  const custom = await db.$queryRaw<RawMonthRow[]>`
    SELECT
      EXTRACT(YEAR  FROM "createdAt")::int          AS yr,
      EXTRACT(MONTH FROM "createdAt")::int          AS mo,
      COUNT(*)::int                                 AS cnt,
      (COALESCE(SUM(price), 0) + COALESCE(SUM("shippingCost"), 0))::float AS rev,
      COALESCE(SUM("shippingCost"), 0)::float       AS ship
    FROM "CustomOrder"
    WHERE status IN ('PAID', 'DONE') AND price IS NOT NULL
      AND "createdAt" >= ${from} AND "createdAt" < ${to}
    GROUP BY yr, mo
  `.catch((e) => { console.error("[revenue] indywidualne:", e); return [] as RawMonthRow[]; });
  for (const r of custom) add(Number(r.yr), Number(r.mo), Number(r.cnt), Number(r.rev), Number(r.ship));

  // Sprzedaż poza sklepem – bez wysyłki, cała kwota to produkty
  const external = await getExternalSalesBetween(from, to);
  for (const s of external) {
    const d = new Date(s.soldAt);
    add(d.getFullYear(), d.getMonth() + 1, 1, Number(s.amount), 0);
  }

  return map;
}

/** Miesiące `from`–`to` (włącznie, kolejne) z zerami tam, gdzie nie było sprzedaży. */
export function fillMonths(
  totals: Map<string, MonthTotals>,
  from: { yr: number; mo: number },
  to: { yr: number; mo: number }
): MonthTotals[] {
  const out: MonthTotals[] = [];
  let { yr, mo } = from;
  while (yr < to.yr || (yr === to.yr && mo <= to.mo)) {
    out.push(totals.get(monthKey(yr, mo)) ?? { yr, mo, cnt: 0, rev: 0, ship: 0 });
    mo++;
    if (mo > 12) { mo = 1; yr++; }
  }
  return out;
}
