export const revalidate = 300;

import type { Metadata } from "next";
import ContactPage, { contactMetadata } from "@/app/kontakt/ContactPage";

export const metadata: Metadata = contactMetadata("en");

export default function Page() {
  return <ContactPage locale="en" />;
}
