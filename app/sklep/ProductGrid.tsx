"use client";

import { useState, useSyncExternalStore } from "react";
import { LayoutGrid, Grid3X3, ShoppingBag } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import type { getShopProducts } from "@/lib/products";
import { categoryLabel, type Category } from "@/lib/category-defaults";

type Product = Awaited<ReturnType<typeof getShopProducts>>["inStock"][0];
type Layout = "standard" | "compact";

const LAYOUT_KEY = "sklep-layout";
const PER_PAGE_KEY = "sklep-na-stronie";
const PER_PAGE_OPTIONS = [30, 50, 100] as const;
const DEFAULT_PER_PAGE = 30;

interface Props {
  products: Product[];
  kategoria?: string;
  dbError: boolean;
  /** Kategorie sklepu – potrzebne, bo produkt trzyma slug, a pokazujemy etykietę. */
  categories: Category[];
}

/**
 * Preferencje widoku czytamy przez `useSyncExternalStore`, a nie `setState` w efekcie:
 * serwer renderuje wartość domyślną, klient od razu podmienia zapisaną – bez
 * rozjazdu hydratacji i bez migotania listy.
 */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  const mq = window.matchMedia("(max-width: 767px)");
  mq.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    mq.removeEventListener("change", onChange);
  };
}

function useLayoutPreference(): Layout {
  return useSyncExternalStore(
    subscribe,
    () => {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved === "standard" || saved === "compact") return saved;
      // Bez zapisanej preferencji: na telefonie gęstsza siatka (3 produkty w wierszu)
      return window.matchMedia("(max-width: 767px)").matches ? "compact" : "standard";
    },
    () => "standard" as Layout
  );
}

function usePerPagePreference(): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      const saved = Number(localStorage.getItem(PER_PAGE_KEY));
      return PER_PAGE_OPTIONS.includes(saved as (typeof PER_PAGE_OPTIONS)[number])
        ? saved
        : DEFAULT_PER_PAGE;
    },
    () => DEFAULT_PER_PAGE
  );
}

export default function ProductGrid({ products, kategoria, dbError, categories }: Props) {
  const storedLayout = useLayoutPreference();
  const storedPerPage = usePerPagePreference();
  // Nadpisania z bieżącej sesji – zapis do localStorage nie powiadamia własnej karty
  const [layoutOverride, setLayoutOverride] = useState<Layout | null>(null);
  const [perPageOverride, setPerPageOverride] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const layout = layoutOverride ?? storedLayout;
  const perPage = perPageOverride ?? storedPerPage;
  const pageCount = Math.max(1, Math.ceil(products.length / perPage));

  const chooseLayout = (next: Layout) => {
    setLayoutOverride(next);
    localStorage.setItem(LAYOUT_KEY, next);
  };

  const choosePerPage = (next: number) => {
    setPerPageOverride(next);
    setPage(1);
    localStorage.setItem(PER_PAGE_KEY, String(next));
  };

  if (dbError) {
    return (
      <div className="text-center py-24">
        <ShoppingBag size={48} strokeWidth={1} className="mx-auto text-sand mb-6" />
        <p className="font-serif text-2xl text-espresso mb-2">Sklep chwilowo niedostępny</p>
        <p className="text-charcoal/80 text-sm">Spróbuj ponownie za chwilę.</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-24">
        <ShoppingBag size={48} strokeWidth={1} className="mx-auto text-sand mb-6" />
        <p className="font-serif text-2xl text-espresso mb-2">Brak produktów</p>
        <p className="text-charcoal/80 text-sm">
          {kategoria ? "Brak produktów w tej kategorii." : "Sklep jest w przygotowaniu."}
        </p>
      </div>
    );
  }

  const compact = layout === "compact";
  // Klamrowanie zamiast korekty w efekcie: po zmianie kategorii albo liczby na stronę
  // numer strony może wypaść poza zakres, a lista i tak ma pokazać istniejącą stronę
  const currentPage = Math.min(page, pageCount);
  const visible = products.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-3 md:mb-8">
        <p className="text-xs text-charcoal/80 tracking-widest uppercase">
          {products.length}{" "}
          {products.length === 1 ? "produkt" : products.length < 5 ? "produkty" : "produktów"}
        </p>

        <div className="flex items-center gap-3">
          {/* Liczba produktów na stronę – widoczna tylko gdy jest co dzielić */}
          {products.length > PER_PAGE_OPTIONS[0] && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-charcoal/80 tracking-widest uppercase hidden sm:inline">
                Na stronie
              </span>
              <div className="flex items-center">
                {PER_PAGE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => choosePerPage(option)}
                    aria-pressed={perPage === option}
                    className={`px-2 py-1 text-xs tabular-nums transition-colors ${
                      perPage === option
                        ? "text-espresso font-medium"
                        : "text-charcoal/80 hover:text-espresso"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => chooseLayout("standard")}
              className={`p-1.5 transition-colors ${
                !compact ? "text-espresso" : "text-charcoal/80 hover:text-espresso"
              }`}
              aria-label="Widok standardowy"
              title="Widok standardowy"
            >
              <LayoutGrid size={18} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => chooseLayout("compact")}
              className={`p-1.5 transition-colors ${
                compact ? "text-espresso" : "text-charcoal/80 hover:text-espresso"
              }`}
              aria-label="Widok kompaktowy"
              title="Widok kompaktowy"
            >
              <Grid3X3 size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <div
        className={
          compact
            ? "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4"
            : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8"
        }
      >
        {visible.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            compact={compact}
            categoryLabel={categoryLabel(product.category, categories)}
          />
        ))}
      </div>

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-1.5 mt-12" aria-label="Strony produktów">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((number) => (
            <button
              key={number}
              onClick={() => setPage(number)}
              aria-current={number === currentPage ? "page" : undefined}
              className={`w-9 h-9 text-sm tabular-nums border transition-colors ${
                number === currentPage
                  ? "border-espresso bg-espresso text-cream"
                  : "border-sand text-charcoal hover:border-clay hover:text-espresso"
              }`}
            >
              {number}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
