"use client";

import { useState, useEffect } from "react";
import { Mail, Phone } from "lucide-react";
import InstagramIcon from "@/components/ui/InstagramIcon";
import FacebookIcon from "@/components/ui/FacebookIcon";
import YoutubeIcon from "@/components/ui/YoutubeIcon";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

const DEFAULTS = {
  phone: "+48 668 443 706",
  email: "kontakt@uniqueceramics.pl",
  instagram: "@unique.ceramics",
  facebook: "",
  youtube: "",
  whatsapp: "",
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
    </>
  );
}
