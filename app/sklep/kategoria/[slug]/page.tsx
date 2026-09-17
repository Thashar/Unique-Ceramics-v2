// Ten sam czas życia co katalog – siatka produktów pochodzi z `getShopProducts`
export const revalidate = 60;

import type { Metadata } from "next";
import CategoryPage, { categoryMetadata, categoryStaticParams } from "./CategoryPage";

type Params = { params: Promise<{ slug: string }> };

// Treść siedzi w `CategoryPage` – ten sam komponent renderuje `/en/sklep/kategoria/[slug]`
export const generateStaticParams = categoryStaticParams;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return categoryMetadata(slug, "pl");
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  return <CategoryPage slug={slug} locale="pl" />;
}
