export const dynamic = "force-dynamic";

import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import ClayRule from "@/components/ui/ClayRule";
import EmailChangeConfirm from "./EmailChangeConfirm";

export const metadata: Metadata = {
  title: "Zmiana adresu e-mail",
  description: "Potwierdzenie zmiany adresu e-mail konta w Unique Ceramics.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://uniqueceramics.pl/zmiana-emaila" },
};

/**
 * Strona potwierdzenia zmiany adresu e-mail.
 *
 * **Celowo poza `/konto`** – ta sekcja wymaga sesji (middleware), a link z maila
 * klient bardzo często otwiera na innym urządzeniu albo w innej przeglądarce,
 * gdzie zalogowany nie jest. Autoryzacją jest token z adresu, nie sesja.
 */
export default function EmailChangePage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-warm-white">
        <div className="bg-cream px-6 lg:px-10 py-10">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Konto</p>
            <h1 className="font-serif text-4xl md:text-5xl text-espresso">
              Zmiana adresu e-mail
            </h1>
            <ClayRule className="mt-6" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-16">
          <div className="max-w-xl">
            {/* useSearchParams wymaga granicy Suspense */}
            <Suspense fallback={<div className="bg-cream p-8 h-40 animate-pulse" />}>
              <EmailChangeConfirm />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
