"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";

type ProductCardProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  images: string[];
  stock: number;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 0,
  }).format(price);
}

export default function ProductCard({
  product,
  compact = false,
}: {
  product: ProductCardProduct;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={`/sklep/${product.slug}`} className="group block">
        {/* Zdjęcie */}
        <div className={`relative aspect-[4/5] overflow-hidden bg-mist ${compact ? "mb-2" : "mb-4"}`}>
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${product.stock === 0 ? "opacity-60" : ""}`}
              sizes={
                compact
                  ? "(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 20vw"
                  : "(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              }
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-cream">
              <ShoppingBag size={compact ? 24 : 40} strokeWidth={1} className="text-sand" />
            </div>
          )}
          {product.stock <= 2 && product.stock > 0 && (
            <span
              className={`absolute bg-terracotta text-warm-white tracking-wider uppercase ${
                compact
                  ? "top-2 left-2 text-[8px] px-1.5 py-0.5"
                  : "top-3 left-3 text-[11px] px-2.5 py-1"
              }`}
            >
              Ostatnie sztuki
            </span>
          )}
          {product.stock === 0 && (
            <span
              className={`absolute bg-charcoal text-warm-white tracking-wider uppercase ${
                compact
                  ? "top-2 left-2 text-[8px] px-1.5 py-0.5"
                  : "top-3 left-3 text-[11px] px-2.5 py-1"
              }`}
            >
              Wyprzedano
            </span>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-espresso/0 group-hover:bg-espresso/8 transition-colors duration-500" />
        </div>

        {/* Info */}
        <div>
          <p
            className={`tracking-widest uppercase text-clay ${
              compact ? "text-[9px] mb-0.5" : "text-[11px] mb-1.5"
            }`}
          >
            {product.category}
          </p>
          <h3
            className={`font-serif text-espresso group-hover:text-clay transition-colors leading-snug mb-1 ${
              compact ? "text-sm" : "text-lg"
            }`}
          >
            {product.name}
          </h3>
          <p
            className={`text-charcoal/80 font-medium tabular-nums ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
