import Link from "next/link";
import type { Category } from "@/lib/category-defaults";
import { categoryPath } from "@/lib/category-seo";

/**
 * Pasek kategorii nad siatką produktów – wspólny dla `/sklep` i stron kategorii.
 *
 * Przykleja się pod headerem: `--header-offset` ustawia `Header`, więc gdy na
 * mobile chowa się przy przewijaniu w dół, pasek podjeżdża pod samą górę
 * (albo pod baner urlopowy) i zostaje jedynym stałym elementem. Fallback
 * w `var()` odpowiada stanowi przed hydratacją.
 *
 * Synchroniczny komponent serwerowy – dane dostaje propsami.
 */
export default function CategoryBar({
  categories,
  activeSlug,
  vacationEnabled,
}: {
  categories: Category[];
  /** Slug otwartej kategorii; `null` na `/sklep` (zakładka „Wszystkie"). */
  activeSlug: string | null;
  vacationEnabled: boolean;
}) {
  return (
    <div
      className="border-b border-sand bg-cream sticky z-30 shadow-sm"
      style={{
        top: `var(--header-offset, ${vacationEnabled ? "100px" : "80px"})`,
        transition: "top 300ms ease",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 flex gap-1.5 md:gap-2 overflow-x-auto py-2 md:py-4 no-scrollbar">
        {[{ slug: null, label: "Wszystkie" }, ...categories].map((cat) => (
          <Link
            key={cat.slug ?? "wszystkie"}
            href={cat.slug ? categoryPath(cat.slug) : "/sklep"}
            className={`shrink-0 px-3 py-1 md:px-5 md:py-2 text-[10px] md:text-xs tracking-wider md:tracking-widest uppercase transition-all duration-200 ${
              activeSlug === cat.slug
                ? "bg-espresso text-warm-white"
                : "bg-clay text-cream hover:bg-espresso"
            }`}
          >
            {cat.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
