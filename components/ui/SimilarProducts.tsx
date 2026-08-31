"use client";

import ProductCard from "@/components/ui/ProductCard";
import ClayRule from "@/components/ui/ClayRule";
import { categoryLabel, type Category } from "@/lib/category-defaults";
import { DRAG_SCROLL_CLASS, HINT_FADE_MS, useDragScroll } from "@/lib/use-drag-scroll";

type CarouselProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  images: string[];
  stock: number;
  /** Rabat produktowy w procentach – kafelek pokazuje cenę już po nim. */
  discountPercent?: number;
};

/**
 * Karuzela „Mogą Ci się spodobać” pod kartą produktu. Dobór robi serwer
 * (`lib/similar-products.ts`), tutaj zostaje sama prezentacja.
 *
 * Taśma przewija się tak samo jak miniatury w galerii – palcem, kursorem
 * i kółkiem (`useDragScroll`), ze wskaźnikiem widocznym wyłącznie w trakcie
 * ruchu. Bez strzałek: ta sama konwencja co w galerii.
 */
export default function SimilarProducts({
  products,
  categories,
  title = "Mogą Ci się spodobać",
}: {
  products: CarouselProduct[];
  categories: Category[];
  title?: string;
}) {
  const { attach, onScroll, hint } = useDragScroll();

  if (products.length === 0) return null;

  return (
    <section className="bg-cream py-16 px-6 lg:px-10" aria-label={title}>
      <div className="max-w-7xl mx-auto">
        <ClayRule className="mb-7" />
        <h2 className="font-serif text-2xl md:text-3xl text-espresso mb-8">{title}</h2>

        {/* Kafelki są **o połowę węższe** od kart katalogu (decyzja właściciela
            31.08.2026) i idą w wariancie `compact`, żeby tytuł i cena zgadzały
            się ze zmniejszonym kadrem. Na telefonie zostają trzy w rzędzie –
            przy czterech nazwa produktu łamała się co słowo. Kafelek węższy niż
            kolumna sprawia, że wystający fragment następnego mówi, że taśmę da
            się przesunąć, bez dokładania strzałek */}
        <div ref={attach} onScroll={onScroll} className={`flex gap-3 md:gap-4 ${DRAG_SCROLL_CLASS}`}>
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[28%] sm:w-[24%] md:w-[18%] lg:w-[12%] shrink-0"
            >
              <ProductCard
                product={product}
                compact
                categoryLabel={categoryLabel(product.category, categories)}
              />
            </div>
          ))}
        </div>

        {/* Wskaźnik przewijania – ten sam wzorzec co pod miniaturami galerii */}
        <div className="relative mt-4 h-0.5" aria-hidden="true">
          <div
            className="absolute inset-y-0 bg-clay rounded-full"
            style={{
              width: `${hint.size * 100}%`,
              left: `${hint.progress * (100 - hint.size * 100)}%`,
              opacity: hint.visible ? 1 : 0,
              transition: hint.visible
                ? "opacity 120ms ease-out"
                : `opacity ${HINT_FADE_MS}ms ease-in`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
