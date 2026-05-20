import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Koszyk",
};

export default function CartPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-20">
        <div className="bg-cream px-6 lg:px-10 py-16">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-serif text-4xl text-espresso">Koszyk</h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
          {/* Stan pusty */}
          <div className="text-center py-20">
            <ShoppingBag size={56} strokeWidth={1} className="mx-auto text-sand mb-6" />
            <h2 className="font-serif text-2xl text-espresso mb-3">Koszyk jest pusty</h2>
            <p className="text-charcoal/60 mb-10">
              Nie masz jeszcze nic w koszyku. Odkryj moją kolekcję.
            </p>
            <Link
              href="/sklep"
              className="inline-flex items-center gap-3 bg-terracotta hover:bg-clay text-warm-white text-sm tracking-widest uppercase px-8 py-4 transition-colors"
            >
              Przejdź do sklepu
              <ArrowRight size={15} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
