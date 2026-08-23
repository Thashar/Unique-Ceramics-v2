export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, Ticket } from "lucide-react";
import { listDiscountCodes } from "@/lib/discount-codes";
import { codeState, type CodeState } from "@/lib/discount-code";
import { formatWarsaw } from "@/lib/warsaw-time";

/** Kolory stanu kodu – ta sama konwencja co znaczek rabatu przy produkcie. */
const STATE_BADGE: Record<CodeState, string> = {
  active: "bg-green-50 text-green-700 ring-1 ring-green-200",
  scheduled: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  expired: "bg-charcoal/8 text-charcoal/80",
  inactive: "bg-charcoal/8 text-charcoal/80",
};

const STATE_LABEL: Record<CodeState, string> = {
  active: "Działa",
  scheduled: "Zaplanowany",
  expired: "Zakończony",
  inactive: "Wyłączony",
};

export default async function DiscountCodesPage() {
  const { available, codes } = await listDiscountCodes();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-espresso">Kody rabatowe</h1>
          <p className="text-sm text-charcoal/80 mt-0.5">
            {available ? `${codes.length} kodów` : "Baza bez tabeli kodów"}
          </p>
        </div>
        {available && (
          <Link
            href="/admin/kody-rabatowe/nowy"
            className="flex items-center gap-2 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-xs tracking-widest uppercase px-4 py-2.5 transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Dodaj kod</span>
            <span className="sm:hidden">Dodaj</span>
          </Link>
        )}
      </div>

      {!available ? (
        // Tabela powstaje ręczną migracją na Supabase – dopóki jej nie ma,
        // sklep działa normalnie, a kody są po prostu nieaktywne
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-5 py-4 leading-relaxed">
          <p className="font-medium mb-1">Brak tabeli kodów rabatowych w bazie.</p>
          <p>
            Uruchom w SQL Editorze Supabase plik{" "}
            <code className="font-mono text-xs">prisma/migrations/manual_add_discount_codes.sql</code>{" "}
            i odśwież tę stronę. Do tego czasu sklep działa normalnie – kody po prostu
            nie są honorowane przy zamówieniu.
          </p>
        </div>
      ) : codes.length === 0 ? (
        <div className="bg-cream border border-sand/60 text-center py-16 text-charcoal/80">
          <Ticket size={36} strokeWidth={1} className="mx-auto mb-4 text-sand" />
          <p className="text-sm">
            Brak kodów.{" "}
            <Link href="/admin/kody-rabatowe/nowy" className="text-clay hover:underline">
              Dodaj pierwszy
            </Link>
          </p>
        </div>
      ) : (
        <div className="bg-cream border border-sand/60">
          <div className="hidden md:grid md:grid-cols-[1fr_90px_140px_1fr_90px] text-[11px] tracking-widest uppercase text-charcoal/80 px-4 py-3 border-b border-sand">
            <span>Kod</span>
            <span className="text-center">Rabat</span>
            <span className="text-center">Łączenie</span>
            <span>Obowiązuje</span>
            <span className="text-center">Użycia</span>
          </div>

          {codes.map((code) => {
            const state = codeState(code);
            const window = code.endsAt
              ? `${code.startsAt ? `${formatWarsaw(code.startsAt, { short: true })} – ` : "do "}${formatWarsaw(code.endsAt, { short: true })}`
              : code.startsAt
                ? `od ${formatWarsaw(code.startsAt, { short: true })}`
                : "bezterminowo";
            return (
              <Link
                key={code.id}
                href={`/admin/kody-rabatowe/${code.id}`}
                className="block border-b border-sand/60 last:border-0 hover:bg-warm-white transition-colors"
              >
                <div className="md:grid md:grid-cols-[1fr_90px_140px_1fr_90px] md:items-center px-4 py-3 gap-x-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-sm text-espresso truncate">{code.code}</span>
                    <span
                      className={`text-[10px] tracking-wide uppercase px-1.5 py-0.5 rounded-sm shrink-0 ${STATE_BADGE[state]}`}
                    >
                      {STATE_LABEL[state]}
                    </span>
                  </div>
                  <div className="text-sm text-espresso tabular-nums md:text-center mt-1 md:mt-0">
                    −{code.percent}%
                  </div>
                  <div className="text-xs text-charcoal/80 md:text-center mt-1 md:mt-0">
                    {code.stackable ? "z innymi rabatami" : "sam (lepszy wariant)"}
                  </div>
                  <div className="text-xs text-charcoal/80 mt-1 md:mt-0">{window}</div>
                  <div className="text-xs text-charcoal/80 md:text-center mt-1 md:mt-0 tabular-nums">
                    {code.usedCount}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
