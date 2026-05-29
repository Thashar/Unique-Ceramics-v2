"use client";

import { MapPin } from "lucide-react";
import { useCookieConsent } from "@/lib/cookie-consent";

const MAP_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2545.9841035768472!2d18.518208176464153!3d50.348201871572854!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47113ca727ad0a73%3A0x3d10e6bfdf3c14cc!2sFamilijna%2023%2C%2044-164%20Kleszcz%C3%B3w!5e0!3m2!1spl!2spl!4v1779345180945!5m2!1spl!2spl";

export default function FooterMap() {
  const { consent, hydrated, acceptAll } = useCookieConsent();

  if (hydrated && consent === "all") {
    return (
      <iframe
        src={MAP_SRC}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Lokalizacja Unique Ceramics"
      />
    );
  }

  return (
    <button
      onClick={acceptAll}
      className="w-full h-full flex flex-col items-center justify-center gap-3 bg-espresso/40 hover:bg-espresso/60 transition-colors group"
      aria-label="Kliknij aby załadować mapę Google (wymaga zgody na cookies)"
    >
      <MapPin size={24} strokeWidth={1.5} className="text-sand/40 group-hover:text-terracotta transition-colors" />
      <span className="text-xs text-sand/50 group-hover:text-sand/80 text-center leading-relaxed transition-colors">
        Kliknij, aby załadować mapę
        <br />
        <span className="text-[10px] text-sand/30">(zgoda na cookies Google)</span>
      </span>
    </button>
  );
}
