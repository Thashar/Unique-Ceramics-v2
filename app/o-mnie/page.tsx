// Treść zmienia się rzadko – ISR; zapis ustawień w adminie odświeża cache
export const revalidate = 300;

import type { Metadata } from "next";
import AboutPage, { aboutMetadata } from "./AboutPage";

// Treść siedzi w `AboutPage` – ten sam komponent renderuje `/en/o-mnie`
export const metadata: Metadata = aboutMetadata("pl");

export default function Page() {
  return <AboutPage locale="pl" />;
}
