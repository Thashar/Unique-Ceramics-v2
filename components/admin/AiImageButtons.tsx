"use client";

import { Loader2, Sparkles } from "lucide-react";
import { AI_VARIANT_LABEL, isAiGeneratedImage, type AiVariant } from "@/lib/ai";

/** Które zdjęcie jest właśnie przetwarzane przez model (null = żadne). */
export type AiGenerating = { idx: number; variant: AiVariant } | null;

export const AI_CONFIRM: Record<AiVariant, string> = {
  ai: "Wygenerować przez AI zdjęcie na jednolitym, matowym tle?\n\nPowstanie nowe zdjęcie dodane na końcu listy – oryginał zostaje bez zmian.",
  ai_plus:
    "Wygenerować przez AI zdjęcie w wystylizowanej scenie (len, eukaliptus, kamienie)?\n\nPowstanie nowe zdjęcie dodane na końcu listy – oryginał zostaje bez zmian.",
};

/**
 * Przyciski **AI** i **AI+** pod kafelkiem zdjęcia w panelu – wspólne dla produktów
 * i projektów portfolio. Zdjęcie już wygenerowane przez model dostaje w to miejsce
 * plakietkę „Wygenerowane”: powtórne przetworzenie gubi wygląd przedmiotu.
 * Wysokość jest stała, żeby kafelki z przyciskami i z plakietką stały równo w rzędzie.
 */
export default function AiImageButtons({
  index,
  url,
  generating,
  onGenerate,
}: {
  index: number;
  url: string;
  generating: AiGenerating;
  onGenerate: (idx: number, variant: AiVariant) => void;
}) {
  if (isAiGeneratedImage(url)) {
    return (
      <p className="mt-1 h-6 flex items-center justify-center gap-1 text-[9px] sm:text-[10px] uppercase whitespace-nowrap text-charcoal/80">
        <Sparkles size={11} aria-hidden="true" />
        Wygenerowane
      </p>
    );
  }

  return (
    <div className="flex gap-1 mt-1 h-6">
      {(["ai", "ai_plus"] as AiVariant[]).map((variant) => {
        const busy = generating?.idx === index && generating.variant === variant;
        return (
          <button
            key={variant}
            type="button"
            onClick={() => onGenerate(index, variant)}
            disabled={generating !== null}
            title={
              variant === "ai"
                ? "AI – przedmiot na jednolitym tle"
                : "AI+ – przedmiot w wystylizowanej scenie"
            }
            aria-label={`Wygeneruj wersję ${AI_VARIANT_LABEL[variant]} ze zdjęcia ${index + 1}`}
            className="flex-1 inline-flex items-center justify-center gap-0.5 border border-sand bg-cream hover:bg-sand text-espresso text-[9px] sm:text-[10px] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? (
              <Loader2 size={11} className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles size={11} aria-hidden="true" />
            )}
            {AI_VARIANT_LABEL[variant]}
          </button>
        );
      })}
    </div>
  );
}
