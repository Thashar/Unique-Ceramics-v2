import { getCategories } from "@/lib/categories";
import ProductForm from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-8">Nowy produkt</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
