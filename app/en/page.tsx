import type { Metadata } from "next";
import HomePage, { homeMetadata } from "../HomePage";

export const revalidate = 3600;

export const metadata: Metadata = homeMetadata("en");

export default function HomeEn() {
  return <HomePage locale="en" />;
}
