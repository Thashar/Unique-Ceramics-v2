import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ShoppingBag, Package, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductGallery from "./ProductGallery";
import AddToCartSection from "./AddToCartSection";

// ISR: strona produktu cachowana 60 s (checkout i tak weryfikuje stan
// magazynowy po stronie serwera); mutacje w adminie odświeżają cache.
// Pusta lista paramów = strony generowane na żądanie przy pierwszym wejściu —
// bez generateStaticParams trasa byłaby w pełni dynamiczna (bez cache)
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

const BASE = "https://uniqueceramics.pl";

// React.cache() deduplikuje zapytanie między generateMetadata a stroną
const getProduct = cache((slug: string) =>
  db.product.findUnique({ where: { slug, active: true } })
);

// ─── Metadata dynamiczne per produkt ─────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  const image = product.images[0]
    ? product.images[0].startsWith("http")
      ? product.images[0]
      : `${BASE}${product.images[0]}`
    : `${BASE}/images/hero.jpg`;

  const description =
    product.description ??
    `Ręcznie robiona ceramika — ${product.name}. Sklep Unique Ceramics.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `${BASE}/sklep/${product.slug}` },
    openGraph: {
      title: `${product.name} | Unique Ceramics`,
      description,
      url: `${BASE}/sklep/${product.slug}`,
      images: [{ url: image, width: 800, height: 1000, alt: product.name }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [image],
    },
  };
}

// ─── Strona produktu ──────────────────────────────────────────────────────────

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [product, shippingSettings] = await Promise.all([
    getProduct(slug),
    getSettings(["shipping_cost", "shipping_free_enabled", "shipping_free_from", "shipping_time"]),
  ]);

  if (!product) notFound();

  const related = await db.product.findMany({
    where: {
      active: true,
      stock: { gt: 0 },
      category: product.category,
      id: { not: product.id },
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 3,
  });

  const shippingCost = shippingSettings.shipping_cost || "18";
  const freeEnabled = shippingSettings.shipping_free_enabled === "true";
  const freeFrom = shippingSettings.shipping_free_from || "300";
  const shippingTime = shippingSettings.shipping_time || "2–4 dni robocze";

  const effectiveShipping =
    freeEnabled && product.price >= parseFloat(freeFrom)
      ? 0
      : parseFloat(shippingCost);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.id,
    image: product.images.map((img) =>
      img.startsWith("http") ? img : `${BASE}${img}`
    ),
    brand: { "@type": "Brand", name: "Unique Ceramics" },
    offers: {
      "@type": "Offer",
      url: `${BASE}/sklep/${product.slug}`,
      priceCurrency: "PLN",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Unique Ceramics" },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: effectiveShipping,
          currency: "PLN",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "PL",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 2,
            maxValue: 4,
            unitCode: "DAY",
          },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "PL",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <Header />
      <div className="min-h-[100svh] bg-warm-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-28 pb-4">
          <Link
            href="/sklep"
            className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors"
          >
            <ChevronLeft size={14} strokeWidth={1.5} />
            Sklep
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Galeria — komponent kliencki */}
          <ProductGallery images={product.images} name={product.name} />

          {/* Info */}
          <div className="lg:pt-8">
            <p className="text-xs tracking-widest uppercase text-clay mb-3">
              {product.category}
            </p>
            <h1 className="font-serif text-4xl md:text-5xl text-espresso leading-tight mb-6">
              {product.name}
            </h1>
            <p className="font-serif text-3xl text-espresso mb-8">
              {product.price.toFixed(2).replace(".", ",")} zł
            </p>

            {product.description && (
              <p className="text-charcoal/80 leading-relaxed mb-8">
                {product.description}
              </p>
            )}

            <p className="text-sm text-charcoal/80 mb-6">
              {product.stock > 0
                ? `Dostępność: ${product.stock} ${
                    product.stock === 1
                      ? "sztuka"
                      : product.stock < 5
                      ? "sztuki"
                      : "sztuk"
                  }`
                : "Wyprzedano"}
            </p>

            {/* Dodaj do koszyka — komponent kliencki */}
            <AddToCartSection product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              images: product.images,
              stock: product.stock,
            }} />

            <div className="mt-10 space-y-3 border-t border-sand pt-8">
              <div className="flex items-center gap-3 text-sm text-charcoal/70">
                <Truck size={16} strokeWidth={1.5} className="text-clay flex-shrink-0" />
                <p>
                  Wysyłka {shippingCost} zł.
                  {freeEnabled && ` Darmowa od ${freeFrom} zł.`}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-charcoal/70">
                <Package size={16} strokeWidth={1.5} className="text-clay flex-shrink-0" />
                <p>Czas realizacji {shippingTime}.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Produkty z tej samej kategorii */}
        {related.length > 0 && (
          <div className="bg-cream py-16 px-6 lg:px-10 mt-8">
            <div className="max-w-7xl mx-auto">
              <h2 className="font-serif text-3xl text-espresso mb-10">
                Z tej samej kategorii
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                {related.map((p) => (
                  <Link key={p.id} href={`/sklep/${p.slug}`} className="group">
                    <div className="aspect-square bg-warm-white overflow-hidden mb-3 relative">
                      {p.images[0] ? (
                        <Image
                          src={p.images[0]}
                          alt={p.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag size={32} strokeWidth={1} className="text-sand" />
                        </div>
                      )}
                    </div>
                    <p className="font-serif text-lg text-espresso group-hover:text-clay transition-colors">
                      {p.name}
                    </p>
                    <p className="text-sm text-charcoal/80">
                      {p.price.toFixed(2).replace(".", ",")} zł
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
