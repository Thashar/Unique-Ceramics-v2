// Treść zmienia się rzadko – ISR; zapis ustawień w adminie odświeża cache
export const revalidate = 300;

import type { Metadata } from "next";
import WorkshopsPage, { workshopsMetadata } from "./WorkshopsPage";

// Treść siedzi w `WorkshopsPage` – ten sam komponent renderuje `/en/warsztaty`
export const metadata: Metadata = workshopsMetadata("pl");

export default function Page() {
  return <WorkshopsPage locale="pl" />;
}
