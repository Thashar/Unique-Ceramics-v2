"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function AboutTeaser() {
  return (
    <section
      className="px-6 lg:px-10 bg-cream flex items-center py-8 lg:py-12 overflow-hidden"
      style={{ height: "100svh" }}
      data-snap
    >
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
        {/* Zdjęcie */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-sm h-[42svh] lg:h-[calc(100svh-7rem)]"
        >
          <Image
            src="/images/about-photo.jpg"
            alt="Pracownia ceramiczna"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </motion.div>

        {/* Tekst */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs tracking-[0.3em] uppercase text-clay mb-4">O mnie</p>
          <h2 className="font-serif text-4xl md:text-5xl text-espresso leading-tight mb-6 lg:mb-8">
            Ręcznie tworzone
            <br />
            z sercem
          </h2>
          <p className="text-charcoal/80 leading-relaxed mb-4 lg:mb-5">
            Od 20 lat zajmuję się ceramiką w obszarze przemysłu, dlatego moje
            doświadczenie przeniosłam na ceramikę artystyczną, którą zajmuję się
            od około roku. Każdą pracę wykonuję samodzielnie, dbając o detale,
            estetykę i niepowtarzalny charakter wyrobów.
          </p>
          <p className="text-charcoal/80 leading-relaxed mb-8 lg:mb-10">
            Ceramika daje mi ogromną satysfakcję oraz pozwala odnaleźć wewnętrzny
            spokój i chwilę wyciszenia. Daje mi to też motywację do ciągłego
            rozwijania swoich umiejętności.
          </p>
          <Link
            href="/o-mnie"
            className="inline-flex items-center gap-2 text-sm tracking-widest uppercase text-clay hover:text-espresso transition-colors group"
          >
            Poznaj moją historię
            <ArrowRight
              size={15}
              className="group-hover:translate-x-1 transition-transform"
              strokeWidth={1.5}
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
