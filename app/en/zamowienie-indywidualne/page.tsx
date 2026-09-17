import type { Metadata } from "next";
import CustomOrderPage, { customOrderMetadata } from "@/app/zamowienie-indywidualne/CustomOrderPage";

export const revalidate = 300;

export const metadata: Metadata = customOrderMetadata("en");

export default function Page() {
  return <CustomOrderPage locale="en" />;
}
