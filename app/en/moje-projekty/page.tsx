export const revalidate = 300;

import type { Metadata } from "next";
import ProjectsPage, { projectsMetadata } from "@/app/moje-projekty/ProjectsPage";

export const metadata: Metadata = projectsMetadata("en");

export default function Page() {
  return <ProjectsPage locale="en" />;
}
