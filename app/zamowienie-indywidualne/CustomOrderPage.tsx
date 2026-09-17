import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import CustomOrderForm from "@/components/custom-order/CustomOrderForm";
import CustomOrderFormParams from "@/components/custom-order/CustomOrderFormParams";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/dictionary";

export function customOrderMetadata(locale: Locale): Metadata {
  const m = t(locale).meta;
  return pageMetadata({
    title: m.customTitle,
    description: m.customDescription,
    path: "/zamowienie-indywidualne",
    locale,
  });
}

/**
 * Zamówienie indywidualne – wspólne dla `/zamowienie-indywidualne`
 * i `/en/zamowienie-indywidualne`. Z karty produktu w wersji angielskiej
 * przychodzi `?produkt={slug}` – czyta go `CustomOrderFormParams`, a
 * `useSearchParams` na stronie ISR wymaga granicy Suspense z **tym samym
 * formularzem** jako fallbackiem (wzorzec z `/kontakt`).
 */
export default function CustomOrderPage({ locale = "pl" }: { locale?: Locale }) {
  const d = t(locale);
  return (
    <>
      <BreadcrumbSchema
        locale={locale}
        items={[{ name: d.custom.title, path: "/zamowienie-indywidualne" }]}
      />
      <Header locale={locale} />
      <Suspense fallback={<CustomOrderForm />}>
        <CustomOrderFormParams />
      </Suspense>
      <Footer locale={locale} />
    </>
  );
}
