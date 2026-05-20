"use client";

import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ShoppingBag, Package, RefreshCw, Check } from "lucide-react";
import { useCart } from "@/lib/cart";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  images: string[];
  category: string;
  stock: number;
  featured: boolean;
};

export default function ProductPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setProduct(data);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    fetch(`/api/products?kategoria=${product.category}&exclude=${product.id}`)
      .then((r) => r.json())
      .then((data) => setRelated(data.slice(0, 3)));
  }, [product]);

  function handleAddToCart() {
    if (!product) return;
    addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.images[0] ?? "",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-white pt-32 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-clay border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) notFound();

  return (
    <div className="min-h-screen bg-warm-white">
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
        {/* Galeria */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[4/5] overflow-hidden bg-cream">
            {product.images[activeImage] ? (
              <Image
                src={product.images[activeImage]}
                alt={product.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag size={64} strokeWidth={1} className="text-sand" />
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative aspect-square w-20 overflow-hidden bg-cream flex-shrink-0 border-2 transition-colors ${
                    activeImage === i ? "border-clay" : "border-transparent"
                  }`}
                >
                  <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" sizes="80px" />
                </button>
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
          <p className="font-serif text-3xl text-espresso mb-8">
            {product.price.toFixed(2).replace(".", ",")} zł
          </p>

          {product.description && (
            <p className="text-charcoal/80 leading-relaxed mb-8">{product.description}</p>
          )}

          <p className="text-sm text-charcoal/60 mb-6">
            {product.stock > 0
              ? `Dostępność: ${product.stock} ${product.stock === 1 ? "sztuka" : product.stock < 5 ? "sztuki" : "sztuk"}`
              : "Chwilowo niedostępne"}
          </p>

          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`w-full flex items-center justify-center gap-3 text-sm tracking-widest uppercase py-5 transition-all duration-300 ${
              added
                ? "bg-green-600 text-white"
                : "bg-terracotta hover:bg-clay disabled:bg-sand disabled:text-charcoal/40 text-warm-white"
            }`}
          >
            {added ? (
              <>
                <Check size={18} strokeWidth={2} />
                Dodano do koszyka
              </>
            ) : (
              <>
                <ShoppingBag size={18} strokeWidth={1.5} />
                {product.stock > 0 ? "Dodaj do koszyka" : "Niedostępne"}
              </>
            )}
          </button>

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

      {related.length > 0 && (
        <div className="bg-cream py-16 px-6 lg:px-10 mt-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-3xl text-espresso mb-10">Z tej samej kategorii</h2>
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
                  <p className="text-sm text-charcoal/60">{p.price.toFixed(2).replace(".", ",")} zł</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
