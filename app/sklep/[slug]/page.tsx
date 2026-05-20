import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ShoppingBag, Package, RefreshCw } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/ui/ProductCard";
import { getProductBySlug, products, formatPrice } from "@/lib/data";

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  return (
    <>
      <Header />
      <main className="flex-1 pt-20">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 pb-2">
          <Link
            href="/sklep"
            className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors"
          >
            <ChevronLeft size={14} strokeWidth={1.5} />
            Sklep
          </Link>
        </div>

        {/* Produkt */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Galeria */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-mist">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-4">
                {product.images.map((img, i) => (
                  <div key={i} className="relative aspect-square w-24 overflow-hidden rounded-sm bg-mist flex-shrink-0">
                    <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" sizes="96px" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="lg:pt-8">
            <p className="text-xs tracking-widest uppercase text-clay mb-3">{product.category}</p>
            <h1 className="font-serif text-4xl md:text-5xl text-espresso leading-tight mb-6">
              {product.name}
            </h1>
            <p className="font-serif text-3xl text-espresso mb-8">{formatPrice(product.price)}</p>

            <p className="text-charcoal/80 leading-relaxed mb-8">{product.description}</p>

            {/* Dane techniczne */}
            {(product.dimensions || product.material) && (
              <div className="border-t border-sand pt-6 mb-8 space-y-2">
                {product.dimensions && (
                  <p className="text-sm text-charcoal/70">
                    <span className="font-medium text-espresso">Wymiary:</span>{" "}
                    {product.dimensions}
                  </p>
                )}
                {product.material && (
                  <p className="text-sm text-charcoal/70">
                    <span className="font-medium text-espresso">Materiał:</span>{" "}
                    {product.material}
                  </p>
                )}
              </div>
            )}

            {/* Dostępność */}
            <p className="text-sm text-charcoal/60 mb-6">
              {product.stock > 0
                ? `Dostępność: ${product.stock} ${product.stock === 1 ? "sztuka" : "sztuki"}`
                : "Chwilowo niedostępne"}
            </p>

            {/* CTA */}
            <button
              disabled={product.stock === 0}
              className="w-full flex items-center justify-center gap-3 bg-terracotta hover:bg-clay disabled:bg-sand disabled:text-charcoal/40 text-warm-white text-sm tracking-widest uppercase py-5 transition-colors duration-300 cursor-pointer disabled:cursor-not-allowed"
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              {product.stock > 0 ? "Dodaj do koszyka" : "Niedostępne"}
            </button>

            {/* Usługi */}
            <div className="mt-10 space-y-4 border-t border-sand pt-8">
              <div className="flex items-start gap-3 text-sm text-charcoal/70">
                <Package size={16} strokeWidth={1.5} className="text-clay mt-0.5 flex-shrink-0" />
                <p>Wysyłka 18 zł. Darmowa od 300 zł. Czas realizacji 2–4 dni robocze.</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-charcoal/70">
                <RefreshCw size={16} strokeWidth={1.5} className="text-clay mt-0.5 flex-shrink-0" />
                <p>Zwrot w ciągu 14 dni. Przedmioty uszkodzone przy wysyłce wymieniam bezpłatnie.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Powiązane produkty */}
        {related.length > 0 && (
          <div className="bg-cream py-20 px-6 lg:px-10">
            <div className="max-w-7xl mx-auto">
              <h2 className="font-serif text-3xl text-espresso mb-12">Z tej samej kategorii</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {related.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
