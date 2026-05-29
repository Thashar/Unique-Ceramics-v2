"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function AboutTeaser({
  aboutImage = "",
  aboutPosition = "50% 50%",
}: {
  aboutImage?: string;
  aboutPosition?: string;
}) {
  return (
    <section
      className="relative overflow-hidden flex items-center"
      style={{ height: "100svh" }}
      data-snap
      data-header-theme="transparent"
    >
      {/* Tło — takie same jak Warsztaty */}
      <div className="absolute inset-0 bg-espresso">
        {aboutImage && (
          <Image
            src={aboutImage}
            alt="Pracownia ceramiczna"
            fill
            className="object-cover"
            style={{ objectPosition: aboutPosition }}
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-espresso/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-espresso/75 via-espresso/35 to-transparent" />
      </div>

      {/* Treść — identyczna struktura jak Hero i Warsztaty */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full pt-20">
        <div className="max-w-xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-xs tracking-[0.3em] uppercase text-terracotta mb-4"
          >
            O mnie
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-4xl md:text-5xl text-cream leading-tight mb-6"
          >
            Ręcznie tworzone
            <br />
            z sercem
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-sand/80 leading-relaxed mb-4"
          >
            Od 20 lat zajmuję się ceramiką w obszarze przemysłu, dlatego moje
            doświadczenie przeniosłam na ceramikę artystyczną, którą zajmuję się
            od około roku. Każdą pracę wykonuję samodzielnie, dbając o detale,
            estetykę i niepowtarzalny charakter wyrobów.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-sand/80 leading-relaxed mb-10"
          >
            Ceramika daje mi ogromną satysfakcję oraz pozwala odnaleźć wewnętrzny
            spokój i chwilę wyciszenia. Daje mi to też motywację do ciągłego
            rozwijania swoich umiejętności.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link
              href="/o-mnie"
              className="inline-flex items-center gap-3 border border-cream/60 hover:border-cream text-cream text-sm tracking-widest uppercase px-8 py-4 transition-colors duration-300 group"
            >
              Poznaj moją historię
              <ArrowRight
                size={16}
                strokeWidth={1.5}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
