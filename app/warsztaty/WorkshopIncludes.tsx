"use client";

import { useState } from "react";
import ImageGallery from "@/components/ui/ImageGallery";
import AiImageBadge from "@/components/ui/AiImageBadge";
import { ICON_MAP, CheckCircle } from "./icons";
import type { GalleryImage } from "@/lib/gallery";

/** Wyjaśnienie pod galerią – zdjęcia warsztatów powstały przy wsparciu AI. */
const AI_NOTICE = "Zdjęcia w tej sekcji zostały wygenerowane przy wsparciu AI.";

export type WorkshopInclude = {
  id: number;
  iconName: string;
  label: string;
};

interface Props {
  includes: WorkshopInclude[];
  images: GalleryImage[];
  /** Nagłówek sekcji – renderowany w lewej kolumnie, żeby galeria zaczynała się na jego wysokości */
  title: string;
}

/**
 * Lista „Co zawiera warsztat?" sprzężona z pokazem zdjęć: przy zmianie zdjęcia
 * podświetla się odpowiadająca mu pozycja. Gdy zdjęć jest mniej niż punktów,
 * numer zawija się modulo – dlatego najlepiej mieć tyle zdjęć, ile pozycji.
 */
export default function WorkshopIncludes({ includes, images, title }: Props) {
  const [active, setActive] = useState(0);
  const activeItem = includes.length > 0 ? active % includes.length : -1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
      <div>
        <h2 className="font-serif text-[2rem] md:text-4xl text-espresso mb-8">{title}</h2>
        <ul className="space-y-4">
          {includes.map((inc, i) => {
            const Icon = ICON_MAP[inc.iconName] ?? CheckCircle;
            const isActive = i === activeItem;
            return (
              <li key={inc.id} className="flex items-center gap-4">
                <span
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${
                    isActive ? "bg-terracotta/35" : "bg-warm-white"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.5} className="text-clay" />
                </span>
                <span
                  className={`leading-snug transition-colors duration-500 ${
                    isActive ? "font-medium text-espresso" : "text-charcoal"
                  }`}
                >
                  {inc.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="w-full max-w-xl mx-auto lg:mx-0 flex flex-col gap-2">
        <ImageGallery
          images={images}
          alt="Zdjęcia z warsztatów ceramicznych"
          className="aspect-[4/3] rounded-sm w-full"
          sizes="(max-width: 640px) 100vw, 576px"
          onIndexChange={setActive}
        />
        {/* Zdjęcia w tej sekcji powstały z modelu – ten sam znaczek co przy
            galerii produktu, tylko z opisem dopasowanym do warsztatów */}
        <div className="flex">
          <AiImageBadge size="lg" notice={AI_NOTICE} />
        </div>
      </div>
    </div>
  );
}
