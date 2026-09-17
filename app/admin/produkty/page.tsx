export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Languages, Plus, ShoppingBag, Star } from "lucide-react";
import ProductsSearch from "@/components/admin/ProductsSearch";
import ProductRowActions from "@/components/admin/ProductRowActions";
import ProductAgent from "@/components/admin/ProductAgent";
import { getSettings } from "@/lib/settings";
import { getCollections } from "@/lib/collections";
import { AI_PRESET_SETTING_KEY, AI_PRESETS_SETTING_KEY, allAiPresets, parseAiPresets, resolveAiPreset } from "@/lib/ai";
import { getCategories } from "@/lib/categories";
import { productOrderBy, resolveProductSort, sortByName } from "@/lib/product-sort";
import { discountState, type DiscountState } from "@/lib/product-price";
import { formatWarsaw } from "@/lib/warsaw-time";
import { EN_KEY_PREFIX, parseEnglishRows, type ProductTranslation } from "@/lib/i18n-content";

/**
 * Znaczek wersji angielskiej przy nazwie produktu. Produkt bez angielskiej
 * nazwy i opisu „jedzie na bypassie” – `/en` pokazuje polski tekst – więc
 * bursztynowy znaczek z ikoną języków mówi, że w formularzu (zakładka EN)
 * jest jeszcze coś do wypełnienia. Zielony = komplet.
 */
function EnglishBadge({ translation }: { translation?: ProductTranslation }) {
  const hasName = Boolean(translation?.name);
  const hasDescription = Boolean(translation?.description.trim());
  if (hasName && hasDescription) {
    return (
      <span
        title="Wersja angielska: nazwa i opis uzupełnione"
        className="inline-flex items-center gap-1 text-[10px] tracking-wide uppercase px-1.5 py-0.5 rounded-sm shrink-0 bg-green-50 text-green-700 ring-1 ring-green-200"
      >
        <Languages size={10} strokeWidth={2} aria-hidden="true" />
        EN
      </span>
    );
  }
  const missing = !hasName && !hasDescription ? "nazwy i opisu" : !hasName ? "nazwy" : "opisu";
  return (
    <span
      title={`Brak angielskiej ${missing} – na /en pokazuje się polski tekst. Uzupełnij w zakładce EN formularza produktu.`}
      className="inline-flex items-center gap-1 text-[10px] tracking-wide uppercase px-1.5 py-0.5 rounded-sm shrink-0 bg-amber-50 text-amber-800 ring-1 ring-amber-200"
    >
      <Languages size={10} strokeWidth={2} aria-hidden="true" />
      EN?
    </span>
  );
}

/** Kolory znacznika rabatu – zielony dla działającego, bursztyn dla zaplanowanego. */
const DISCOUNT_BADGE: Record<Exclude<DiscountState, "none">, string> = {
  active: "bg-green-50 text-green-700 ring-1 ring-green-200",
  scheduled: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  expired: "bg-charcoal/8 text-charcoal/80",
};

/** Podpowiedź pod kursorem: od kiedy i do kiedy rabat obowiązuje (czas polski). */
function discountTitle(
  state: Exclude<DiscountState, "none">,
  startsAt: Date | null,
  endsAt: Date | null
): string {
  if (state === "expired") return `Rabat zakończył się ${formatWarsaw(endsAt)}`;
  if (state === "scheduled") {
    return endsAt
      ? `Rabat od ${formatWarsaw(startsAt)} do ${formatWarsaw(endsAt)}`
      : `Rabat od ${formatWarsaw(startsAt)}, bezterminowo`;
  }
  return endsAt ? `Rabat obowiązuje do ${formatWarsaw(endsAt)}` : "Rabat bezterminowy";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kat?: string; status?: string; sort?: string }>;
}) {
  const { q, kat, status, sort: sortParam } = await searchParams;
  const sort = resolveProductSort(sortParam);

  const [categories, rows] = await Promise.all([
    getCategories(),
    db.product.findMany({
    where: {
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(kat ? { category: kat } : {}),
      ...(status === "active" ? { active: true } : {}),
      ...(status === "inactive" ? { active: false } : {}),
      ...(status === "outofstock" ? { active: true, stock: 0 } : {}),
    },
    // Sortowanie po nazwie dokłada sortByName (polska kolejność), więc baza
    // zwraca wtedy domyślną kolejność
    orderBy: productOrderBy(sort) ?? { createdAt: "desc" },
  }),
  ]);
  const products = sortByName(rows, sort);
  // Dane dla agenta dodawania produktów: kurs USD→PLN (podsumowanie kosztu),
  // kolekcje (pytanie o serię), presety promptów (wybór stylu zdjęć) i preset
  // przypisany do każdego z przycisków AI (proponowany jako domyślny)
  const agentSettings = await getSettings([
    "ai_usd_pln_rate", AI_PRESETS_SETTING_KEY, AI_PRESET_SETTING_KEY.ai, AI_PRESET_SETTING_KEY.ai_plus,
  ]);
  const usdPlnRate = Math.max(0, parseFloat(agentSettings.ai_usd_pln_rate.replace(",", ".")) || 0);
  const customPresets = parseAiPresets(agentSettings[AI_PRESETS_SETTING_KEY]);
  const presets = allAiPresets(customPresets).map((p) => ({ id: p.id, name: p.name }));
  const defaultPreset = {
    ai: resolveAiPreset("ai", agentSettings[AI_PRESET_SETTING_KEY.ai], customPresets).id,
    ai_plus: resolveAiPreset("ai_plus", agentSettings[AI_PRESET_SETTING_KEY.ai_plus], customPresets).id,
  };
  const collections = (await getCollections()).map((c) => ({ slug: c.slug, label: c.label }));

  // Angielskie wersje (`en_product_{id}` w `Setting`) – do znaczka przy nazwie.
  // Odczyt w try/catch: brak tłumaczeń nie może wywrócić listy produktów
  let english: Record<string, ProductTranslation> = {};
  try {
    const rowsEn = await db.setting.findMany({
      where: { key: { startsWith: `${EN_KEY_PREFIX}product_` } },
      select: { key: true, value: true },
    });
    english = parseEnglishRows(rowsEn).products;
  } catch (e) {
    console.error("[admin/produkty] odczyt tłumaczeń:", e);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-espresso">Produkty</h1>
          <p className="text-sm text-charcoal/80 mt-0.5">{products.length} wyników</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Agent dodawania produktów: jedno zdjęcie → rozmowa → kompletny produkt (patrz `ProductAgent`) */}
          <ProductAgent
            usdPlnRate={usdPlnRate}
            categories={categories.map((c) => ({ slug: c.slug, label: c.label }))}
            collections={collections}
            presets={presets}
            defaultPreset={defaultPreset}
          />
          <Link
            href="/admin/produkty/nowy"
            className="flex items-center gap-2 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-xs tracking-widest uppercase px-4 py-2.5 transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Dodaj produkt</span>
            <span className="sm:hidden">Dodaj</span>
          </Link>
        </div>
      </div>

      <Suspense fallback={null}>
        <ProductsSearch categories={categories} />
      </Suspense>

      {products.length === 0 ? (
        <div className="bg-cream border border-sand/60 text-center py-16 text-charcoal/80">
          <ShoppingBag size={36} strokeWidth={1} className="mx-auto mb-4 text-sand" />
          <p className="text-sm">
            {q || kat || status
              ? "Brak produktów pasujących do filtrów."
              : <>Brak produktów. <Link href="/admin/produkty/nowy" className="text-clay hover:underline">Dodaj pierwszy</Link></>
            }
          </p>
        </div>
      ) : (
        <div className="bg-cream border border-sand/60">
          {/* Nagłówek tabeli – tylko desktop */}
          <div className="hidden md:grid md:grid-cols-[72px_1fr_120px_96px_100px_56px] text-[11px] tracking-widest uppercase text-charcoal/80 px-4 py-3 border-b border-sand">
            <span>Zdjęcie</span>
            <span>Nazwa</span>
            <span className="text-right">Cena</span>
            <span className="text-center">Stan</span>
            <span className="text-center">Status</span>
            <span className="text-right">Opcje</span>
          </div>

          {products.map((product) => (
            <div key={product.id} className="border-b border-sand/60 last:border-0 hover:bg-warm-white transition-colors">

              {/* Mobile */}
              <div className="md:hidden flex items-center gap-3 px-4 py-3">
                <div className="w-14 h-14 bg-warm-white relative overflow-hidden shrink-0">
                  {product.images[0] ? (
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={16} strokeWidth={1} className="text-sand" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/produkty/${product.id}`}
                      className="text-sm font-medium text-espresso truncate hover:text-clay transition-colors"
                    >
                      {product.name}
                    </Link>
                    {product.featured && <Star size={11} className="text-clay shrink-0 fill-clay" />}
                    {(() => {
                      // Rabat produktowy: kolor mówi, czy działa teraz, czeka na
                      // swój termin, czy już się skończył
                      const state = discountState(product);
                      if (state === "none") return null;
                      return (
                        <span
                          title={discountTitle(state, product.discountStartsAt, product.discountEndsAt)}
                          className={`text-[10px] tracking-wide uppercase px-1.5 py-0.5 rounded-sm shrink-0 ${DISCOUNT_BADGE[state]}`}
                        >
                          −{product.discountPercent}%
                        </span>
                      );
                    })()}
                    <EnglishBadge translation={english[product.id]} />
                  </div>
                  <p className="text-xs text-charcoal/80 capitalize">{product.category}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-[10px] tracking-wide uppercase px-1.5 py-0.5 rounded-sm ${
                      !product.active
                        ? "bg-charcoal/8 text-charcoal/80"
                        : product.stock === 0
                        ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                        : "bg-green-50 text-green-700 ring-1 ring-green-200"
                    }`}>
                      {!product.active ? "Ukryty" : product.stock === 0 ? "Brak" : `${product.stock} szt.`}
                    </span>
                    <span className="text-sm text-espresso tabular-nums">
                      {product.price.toFixed(2).replace(".", ",")} zł
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <ProductRowActions productId={product.id} productName={product.name} />
                </div>
              </div>

              {/* Desktop */}
              <div className="hidden md:grid md:grid-cols-[72px_1fr_120px_96px_100px_56px] items-center px-4 py-3 gap-x-2">
                <div className="w-14 h-12 bg-warm-white relative overflow-hidden">
                  {product.images[0] ? (
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={14} strokeWidth={1} className="text-sand" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/produkty/${product.id}`}
                      className="text-sm font-medium text-espresso truncate hover:text-clay transition-colors"
                    >
                      {product.name}
                    </Link>
                    {product.featured && <Star size={11} className="text-clay shrink-0 fill-clay" />}
                    {(() => {
                      // Rabat produktowy: kolor mówi, czy działa teraz, czeka na
                      // swój termin, czy już się skończył
                      const state = discountState(product);
                      if (state === "none") return null;
                      return (
                        <span
                          title={discountTitle(state, product.discountStartsAt, product.discountEndsAt)}
                          className={`text-[10px] tracking-wide uppercase px-1.5 py-0.5 rounded-sm shrink-0 ${DISCOUNT_BADGE[state]}`}
                        >
                          −{product.discountPercent}%
                        </span>
                      );
                    })()}
                    <EnglishBadge translation={english[product.id]} />
                  </div>
                  <p className="text-xs text-charcoal/80 capitalize mt-0.5">{product.category}</p>
                </div>
                <div className="text-right text-sm text-espresso tabular-nums">
                  {product.price.toFixed(2).replace(".", ",")} zł
                </div>
                <div className="text-center text-sm text-espresso tabular-nums">
                  {product.stock}
                </div>
                <div className="text-center">
                  <span className={`text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-sm ${
                    !product.active
                      ? "bg-charcoal/8 text-charcoal/80"
                      : product.stock === 0
                      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                      : "bg-green-50 text-green-700 ring-1 ring-green-200"
                  }`}>
                    {!product.active ? "Ukryty" : product.stock === 0 ? "Brak" : "Aktywny"}
                  </span>
                </div>
                <div className="text-right">
                  <ProductRowActions productId={product.id} productName={product.name} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
