export const dynamic = "force-dynamic";

import Link from "next/link";
import { BadgePercent, Plus, Truck } from "lucide-react";
import { listFreeShippingPromos, listQuantityPromos } from "@/lib/promos";
import { activeQuantityPromo } from "@/lib/quantity-promo";
import { activeFreeShipping, SHIPPING_METHOD_LABEL, normalizeMethods } from "@/lib/free-shipping";
import { formatWarsaw } from "@/lib/warsaw-time";

type State = "active" | "scheduled" | "expired" | "inactive";

/** Kolory stanu – ta sama konwencja co przy kodach rabatowych. */
const STATE_BADGE: Record<State, string> = {
  active: "bg-green-50 text-green-700 ring-1 ring-green-200",
  scheduled: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  expired: "bg-charcoal/8 text-charcoal/80",
  inactive: "bg-charcoal/8 text-charcoal/80",
};

const STATE_LABEL: Record<State, string> = {
  active: "Działa",
  scheduled: "Zaplanowana",
  expired: "Zakończona",
  inactive: "Wyłączona",
};

function stateOf(
  promo: { active: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date
): State {
  if (!promo.active) return "inactive";
  if (promo.endsAt && promo.endsAt.getTime() <= now.getTime()) return "expired";
  if (promo.startsAt && promo.startsAt.getTime() > now.getTime()) return "scheduled";
  return "active";
}

function windowText(promo: { startsAt: Date | null; endsAt: Date | null }): string {
  if (!promo.startsAt && !promo.endsAt) return "bezterminowo";
  if (promo.startsAt && promo.endsAt) {
    return `${formatWarsaw(promo.startsAt, { short: true })} – ${formatWarsaw(promo.endsAt, { short: true })}`;
  }
  if (promo.endsAt) return `do ${formatWarsaw(promo.endsAt, { short: true })}`;
  return `od ${formatWarsaw(promo.startsAt, { short: true })}`;
}

function Badge({ state }: { state: State }) {
  return (
    <span
      className={`text-[10px] tracking-wide uppercase px-1.5 py-0.5 rounded-sm shrink-0 ${STATE_BADGE[state]}`}
    >
      {STATE_LABEL[state]}
    </span>
  );
}

function MissingTable() {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm p-4 leading-relaxed">
      <p className="font-medium mb-1">Baza nie ma jeszcze tabel promocji</p>
      <p>
        Uruchom na Supabase migrację{" "}
        <code className="font-mono text-xs">prisma/migrations/manual_add_promotions.sql</code>.
        Do tego czasu sklep działa normalnie, ale promocje nie obowiązują.
      </p>
    </div>
  );
}

export default async function PromocjePage() {
  const now = new Date();
  const [quantity, freeShipping] = await Promise.all([
    listQuantityPromos(),
    listFreeShippingPromos(),
  ]);

  // Jednocześnie działa tylko jedna promocja danego typu – przy nachodzących
  // oknach właściciel musi wiedzieć, która wygrywa
  const activeQuantityCount = quantity.promos.filter(
    (p) => activeQuantityPromo(p, { now }) !== null
  ).length;
  const activeShippingCount = freeShipping.promos.filter(
    (p) => activeFreeShipping(p, { now }) !== null
  ).length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl text-espresso">Promocje</h1>
        <p className="text-sm text-charcoal/80 mt-0.5">
          Rabat za większe zakupy i darmowa wysyłka. Kody rabatowe są w osobnej zakładce.
        </p>
      </div>

      {/* ── Rabat ilościowy ── */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="flex items-center gap-2 font-serif text-xl text-espresso">
            <BadgePercent size={16} className="text-clay" strokeWidth={1.5} />
            Rabat za większe zakupy
          </h2>
          {quantity.available && (
            <Link
              href="/admin/promocje/ilosciowe/nowy"
              className="flex items-center gap-2 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-xs tracking-widest uppercase px-4 py-2.5 transition-colors"
            >
              <Plus size={14} strokeWidth={1.5} />
              Dodaj
            </Link>
          )}
        </div>

        {!quantity.available ? (
          <MissingTable />
        ) : quantity.promos.length === 0 ? (
          <p className="text-sm text-charcoal/80 bg-cream p-4">
            Brak promocji. Rabat naliczany jest od progu sztuk – im więcej, tym większy upust.
          </p>
        ) : (
          <>
            {activeQuantityCount > 1 && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 mb-3">
                Kilka promocji obowiązuje jednocześnie – sklep zastosuje tę o najpóźniejszej dacie
                startu.
              </p>
            )}
            <div className="divide-y divide-sand border border-sand">
              {quantity.promos.map((promo) => (
                <Link
                  key={promo.id}
                  href={`/admin/promocje/ilosciowe/${promo.id}`}
                  className="block p-4 hover:bg-cream transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-espresso font-medium">{promo.name}</span>
                    <Badge state={stateOf(promo, now)} />
                    <span className="text-xs text-charcoal/80">{windowText(promo)}</span>
                  </div>
                  <p className="text-xs text-charcoal/80 mt-1">
                    {promo.tiers.map((t) => `${t.minPieces} szt. → −${t.percent}%`).join(" · ")}
                  </p>
                  <p className="text-[11px] text-charcoal/80 mt-1">
                    {promo.stackable ? "łączy się z kodami" : "wyklucza się z kodami"}
                    {promo.includeDiscountedProducts
                      ? " · obejmuje przecenione"
                      : " · pomija przecenione"}
                    {promo.minItemPrice > 0 &&
                      ` · pozycje od ${promo.minItemPrice.toFixed(2).replace(".", ",")} zł`}
                    {promo.maxDiscount != null &&
                      ` · limit ${promo.maxDiscount.toFixed(2).replace(".", ",")} zł`}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Darmowa wysyłka ── */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="flex items-center gap-2 font-serif text-xl text-espresso">
            <Truck size={16} className="text-clay" strokeWidth={1.5} />
            Darmowa wysyłka
          </h2>
          {freeShipping.available && (
            <Link
              href="/admin/promocje/wysylka/nowy"
              className="flex items-center gap-2 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-xs tracking-widest uppercase px-4 py-2.5 transition-colors"
            >
              <Plus size={14} strokeWidth={1.5} />
              Dodaj
            </Link>
          )}
        </div>

        {!freeShipping.available ? (
          <MissingTable />
        ) : freeShipping.promos.length === 0 ? (
          <p className="text-sm text-charcoal/80 bg-cream p-4">
            Brak promocji – wysyłka jest płatna wg stawek z zakładki Wysyłka.
          </p>
        ) : (
          <>
            {activeShippingCount > 1 && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 mb-3">
                Kilka promocji obowiązuje jednocześnie – sklep zastosuje tę o najniższym progu.
              </p>
            )}
            <div className="divide-y divide-sand border border-sand">
              {freeShipping.promos.map((promo) => (
                <Link
                  key={promo.id}
                  href={`/admin/promocje/wysylka/${promo.id}`}
                  className="block p-4 hover:bg-cream transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-espresso font-medium">{promo.name}</span>
                    <Badge state={stateOf(promo, now)} />
                    <span className="text-xs text-charcoal/80">{windowText(promo)}</span>
                  </div>
                  <p className="text-xs text-charcoal/80 mt-1">
                    {promo.minOrderValue > 0
                      ? `od ${promo.minOrderValue.toFixed(2).replace(".", ",")} zł`
                      : "bez progu"}
                    {" · "}
                    {normalizeMethods(promo.methods)
                      .map((m) => SHIPPING_METHOD_LABEL[m])
                      .join(", ")}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
