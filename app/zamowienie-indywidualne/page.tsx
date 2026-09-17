import type { Metadata } from "next";
import CustomOrderPage, { customOrderMetadata } from "./CustomOrderPage";

export const revalidate = 300;

// Treść siedzi w `CustomOrderPage` – ten sam komponent renderuje `/en/zamowienie-indywidualne`
export const metadata: Metadata = customOrderMetadata("pl");

export default function Page() {
  return <CustomOrderPage locale="pl" />;
}
