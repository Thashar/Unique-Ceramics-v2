export const revalidate = 60;

import type { Metadata } from "next";
import ShopPage, { shopMetadata } from "@/app/sklep/ShopPage";

export const metadata: Metadata = shopMetadata("en");

export default function Page() {
  return <ShopPage locale="en" />;
}
