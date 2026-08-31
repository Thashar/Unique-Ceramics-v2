"use client";

import { useSearchParams } from "next/navigation";
import ContactForm from "@/components/contact/ContactForm";

/**
 * Cienka nakładka na formularz kontaktowy: czyta `?produkt={slug}` z adresu
 * (przycisk „Zapytaj o produkt” przy wyprzedanym towarze) i podaje slug propsem.
 *
 * Osobny komponent, bo `useSearchParams` wymaga granicy `<Suspense>`, a strona
 * `/kontakt` jest ISR-owa. Dzięki rozdzieleniu w prerenderze ląduje **pełny
 * formularz** (jako fallback Suspense), a wersja z wypełnioną treścią wchodzi
 * po hydracji – wcześniej cały formularz był w prerenderze pustą ramką.
 */
export default function ContactFormParams({ workshopOptions = [] }: { workshopOptions?: string[] }) {
  const productSlug = useSearchParams().get("produkt") ?? "";
  return <ContactForm workshopOptions={workshopOptions} productSlug={productSlug} />;
}
