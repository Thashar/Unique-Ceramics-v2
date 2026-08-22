export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import ProductForm, { type ProductDraft } from "@/components/admin/ProductForm";
import { duplicateName, duplicateSlugBase, nextFreeSlug } from "@/lib/product-duplicate";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ kopia?: string }>;
}) {
  const { kopia } = await searchParams;
  const categories = await getCategories();

  if (!kopia) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-espresso mb-8">Nowy produkt</h1>
        <ProductForm categories={categories} />
      </div>
    );
  }

  const source = await db.product.findUnique({ where: { id: kopia } });
  // Produkt mógł zostać w międzyczasie usunięty – lepiej powiedzieć to wprost,
  // niż po cichu otworzyć pusty formularz
  if (!source) notFound();

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
    stock: source.stock,
    featured: source.featured,
    active: source.active,
    variesFromPhoto: source.variesFromPhoto,
    discountPercent: source.discountPercent,
  };

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-2">Nowy produkt (kopia)</h1>
      <p className="text-sm text-charcoal/80 mb-8">
        Kopia produktu <span className="text-espresso">{source.name}</span> – zdjęcia i dane są
        przepisane, nazwa i adres dostały dopisek. Nowy produkt powstanie dopiero po zapisaniu.
      </p>
      <ProductForm initial={initial} categories={categories} />
    </div>
  );
}
