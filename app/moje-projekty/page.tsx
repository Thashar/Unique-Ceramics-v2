export const revalidate = 300;

import type { Metadata } from "next";
import ProjectsPage, { projectsMetadata } from "./ProjectsPage";

// Treść siedzi w `ProjectsPage` – ten sam komponent renderuje `/en/moje-projekty`
export const metadata: Metadata = projectsMetadata("pl");

export default function Page() {
  return <ProjectsPage locale="pl" />;
}
