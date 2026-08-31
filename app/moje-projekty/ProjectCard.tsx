"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ImageIcon } from "lucide-react";
import { projectPath } from "@/lib/portfolio-slug";

/**
 * Kafelek projektu w siatce portfolio – celowo ten sam materiał co karta produktu
 * w katalogu (kadr 4/5, `object-cover`, powiększenie na hoverze, tytuł pod zdjęciem).
 * Różnica jest jedna: projekt nie ma ceny ani stanu magazynowego, więc pod tytułem
 * nie ma już nic. Opis pokazuje dopiero strona projektu.
 */
export default function ProjectCard({
  title,
  slug,
  image,
}: {
  title: string;
  slug: string;
  image?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={projectPath(slug)} className="group block">
        <div className="relative aspect-[4/5] overflow-hidden bg-mist mb-4">
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-cream">
              <ImageIcon size={40} strokeWidth={1} className="text-sand" />
            </div>
          )}
        </div>
        <h2 className="font-serif text-lg text-espresso group-hover:text-clay transition-colors">
          {title}
        </h2>
      </Link>
    </motion.div>
  );
}
