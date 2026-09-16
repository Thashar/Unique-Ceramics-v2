export const dynamic = "force-dynamic";

// Ruch na stronie – dane z Vercel Web Analytics.
//
// Dwie warstwy: **na żywo** (ostatnie 7/14/30 dni prosto z API, cache 15 min –
// `lib/traffic-overview.ts`) i **historia** (dzienne agregaty zapisywane u nas
// przez cron, bez limitu czasu – `lib/traffic-store.ts`). Plan Hobby trzyma
// dane tylko przez miesiąc, więc bez drugiej warstwy nie dałoby się porównać
// tego roku z poprzednim.

import Link from "next/link";
import {
  Activity, ChevronLeft, Eye, Users, MousePointerClick, CalendarDays, Globe, Smartphone,
  Compass, Clock, Database, Link2, Package,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { getProjects } from "@/lib/portfolio";
import { projectSlugs } from "@/lib/portfolio-slug";
import { getTrafficOverview } from "@/lib/traffic-overview";
import { getSyncState, getTrafficHistory } from "@/lib/traffic-store";
import { isTrafficConfigured } from "@/lib/vercel-analytics";
import {
  DIMENSION_LABELS,
  TRAFFIC_HOUR,
  TRAFFIC_RANGES,
  TRAFFIC_SYNC_WINDOW_DAYS,
  TRAFFIC_TOTAL,
  dimensionValueLabel,
  hourBuckets,
  hourBucketsFromStats,
  missingSyncDays,
  monthBuckets,
  percentChange,
  productSlugFromPath,
  resolveTrafficRange,
  share,
  sumByValue,
  weekdayBuckets,
  type Bucket,
  type DimTotal,
  type PathLabelSources,
  type TrafficDimension,
} from "@/lib/traffic";
import { formatWarsaw } from "@/lib/warsaw-time";
import TrafficSyncButton from "@/components/admin/TrafficSyncButton";

// ── Pomocnicze ─────────────────────────────────────────────────────────────────

const nf = new Intl.NumberFormat("pl-PL");
const fmt = (n: number) => nf.format(n);

function fmtDay(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}.${m}.${y}`;
}

function Delta({ current, previous }: { current: number; previous: number | null }) {
  const change = percentChange(current, previous);
  if (change === null) return null;
  const cls = change > 0 ? "text-green-700" : change < 0 ? "text-red-700" : "text-charcoal/80";
  return (
    <span className={`text-[11px] ${cls}`}>
      {change > 0 ? "+" : ""}{change}% vs poprzedni okres
    </span>
  );
}

function Card({ title, icon: Icon, children, className = "" }: {
  title: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-cream border border-sand/60 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-5">
        <Icon size={15} strokeWidth={1.5} className="text-clay" />
        <h2 className="font-serif text-lg text-espresso">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/** Lista wartości wymiaru z paskiem udziału. */
function DimList({ rows, total, label, empty = "Brak danych w tym okresie", href }: {
  rows: DimTotal[];
  total: number;
  label: (value: string) => string;
  empty?: string;
  /** Link przy wartości (np. do strony produktu). */
  href?: (value: string) => string | null;
}) {
  if (rows.length === 0) return <p className="text-xs text-charcoal/80">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pctVal = share(r.pageviews, total);
        const link = href?.(r.value) ?? null;
        const text = label(r.value);
        return (
          <li key={r.value || "(pusto)"}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-charcoal" title={r.value || text}>
                {link ? (
                  <Link href={link} className="hover:text-clay transition-colors">{text}</Link>
                ) : text}
              </span>
              <span className="shrink-0 tabular-nums text-espresso">
                {fmt(r.pageviews)}
                <span className="text-[11px] text-charcoal/80"> · {fmt(r.visitors)} os. · {pctVal}%</span>
              </span>
            </div>
            <div className="h-1 bg-sand/60 mt-1">
              <div className="h-full bg-clay/70" style={{ width: `${pctVal}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Słupki (odsłony) z podpisem – godziny, dni tygodnia, miesiące. */
function Bars({ buckets, labelEvery = 1, height = "h-28", tip }: {
  buckets: Bucket[];
  labelEvery?: number;
  height?: string;
  tip?: (b: Bucket) => string;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.pageviews));
  return (
    <div>
      <div className={`flex items-end gap-1 ${height}`}>
        {buckets.map((b) => (
          <div key={b.index} className="flex-1 group relative flex flex-col justify-end h-full">
            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-espresso text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {tip ? tip(b) : `${b.label}: ${fmt(b.pageviews)} odsłon · ${fmt(b.visitors)} os.`}
            </div>
            <div
              className="w-full bg-clay/80 group-hover:bg-clay transition-colors rounded-t-sm"
              style={{ height: `${(b.pageviews / max) * 100}%`, minHeight: b.pageviews > 0 ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {buckets.map((b) => (
          <div key={`l-${b.index}`} className="flex-1 text-center text-[9px] text-charcoal/80 leading-none">
            {b.index % labelEvery === 0 ? b.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function Notice({ tone, title, children }: { tone: "amber" | "red" | "blue"; title: string; children: React.ReactNode }) {
  const cls = {
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    red: "bg-red-50 border-red-200 text-red-800",
    blue: "bg-blue-50 border-blue-200 text-blue-900",
  }[tone];
  return (
    <div className={`border text-sm p-4 leading-relaxed ${cls}`}>
      <p className="font-medium mb-1">{title}</p>
      <div className="text-[13px]">{children}</div>
    </div>
  );
}

// ── Strona ─────────────────────────────────────────────────────────────────────

export default async function RuchPage({
  searchParams,
}: {
  searchParams: Promise<{ dni?: string }>;
}) {
  const { dni } = await searchParams;
  const days = resolveTrafficRange(dni);
  const now = new Date();
  const configured = isTrafficConfigured();

  // Jeden klient Prismy (connection_limit=1) i tak szereguje zapytania do bazy;
  // równolegle idzie tylko API Vercela
  const [overview, syncState, history, products, categories, projects] = await Promise.all([
    getTrafficOverview(days),
    getSyncState(),
    getTrafficHistory([TRAFFIC_TOTAL, TRAFFIC_HOUR, "requestPath", "referrerHostname", "country", "deviceType"]),
    db.product.findMany({ select: { id: true, slug: true, name: true } }).catch(() => []),
    getCategories(),
    getProjects(),
  ]);

  const slugMap = projectSlugs(projects);
  const sources: PathLabelSources = {
    products: new Map(products.map((p) => [p.slug, p.name])),
    categories: new Map(categories.map((c) => [c.slug, c.label])),
    projects: new Map(projects.map((p) => [slugMap.get(p.id) ?? "", p.title])),
  };
  const productIdBySlug = new Map(products.map((p) => [p.slug, p.id]));

  const label = (dimension: TrafficDimension) => (value: string) => dimensionValueLabel(dimension, value, sources);
  const productHref = (value: string) => {
    const slug = productSlugFromPath(value);
    const id = slug ? productIdBySlug.get(slug) : undefined;
    return id ? `/admin/produkty/${id}` : null;
  };

  // ── Na żywo ──
  const { totals, previous } = overview;
  const perVisitor = totals.visitors > 0 ? (totals.pageviews / totals.visitors).toFixed(1) : "–";
  const perDay = Math.round(totals.pageviews / days);
  const prevPerDay = previous ? Math.round(previous.pageviews / days) : null;
  const dailyBuckets: Bucket[] = overview.daily.map((r, i) => ({
    index: i,
    label: r.timestamp.slice(8, 10),
    pageviews: r.pageviews,
    visitors: r.visitors,
  }));
  const liveHours = hourBuckets(overview.hourly);
  const liveWeekdays = weekdayBuckets(overview.daily);
  const topProducts = overview.dims.requestPath.filter((r) => productSlugFromPath(r.value)).slice(0, 10);
  const utmDims = (["utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm"] as const)
    .map((d) => ({ dimension: d, rows: overview.dims[d].filter((r) => r.value !== "") }))
    .filter((d) => d.rows.length > 0);

  // ── Historia ──
  const histTotals = history.rows.filter((r) => r.dimension === TRAFFIC_TOTAL);
  const months = monthBuckets(histTotals);
  const monthBars: Bucket[] = months.map((m, i) => ({
    index: i, label: m.label, pageviews: m.pageviews, visitors: m.visitors,
  }));
  const histAll = histTotals.reduce(
    (acc, r) => ({ pageviews: acc.pageviews + r.pageviews, visitors: acc.visitors + r.visitors }),
    { pageviews: 0, visitors: 0 }
  );
  const histHours = hourBucketsFromStats(history.rows.filter((r) => r.dimension === TRAFFIC_HOUR));
  const histPaths = sumByValue(history.rows.filter((r) => r.dimension === "requestPath"), 200);
  const histProducts = histPaths.filter((r) => productSlugFromPath(r.value)).slice(0, 10);
  const histReferrers = sumByValue(history.rows.filter((r) => r.dimension === "referrerHostname"), 10);
  const histCountries = sumByValue(history.rows.filter((r) => r.dimension === "country"), 10);
  const histDevices = sumByValue(history.rows.filter((r) => r.dimension === "deviceType"), 5);
  const missing = syncState.available ? missingSyncDays({ now, synced: syncState.days }).length : 0;

  return (
    <div className="max-w-5xl space-y-8">
      {/* Nagłówek */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            <Activity size={18} strokeWidth={1.5} className="text-clay" />
            <h1 className="font-serif text-2xl text-espresso">Ruch na stronie</h1>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {TRAFFIC_RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/ruch?dni=${r}`}
              className={`px-3 py-1.5 border transition-colors ${
                r === days
                  ? "bg-clay text-warm-white border-clay"
                  : "border-sand text-charcoal hover:border-clay hover:text-clay"
              }`}
            >
              {r} dni
            </Link>
          ))}
        </div>
      </div>

      {!configured && (
        <Notice tone="amber" title="Vercel Analytics nie jest jeszcze podłączone">
          <ol className="list-decimal pl-5 space-y-1">
            <li>W panelu Vercela otwórz projekt → zakładka <b>Analytics</b> → <b>Enable</b>.</li>
            <li>Utwórz token: <span className="font-mono text-xs">vercel.com/account/tokens</span> (zakres: ten projekt).</li>
            <li>
              Dodaj zmienne środowiskowe <span className="font-mono text-xs">VERCEL_ANALYTICS_TOKEN</span> i{" "}
              <span className="font-mono text-xs">VERCEL_ANALYTICS_PROJECT_ID</span> (Settings → General → Project ID),
              a dla projektu w zespole także <span className="font-mono text-xs">VERCEL_ANALYTICS_TEAM_ID</span>. Zredeployuj.
            </li>
          </ol>
        </Notice>
      )}

      {configured && overview.error && (
        <Notice tone="red" title="Nie udało się pobrać danych z Vercela">{overview.error}</Notice>
      )}

      {!syncState.available && (
        <Notice tone="amber" title="Baza nie ma jeszcze tabeli historii ruchu">
          Uruchom na Supabase migrację{" "}
          <code className="font-mono text-xs">prisma/migrations/manual_add_traffic_stats.sql</code>.
          Do tego czasu widać tylko ostatnie {TRAFFIC_SYNC_WINDOW_DAYS} dni z API – Vercel na planie Hobby
          starszych danych nie oddaje, a bez tabeli nie mamy gdzie ich odkładać.
        </Notice>
      )}

      {/* ── Karty ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Odsłony", value: fmt(totals.pageviews), icon: Eye, cur: totals.pageviews, prev: previous?.pageviews ?? null },
          { label: "Odwiedzający", value: fmt(totals.visitors), icon: Users, cur: totals.visitors, prev: previous?.visitors ?? null },
          { label: "Odsłon na osobę", value: perVisitor, icon: MousePointerClick, cur: null, prev: null },
          { label: "Odsłon dziennie", value: fmt(perDay), icon: CalendarDays, cur: perDay, prev: prevPerDay },
        ].map(({ label, value, icon: Icon, cur, prev }) => (
          <div key={label} className="bg-cream border border-sand/60 p-5">
            <div className="w-9 h-9 bg-warm-white border border-sand/60 rounded-full flex items-center justify-center mb-4">
              <Icon size={17} strokeWidth={1.5} className="text-clay" />
            </div>
            <p className="font-serif text-2xl text-espresso leading-none tabular-nums">{value}</p>
            <p className="text-[11px] text-clay mt-1.5">
              {cur !== null ? <Delta current={cur} previous={prev} /> : `ostatnie ${days} dni`}
            </p>
            <p className="text-[11px] tracking-widest uppercase text-charcoal/80 mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Dziennie ─────────────────────────────────────────────────────── */}
      <Card title={`Odsłony dziennie – ${fmtDay(overview.since)} do ${fmtDay(overview.until)}`} icon={CalendarDays}>
        {dailyBuckets.length ? (
          <Bars
            buckets={dailyBuckets}
            height="h-40"
            labelEvery={days > 14 ? 2 : 1}
            tip={(b) => `${fmtDay(overview.daily[b.index].timestamp.slice(0, 10))}: ${fmt(b.pageviews)} odsłon · ${fmt(b.visitors)} os.`}
          />
        ) : (
          <p className="text-xs text-charcoal/80">Brak danych.</p>
        )}
        {previous === null && configured && !overview.error && days === 30 && (
          <p className="text-[11px] text-charcoal/80 mt-4">
            Porównanie z poprzednim okresem przy 30 dniach wykracza poza okno raportowania planu Hobby – wybierz 7 lub 14 dni.
          </p>
        )}
      </Card>

      {/* ── Strony + produkty ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Najczęściej oglądane strony" icon={Link2}>
          <DimList rows={overview.dims.requestPath.slice(0, 15)} total={totals.pageviews} label={label("requestPath")} href={productHref} />
        </Card>
        <Card title="Najczęściej oglądane produkty" icon={Package}>
          <DimList rows={topProducts} total={totals.pageviews} label={label("requestPath")} href={productHref} empty="Nikt nie oglądał jeszcze kart produktów w tym okresie" />
          <p className="text-[11px] text-charcoal/80 mt-4">
            Zestaw z bestsellerami w <Link href="/admin/analityki" className="text-clay hover:text-espresso">Analityce</Link> – produkt oglądany, a niekupowany, to sygnał do zmiany zdjęcia albo ceny.
          </p>
        </Card>
      </div>

      {/* ── Źródła + kraje ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title={DIMENSION_LABELS.referrerHostname} icon={Compass}>
          <DimList rows={overview.dims.referrerHostname.slice(0, 12)} total={totals.pageviews} label={label("referrerHostname")} />
        </Card>
        <Card title={DIMENSION_LABELS.country} icon={Globe}>
          <DimList rows={overview.dims.country.slice(0, 12)} total={totals.pageviews} label={label("country")} />
        </Card>
      </div>

      {/* ── Urządzenia / przeglądarki / systemy ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(["deviceType", "browserName", "osName"] as const).map((d) => (
          <Card key={d} title={DIMENSION_LABELS[d]} icon={Smartphone}>
            <DimList rows={overview.dims[d].slice(0, 8)} total={totals.pageviews} label={label(d)} />
          </Card>
        ))}
      </div>

      {/* ── Typy stron ───────────────────────────────────────────────────── */}
      <Card title={DIMENSION_LABELS.route} icon={Link2}>
        <p className="text-xs text-charcoal/80 mb-4">
          Wszystkie karty produktów zliczone razem, wszystkie kategorie razem – widać, gdzie ludzie spędzają czas.
        </p>
        <DimList rows={overview.dims.route.slice(0, 12)} total={totals.pageviews} label={label("route")} />
      </Card>

      {/* ── UTM ──────────────────────────────────────────────────────────── */}
      {utmDims.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {utmDims.map(({ dimension, rows }) => (
            <Card key={dimension} title={DIMENSION_LABELS[dimension]} icon={Compass}>
              <DimList rows={rows.slice(0, 10)} total={totals.pageviews} label={label(dimension)} />
            </Card>
          ))}
        </div>
      )}

      {/* ── Godziny + dni tygodnia ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="O której godzinie wchodzą (czas polski)" icon={Clock}>
          <Bars buckets={liveHours} labelEvery={3} />
        </Card>
        <Card title="W które dni tygodnia" icon={CalendarDays}>
          <Bars buckets={liveWeekdays} />
        </Card>
      </div>

      {/* ── Historia ─────────────────────────────────────────────────────── */}
      <div className="bg-cream border border-sand/60 p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database size={15} strokeWidth={1.5} className="text-clay" />
              <h2 className="font-serif text-lg text-espresso">Historia – dane zapisane w sklepie</h2>
            </div>
            <p className="text-xs text-charcoal/80 max-w-2xl">
              Vercel na planie Hobby trzyma dane tylko {TRAFFIC_SYNC_WINDOW_DAYS} dni. Cron zapisuje codziennie
              wczorajszy dzień we wszystkich rozbiciach, więc historia poniżej rośnie bez limitu.
              {syncState.available && history.dayCount > 0 && (
                <> Zapisane dni: <b>{history.dayCount}</b> ({fmtDay(history.firstDay!)} – {fmtDay(history.lastDay!)})
                {syncState.lastSyncedAt && <>, ostatnia synchronizacja {formatWarsaw(syncState.lastSyncedAt)}</>}.</>
              )}
              {syncState.available && history.dayCount === 0 && <> Nic jeszcze nie zapisano – pobierz okno przyciskiem obok.</>}
            </p>
          </div>
          {syncState.available && configured && <TrafficSyncButton missing={missing} />}
        </div>

        {syncState.available && months.length > 0 && (
          <>
            <div>
              <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">
                Odsłony miesięcznie · łącznie {fmt(histAll.pageviews)} odsłon i {fmt(histAll.visitors)} dziennych odwiedzających
              </p>
              <Bars
                buckets={monthBars}
                height="h-40"
                tip={(b) => `${b.label}: ${fmt(b.pageviews)} odsłon · ${fmt(b.visitors)} os. · ${months[b.index].days} dni`}
              />
              <p className="text-[11px] text-charcoal/80 mt-3">
                „Odwiedzający” w historii to suma dziennych unikalnych osób – ktoś, kto wraca codziennie, liczy się w miesiącu wielokrotnie.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] tracking-widest uppercase text-charcoal/80 border-b border-sand">
                    <th className="text-left py-2 font-normal">Miesiąc</th>
                    <th className="text-right py-2 font-normal">Odsłony</th>
                    <th className="text-right py-2 font-normal">Odwiedzający</th>
                    <th className="text-right py-2 font-normal">Dni</th>
                    <th className="text-right py-2 font-normal">Odsłon / dzień</th>
                  </tr>
                </thead>
                <tbody>
                  {[...months].reverse().map((m) => (
                    <tr key={`${m.year}-${m.month}`} className="border-b border-sand/60 tabular-nums">
                      <td className="py-2 text-charcoal">{m.label}</td>
                      <td className="py-2 text-right text-espresso">{fmt(m.pageviews)}</td>
                      <td className="py-2 text-right text-charcoal">{fmt(m.visitors)}</td>
                      <td className="py-2 text-right text-charcoal/80">{m.days}</td>
                      <td className="py-2 text-right text-charcoal">{fmt(Math.round(m.pageviews / m.days))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">Najczęściej oglądane produkty – cała historia</p>
                <DimList rows={histProducts} total={histAll.pageviews} label={label("requestPath")} href={productHref} />
              </div>
              <div>
                <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">Najczęściej oglądane strony – cała historia</p>
                <DimList rows={histPaths.slice(0, 10)} total={histAll.pageviews} label={label("requestPath")} href={productHref} />
              </div>
              <div>
                <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">Źródła wejść – cała historia</p>
                <DimList rows={histReferrers} total={histAll.pageviews} label={label("referrerHostname")} />
              </div>
              <div>
                <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">Kraje – cała historia</p>
                <DimList rows={histCountries} total={histAll.pageviews} label={label("country")} />
              </div>
              <div>
                <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">Urządzenia – cała historia</p>
                <DimList rows={histDevices} total={histAll.pageviews} label={label("deviceType")} />
              </div>
              <div>
                <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">Godziny wejść – cała historia (czas polski)</p>
                <Bars buckets={histHours} labelEvery={3} height="h-24" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
