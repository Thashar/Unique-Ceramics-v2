"use client";

import { MapPin } from "lucide-react";
import { useCookieConsent } from "@/lib/cookie-consent";
import { useT } from "@/lib/use-locale";

const MAP_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2545.9841035768472!2d18.518208176464153!3d50.348201871572854!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47113ca727ad0a73%3A0x3d10e6bfdf3c14cc!2sFamilijna%2023%2C%2044-164%20Kleszcz%C3%B3w!5e0!3m2!1spl!2spl!4v1779345180945!5m2!1spl!2spl";

export default function FooterMap() {
  const { consent, hydrated, acceptAll } = useCookieConsent();
  const d = useT();

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
        title={d.footer.mapTitle}
      />
    );
  }

  return (
    <button
      onClick={acceptAll}
      className="w-full h-full flex flex-col items-center justify-center gap-3 bg-espresso/40 hover:bg-espresso/60 transition-colors group"
      aria-label={d.footer.mapAria}
    >
      <MapPin size={24} strokeWidth={1.5} className="text-sand/60 group-hover:text-terracotta transition-colors" />
      <span className="text-xs text-sand/70 group-hover:text-sand text-center leading-relaxed transition-colors">
        {d.footer.loadMap}
        <br />
        <span className="text-[10px] text-sand/70">{d.footer.mapConsent}</span>
      </span>
    </button>
  );
}
