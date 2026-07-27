"use client";

import { MapPin, Clock } from "lucide-react";
import { useContacts } from "@/lib/public-contacts";

/**
 * Adres pracowni i godziny otwarcia pod nagłówkiem „Gdzie mnie znajdziesz"
 * (nad mapą) — bez osobnych nagłówków. Gdy dane nie są uzupełnione w panelu,
 * dany blok w ogóle się nie renderuje.
 */
export default function FooterAddressClient() {
  const { addressStreet, addressCity, addressRegion, hours } = useContacts();
  const hasAddress = Boolean(addressStreet || addressCity);

  if (!hasAddress && !hours) return null;

  return (
    <div className="mb-4 flex flex-col gap-3">
      {hasAddress && (
        <div className="flex items-start gap-3 text-sm">
          <MapPin size={15} strokeWidth={1.5} className="shrink-0 mt-0.5" />
          <address className="not-italic leading-relaxed">
            {addressStreet}
            {addressCity && <><br />{addressCity}</>}
            {addressRegion && <><br />{addressRegion}</>}
          </address>
        </div>
      )}

      {hours && (
        <div className="flex items-start gap-3 text-sm">
          <Clock size={15} strokeWidth={1.5} className="shrink-0 mt-0.5" />
          {/* pre-line: nowe wiersze wpisane w panelu admina są zachowywane */}
          <span className="leading-relaxed whitespace-pre-line">{hours}</span>
        </div>
      )}
    </div>
  );
}
