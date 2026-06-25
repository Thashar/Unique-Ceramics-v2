export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import { ChevronLeft, TrendingUp, ShoppingBag, Package, Truck, CreditCard, BarChart2 } from "lucide-react";
import DznSection from "@/components/admin/DznSection";
import MonthlyReportsTable from "@/components/admin/MonthlyReportsTable";
import { getSetting, getSettings } from "@/lib/settings";

// ── Typy dla raw queries ───────────────────────────────────────────────────────

type RawMonthRow = {
  yr:   number;
  mo:   number;
  cnt:  number;
  rev:  number;
  ship: number;
};

type RawProductRow = {
  name:    string;
  qty:     number;
  revenue: number;
};

type RawGroupRow = {
  key:   string;
  cnt:   number;
  total: number;
};

type RawQuarterRow = {
  q:   number;
  rev: number;
  cnt: number;
};

// ── Pomocnicze ─────────────────────────────────────────────────────────────────

const MONTH_LABELS = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

const SHIPPING_LABELS: Record<string, string> = {
  courier:       "Kurier",
  parcel_locker: "Paczkomat InPost",
  pickup:        "Odbiór osobisty",
};

const PAYMENT_LABELS: Record<string, string> = {
  transfer: "Przelew / BLIK",
  stripe:   "Karta (Stripe)",
  blik:     "BLIK",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:     "Nowe",
  CONFIRMED:   "Potwierdzone",
  PAID:        "Opłacone",
  IN_PROGRESS: "W realizacji",
  SHIPPED:     "Wysłane",
  DELIVERED:   "Dostarczone",
  CANCELLED:   "Anulowane",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "bg-amber-400",
  CONFIRMED:   "bg-blue-400",
  PAID:        "bg-emerald-400",
  IN_PROGRESS: "bg-orange-400",
  SHIPPED:     "bg-purple-400",
  DELIVERED:   "bg-green-500",
  CANCELLED:   "bg-red-400",
};

// Statusy zamówień indywidualnych zaliczane do przychodu
const CUSTOM_ORDER_PAID_STATUSES = ["PAID", "DONE"] as const;

function pct(val: number, total: number) {
  return total === 0 ? 0 : Math.round((val / total) * 100);
}

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",");
}

// ── Strona ─────────────────────────────────────────────────────────────────────

export default async function AnalitykiPage() {
  const now = new Date();
  const yearStart       = new Date(now.getFullYear(), 0, 1);
  const monthStart      = new Date(now.getFullYear(), now.getMonth(), 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  // ── Zamówienia sklepowe — dane miesięczne (ostatnie 12 miesięcy) ──────────
  // Tylko opłacone (PAID). Przychód rozpoznawany wg daty wpłaty
  // (paidAt → createdAt jako fallback dla starych zamówień bez paidAt).
  const monthlyRaw = await db.$queryRaw<RawMonthRow[]>`
    SELECT
      EXTRACT(YEAR  FROM rec)::int          AS yr,
      EXTRACT(MONTH FROM rec)::int          AS mo,
      COUNT(*)::int                         AS cnt,
      COALESCE(SUM(total), 0)::float        AS rev,
      COALESCE(SUM(ship), 0)::float         AS ship
    FROM (
      SELECT total, "shippingCost" AS ship,
             COALESCE("paidAt", "createdAt") AS rec
      FROM "Order"
      WHERE status != 'CANCELLED' AND "paymentStatus" = 'PAID'
    ) t
    WHERE rec >= ${twelveMonthsAgo}
    GROUP BY yr, mo
    ORDER BY yr, mo
  `.catch(() => [] as RawMonthRow[]);

  // ── Zamówienia indywidualne — dane miesięczne (ostatnie 12 miesięcy) ──────
  const customMonthlyRaw = await db.$queryRaw<RawMonthRow[]>`
    SELECT
      EXTRACT(YEAR  FROM "createdAt")::int          AS yr,
      EXTRACT(MONTH FROM "createdAt")::int          AS mo,
      COUNT(*)::int                                 AS cnt,
      COALESCE(SUM(price), 0)::float                AS rev,
      COALESCE(SUM("shippingCost"), 0)::float       AS ship
    FROM "CustomOrder"
    WHERE status IN ('PAID', 'DONE')
      AND price IS NOT NULL
      AND "createdAt" >= ${twelveMonthsAgo}
    GROUP BY yr, mo
    ORDER BY yr, mo
  `.catch(() => [] as RawMonthRow[]);

  // Bestsellery
  const topProductsRaw = await db.$queryRaw<RawProductRow[]>`
    SELECT
      oi.name,
      SUM(oi.quantity)::int            AS qty,
      SUM(oi.price * oi.quantity)::float AS revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    WHERE o.status != 'CANCELLED'
    GROUP BY oi.name
    ORDER BY qty DESC
    LIMIT 12
  `.catch(() => [] as RawProductRow[]);

  // Metody wysyłki
  const shippingRaw = await db.$queryRaw<RawGroupRow[]>`
    SELECT
      "shippingMethod" AS key,
      COUNT(*)::int    AS cnt,
      COALESCE(SUM("shippingCost"), 0)::float AS total
    FROM "Order"
    WHERE status != 'CANCELLED'
    GROUP BY key
    ORDER BY cnt DESC
  `.catch(() => [] as RawGroupRow[]);

  // Metody płatności
  const paymentRaw = await db.$queryRaw<RawGroupRow[]>`
    SELECT
      "paymentMethod" AS key,
      COUNT(*)::int   AS cnt,
      0::float        AS total
    FROM "Order"
    WHERE status != 'CANCELLED'
    GROUP BY key
    ORDER BY cnt DESC
  `.catch(() => [] as RawGroupRow[]);

  // Statusy zamówień sklepowych
  const statusRaw = await db.$queryRaw<RawGroupRow[]>`
    SELECT
      status AS key,
      COUNT(*)::int AS cnt,
      0::float      AS total
    FROM "Order"
    GROUP BY key
    ORDER BY cnt DESC
  `.catch(() => [] as RawGroupRow[]);

  // ── Kwartały — zamówienia sklepowe (tylko PAID, wg daty wpłaty) ────────────
  const quarterlyRaw = await db.$queryRaw<RawQuarterRow[]>`
    SELECT
      EXTRACT(QUARTER FROM rec)::int AS q,
      COALESCE(SUM(total), 0)::float AS rev,
      COUNT(*)::int                  AS cnt
    FROM (
      SELECT total, COALESCE("paidAt", "createdAt") AS rec
      FROM "Order"
      WHERE status != 'CANCELLED' AND "paymentStatus" = 'PAID'
    ) t
    WHERE EXTRACT(YEAR FROM rec) = ${now.getFullYear()}
    GROUP BY q
    ORDER BY q
  `.catch(() => [] as RawQuarterRow[]);

  // ── Kwartały — zamówienia indywidualne (PAID lub DONE, z ceną) ───────────
  // Do limitu działalności nierejestrowanej liczy się przychód należny — wraz z
  // wysyłką pobraną od klienta (zamówienia sklepowe mają ją już w "total").
  const customQuarterlyRaw = await db.$queryRaw<RawQuarterRow[]>`
    SELECT
      EXTRACT(QUARTER FROM "createdAt")::int            AS q,
      (COALESCE(SUM(price), 0) + COALESCE(SUM("shippingCost"), 0))::float AS rev,
      COUNT(*)::int                                     AS cnt
    FROM "CustomOrder"
    WHERE status IN ('PAID', 'DONE')
      AND price IS NOT NULL
      AND EXTRACT(YEAR FROM "createdAt") = ${now.getFullYear()}
    GROUP BY q
    ORDER BY q
  `.catch(() => [] as RawQuarterRow[]);

  // ── Agregaty zamówień sklepowych ──────────────────────────────────────────
  const [yearAgg, monthAgg, allTimeAgg] = await Promise.all([
    db.order.aggregate({
      _sum: { total: true, shippingCost: true },
      _count: true,
      where: { status: { not: "CANCELLED" }, createdAt: { gte: yearStart } },
    }).catch(() => ({ _sum: { total: 0, shippingCost: 0 }, _count: 0 })),
    db.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: { status: { not: "CANCELLED" }, createdAt: { gte: monthStart } },
    }).catch(() => ({ _sum: { total: 0 }, _count: 0 })),
    db.order.aggregate({
      _sum: { total: true, shippingCost: true },
      _count: true,
      where: { status: { not: "CANCELLED" } },
    }).catch(() => ({ _sum: { total: 0, shippingCost: 0 }, _count: 0 })),
  ]);

  // ── Agregaty zamówień indywidualnych (PAID lub DONE, z ceną + wysyłką) ────
  type RawCustomAgg = { total: number; ship: number; cnt: number };
  const [customYearAgg, customMonthAgg, customAllTimeAgg] = await Promise.all([
    db.$queryRaw<RawCustomAgg[]>`
      SELECT COALESCE(SUM(price), 0)::float AS total,
             COALESCE(SUM("shippingCost"), 0)::float AS ship,
             COUNT(*)::int AS cnt
      FROM "CustomOrder"
      WHERE status IN ('PAID', 'DONE') AND price IS NOT NULL
        AND "createdAt" >= ${yearStart}
    `.catch(() => [{ total: 0, ship: 0, cnt: 0 }] as RawCustomAgg[]),
    db.$queryRaw<RawCustomAgg[]>`
      SELECT COALESCE(SUM(price), 0)::float AS total,
             COALESCE(SUM("shippingCost"), 0)::float AS ship,
             COUNT(*)::int AS cnt
      FROM "CustomOrder"
      WHERE status IN ('PAID', 'DONE') AND price IS NOT NULL
        AND "createdAt" >= ${monthStart}
    `.catch(() => [{ total: 0, ship: 0, cnt: 0 }] as RawCustomAgg[]),
    db.$queryRaw<RawCustomAgg[]>`
      SELECT COALESCE(SUM(price), 0)::float AS total,
             COALESCE(SUM("shippingCost"), 0)::float AS ship,
             COUNT(*)::int AS cnt
      FROM "CustomOrder"
      WHERE status IN ('PAID', 'DONE') AND price IS NOT NULL
    `.catch(() => [{ total: 0, ship: 0, cnt: 0 }] as RawCustomAgg[]),
  ]);

  const customYearRevenue   = Number(customYearAgg[0]?.total    ?? 0);
  const customYearShipping  = Number(customYearAgg[0]?.ship     ?? 0);
  const customYearOrders    = Number(customYearAgg[0]?.cnt      ?? 0);
  const customMonthRevenue  = Number(customMonthAgg[0]?.total   ?? 0);
  const customMonthOrders   = Number(customMonthAgg[0]?.cnt     ?? 0);
  const customAllRevenue    = Number(customAllTimeAgg[0]?.total ?? 0);
  const customAllOrders     = Number(customAllTimeAgg[0]?.cnt   ?? 0);

  // ── Budujemy oś czasu 12 miesięcy ─────────────────────────────────────────
  const monthMap = new Map<string, RawMonthRow>();
  for (const r of monthlyRaw) {
    monthMap.set(`${r.yr}-${r.mo}`, r);
  }
  // Dodajemy zamówienia indywidualne do tej samej mapy
  for (const r of customMonthlyRaw) {
    const key = `${Number(r.yr)}-${Number(r.mo)}`;
    const existing = monthMap.get(key);
    if (existing) {
      monthMap.set(key, {
        ...existing,
        cnt: existing.cnt + Number(r.cnt),
        rev: existing.rev + Number(r.rev),
      });
    } else {
      monthMap.set(key, { yr: Number(r.yr), mo: Number(r.mo), cnt: Number(r.cnt), rev: Number(r.rev), ship: 0 });
    }
  }

  const timeline: { label: string; yr: number; mo: number; cnt: number; rev: number; ship: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    const found = monthMap.get(`${yr}-${mo}`);
    timeline.push({
      label: `${MONTH_LABELS[mo - 1]} ${yr !== now.getFullYear() ? yr : ""}`.trim(),
      yr, mo,
      cnt:  Number(found?.cnt  ?? 0),
      rev:  Number(found?.rev  ?? 0),
      ship: Number(found?.ship ?? 0),
    });
  }

  const maxRev = Math.max(...timeline.map((t) => t.rev), 1);
  const maxCnt = Math.max(...timeline.map((t) => t.cnt), 1);

  // ── Flagi podwyższonej stawki podatku (32%) dla każdego miesiąca osi czasu ──
  const taxKeys     = timeline.map((m) => `tax_high_${m.yr}_${m.mo}`);
  const taxSettings = await getSettings(taxKeys).catch(() => ({} as Record<string, string>));
  const taxFlags: Record<string, boolean> = {};
  for (const m of timeline) {
    taxFlags[`${m.yr}-${m.mo}`] = taxSettings[`tax_high_${m.yr}_${m.mo}`] === "true";
  }

  // ── Sumaryczne wartości (sklep + indywidualne) ─────────────────────────────
  const yearRevenue  = Number(yearAgg._sum.total       ?? 0) + customYearRevenue;
  const yearShipping = Number(yearAgg._sum.shippingCost ?? 0) + customYearShipping;
  const yearOrders   = Number(yearAgg._count  ?? 0)         + customYearOrders;
  const avgOrder     = yearOrders > 0 ? yearRevenue / yearOrders : 0;
  const monthRevenue = Number(monthAgg._sum.total ?? 0)      + customMonthRevenue;
  const monthOrders  = Number(monthAgg._count ?? 0)          + customMonthOrders;
  const allRevenue   = Number(allTimeAgg._sum.total ?? 0)    + customAllRevenue;
  const allOrders    = Number(allTimeAgg._count ?? 0)        + customAllOrders;

  const totalShipping = shippingRaw.reduce((s, r) => s + Number(r.total), 0);
  const totalOrders   = statusRaw.reduce((s, r) => s + Number(r.cnt), 0);

  // ── Działalność nierejestrowana — kwartały (sklep + indywidualne) ─────────
  const dznMinWageStr = await getSetting("dzn_min_wage").catch(() => "4806");
  const dznMinWage    = Math.max(1000, parseInt(dznMinWageStr || "4806", 10) || 4806);
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

  const quarterData: Record<number, { rev: number; cnt: number }> = {};
  for (const r of quarterlyRaw) {
    const q = Number(r.q);
    quarterData[q] = { rev: Number(r.rev), cnt: Number(r.cnt) };
  }
  // Dodaj zamówienia indywidualne do kwartałów
  for (const r of customQuarterlyRaw) {
    const q = Number(r.q);
    if (quarterData[q]) {
      quarterData[q].rev += Number(r.rev);
      quarterData[q].cnt += Number(r.cnt);
    } else {
      quarterData[q] = { rev: Number(r.rev), cnt: Number(r.cnt) };
    }
  }

  // Czy są jakieś zamówienia indywidualne uwzględnione w analityce
  const hasCustomOrders = customAllOrders > 0;

  void CUSTOM_ORDER_PAID_STATUSES; // używane w zapytaniach SQL (suppress unused warning)

  return (
    <div className="max-w-5xl space-y-8">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors"
          >
            <ChevronLeft size={14} />
            Dashboard
          </Link>
          <span className="text-sand">|</span>
          <div className="flex items-center gap-2">
            <BarChart2 size={18} strokeWidth={1.5} className="text-clay" />
            <h1 className="font-serif text-2xl text-espresso">Analityki</h1>
          </div>
        </div>
        <p className="text-xs text-charcoal/40">
          Dane aktualne na {now.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {hasCustomOrders && (
        <div className="bg-purple-50 border border-purple-200 px-4 py-2.5 text-xs text-purple-700">
          Dane uwzględniają zamówienia indywidualne ze statusem Opłacone lub Zrealizowane.
        </div>
      )}

      {/* ── Karty podsumowania ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Przychód w tym roku",
            value: `${yearRevenue.toFixed(0)} zł`,
            sub:   `${yearOrders} zamówień`,
            icon:  TrendingUp,
          },
          {
            label: "Przychód w tym miesiącu",
            value: `${monthRevenue.toFixed(0)} zł`,
            sub:   `${monthOrders} zamówień`,
            icon:  TrendingUp,
          },
          {
            label: "Śr. wartość zamówienia",
            value: `${avgOrder.toFixed(0)} zł`,
            sub:   `w tym roku`,
            icon:  ShoppingBag,
          },
          {
            label: "Przychód łącznie",
            value: `${allRevenue.toFixed(0)} zł`,
            sub:   `${allOrders} zamówień ogółem`,
            icon:  Package,
          },
        ].map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="bg-cream border border-sand/60 p-5">
            <div className="w-9 h-9 bg-warm-white border border-sand/60 rounded-full flex items-center justify-center mb-4">
              <Icon size={17} strokeWidth={1.5} className="text-clay" />
            </div>
            <p className="font-serif text-2xl text-espresso leading-none tabular-nums">{value}</p>
            <p className="text-[11px] text-terracotta mt-1.5">{sub}</p>
            <p className="text-[11px] tracking-widest uppercase text-charcoal/45 mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Wykres miesięczny ──────────────────────────────────────────────── */}
      <div className="bg-cream border border-sand/60 p-6">
        <h2 className="font-serif text-lg text-espresso mb-1">Przychód i zamówienia — ostatnie 12 miesięcy</h2>
        <p className="text-xs text-charcoal/40 mb-6">
          Tylko opłacone · przychód rozpoznawany wg daty wpłaty · uwzględnia zamówienia indywidualne (Opłacone/Zrealizowane)
        </p>

        {/* Wykres słupkowy */}
        <div className="flex items-end gap-1.5 h-40 mb-2">
          {timeline.map((m) => (
            <div key={`${m.yr}-${m.mo}`} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-espresso text-white text-[10px] px-2 py-1.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                <p className="font-semibold">{m.label}</p>
                <p>{fmt(m.rev)} zł</p>
                <p>{m.cnt} zam.</p>
                <p className="text-white/60">{fmt(m.ship)} zł wysyłka</p>
              </div>
              {/* Słupek przychodu */}
              <div
                className="w-full bg-clay/80 hover:bg-clay transition-colors rounded-t-sm"
                style={{ height: `${(m.rev / maxRev) * 100}%` }}
              />
            </div>
          ))}
        </div>

        {/* Etykiety miesięcy */}
        <div className="flex gap-1.5">
          {timeline.map((m) => (
            <div key={`lbl-${m.yr}-${m.mo}`} className="flex-1 text-center text-[9px] text-charcoal/35 leading-none">
              {m.label}
            </div>
          ))}
        </div>

        {/* Wykres zamówień — linia punktowa */}
        <div className="mt-6 pt-5 border-t border-sand">
          <p className="text-xs text-charcoal/45 mb-3 tracking-widest uppercase">Liczba zamówień</p>
          <div className="flex items-end gap-1.5 h-16">
            {timeline.map((m) => (
              <div key={`cnt-${m.yr}-${m.mo}`} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <div
                  className="w-full bg-terracotta/40 hover:bg-terracotta/60 transition-colors rounded-t-sm"
                  style={{ height: `${(m.cnt / maxCnt) * 100}%` }}
                />
                {m.cnt > 0 && (
                  <span className="absolute -top-4 text-[9px] text-terracotta font-medium">{m.cnt}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tabela miesięczna + podatek (klient: checkbox 32% + PDF) */}
        <MonthlyReportsTable
          rows={[...timeline].reverse()}
          highFlags={taxFlags}
          currentYear={now.getFullYear()}
        />
      </div>

      {/* ── Bestsellery + Wysyłka ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Bestsellery */}
        <div className="bg-cream border border-sand/60 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Package size={15} strokeWidth={1.5} className="text-clay" />
            <h2 className="font-serif text-lg text-espresso">Bestsellery</h2>
          </div>
          {topProductsRaw.length === 0 ? (
            <p className="text-sm text-charcoal/40 py-6 text-center">Brak danych</p>
          ) : (
            <div className="space-y-1">
              {topProductsRaw.map((p, i) => {
                const maxQty = Number(topProductsRaw[0].qty);
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-[11px] text-charcoal/35 w-4 shrink-0 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-xs text-espresso truncate">{p.name}</p>
                        <p className="text-xs text-charcoal/60 shrink-0 tabular-nums">
                          {Number(p.qty)} szt. · {fmt(Number(p.revenue))} zł
                        </p>
                      </div>
                      <div className="h-1.5 bg-sand rounded-full overflow-hidden">
                        <div
                          className="h-full bg-clay rounded-full"
                          style={{ width: `${(Number(p.qty) / maxQty) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Metody wysyłki */}
        <div className="bg-cream border border-sand/60 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Truck size={15} strokeWidth={1.5} className="text-clay" />
            <h2 className="font-serif text-lg text-espresso">Metody wysyłki</h2>
          </div>
          {shippingRaw.length === 0 ? (
            <p className="text-sm text-charcoal/40 py-6 text-center">Brak danych</p>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {shippingRaw.map((r) => {
                  const total = shippingRaw.reduce((s, x) => s + Number(x.cnt), 0);
                  return (
                    <div key={r.key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-espresso font-medium">{SHIPPING_LABELS[r.key] ?? r.key}</span>
                        <span className="text-charcoal/55 tabular-nums">{Number(r.cnt)} zam. ({pct(Number(r.cnt), total)}%)</span>
                      </div>
                      <div className="h-2 bg-sand rounded-full overflow-hidden">
                        <div
                          className="h-full bg-clay rounded-full"
                          style={{ width: `${pct(Number(r.cnt), total)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Koszty wysyłki */}
              <div className="pt-4 border-t border-sand">
                <p className="text-[10px] tracking-widest uppercase text-charcoal/40 mb-3">Koszty wysyłki pobrane</p>
                <div className="space-y-1.5">
                  {shippingRaw.map((r) => (
                    <div key={`cost-${r.key}`} className="flex justify-between text-xs">
                      <span className="text-charcoal/60">{SHIPPING_LABELS[r.key] ?? r.key}</span>
                      <span className="tabular-nums text-espresso">{fmt(Number(r.total))} zł</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-semibold pt-1.5 border-t border-sand">
                    <span className="text-espresso">Łącznie</span>
                    <span className="tabular-nums text-espresso">{fmt(totalShipping)} zł</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Płatności + Statusy ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Metody płatności */}
        <div className="bg-cream border border-sand/60 p-6">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard size={15} strokeWidth={1.5} className="text-clay" />
            <h2 className="font-serif text-lg text-espresso">Metody płatności</h2>
          </div>
          {paymentRaw.length === 0 ? (
            <p className="text-sm text-charcoal/40 py-6 text-center">Brak danych</p>
          ) : (
            <div className="space-y-4">
              {paymentRaw.map((r) => {
                const total = paymentRaw.reduce((s, x) => s + Number(x.cnt), 0);
                return (
                  <div key={r.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-espresso font-medium">{PAYMENT_LABELS[r.key] ?? r.key}</span>
                      <span className="text-charcoal/55 tabular-nums">{Number(r.cnt)} zam. ({pct(Number(r.cnt), total)}%)</span>
                    </div>
                    <div className="h-2 bg-sand rounded-full overflow-hidden">
                      <div
                        className="h-full bg-terracotta/70 rounded-full"
                        style={{ width: `${pct(Number(r.cnt), total)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Statusy zamówień */}
        <div className="bg-cream border border-sand/60 p-6">
          <div className="flex items-center gap-2 mb-5">
            <ShoppingBag size={15} strokeWidth={1.5} className="text-clay" />
            <h2 className="font-serif text-lg text-espresso">Statusy zamówień</h2>
          </div>
          {statusRaw.length === 0 ? (
            <p className="text-sm text-charcoal/40 py-6 text-center">Brak danych</p>
          ) : (
            <div className="space-y-3">
              {statusRaw.map((r) => (
                <div key={r.key} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[r.key] ?? "bg-sand"}`} />
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-xs text-espresso">{STATUS_LABELS[r.key] ?? r.key}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-sand rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${STATUS_COLORS[r.key] ?? "bg-sand"}`}
                          style={{ width: `${pct(Number(r.cnt), totalOrders)}%` }}
                        />
                      </div>
                      <span className="text-xs text-charcoal/55 tabular-nums w-16 text-right">
                        {Number(r.cnt)} ({pct(Number(r.cnt), totalOrders)}%)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-charcoal/35 pt-2 border-t border-sand">
                Łącznie: {totalOrders} zamówień sklepowych
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Roczne podsumowanie finansowe ─────────────────────────────────── */}
      <div className="bg-cream border border-sand/60 p-6">
        <h2 className="font-serif text-lg text-espresso mb-5">Podsumowanie finansowe — {now.getFullYear()}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { label: "Przychód brutto",         value: `${fmt(yearRevenue)} zł` },
            { label: "w tym koszty wysyłki",    value: `${fmt(yearShipping)} zł` },
            { label: "Przychód z produktów",    value: `${fmt(yearRevenue - yearShipping)} zł` },
            { label: "Śr. wartość zamówienia",  value: `${avgOrder.toFixed(0)} zł` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="font-serif text-xl text-espresso tabular-nums">{value}</p>
              <p className="text-[11px] tracking-widest uppercase text-charcoal/40 mt-1">{label}</p>
            </div>
          ))}
        </div>
        {hasCustomOrders && (
          <p className="text-[10px] text-purple-600 mt-4 pt-3 border-t border-sand">
            * Przychód zawiera zamówienia indywidualne: {fmt(customYearRevenue)} zł ({customYearOrders} zam.)
          </p>
        )}
      </div>

      {/* ── Działalność nierejestrowana ───────────────────────────────────── */}
      <DznSection
        initialMinWage={dznMinWage}
        quarterMap={quarterData}
        currentQuarter={currentQuarter}
        currentYear={now.getFullYear()}
      />
    </div>
  );
}
