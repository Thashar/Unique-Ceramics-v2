export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCategories, getCategoryDimensions } from "@/lib/categories";
import { getCollections } from "@/lib/collections";
import ProductForm, { type ProductDraft } from "@/components/admin/ProductForm";
import { duplicateName, duplicateSlugBase, nextFreeSlug } from "@/lib/product-duplicate";
import { getSetting } from "@/lib/settings";
import { parseProductDimensions, productDimensionsKey } from "@/lib/product-dimensions";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ kopia?: string }>;
}) {
  const { kopia } = await searchParams;
  const [categories, collections] = await Promise.all([getCategories(), getCollections()]);
  const categoryDimensions = await getCategoryDimensions(categories);

  if (!kopia) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-espresso mb-8">Nowy produkt</h1>
        <ProductForm
          categories={categories}
          collections={collections}
          categoryDimensions={categoryDimensions}
        />
      </div>
    );
  }

  const source = await db.product.findUnique({ where: { id: kopia } });
  // Produkt mógł zostać w międzyczasie usunięty – lepiej powiedzieć to wprost,
  // niż po cichu otworzyć pusty formularz
  if (!source) notFound();

  // Kopia przejmuje wymiary oryginału – to ten sam przedmiot, tylko nowy wpis
  const dimensions = parseProductDimensions(await getSetting(productDimensionsKey(source.id)));

  // Kopia dostaje wolny slug, żeby zapis nie kończył się błędem „Slug już istnieje"
  const slugBase = duplicateSlugBase(source.slug);
  const taken = await db.product.findMany({
    where: { slug: { startsWith: slugBase } },
    select: { slug: true },
  });

  const initial: ProductDraft = {
    name: duplicateName(source.name),
    slug: nextFreeSlug(slugBase, taken.map((t) => t.slug)),
    description: source.description,
    price: source.price,
    images: source.images,
    category: source.category,
    collection: source.collection,
    stock: source.stock,
    featured: source.featured,
    active: source.active,
    variesFromPhoto: source.variesFromPhoto,
    discountPercent: source.discountPercent,
    // Kopia przejmuje też okno rabatu – termin liczy się od tych samych dat
    discountStartsAt: source.discountStartsAt,
    discountEndsAt: source.discountEndsAt,
  };

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-2">Nowy produkt (kopia)</h1>
      <p className="text-sm text-charcoal/80 mb-8">
        Kopia produktu <span className="text-espresso">{source.name}</span> – zdjęcia i dane są
        przepisane, nazwa i adres dostały dopisek. Nowy produkt powstanie dopiero po zapisaniu.
      </p>
      <ProductForm
        initial={initial}
        categories={categories}
        collections={collections}
        dimensions={dimensions}
        categoryDimensions={categoryDimensions}
      />
    </div>
  );
}
