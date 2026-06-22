export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import { ChevronLeft, TrendingUp, ShoppingBag, Package, Truck, CreditCard, BarChart2, Download, Scale, AlertTriangle } from "lucide-react";

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
  IN_PROGRESS: "W realizacji",
  SHIPPED:     "Wysłane",
  DELIVERED:   "Dostarczone",
  CANCELLED:   "Anulowane",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "bg-amber-400",
  CONFIRMED:   "bg-blue-400",
  IN_PROGRESS: "bg-orange-400",
  SHIPPED:     "bg-purple-400",
  DELIVERED:   "bg-green-500",
  CANCELLED:   "bg-red-400",
};

function pct(val: number, total: number) {
  return total === 0 ? 0 : Math.round((val / total) * 100);
}

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",");
}

// ── Strona ─────────────────────────────────────────────────────────────────────

export default async function AnalitykiPage() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  // Dane miesięczne (ostatnie 12 miesięcy)
  const monthlyRaw = await db.$queryRaw<RawMonthRow[]>`
    SELECT
      EXTRACT(YEAR  FROM "createdAt")::int AS yr,
      EXTRACT(MONTH FROM "createdAt")::int AS mo,
      COUNT(*)::int                        AS cnt,
      COALESCE(SUM(total), 0)::float       AS rev,
      COALESCE(SUM("shippingCost"), 0)::float AS ship
    FROM "Order"
    WHERE status != 'CANCELLED'
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

  // Statusy zamówień
  const statusRaw = await db.$queryRaw<RawGroupRow[]>`
    SELECT
      status AS key,
      COUNT(*)::int AS cnt,
      0::float      AS total
    FROM "Order"
    GROUP BY key
    ORDER BY cnt DESC
  `.catch(() => [] as RawGroupRow[]);

  // Dane kwartalne bieżącego roku (tylko PAID) — działalność nierejestrowana
  const quarterlyRaw = await db.$queryRaw<RawQuarterRow[]>`
    SELECT
      EXTRACT(QUARTER FROM "createdAt")::int AS q,
      COALESCE(SUM(total), 0)::float         AS rev,
      COUNT(*)::int                          AS cnt
    FROM "Order"
    WHERE status != 'CANCELLED'
      AND "paymentStatus" = 'PAID'
      AND EXTRACT(YEAR FROM "createdAt") = ${now.getFullYear()}
    GROUP BY q
    ORDER BY q
  `.catch(() => [] as RawQuarterRow[]);

  // Agregaty roczne i bieżący miesiąc
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

  // ── Budujemy oś czasu 12 miesięcy (wypełniamy braki zerami) ──────────────
  const monthMap = new Map<string, RawMonthRow>();
  for (const r of monthlyRaw) {
    monthMap.set(`${r.yr}-${r.mo}`, r);
  }

  const timeline: { label: string; yr: number; mo: number; cnt: number; rev: number; ship: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
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

  // ── Sumaryczne wartości ───────────────────────────────────────────────────
  const yearRevenue  = Number(yearAgg._sum.total      ?? 0);
  const yearShipping = Number(yearAgg._sum.shippingCost ?? 0);
  const yearOrders   = Number(yearAgg._count ?? 0);
  const avgOrder     = yearOrders > 0 ? yearRevenue / yearOrders : 0;
  const monthRevenue = Number(monthAgg._sum.total ?? 0);
  const monthOrders  = Number(monthAgg._count ?? 0);
  const allRevenue   = Number(allTimeAgg._sum.total ?? 0);
  const allOrders    = Number(allTimeAgg._count ?? 0);

  const totalShipping = shippingRaw.reduce((s, r) => s + Number(r.total), 0);
  const totalOrders   = statusRaw.reduce((s, r) => s + Number(r.cnt), 0);

  // ── Działalność nierejestrowana ────────────────────────────────────────────
  // Limit = 75% minimalnego wynagrodzenia × 3 miesiące (art. 5 Prawa przedsiębiorców)
  // Aktualizuj DZN_MIN_WAGE co rok! (Dz.U. 2024 poz. 1516 → 4 666 zł od 2025-01-01)
  const DZN_MIN_WAGE  = 4_666;
  const DZN_MONTHLY   = Math.round(DZN_MIN_WAGE * 0.75 * 100) / 100; // 3 499,50 zł
  const DZN_QUARTERLY = Math.round(DZN_MONTHLY * 3 * 100) / 100;     // 10 498,50 zł
  const DZN_WARN      = 0.8; // próg ostrzegawczy

  const quarterMap = new Map<number, { rev: number; cnt: number }>();
  for (const r of quarterlyRaw) {
    quarterMap.set(Number(r.q), { rev: Number(r.rev), cnt: Number(r.cnt) });
  }
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3); // 1–4

  const QUARTERS = [
    { q: 1, label: "Q1", months: "Styczeń – Marzec" },
    { q: 2, label: "Q2", months: "Kwiecień – Czerwiec" },
    { q: 3, label: "Q3", months: "Lipiec – Wrzesień" },
    { q: 4, label: "Q4", months: "Październik – Grudzień" },
  ];

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

      {/* ── Karty podsumowania ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div key={label} className="bg-cream p-5 border border-transparent">
            <div className="w-9 h-9 bg-warm-white rounded-full flex items-center justify-center mb-4">
              <Icon size={17} strokeWidth={1.5} className="text-clay" />
            </div>
            <p className="font-serif text-2xl text-espresso leading-none tabular-nums">{value}</p>
            <p className="text-[11px] text-terracotta mt-1">{sub}</p>
            <p className="text-[11px] tracking-widest uppercase text-charcoal/45 mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Wykres miesięczny ──────────────────────────────────────────────── */}
      <div className="bg-cream p-6">
        <h2 className="font-serif text-lg text-espresso mb-1">Przychód i zamówienia — ostatnie 12 miesięcy</h2>
        <p className="text-xs text-charcoal/40 mb-6">Bez anulowanych zamówień</p>

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

        {/* Tabela miesięczna */}
        <div className="mt-6 pt-5 border-t border-sand overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-charcoal/40 tracking-widest uppercase">
                <th className="pb-2 font-normal">Miesiąc</th>
                <th className="pb-2 font-normal text-right">Zamówień</th>
                <th className="pb-2 font-normal text-right">Przychód</th>
                <th className="pb-2 font-normal text-right">Wysyłka</th>
                <th className="pb-2 font-normal text-right">Śr. zam.</th>
                <th className="pb-2 font-normal text-right">Raport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {[...timeline].reverse().map((m) => (
                <tr key={`tbl-${m.yr}-${m.mo}`} className="text-charcoal/70">
                  <td className="py-2 text-espresso font-medium">{m.label || `${m.mo}/${m.yr}`}</td>
                  <td className="py-2 text-right tabular-nums">{m.cnt}</td>
                  <td className="py-2 text-right tabular-nums">{fmt(m.rev)} zł</td>
                  <td className="py-2 text-right tabular-nums">{fmt(m.ship)} zł</td>
                  <td className="py-2 text-right tabular-nums">
                    {m.cnt > 0 ? `${(m.rev / m.cnt).toFixed(0)} zł` : "—"}
                  </td>
                  <td className="py-2 text-right">
                    {m.cnt > 0 ? (
                      <a
                        href={`/api/admin/reports/${m.yr}/${m.mo}`}
                        className="inline-flex items-center gap-1 text-clay hover:text-espresso transition-colors"
                        title={`Pobierz raport PDF — ${m.label || `${m.mo}/${m.yr}`}`}
                      >
                        <Download size={12} />
                        <span>PDF</span>
                      </a>
                    ) : (
                      <span className="text-charcoal/20">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bestsellery + Wysyłka ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Bestsellery */}
        <div className="bg-cream p-6">
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
        <div className="bg-cream p-6">
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
        <div className="bg-cream p-6">
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
        <div className="bg-cream p-6">
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
                Łącznie: {totalOrders} zamówień
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Roczne podsumowanie finansowe ─────────────────────────────────── */}
      <div className="bg-cream p-6">
        <h2 className="font-serif text-lg text-espresso mb-5">Podsumowanie finansowe — {now.getFullYear()}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
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
      </div>

      {/* ── Działalność nierejestrowana ───────────────────────────────────── */}
      <div className="bg-cream p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-9 h-9 bg-warm-white rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <Scale size={17} strokeWidth={1.5} className="text-clay" />
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-lg text-espresso leading-tight">
              Działalność nierejestrowana — {now.getFullYear()}
            </h2>
            <p className="text-xs text-charcoal/45 mt-0.5">
              Limit kwartalny: <span className="font-medium text-charcoal/70">{fmt(DZN_QUARTERLY)} zł</span>
              {" "}· 75% minimalnego wynagrodzenia ({DZN_MIN_WAGE.toLocaleString("pl-PL")} zł) × 3 miesiące
              · uwzględnia tylko opłacone zamówienia
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {QUARTERS.map(({ q, label, months }) => {
            const data     = quarterMap.get(q) ?? { rev: 0, cnt: 0 };
            const pctVal   = DZN_QUARTERLY > 0 ? (data.rev / DZN_QUARTERLY) * 100 : 0;
            const isOver80 = pctVal >= DZN_WARN * 100;
            const isCurrent = q === currentQuarter;

            const barColor = isOver80
              ? "bg-red-400"
              : pctVal >= 60
              ? "bg-amber-400"
              : "bg-green-400";

            return (
              <div
                key={q}
                className={`rounded-sm p-3 -mx-1 ${isCurrent ? "bg-warm-white" : ""}`}
              >
                {/* Nagłówek kwartału */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-semibold tabular-nums ${isOver80 ? "text-red-600" : "text-espresso"}`}>
                      {label}
                    </span>
                    <span className="text-[11px] text-charcoal/45">{months}</span>
                    {isCurrent && (
                      <span className="text-[10px] tracking-widest uppercase text-terracotta font-medium">
                        Bieżący
                      </span>
                    )}
                    {isOver80 && (
                      <AlertTriangle size={13} className="text-red-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-sm font-medium tabular-nums ${isOver80 ? "text-red-600" : "text-espresso"}`}>
                      {fmt(data.rev)} zł
                    </span>
                    <span className="text-xs text-charcoal/40 tabular-nums">
                      ({Math.min(pctVal, 999).toFixed(0)}%)
                    </span>
                  </div>
                </div>

                {/* Pasek postępu */}
                <div className="h-2.5 bg-sand rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(pctVal, 100)}%` }}
                  />
                </div>

                {/* Podpis */}
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px] text-charcoal/35">
                    {data.cnt > 0 ? `${data.cnt} zam.` : "Brak zamówień"}
                  </p>
                  <p className="text-[11px] text-charcoal/35 tabular-nums">
                    {data.rev > 0 && data.rev < DZN_QUARTERLY
                      ? `Pozostało: ${fmt(DZN_QUARTERLY - data.rev)} zł`
                      : data.rev >= DZN_QUARTERLY
                      ? "Limit przekroczony!"
                      : `Limit: ${fmt(DZN_QUARTERLY)} zł`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Linia z ostrzeżeniem przy 80% */}
        <div className="relative mt-4 pt-4 border-t border-sand">
          <div
            className="absolute top-0 h-[1px] bg-amber-400/60"
            style={{ left: `${DZN_WARN * 100}%`, right: 0 }}
          />
          <p className="text-[11px] text-charcoal/35">
            Podstawa: art. 5 ustawy Prawo przedsiębiorców (Dz.U. 2018 poz. 646 ze zm.).
            Czerwony = powyżej {Math.round(DZN_WARN * 100)}% limitu.
            Miesięczny limit: {fmt(DZN_MONTHLY)} zł — sprawdzaj też każdy miesiąc osobno.
          </p>
        </div>
      </div>
    </div>
  );
}
