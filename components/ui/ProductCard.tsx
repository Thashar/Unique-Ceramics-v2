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

export default function ProductCard({ product }: { product: ProductCardProduct }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={`/sklep/${product.slug}`} className="group block">
        {/* Zdjęcie */}
        <div className="relative aspect-[4/5] overflow-hidden bg-mist mb-4">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${product.stock === 0 ? "opacity-60" : ""}`}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-cream">
              <ShoppingBag size={40} strokeWidth={1} className="text-sand" />
            </div>
          )}
          {product.stock <= 2 && product.stock > 0 && (
            <span className="absolute top-3 left-3 bg-terracotta text-warm-white text-[11px] tracking-wider uppercase px-2.5 py-1">
              Ostatnie sztuki
            </span>
          )}
          {product.stock === 0 && (
            <span className="absolute top-3 left-3 bg-charcoal text-warm-white text-[11px] tracking-wider uppercase px-2.5 py-1">
              Wyprzedano
            </span>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-espresso/0 group-hover:bg-espresso/8 transition-colors duration-500" />
        </div>

        {/* Info */}
        <div>
          <p className="text-[11px] tracking-widest uppercase text-clay mb-1.5">{product.category}</p>
          <h3 className="font-serif text-lg text-espresso group-hover:text-clay transition-colors leading-snug mb-1">
            {product.name}
          </h3>
          <p className="text-sm text-charcoal/80 font-medium tabular-nums">
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
