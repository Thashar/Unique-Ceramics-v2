// Treść zmienia się rzadko — ISR; zapis ustawień w adminie odświeża cache
export const revalidate = 300;

import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  description: "Polityka prywatności sklepu internetowego Unique Ceramics.",
};

export default async function PolitykaPrywatnosci() {
  const content = await getSetting("polityka_prywatnosci");

  return (
    <>
      <Header />
      <main className="flex-1 pt-[100px]">
        <div className="bg-cream px-6 lg:px-10 py-10">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">
              Sklep
            </p>
            <h1 className="font-serif text-5xl md:text-6xl text-espresso">
              Polityka prywatności
            </h1>
          </div>
        </div>

        <div className="bg-warm-white py-16 px-6 lg:px-10">
          <div
            className="max-w-3xl mx-auto text-charcoal/80 leading-relaxed [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-espresso [&_h2]:mt-8 [&_h2]:mb-4 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_strong]:text-espresso [&_a]:text-clay [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(content) }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
