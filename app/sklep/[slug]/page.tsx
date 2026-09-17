import type { Metadata } from "next";
import ProductPage, { productMetadata, productStaticParams } from "./ProductPage";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

// Treść siedzi w `ProductPage` – ten sam komponent renderuje `/en/sklep/[slug]`
export const generateStaticParams = productStaticParams;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return productMetadata(slug, "pl");
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  return <ProductPage slug={slug} locale="pl" />;
}
