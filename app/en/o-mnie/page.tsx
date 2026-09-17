export const revalidate = 300;

import type { Metadata } from "next";
import AboutPage, { aboutMetadata } from "@/app/o-mnie/AboutPage";

export const metadata: Metadata = aboutMetadata("en");

export default function Page() {
  return <AboutPage locale="en" />;
}
