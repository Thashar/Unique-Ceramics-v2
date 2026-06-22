"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useTransition } from "react";

export default function OrdersSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentQuery = searchParams.get("q") ?? "";

  function updateQuery(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="relative mb-4">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/35 pointer-events-none"
      />
      <input
        type="search"
        placeholder="Szukaj po numerze zamówienia, e-mailu, imieniu, nazwisku, telefonie, adresie…"
        defaultValue={currentQuery}
        onChange={(e) => updateQuery(e.target.value)}
        className="w-full bg-cream border border-sand focus:border-clay outline-none pl-9 pr-9 py-2.5 text-sm text-espresso placeholder:text-charcoal/35 transition-colors"
      />
      {currentQuery && (
        <button
          onClick={() => updateQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/35 hover:text-charcoal transition-colors"
          aria-label="Wyczyść wyszukiwanie"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
