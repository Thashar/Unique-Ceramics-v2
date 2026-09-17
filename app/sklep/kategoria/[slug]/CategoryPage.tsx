import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import ClayRule from "@/components/ui/ClayRule";
import { getCategories } from "@/lib/categories";
import { getSetting } from "@/lib/settings";
import { findActiveFreeShipping, findActiveQuantityPromo, toQuantityConfig } from "@/lib/promos";
import { quantityPromoTeaser } from "@/lib/quantity-promo";
import { DISCOUNT_HOLD_CATALOG_MS } from "@/lib/product-price";
import { SITE_URL, absoluteUrl, metaDescription, ogImage, pageMetadata } from "@/lib/seo";
import { categoryDescription, categoryPath, categoryTitle } from "@/lib/category-seo";
import ProductGrid from "../../ProductGrid";
import CategoryBar from "../../CategoryBar";
import { loadCatalog } from "../../catalog";
import { jsonLdHtml } from "@/lib/escape-html";
import { SCHEMA_LANG, localePath, type Locale } from "@/lib/i18n";
import { t } from "@/lib/dictionary";
import { englishContentFor } from "@/lib/content-translations";
import { localizeCategories, localizeProduct } from "@/lib/i18n-content";

/** Kategorie mają stały, niewielki zbiór adresów – pre-generujemy wszystkie. */
export async function categoryStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

/** Kategoria z etykietą w języku strony (angielska z panelu, jeśli jest). */
async function findCategory(slug: string, locale: Locale) {
  const categories = localizeCategories(locale, await getCategories(), await englishContentFor(locale));
  return { category: categories.find((c) => c.slug === slug) ?? null, categories };
}

export async function categoryMetadata(slug: string, locale: Locale): Promise<Metadata> {
  const { category } = await findCategory(slug, locale);
  if (!category) {
    return { title: t(locale).meta.categoryMissing, robots: { index: false, follow: false } };
  }

  // Opis idzie **tylko** do metadanych – na stronie go nie drukujemy.
  // Układa go szablon z nazwy kategorii; przycinamy, bo w wyniku wyszukiwania
  // i tak zmieści się około 160 znaków
  return pageMetadata({
    title: categoryTitle(category.label, locale),
    description: metaDescription(categoryDescription(category.label, locale)),
    path: categoryPath(slug),
    ogTitle: `${category.label} – Unique Ceramics`,
    // Podgląd linku = zdjęcie pierwszego produktu z kategorii (JPEG z `/api/og/kategoria`)
    image: ogImage(`/api/og/kategoria/${slug}`, `${category.label} – Unique Ceramics`),
    locale,
  });
}

export default async function CategoryPage({ slug, locale = "pl" }: { slug: string; locale?: Locale }) {
  const d = t(locale);
  const { category, categories } = await findCategory(slug, locale);
  if (!category) notFound();

  // Zapytania sekwencyjne – każde zwalnia połączenie przed kolejnym, co chroni
  // przed wyczerpaniem puli (Supabase: 15 połączeń w trybie sesji)
  const vacationEnabled = (await getSetting("vacation_enabled")) === "true";
  const lowStockBadge = (await getSetting("low_stock_badge_enabled")) !== "false";
  // Opis kategorii **nie jest drukowany na stronie** – trafia do metadanych
  // (patrz `categoryMetadata`) i do danych strukturalnych niżej
  const description = categoryDescription(category.label, locale);

  // Zachęty promocyjne tylko po polsku – na wersji angielskiej nie da się kupować
  const hold = { holdMs: DISCOUNT_HOLD_CATALOG_MS };
  const quantityTeaser =
    locale === "pl" ? quantityPromoTeaser(toQuantityConfig(await findActiveQuantityPromo(hold))) : null;
  const freeShippingNote = locale === "pl" && (await findActiveFreeShipping(hold)) !== null;

  const { products: rawProducts, dbError } = await loadCatalog(slug);
  const en = await englishContentFor(locale);
  const products = rawProducts.map((p) => localizeProduct(locale, p, en));

  const pageUrl = `${SITE_URL}${localePath(locale, categoryPath(slug))}`;
  // Lista produktów kategorii dla wyszukiwarki – pozycje w kolejności widocznej
  // na stronie. Ceny są na kartach produktów, tu wystarczą nazwy i adresy
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    url: pageUrl,
    name: categoryTitle(category.label, locale),
    description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: SCHEMA_LANG[locale],
    ...(products.length > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: products.length,
            itemListElement: products.slice(0, 30).map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: p.name,
              url: `${SITE_URL}${localePath(locale, `/sklep/${p.slug}`)}`,
              ...(p.images[0] ? { image: absoluteUrl(p.images[0]) } : {}),
            })),
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(collectionSchema) }}
      />
      <BreadcrumbSchema
        locale={locale}
        items={[
          { name: d.nav.shop, path: "/sklep" },
          { name: category.label, path: categoryPath(slug) },
        ]}
      />
      <Header locale={locale} />
      <div className="min-h-[100svh] bg-warm-white">
        <CategoryBar
          categories={categories}
          activeSlug={slug}
          vacationEnabled={vacationEnabled}
          locale={locale}
        />

        {/* Nagłówek kategorii. Opisu tu **nie ma świadomie** – idzie wyłącznie
            do metadanych i danych strukturalnych (decyzja właściciela 28.08.2026).
            Nie dodawaj go z powrotem jako ukrytego akapitu – tekst niewidoczny
            dla użytkownika, a podany robotowi, to cloaking */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 md:pt-12">
          {/* Nagłówek na linii ozdobnej jak w /sklep */}
          <ClayRule>
            <h1 className="font-serif text-3xl md:text-4xl text-espresso leading-tight">{category.label}</h1>
          </ClayRule>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-16 md:pt-8 md:pb-16">
          <ProductGrid
            products={products}
            kategoria={slug}
            dbError={dbError}
            categories={categories}
            quantityTeaser={quantityTeaser}
            freeShippingNote={freeShippingNote}
            lowStockBadge={lowStockBadge}
          />
        </div>
      </div>

      <Footer locale={locale} />
    </>
  );
}
