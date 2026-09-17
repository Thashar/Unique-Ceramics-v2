export const revalidate = 300;

import type { Metadata } from "next";
import ProjectPage, { projectMetadata, projectStaticParams } from "./ProjectPage";

type Params = { params: Promise<{ slug: string }> };

// Treść siedzi w `ProjectPage` – ten sam komponent renderuje `/en/moje-projekty/[slug]`
export const generateStaticParams = projectStaticParams;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return projectMetadata(slug, "pl");
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  return <ProjectPage slug={slug} locale="pl" />;
}
