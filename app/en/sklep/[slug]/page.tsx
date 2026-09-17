import type { Metadata } from "next";
import ProductPage, { productMetadata, productStaticParams } from "@/app/sklep/[slug]/ProductPage";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export const generateStaticParams = productStaticParams;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return productMetadata(slug, "en");
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  return <ProductPage slug={slug} locale="en" />;
}
