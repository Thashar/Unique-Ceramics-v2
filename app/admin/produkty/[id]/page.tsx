import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/categories";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id } }),
    getCategories(),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-8">Edytuj produkt</h1>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
