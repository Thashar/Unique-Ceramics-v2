"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useRef, useTransition } from "react";

const CATEGORIES = ["kubki", "miski", "wazy", "talerze", "inne"];

export default function ProductsSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const currentQuery = searchParams.get("q") ?? "";
  const currentCategory = searchParams.get("kat") ?? "";
  const currentStatus = searchParams.get("status") ?? "";

  function updateParams(updates: Record<string, string>, debounce = false) {
    const doUpdate = () => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    };

    if (debounce) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(doUpdate, 300);
    } else {
      doUpdate();
    }
  }

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-5">
      <div className="relative flex-1 min-w-0 sm:min-w-48">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/35 pointer-events-none" />
        <input
          type="search"
          placeholder="Szukaj po nazwie..."
          defaultValue={currentQuery}
          onChange={(e) => updateParams({ q: e.target.value }, true)}
          className="w-full bg-cream border border-sand focus:border-clay outline-none pl-9 pr-4 py-2.5 text-sm text-espresso placeholder:text-charcoal/35 transition-colors"
        />
      </div>
      <div className="flex gap-3">
        <select
          value={currentCategory}
          onChange={(e) => updateParams({ kat: e.target.value })}
          className="flex-1 sm:flex-none bg-cream border border-sand focus:border-clay outline-none px-4 py-2.5 text-sm text-espresso transition-colors"
        >
          <option value="">Wszystkie kategorie</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <select
          value={currentStatus}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="flex-1 sm:flex-none bg-cream border border-sand focus:border-clay outline-none px-4 py-2.5 text-sm text-espresso transition-colors"
        >
          <option value="">Wszystkie statusy</option>
          <option value="active">Aktywne</option>
          <option value="inactive">Ukryte</option>
          <option value="outofstock">Brak w magazynie</option>
        </select>
      </div>
    </div>
  );
}
