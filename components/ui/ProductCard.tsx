"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { type Product, formatPrice } from "@/lib/data";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={`/sklep/${product.slug}`} className="group block">
        {/* Zdjęcie */}
        <div className="relative aspect-[4/5] overflow-hidden bg-mist rounded-sm mb-5">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {product.stock <= 2 && product.stock > 0 && (
            <span className="absolute top-3 left-3 bg-terracotta text-warm-white text-[11px] tracking-wider uppercase px-2.5 py-1 rounded-sm">
              Ostatnie sztuki
            </span>
          )}
          {product.stock === 0 && (
            <span className="absolute top-3 left-3 bg-charcoal text-warm-white text-[11px] tracking-wider uppercase px-2.5 py-1 rounded-sm">
              Niedostępny
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs tracking-widest uppercase text-clay mb-1">{product.category}</p>
            <h3 className="font-serif text-lg text-espresso group-hover:text-clay transition-colors leading-snug">
              {product.name}
            </h3>
          </div>
          <p className="font-serif text-lg text-espresso whitespace-nowrap mt-5">
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
