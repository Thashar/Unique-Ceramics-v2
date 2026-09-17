"use client";

import { useSearchParams } from "next/navigation";
import CustomOrderForm from "@/components/custom-order/CustomOrderForm";

/**
 * Cienka nakładka na formularz zamówienia indywidualnego: czyta `?produkt={slug}`
 * (przycisk „Zapytaj o ten przedmiot” na karcie produktu w wersji angielskiej)
 * i podaje slug propsem. Osobny komponent, bo `useSearchParams` wymaga granicy
 * `<Suspense>` – ten sam wzorzec co `ContactFormParams`.
 */
export default function CustomOrderFormParams() {
  const productSlug = useSearchParams().get("produkt") ?? "";
  return <CustomOrderForm productSlug={productSlug} />;
}
