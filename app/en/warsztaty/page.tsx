export const revalidate = 300;

import type { Metadata } from "next";
import WorkshopsPage, { workshopsMetadata } from "@/app/warsztaty/WorkshopsPage";

export const metadata: Metadata = workshopsMetadata("en");

export default function Page() {
  return <WorkshopsPage locale="en" />;
}
