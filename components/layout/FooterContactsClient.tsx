"use client";

import { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import InstagramIcon from "@/components/ui/InstagramIcon";
import FacebookIcon from "@/components/ui/FacebookIcon";
import YoutubeIcon from "@/components/ui/YoutubeIcon";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

// Muszą odpowiadać defaultom z lib/settings.ts — pokazują się zanim
// dojedzie odpowiedź z /api/public/contacts.
const DEFAULTS = {
  phone: "+48 668 443 706",
  email: "kontakt@uniqueceramics.pl",
  instagram: "@unique.ceramics",
  facebook: "",
  youtube: "",
  whatsapp: "",
  hours: "Wt–Czw 17:00–19:00, So 15:00–17:00",
  addressStreet: "ul. Familijna 23",
  addressCity: "44-164 Kleszczów (k. Gliwic)",
  addressRegion: "woj. śląskie",
};

export default function FooterContactsClient() {
  const [data, setData] = useState(DEFAULTS);

  useEffect(() => {
    fetch("/api/public/contacts")
      .then((r) => r.json())
      .then((json) => {
        setData({
          phone:     json.phone     || DEFAULTS.phone,
          email:     json.email     || DEFAULTS.email,
          instagram: json.instagram || DEFAULTS.instagram,
          facebook:  json.facebook  || "",
          youtube:   json.youtube   || "",
          whatsapp:  json.whatsapp  || "",
          hours:         json.hours         || DEFAULTS.hours,
          addressStreet: json.addressStreet || DEFAULTS.addressStreet,
          addressCity:   json.addressCity   || DEFAULTS.addressCity,
          addressRegion: json.addressRegion || "",
        });
      })
      .catch(() => {});
  }, []);

  const instagramHandle = data.instagram.startsWith("@")
    ? data.instagram.slice(1)
    : data.instagram;

  const whatsappNumber = data.whatsapp.replace(/[^\d]/g, "");

  return (
    <>
      <a
        href={`tel:${data.phone.replace(/\s/g, "")}`}
        className="flex items-center gap-3 text-sm hover:text-cream transition-colors"
      >
        <Phone size={15} strokeWidth={1.5} />
        {data.phone}
      </a>
      <a
        href={`mailto:${data.email}`}
        className="flex items-center gap-3 text-sm hover:text-cream transition-colors"
      >
        <Mail size={15} strokeWidth={1.5} />
        {data.email}
      </a>
      <a
        href={`https://instagram.com/${instagramHandle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 text-sm hover:text-cream transition-colors"
      >
        <InstagramIcon size={15} />
        {data.instagram}
      </a>
      {data.facebook && (
        <a
          href={data.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-sm hover:text-cream transition-colors"
        >
          <FacebookIcon size={15} />
          Facebook
        </a>
      )}
      {data.youtube && (
        <a
          href={data.youtube}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-sm hover:text-cream transition-colors"
        >
          <YoutubeIcon size={15} />
          YouTube
        </a>
      )}
      {data.whatsapp && (
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-sm hover:text-cream transition-colors"
        >
          <WhatsAppIcon size={15} />
          WhatsApp
        </a>
      )}

      {/* Adres pracowni i godziny — te same ustawienia co strona /kontakt */}
      {(data.addressStreet || data.addressCity) && (
        <div className="flex items-start gap-3 text-sm">
          <MapPin size={15} strokeWidth={1.5} className="shrink-0 mt-0.5" />
          <address className="not-italic leading-relaxed">
            {data.addressStreet}
            {data.addressCity && <><br />{data.addressCity}</>}
            {data.addressRegion && <><br />{data.addressRegion}</>}
          </address>
        </div>
      )}

      {data.hours && (
        <div className="flex items-start gap-3 text-sm">
          <Clock size={15} strokeWidth={1.5} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">{data.hours}</span>
        </div>
      )}
    </>
  );
}
