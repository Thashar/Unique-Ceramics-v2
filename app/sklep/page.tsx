// ISR jak strony kategorii – siatka pochodzi z `getShopProducts` (cache 60 s).
// ⚠️ **Nie czytaj tu `searchParams`** – samo ich odczytanie robi ze strony
// w pełni dynamiczną i każde wejście do sklepu renderuje się od zera (zimny
// start + trzy zapytania do bazy: 2,2 s TTFB zamiast 0,15 s z cache, zmierzone
// 16.09.2026). Stare przekierowanie `?kategoria=` siedzi w `next.config.ts`.
export const revalidate = 60;

import type { Metadata } from "next";
import ShopPage, { shopMetadata } from "./ShopPage";

// Treść siedzi w `ShopPage` – ten sam komponent renderuje `/en/sklep`
export const metadata: Metadata = shopMetadata("pl");

export default function Page() {
  return <ShopPage locale="pl" />;
}
