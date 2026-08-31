// Treść zmienia się rzadko – ISR; zapis ustawień w adminie odświeża cache
export const revalidate = 300;

import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import ClayRule from "@/components/ui/ClayRule";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Polityka prywatności",
  description:
    "Polityka prywatności sklepu Unique Ceramics – jakie dane zbieramy, w jakim celu i jakie masz prawa.",
  path: "/polityka-prywatnosci",
});

export default async function PolitykaPrywatnosci() {
  const content = await getSetting("polityka_prywatnosci");

  return (
    <>
      <Header />
      <main className="flex-1">
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
          <ClayRule className="max-w-3xl mx-auto mb-8" />
          <div
            className="rich-content max-w-3xl mx-auto"
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(content) }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
