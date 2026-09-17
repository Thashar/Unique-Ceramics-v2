"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Circle, Loader2, Sparkles, Upload, X, XCircle } from "lucide-react";
import { uploadErrorMessage } from "@/lib/upload-error";
import { enProductKey } from "@/lib/i18n-content";

/**
 * „Agent dodawania produktów” (przycisk obok „Dodaj produkt”) – jedno zdjęcie
 * na wejściu, gotowa karta produktu na wyjściu. Działa jak agent: kolejne kroki wołają istniejące
 * trasy panelu, a dziennik pokazuje, co się właśnie dzieje.
 *
 * Kroki (każdy to osobne żądanie, bo generowanie zdjęcia zajmuje do 60 s
 * i nie zmieściłoby się w jednej funkcji serverless):
 * 1. upload zdjęcia (`/api/admin/upload`),
 * 2. rozpoznanie produktu, dobór kategorii i nazwa + opis w stylu dwóch
 *    losowych produktów z tej kategorii (`/api/admin/ai-product-card`),
 * 3. zdjęcie **AI+** (scena) i 4. zdjęcie **AI** (jednolite tło) – `/api/admin/ai-image`;
 *    kolejność w karcie: AI+, AI, oryginał,
 * 5. angielska nazwa i opis (`/api/admin/ai-translate`),
 * 6. zapis produktu (`POST /api/admin/products`) i wersji angielskiej
 *    (`en_product_{id}` przez `/api/admin/settings`).
 *
 * Produkt powstaje **nieaktywny, z ceną 0 i stanem 0** – tego model nie zgadnie,
 * więc na końcu otwiera się formularz produktu do uzupełnienia ceny i stanu.
 * Nieudane zdjęcie AI nie przerywa całości (produkt dostaje te zdjęcia, które
 * się udały); nieudane tłumaczenie też nie. Na końcu okno podsumowuje koszt
 * wszystkich wywołań w USD i PLN (kurs z ustawień AI).
 */

type StepStatus = "todo" | "running" | "done" | "warn" | "error";
type Step = { id: string; label: string; status: StepStatus; note?: string };

const STEPS: { id: string; label: string }[] = [
  { id: "upload", label: "Wgrywam zdjęcie" },
  { id: "card", label: "Rozpoznaję produkt, dobieram kategorię i piszę kartę w stylu sklepu" },
  { id: "ai_plus", label: "Generuję zdjęcie AI+ (scena)" },
  { id: "ai", label: "Generuję zdjęcie AI (jednolite tło)" },
  { id: "en", label: "Tłumaczę nazwę i opis na angielski" },
  { id: "save", label: "Zapisuję produkt" },
];

const CONFIRM =
  "Zostanie wykonanych 5 płatnych wywołań AI (rozpoznanie i opis – 2, zdjęcie AI+, zdjęcie AI, tłumaczenie). " +
  "Produkt powstanie jako nieaktywny, z ceną i stanem do uzupełnienia. Kontynuować?";

/** Ile razy próbujemy wolnego sluga, gdy nazwa się powtarza. */
const SLUG_ATTEMPTS = 6;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Błąd ${res.status}`);
  return data as T;
}

function usd(value: number): string {
  return value < 0.01 && value > 0 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
}
function pln(value: number): string {
  return `${value.toFixed(value < 0.01 && value > 0 ? 4 : 2).replace(".", ",")} zł`;
}

export default function QuickAddProduct({ usdPlnRate }: { usdPlnRate: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>(() => STEPS.map((s) => ({ ...s, status: "todo" })));
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: string; name: string; costUsd: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Podgląd wybranego pliku – adres liczony z pliku (nie `setState` w efekcie),
  // zwalniany w sprzątaniu efektu przy zmianie pliku i zamknięciu okna
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !running) close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function close() {
    if (running) return;
    setOpen(false);
    setFile(null);
    setError("");
    setResult(null);
    setSteps(STEPS.map((s) => ({ ...s, status: "todo" })));
  }

  function mark(id: string, status: StepStatus, note?: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status, note } : s)));
  }

  async function run() {
    if (!file || running) return;
    if (!confirm(CONFIRM)) return;
    setRunning(true);
    setError("");
    setSteps(STEPS.map((s) => ({ ...s, status: "todo" })));
    let cost = 0;

    try {
      // 1. Upload
      mark("upload", "running");
      const formData = new FormData();
      formData.append("file", file);
      const upRes = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const upData = await upRes.json().catch(() => null);
      if (!upRes.ok || !upData?.url) throw new Error(uploadErrorMessage(upRes.status, upData?.error, file.name));
      const originalUrl: string = upData.url;
      mark("upload", "done");

      // 2. Karta produktu (kategoria + nazwa + opis w stylu sklepu)
      mark("card", "running");
      const card = await postJson<{
        name: string; slug: string; category: string; categoryLabel: string; categoryMatched: boolean;
        description: string; examples: string[]; costUsd: number;
      }>("/api/admin/ai-product-card", { url: originalUrl });
      cost += card.costUsd ?? 0;
      if (!card.category) throw new Error("W sklepie nie ma żadnej kategorii – dodaj ją najpierw w zakładce Kategorie.");
      mark(
        "card",
        card.categoryMatched ? "done" : "warn",
        card.categoryMatched
          ? `${card.name} · kategoria: ${card.categoryLabel}` +
            (card.examples.length ? ` · wzór: ${card.examples.join(", ")}` : " · brak produktów w kategorii do wzorowania")
          : `${card.name} · model nie dopasował kategorii – ustawiono „${card.categoryLabel}”, popraw ją w formularzu`
      );

      // 3. AI+ i 4. AI – każde może paść bez przerywania całości
      const images: string[] = [];
      for (const variant of ["ai_plus", "ai"] as const) {
        mark(variant, "running");
        try {
          const gen = await postJson<{ url: string; costUsd?: number }>("/api/admin/ai-image", { url: originalUrl, variant });
          images.push(gen.url);
          cost += gen.costUsd ?? 0;
          mark(variant, "done");
        } catch (e) {
          mark(variant, "warn", `Pominięte: ${e instanceof Error ? e.message : "błąd generowania"}`);
        }
      }
      // Kolejność w karcie: AI+, AI, oryginał
      images.push(originalUrl);

      // 5. Angielska wersja
      mark("en", "running");
      let english: { name: string; description: string } | null = null;
      try {
        const tr = await postJson<{ texts: string[]; costUsd?: number }>("/api/admin/ai-translate", {
          texts: [card.name, card.description],
        });
        english = { name: tr.texts[0] ?? "", description: tr.texts[1] ?? "" };
        cost += tr.costUsd ?? 0;
        mark("en", "done", english.name);
      } catch (e) {
        mark("en", "warn", `Pominięte: ${e instanceof Error ? e.message : "błąd tłumaczenia"}`);
      }

      // 6. Zapis produktu – nieaktywny, cena i stan do uzupełnienia
      mark("save", "running");
      const base = {
        name: card.name,
        description: card.description,
        price: 0,
        category: card.category,
        collection: null,
        stock: 0,
        featured: false,
        active: false,
        variesFromPhoto: false,
        discountPercent: 0,
        discountStartsAt: null,
        discountEndsAt: null,
        images,
      };
      let saved: { id: string } | null = null;
      let lastError = "";
      for (let attempt = 0; attempt < SLUG_ATTEMPTS && !saved; attempt++) {
        const slug = attempt === 0 ? card.slug : `${card.slug}-${attempt + 1}`;
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...base, slug }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.id) { saved = data; break; }
        lastError = data?.error ?? `Błąd ${res.status}`;
        // 409 = slug zajęty → kolejna próba z sufiksem; inny błąd przerywa
        if (res.status !== 409) break;
      }
      if (!saved) throw new Error(lastError || "Nie udało się zapisać produktu.");

      if (english && (english.name || english.description)) {
        const enRes = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([{ key: enProductKey(saved.id), value: JSON.stringify(english) }]),
        });
        if (!enRes.ok) mark("en", "warn", "Tłumaczenie gotowe, ale nie zapisało się – uzupełnij w zakładce EN");
      }
      mark("save", "done");
      setResult({ id: saved.id, name: card.name, costUsd: cost });
      router.refresh();
    } catch (e) {
      setSteps((prev) => prev.map((s) => (s.status === "running" ? { ...s, status: "error" } : s)));
      setError(e instanceof Error ? e.message : "Coś poszło nie tak.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-clay text-clay hover:bg-clay hover:text-cream text-xs tracking-widest uppercase px-4 py-2.5 transition-colors"
      >
        <Sparkles size={15} />
        <span className="hidden sm:inline">Agent dodawania produktów</span>
        <span className="sm:hidden">Agent</span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-espresso/60" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Agent dodawania produktów"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-warm-white border border-sand shadow-xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand">
              <h2 className="font-serif text-xl text-espresso">Agent dodawania produktów</h2>
              <button type="button" onClick={close} disabled={running} aria-label="Zamknij" className="p-1 text-charcoal/80 hover:text-espresso disabled:opacity-40">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {!result && (
                <>
                  <p className="text-xs text-charcoal/80 leading-relaxed">
                    Wgraj jedno zdjęcie produktu. Asystent rozpozna, co to jest, dobierze kategorię,
                    napisze nazwę i opis w stylu produktów z tej kategorii, wygeneruje zdjęcia AI+ i AI,
                    przetłumaczy kartę na angielski i zapisze produkt jako <strong>nieaktywny</strong> –
                    cenę i stan magazynowy uzupełnisz w formularzu, który otworzy się na końcu.
                  </p>

                  <label
                    className={`block border-2 border-dashed border-sand hover:border-clay transition-colors cursor-pointer ${running ? "pointer-events-none opacity-60" : ""}`}
                  >
                    {preview ? (
                      <div className="relative w-full aspect-[4/3] bg-cream">
                        <Image src={preview} alt="Wybrane zdjęcie" fill unoptimized className="object-contain" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-12 text-charcoal/80">
                        <Upload size={24} strokeWidth={1.5} />
                        <span className="text-xs tracking-widest uppercase">Wybierz zdjęcie produktu</span>
                      </div>
                    )}
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={running}
                      onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(""); }}
                    />
                  </label>
                </>
              )}

              {(running || steps.some((s) => s.status !== "todo")) && (
                <ol className="space-y-2">
                  {steps.map((s) => (
                    <li key={s.id} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 shrink-0">
                        {s.status === "running" && <Loader2 size={16} className="animate-spin text-clay" />}
                        {s.status === "done" && <CheckCircle2 size={16} className="text-green-700" />}
                        {s.status === "warn" && <CheckCircle2 size={16} className="text-amber-700" />}
                        {s.status === "error" && <XCircle size={16} className="text-red-700" />}
                        {s.status === "todo" && <Circle size={16} className="text-sand" />}
                      </span>
                      <span className={s.status === "todo" ? "text-charcoal/80" : "text-espresso"}>
                        {s.label}
                        {s.note && <span className="block text-xs text-charcoal/80 mt-0.5">{s.note}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
              )}

              {result ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                    Produkt <strong>{result.name}</strong> został zapisany jako nieaktywny.
                    Uzupełnij cenę i stan magazynowy, sprawdź opis i włącz go w sklepie.
                  </div>
                  {/* Podsumowanie kosztu – suma wywołań AI z tego przebiegu, przeliczona
                      kursem z Ustawień → AI. Zero przy modelu spoza cennika */}
                  <div className="border border-sand bg-cream px-4 py-3 text-sm">
                    <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-1">Koszt tego żądania</p>
                    <p className="font-serif text-2xl text-espresso">
                      {pln(result.costUsd * usdPlnRate)}
                      <span className="text-sm text-charcoal/80 ml-2">({usd(result.costUsd)}, kurs {usdPlnRate.toFixed(2).replace(".", ",")} zł)</span>
                    </p>
                    <p className="text-[11px] text-charcoal/80 mt-1">
                      Rozpoznanie i opis, dwa zdjęcia AI oraz tłumaczenie – wg stawek Google AI z cennika w kodzie; kwota orientacyjna.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { setOpen(false); router.push(`/admin/produkty/${result.id}`); }}
                      className="bg-clay hover:bg-espresso text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
                    >
                      Otwórz produkt
                    </button>
                    <button type="button" onClick={close} className="text-sm text-charcoal/80 hover:text-espresso transition-colors">
                      Zamknij
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={run}
                    disabled={!file || running}
                    className="inline-flex items-center gap-2 bg-clay hover:bg-espresso text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors disabled:bg-sand disabled:text-charcoal/40 disabled:cursor-not-allowed"
                  >
                    {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {running ? "Pracuję…" : "Generuj kartę produktu"}
                  </button>
                  {running && (
                    <span className="text-xs text-charcoal/80">To potrwa około 1–2 minut – nie zamykaj okna.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
