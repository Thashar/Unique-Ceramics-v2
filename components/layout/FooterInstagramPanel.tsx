"use client";

import { motion } from "framer-motion";
import InstagramIcon from "@/components/ui/InstagramIcon";
import FacebookIcon from "@/components/ui/FacebookIcon";
import { ArrowRight } from "lucide-react";
import { useContacts } from "@/lib/public-contacts";

/**
 * Panel Instagrama w stopce. Na stronie głównej handle przychodzi propsem
 * (jest tam i tak pobierany serwerowo); na pozostałych stronach – gdzie stopka
 * musi być w pełni synchroniczna – bierzemy go ze wspólnego store'u kontaktów.
 *
 * Pod przyciskiem Instagrama stoi ikona Facebooka. Dopóki `contact_facebook`
 * jest puste, jest **wyszarzona i nieklikalna** z dopiskiem „wkrótce" – profil
 * dopiero powstanie, a link donikąd byłby gorszy niż zapowiedź. Po wpisaniu
 * adresu w panelu ikona sama zamienia się w link.
 */
export default function FooterInstagramPanel({ instagram }: { instagram?: string }) {
  const contacts = useContacts();
  const value = instagram || contacts.instagram;
  const handle = value.startsWith("@") ? value.slice(1) : value;
  const displayHandle = value.startsWith("@") ? value : `@${value}`;
  const href = `https://instagram.com/${handle}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col"
    >
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-terracotta/15 border border-terracotta/30 mb-6">
        <InstagramIcon size={22} className="text-terracotta" />
      </div>

      <h2 className="font-serif text-2xl lg:text-3xl text-cream mb-3 leading-snug">
        Śledź moją pracownię
      </h2>
      <p className="text-sand/60 text-sm leading-relaxed mb-7 max-w-xs">
        Na Instagramie pokazuję proces tworzenia, nowe prace i zakulisowe chwile z pracowni.
      </p>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-3 border border-terracotta/50 hover:border-terracotta hover:bg-terracotta hover:text-espresso text-cream text-sm tracking-widest uppercase px-6 py-3.5 transition-all duration-300 self-start"
      >
        <InstagramIcon size={14} />
        {displayHandle}
        <ArrowRight
          size={13}
          strokeWidth={1.5}
          className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
        />
      </a>

      <div className="mt-5 flex items-center gap-3 self-start">
        {contacts.facebook ? (
          <a
            href={contacts.facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-terracotta/50 text-cream hover:border-terracotta hover:bg-terracotta hover:text-espresso transition-all duration-300"
          >
            <FacebookIcon size={16} />
          </a>
        ) : (
          <>
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-sand/20 text-sand/60">
              <FacebookIcon size={16} />
            </span>
            <span className="text-xs text-sand/60">Facebook – wkrótce</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
