import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getCategories, getCategoryDimensions } from "@/lib/categories";
import { getCollections } from "@/lib/collections";
import ProductForm from "@/components/admin/ProductForm";
import { getSetting } from "@/lib/settings";
import { enProductKey, parseProductTranslation } from "@/lib/i18n-content";
import { parseProductDimensions, productDimensionsKey } from "@/lib/product-dimensions";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories, collections] = await Promise.all([
    db.product.findUnique({ where: { id } }),
    getCategories(),
    getCollections(),
  ]);

  if (!product) notFound();

  // Angielska nazwa i opis oraz wymiary – oba w `Setting` (`en_product_{id}`,
  // `product_dims_{id}`), więc dodanie ich nie wymagało migracji bazy
  const [english, dimensions, categoryDimensions] = await Promise.all([
    getSetting(enProductKey(product.id)).then(parseProductTranslation),
    getSetting(productDimensionsKey(product.id)).then(parseProductDimensions),
    getCategoryDimensions(categories),
  ]);

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-8">Edytuj produkt</h1>
      <ProductForm
        product={product}
        categories={categories}
        collections={collections}
        english={english}
        dimensions={dimensions}
        categoryDimensions={categoryDimensions}
      />
    </div>
  );
}
