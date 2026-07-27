"use client";

import { useSyncExternalStore } from "react";
import { normalizeHours } from "@/lib/opening-hours";

/**
 * Publiczne dane kontaktowe jako store modułowy (wzorzec jak `lib/cart.tsx`).
 * Kilka komponentów stopki potrzebuje tych samych danych – dzięki wspólnemu
 * store'owi `/api/public/contacts` jest odpytywane raz na stronę, a nie
 * osobno przez każdy z nich.
 */

export type PublicContacts = {
  phone: string;
  email: string;
  instagram: string;
  facebook: string;
  youtube: string;
  whatsapp: string;
  hours: string;
  addressStreet: string;
  addressCity: string;
  addressRegion: string;
};

// Muszą odpowiadać defaultom z lib/settings.ts – pokazują się do czasu,
// aż dojedzie odpowiedź z API (bez tego stopka „podskakiwałaby" po wczytaniu).
export const CONTACTS_DEFAULTS: PublicContacts = {
  phone: "+48 668 443 706",
  email: "kontakt@uniqueceramics.pl",
  instagram: "@unique.ceramics",
  facebook: "",
  youtube: "",
  whatsapp: "",
  hours: "Wt–Czw 17:00–19:00\nSo 15:00–17:00",
  addressStreet: "ul. Familijna 23",
  addressCity: "44-164 Kleszczów (k. Gliwic)",
  addressRegion: "woj. śląskie",
};

let state: PublicContacts = CONTACTS_DEFAULTS;
let started = false;
const listeners = new Set<() => void>();

function normalize(j: Partial<PublicContacts>): PublicContacts {
  return {
    // Telefon, e-mail i Instagram muszą być zawsze – pusta wartość wraca do defaultu
    phone: j.phone || CONTACTS_DEFAULTS.phone,
    email: j.email || CONTACTS_DEFAULTS.email,
    instagram: j.instagram || CONTACTS_DEFAULTS.instagram,
    // Reszta jest opcjonalna: wyczyszczone w panelu = ukryte w stopce,
    // dlatego tu świadomie NIE wracamy do defaultów
    facebook: j.facebook ?? "",
    youtube: j.youtube ?? "",
    whatsapp: j.whatsapp ?? "",
    // normalizeHours: honoruje też starszy zapis z `<br>` wpisanym w panelu
    hours: normalizeHours(j.hours ?? ""),
    addressStreet: j.addressStreet ?? "",
    addressCity: j.addressCity ?? "",
    addressRegion: j.addressRegion ?? "",
  };
}

function load() {
  if (started) return;
  started = true;
  fetch("/api/public/contacts")
    .then((r) => r.json())
    .then((json) => {
      state = normalize(json);
      for (const l of listeners) l();
    })
    .catch(() => {});
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  load();
  return () => { listeners.delete(cb); };
}

const getSnapshot = () => state;
const getServerSnapshot = () => CONTACTS_DEFAULTS;

export function useContacts(): PublicContacts {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
