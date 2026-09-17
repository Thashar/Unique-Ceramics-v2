export const revalidate = 60;

import type { Metadata } from "next";
import CategoryPage, { categoryMetadata, categoryStaticParams } from "@/app/sklep/kategoria/[slug]/CategoryPage";

type Params = { params: Promise<{ slug: string }> };

export const generateStaticParams = categoryStaticParams;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return categoryMetadata(slug, "en");
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  return <CategoryPage slug={slug} locale="en" />;
}
