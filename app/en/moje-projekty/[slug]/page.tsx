export const revalidate = 300;

import type { Metadata } from "next";
import ProjectPage, { projectMetadata, projectStaticParams } from "@/app/moje-projekty/[slug]/ProjectPage";

type Params = { params: Promise<{ slug: string }> };

export const generateStaticParams = projectStaticParams;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return projectMetadata(slug, "en");
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  return <ProjectPage slug={slug} locale="en" />;
}
