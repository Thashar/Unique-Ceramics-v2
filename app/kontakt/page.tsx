// Treść zmienia się rzadko – ISR; zapis ustawień w adminie odświeża cache
export const revalidate = 300;

import type { Metadata } from "next";
import ContactPage, { contactMetadata } from "./ContactPage";

// Treść siedzi w `ContactPage` – ten sam komponent renderuje `/en/kontakt`
export const metadata: Metadata = contactMetadata("pl");

export default function Page() {
  return <ContactPage locale="pl" />;
}
