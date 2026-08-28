// Ten sam czas życia co katalog – siatka produktów pochodzi z `getShopProducts`
export const revalidate = 60;

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
import { SITE_URL, absoluteUrl, metaDescription, pageMetadata } from "@/lib/seo";
import {
  categoryDescription,
  categoryIntroKey,
  categoryPath,
  categoryTitle,
} from "@/lib/category-seo";
import ProductGrid from "../../ProductGrid";
import CategoryBar from "../../CategoryBar";
import { loadCatalog } from "../../catalog";

/** Kategorie mają stały, niewielki zbiór adresów – pre-generujemy wszystkie. */
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

async function findCategory(slug: string) {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) {
    return { title: "Kategoria nie istnieje", robots: { index: false, follow: false } };
  }

  // Opis idzie **tylko** do metadanych – na stronie go nie drukujemy.
  // Własny tekst z panelu ma pierwszeństwo; przycinamy go, bo w wyniku
  // wyszukiwania i tak zmieści się około 160 znaków
  const custom = (await getSetting(categoryIntroKey(slug))).trim();

  return pageMetadata({
    title: categoryTitle(category.label),
    description: metaDescription(custom || categoryDescription(category.label)),
    path: categoryPath(slug),
    ogTitle: `${category.label} – Unique Ceramics`,
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();

  // Zapytania sekwencyjne – każde zwalnia połączenie przed kolejnym, co chroni
  // przed wyczerpaniem puli (Supabase: 15 połączeń w trybie sesji)
  const vacationEnabled = (await getSetting("vacation_enabled")) === "true";
  const categories = await getCategories();
  // Opis kategorii **nie jest drukowany na stronie** – trafia do metadanych
  // (patrz `generateMetadata`) i do danych strukturalnych niżej
  const customDescription = (await getSetting(categoryIntroKey(slug))).trim();
  const description = customDescription || categoryDescription(category.label);

  const hold = { holdMs: DISCOUNT_HOLD_CATALOG_MS };
  const quantityTeaser = quantityPromoTeaser(toQuantityConfig(await findActiveQuantityPromo(hold)));
  const freeShippingNote = (await findActiveFreeShipping(hold)) !== null;

  const { products, dbError } = await loadCatalog(slug);

  // Lista produktów kategorii dla wyszukiwarki – pozycje w kolejności widocznej
  // na stronie. Ceny są na kartach produktów, tu wystarczą nazwy i adresy
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}${categoryPath(slug)}#collection`,
    url: `${SITE_URL}${categoryPath(slug)}`,
    name: categoryTitle(category.label),
    description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "pl-PL",
    ...(products.length > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: products.length,
            itemListElement: products.slice(0, 30).map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: p.name,
              url: `${SITE_URL}/sklep/${p.slug}`,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Sklep", path: "/sklep" },
          { name: category.label, path: categoryPath(slug) },
        ]}
      />
      <Header />
      <div className="min-h-[100svh] bg-warm-white">
        <CategoryBar
          categories={categories}
          activeSlug={slug}
          vacationEnabled={vacationEnabled}
        />

        {/* Nagłówek kategorii. Opisu tu **nie ma świadomie** – idzie wyłącznie
            do metadanych i danych strukturalnych (decyzja właściciela 28.08.2026).
            Nie dodawaj go z powrotem jako ukrytego akapitu – tekst niewidoczny
            dla użytkownika, a podany robotowi, to cloaking */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 md:pt-12">
          <ClayRule className="mb-6" />
          <h1 className="font-serif text-3xl md:text-4xl text-espresso">{category.label}</h1>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-16 md:pt-8 md:pb-16">
          <ProductGrid
            products={products}
            kategoria={slug}
            dbError={dbError}
            categories={categories}
            quantityTeaser={quantityTeaser}
            freeShippingNote={freeShippingNote}
          />
        </div>
      </div>

      <Footer />
    </>
  );
}
