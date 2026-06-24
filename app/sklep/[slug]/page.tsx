import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Truck, Clock, AlertTriangle } from "lucide-react";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import ProductGallery from "./ProductGallery";
import AddToCartSection from "./AddToCartSection";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

const getProduct = cache(async (slug: string) => {
  try {
    return await db.product.findUnique({ where: { slug, active: true } });
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Produkt nie istnieje" };
  return {
    title: `${product.name} — Unique Ceramics`,
    description: product.description ?? `${product.name} — ręcznie robiona ceramika. Kup online.`,
    alternates: { canonical: `https://uniqueceramics.pl/sklep/${slug}` },
    openGraph: {
      title: product.name,
      description: product.description ?? "",
      images: product.images[0] ? [{ url: product.images[0] }] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getProduct(slug),
    getSettings(["shipping_time", "shipping_cost", "shipping_free_enabled", "shipping_free_from"]),
  ]);

  if (!product) notFound();

  const shippingTime = settings.shipping_time || "2–4 dni robocze";
  const shippingCost = parseFloat(settings.shipping_cost) || 18;
  const freeEnabled = settings.shipping_free_enabled === "true";
  const freeFrom = parseFloat(settings.shipping_free_from) || 300;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images,
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(2),
      priceCurrency: "PLN",
      availability: product.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="min-h-[100svh] bg-warm-white pt-[100px]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-2">
          <Link
            href="/sklep"
            className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors"
          >
            <ChevronLeft size={14} strokeWidth={1.5} />
            Sklep
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
          {/* Galeria */}
          <ProductGallery images={product.images} name={product.name} />

          {/* Informacje */}
          <div className="lg:pt-4 flex flex-col">
            <p className="text-xs tracking-[0.25em] uppercase text-clay mb-3 capitalize">
              {product.category}
            </p>
            <h1 className="font-serif text-3xl md:text-4xl text-espresso leading-tight mb-4">
              {product.name}
            </h1>
            <p className="font-serif text-2xl text-espresso mb-6">
              {product.price.toFixed(2).replace(".", ",")} zł
            </p>

            {product.description && (
              <p className="text-charcoal/75 leading-relaxed text-sm mb-6">
                {product.description}
              </p>
            )}

            {/* Komunikat o unikalności ceramiki */}
            {product.variesFromPhoto && (
              <div className="mb-6 flex gap-3 bg-amber-50 border border-amber-200/70 px-4 py-3.5">
                <AlertTriangle
                  size={16}
                  strokeWidth={1.5}
                  className="text-amber-600 shrink-0 mt-0.5"
                />
                <div className="text-xs text-amber-800 leading-relaxed space-y-1">
                  <p className="font-medium">Każdy egzemplarz jest niepowtarzalny</p>
                  <p className="text-amber-700/80">
                    Z uwagi na ręczne wykonanie i naturalny charakter gliny, produkt może
                    nieznacznie różnić się od zdjęcia — w odcieniu, fakturze lub kształcie.
                    Zachowuje jednak wszystkie cechy jakościowe i nie odbiega znacząco od
                    pierwowzoru.
                  </p>
                </div>
              </div>
            )}

            {/* Dostępność */}
            <div className="mb-6 text-sm">
              {product.stock > 0 ? (
                product.stock <= 3 ? (
                  <p className="text-amber-600">
                    Ostatnie{" "}
                    {product.stock === 1
                      ? "sztuki"
                      : `${product.stock} sztuki`}
                  </p>
                ) : (
                  <p className="text-green-700">Dostępny</p>
                )
              ) : (
                <p className="text-charcoal/50">Wyprzedano</p>
              )}
            </div>

            {/* Dodaj do koszyka */}
            <AddToCartSection product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              images: product.images,
              stock: product.stock,
            }} />

            {/* Wysyłka */}
            <div className="mt-6 pt-6 border-t border-sand space-y-3">
              <div className="flex items-center gap-3 text-xs text-charcoal/60">
                <Truck size={14} strokeWidth={1.5} className="shrink-0 text-clay" />
                <span>
                  Wysyłka {shippingCost.toFixed(0)} zł
                  {freeEnabled && ` · bezpłatna od ${freeFrom.toFixed(0)} zł`}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-charcoal/60">
                <Clock size={14} strokeWidth={1.5} className="shrink-0 text-clay" />
                <span>Czas realizacji: {shippingTime}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
