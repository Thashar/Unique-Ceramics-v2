import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/categories";
import { getCollections } from "@/lib/collections";
import ProductForm from "@/components/admin/ProductForm";
import { getSetting } from "@/lib/settings";
import { enProductKey, parseProductTranslation } from "@/lib/i18n-content";

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

  // Angielska nazwa i opis – zakładka EN formularza (klucz `en_product_{id}` w `Setting`)
  const english = parseProductTranslation(await getSetting(enProductKey(product.id)));

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-8">Edytuj produkt</h1>
      <ProductForm product={product} categories={categories} collections={collections} english={english} />
    </div>
  );
}
