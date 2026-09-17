"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Bot, Loader2, Sparkles, Upload, X } from "lucide-react";
import { uploadErrorMessage } from "@/lib/upload-error";
import { enProductKey } from "@/lib/i18n-content";
import type { AiVariant } from "@/lib/ai";

/**
 * „Agent dodawania produktów” – rozmowa w oknie panelu: jedno zdjęcie na
 * wejściu, kompletny produkt na wyjściu. Agent **na każdym kroku mówi, co
 * zrobił i co wybrał**, a tam, gdzie nie może zgadnąć (cena, liczba sztuk,
 * kolekcja, styl zdjęć, dodatkowe zdjęcia, włączenie w sklepie) **pyta** –
 * odpowiada się przyciskami z gotowymi wyborami albo w polu na dole okna.
 *
 * Przebieg (każdy krok to osobne żądanie do istniejących tras panelu –
 * generowanie zdjęcia trwa do 60 s i nie zmieściłoby się w jednej funkcji):
 * 1. upload zdjęcia (`/api/admin/upload`),
 * 2. karta: rozpoznanie, kategoria, nazwa i opis w stylu dwóch losowych
 *    produktów z tej kategorii (`/api/admin/ai-product-card`) → agent pokazuje
 *    wynik i pozwala zmienić kategorię,
 * 3. pytania: cena, liczba sztuk, kolekcja,
 * 4. wybór stylu zdjęć (presety promptów z Ustawień → AI) i generowanie
 *    **AI+** oraz **AI** (`/api/admin/ai-image` z `presetId`) → podgląd,
 *    możliwość ponownego wygenerowania w innym stylu i dołożenia kolejnych
 *    zdjęć (własnych); kolejność w karcie: AI+, AI, oryginał, dodatkowe,
 * 5. tłumaczenie nazwy i opisu (`/api/admin/ai-translate`),
 * 6. pytanie, czy włączyć produkt od razu; zapis (`POST /api/admin/products`,
 *    zajęty slug → sufiks) i `en_product_{id}` przez `/api/admin/settings`.
 *
 * Na końcu podsumowanie z kosztem przebiegu w PLN i USD (suma `costUsd`
 * z odpowiedzi tras × kurs z Ustawień → AI). Pytania realizuje `ask()` –
 * obietnica rozwiązywana przez UI, dzięki czemu przebieg jest zwykłą funkcją
 * `async` czytaną od góry do dołu.
 */

type Category = { slug: string; label: string };
type Collection = { slug: string; label: string };
type Preset = { id: string; name: string };

type Msg = { id: number; who: "agent" | "user"; text: string; images?: string[] };

type Choice = { value: string; label: string };
type Question = {
  text: string;
  /** Gotowe odpowiedzi – przyciski nad polem tekstowym. */
  choices?: Choice[];
  /** Czy pole tekstowe jest sensowne (przy pytaniach „wybierz z listy” bywa zbędne). */
  input?: "text" | "number" | "none";
  placeholder?: string;
  /** Pytanie o pliki – zamiast tekstu pokazuje wybór zdjęć. */
  files?: boolean;
};
type Answer = { text: string; files?: File[]; /** Tekst pokazywany w dzienniku zamiast `text` (np. etykieta przycisku). */ label?: string };

const CONFIRM =
  "Agent wykona kilka płatnych wywołań AI (rozpoznanie i opis, zdjęcia AI+ i AI, tłumaczenie) " +
  "i po drodze zada Ci parę pytań. Kontynuować?";

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

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) throw new Error(uploadErrorMessage(res.status, data?.error, file.name));
  return data.url as string;
}

function usd(value: number): string {
  return value < 0.01 && value > 0 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
}
function pln(value: number): string {
  return `${value.toFixed(value < 0.01 && value > 0 ? 4 : 2).replace(".", ",")} zł`;
}
function parseMoney(text: string): number | null {
  const n = parseFloat(text.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}
function parseCount(text: string): number | null {
  const n = parseInt(text.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Sygnał przerwania przebiegu – rzucany, gdy okno zostanie zamknięte w trakcie. */
class Aborted extends Error {}

export default function ProductAgent({
  usdPlnRate,
  categories,
  collections,
  presets,
  defaultPreset,
}: {
  usdPlnRate: number;
  categories: Category[];
  collections: Collection[];
  /** Presety promptów (wbudowane + własne) – wybór stylu zdjęć. */
  presets: Preset[];
  /** Preset przypisany do przycisku AI / AI+ w ustawieniach – proponowany jako domyślny. */
  defaultPreset: Record<AiVariant, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [draft, setDraft] = useState("");
  const [busyLabel, setBusyLabel] = useState("");
  const [done, setDone] = useState<{ id: string; costUsd: number } | null>(null);
  const resolverRef = useRef<((a: Answer) => void) | null>(null);
  const rejectRef = useRef<((e: Error) => void) | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  // Zamknięcie okna w trakcie pracy: kolejny komunikat agenta przerywa przebieg,
  // żeby nie generował zdjęć i nie zapisał produktu „w tle” po zamknięciu
  const abortRef = useRef(false);

  // Dziennik przewija się do ostatniej wiadomości
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, question, busyLabel]);

  function sayRaw(text: string, images?: string[]) {
    setMessages((prev) => [...prev, { id: nextId.current++, who: "agent", text, images }]);
  }
  function say(text: string, images?: string[]) {
    if (abortRef.current) throw new Aborted("przerwane");
    sayRaw(text, images);
  }
  function said(text: string) {
    setMessages((prev) => [...prev, { id: nextId.current++, who: "user", text }]);
  }

  /** Zadaje pytanie i czeka na odpowiedź z UI (przycisk, pole tekstowe albo pliki). */
  function ask(q: Question): Promise<Answer> {
    setBusyLabel("");
    setQuestion(q);
    setDraft("");
    return new Promise<Answer>((resolve, reject) => {
      resolverRef.current = resolve;
      rejectRef.current = reject;
    });
  }
  function answer(a: Answer) {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    rejectRef.current = null;
    setQuestion(null);
    setDraft("");
    const shown = a.label ?? a.text;
    if (shown) said(shown);
    resolve?.(a);
  }

  function reset() {
    setMessages([]);
    setQuestion(null);
    setDraft("");
    setBusyLabel("");
    setDone(null);
  }
  function close() {
    if (running) {
      if (!confirm("Przerwać pracę agenta? Wykonane już wywołania AI zostały naliczone.")) return;
      abortRef.current = true;
      rejectRef.current?.(new Aborted("przerwane"));
    }
    setOpen(false);
    reset();
  }
  function openAgent() {
    reset();
    abortRef.current = false;
    setOpen(true);
    say(
      "Cześć! Wgraj jedno zdjęcie produktu, a ja rozpoznam, co to jest, dobiorę kategorię, " +
        "napiszę nazwę i opis w stylu Twojego sklepu, wygeneruję zdjęcia AI+ i AI, przetłumaczę kartę " +
        "na angielski i zapiszę produkt. Po drodze zapytam o cenę, liczbę sztuk, kolekcję i styl zdjęć."
    );
    setQuestion({ text: "Wybierz zdjęcie produktu.", files: true, input: "none" });
  }

  // ── Przebieg agenta ───────────────────────────────────────────────────────
  async function run(firstFile: File) {
    setRunning(true);
    let cost = 0;
    try {
      if (!confirm(CONFIRM)) throw new Aborted("anulowane");

      // 1. Upload
      setBusyLabel("Wgrywam zdjęcie…");
      const originalUrl = await uploadFile(firstFile);
      say("Zdjęcie wgrane.", [originalUrl]);

      // 2. Karta produktu
      setBusyLabel("Rozpoznaję produkt, dobieram kategorię i piszę kartę w stylu sklepu…");
      const card = await postJson<{
        name: string; slug: string; category: string; categoryLabel: string; categoryMatched: boolean;
        description: string; examples: string[]; costUsd: number;
      }>("/api/admin/ai-product-card", { url: originalUrl });
      cost += card.costUsd ?? 0;
      if (!card.category) throw new Error("W sklepie nie ma żadnej kategorii – dodaj ją najpierw w zakładce Kategorie.");
      say(
        (card.categoryMatched
          ? `Rozpoznałem produkt i przypisałem go do kategorii „${card.categoryLabel}”.`
          : `Nie byłem pewien kategorii – tymczasowo ustawiłem „${card.categoryLabel}”.`) +
          (card.examples.length
            ? ` Wzorowałem się na produktach: ${card.examples.join(", ")}.`
            : " W tej kategorii nie ma jeszcze produktów, więc opis napisałem od zera.") +
          `\n\nNazwa: ${card.name}\nOpis: ${card.description}`
      );

      // Kategoria – potwierdzenie albo zmiana
      const cat = await ask({
        text: "Czy kategoria jest właściwa? Wybierz inną, jeśli trzeba.",
        choices: [
          { value: card.category, label: `Zostaw: ${card.categoryLabel}` },
          ...categories.filter((c) => c.slug !== card.category).map((c) => ({ value: c.slug, label: c.label })),
        ],
        input: "none",
      });
      const category = categories.find((c) => c.slug === cat.text) ?? categories.find((c) => c.slug === card.category)!;
      say(`Kategoria: ${category.label}.`);

      // 3. Cena
      let price: number | null = null;
      while (price === null) {
        const a = await ask({
          text: "Jaka ma być cena (zł)? Wpisz kwotę, np. 85 albo 120,50.",
          input: "number",
          placeholder: "np. 85",
          choices: [{ value: "0", label: "Ustalę później (0 zł, produkt zostanie nieaktywny)" }],
        });
        price = parseMoney(a.text);
        if (price === null) say("Nie rozumiem tej kwoty – wpisz samą liczbę, np. 85.");
      }
      say(price > 0 ? `Cena: ${price.toFixed(2).replace(".", ",")} zł.` : "Cena zostaje do ustalenia (0 zł).");

      // Liczba sztuk
      let stock: number | null = null;
      while (stock === null) {
        const a = await ask({
          text: "Ile sztuk jest dostępnych?",
          input: "number",
          placeholder: "np. 3",
          choices: [1, 2, 3, 5].map((n) => ({ value: String(n), label: `${n} szt.` })),
        });
        stock = parseCount(a.text);
        if (stock === null) say("Podaj liczbę sztuk, np. 2.");
      }
      say(`Stan magazynowy: ${stock} szt.`);

      // Kolekcja
      let collection: string | null = null;
      if (collections.length > 0) {
        const a = await ask({
          text: "Do której kolekcji (serii) należy ten produkt?",
          choices: [{ value: "", label: "Bez kolekcji" }, ...collections.map((c) => ({ value: c.slug, label: c.label }))],
          input: "none",
        });
        collection = a.text || null;
        say(collection ? `Kolekcja: ${collections.find((c) => c.slug === collection)?.label ?? collection}.` : "Bez kolekcji.");
      } else {
        say("W sklepie nie ma jeszcze kolekcji – pomijam ten wybór.");
      }

      // 4. Styl zdjęć i generowanie
      const presetName = (id: string) => presets.find((p) => p.id === id)?.name ?? id;
      const pickPreset = (variant: AiVariant, label: string) =>
        ask({
          text: `Jaki styl zdjęcia ${label}? Domyślnie: „${presetName(defaultPreset[variant])}”.`,
          choices: [
            { value: defaultPreset[variant], label: `Domyślny: ${presetName(defaultPreset[variant])}` },
            ...presets.filter((p) => p.id !== defaultPreset[variant]).map((p) => ({ value: p.id, label: p.name })),
          ],
          input: "none",
        });

      const generated: Record<AiVariant, string | null> = { ai_plus: null, ai: null };
      const generate = async (variant: AiVariant, presetId: string) => {
        setBusyLabel(`Generuję zdjęcie ${variant === "ai_plus" ? "AI+" : "AI"} (${presetName(presetId)})…`);
        try {
          const gen = await postJson<{ url: string; costUsd?: number; preset?: string }>("/api/admin/ai-image", {
            url: originalUrl,
            variant,
            presetId,
          });
          cost += gen.costUsd ?? 0;
          generated[variant] = gen.url;
          say(`Zdjęcie ${variant === "ai_plus" ? "AI+" : "AI"} gotowe (styl: ${gen.preset ?? presetName(presetId)}).`, [gen.url]);
        } catch (e) {
          say(`Zdjęcia ${variant === "ai_plus" ? "AI+" : "AI"} nie udało się wygenerować: ${e instanceof Error ? e.message : "błąd"}. Idę dalej bez niego.`);
        }
      };

      const plusPreset = await pickPreset("ai_plus", "AI+ (scena z rekwizytami)");
      await generate("ai_plus", plusPreset.text);
      const plainPreset = await pickPreset("ai", "AI (jednolite tło)");
      await generate("ai", plainPreset.text);

      // Podgląd zestawu i pętla poprawek
      const extras: string[] = [];
      for (;;) {
        const set = [generated.ai_plus, generated.ai, originalUrl, ...extras].filter((u): u is string => Boolean(u));
        say("Tak wygląda zestaw zdjęć w kolejności, w jakiej trafi do karty: AI+, AI, oryginał, dodatkowe.", set);
        const a = await ask({
          text: "Co dalej ze zdjęciami?",
          choices: [
            { value: "next", label: "Dalej – zdjęcia są w porządku" },
            { value: "more", label: "Dodaj kolejne własne zdjęcia" },
            { value: "redo_plus", label: "Wygeneruj AI+ jeszcze raz w innym stylu" },
            { value: "redo_ai", label: "Wygeneruj AI jeszcze raz w innym stylu" },
          ],
          input: "none",
        });
        if (a.text === "next") break;
        if (a.text === "more") {
          const files = await ask({ text: "Wybierz dodatkowe zdjęcia (można kilka).", files: true, input: "none" });
          for (const f of files.files ?? []) {
            setBusyLabel(`Wgrywam ${f.name}…`);
            try {
              extras.push(await uploadFile(f));
            } catch (e) {
              say(`Nie udało się wgrać ${f.name}: ${e instanceof Error ? e.message : "błąd"}.`);
            }
          }
          if (files.files?.length) say(`Dodałem ${files.files.length} zdj.`);
        } else if (a.text === "redo_plus") {
          const p = await pickPreset("ai_plus", "AI+");
          await generate("ai_plus", p.text);
        } else if (a.text === "redo_ai") {
          const p = await pickPreset("ai", "AI");
          await generate("ai", p.text);
        }
      }
      const images = [generated.ai_plus, generated.ai, originalUrl, ...extras].filter((u): u is string => Boolean(u));

      // 5. Angielska wersja
      setBusyLabel("Tłumaczę nazwę i opis na angielski…");
      let english: { name: string; description: string } | null = null;
      try {
        const tr = await postJson<{ texts: string[]; costUsd?: number }>("/api/admin/ai-translate", {
          texts: [card.name, card.description],
        });
        english = { name: tr.texts[0] ?? "", description: tr.texts[1] ?? "" };
        cost += tr.costUsd ?? 0;
        say(`Wersja angielska gotowa.\n\nName: ${english.name}\nDescription: ${english.description}`);
      } catch (e) {
        say(`Tłumaczenia nie udało się zrobić (${e instanceof Error ? e.message : "błąd"}) – uzupełnisz je w zakładce EN produktu.`);
      }

      // 6. Widoczność i zapis
      let active = false;
      if (price > 0 && stock > 0) {
        const a = await ask({
          text: "Włączyć produkt w sklepie od razu po zapisie?",
          choices: [
            { value: "yes", label: "Tak, włącz od razu" },
            { value: "no", label: "Nie, zostaw nieaktywny – sprawdzę go najpierw" },
          ],
          input: "none",
        });
        active = a.text === "yes";
      } else {
        say("Bez ceny albo bez sztuk produkt zostaje nieaktywny – włączysz go po uzupełnieniu.");
      }

      setBusyLabel("Zapisuję produkt…");
      const base = {
        name: card.name,
        description: card.description,
        price,
        category: category.slug,
        collection,
        stock,
        featured: false,
        active,
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
        if (res.status !== 409) break;
      }
      if (!saved) throw new Error(lastError || "Nie udało się zapisać produktu.");

      if (english && (english.name || english.description)) {
        const enRes = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([{ key: enProductKey(saved.id), value: JSON.stringify(english) }]),
        });
        if (!enRes.ok) say("Tłumaczenie gotowe, ale nie zapisało się – uzupełnij je w zakładce EN produktu.");
      }

      say(
        `Gotowe. Zapisałem produkt „${card.name}” (${active ? "aktywny, widoczny w sklepie" : "nieaktywny"}), ` +
          `${images.length} zdj., cena ${price.toFixed(2).replace(".", ",")} zł, ${stock} szt.`
      );
      setBusyLabel("");
      setDone({ id: saved.id, costUsd: cost });
      router.refresh();
    } catch (e) {
      setBusyLabel("");
      if (e instanceof Aborted) {
        sayRaw("Przerwano.");
      } else {
        sayRaw(`Nie udało się dokończyć: ${e instanceof Error ? e.message : "błąd"}. Możesz zamknąć okno i spróbować ponownie.`);
      }
      if (cost > 0) setDone({ id: "", costUsd: cost });
    } finally {
      setRunning(false);
      setQuestion(null);
    }
  }

  // Odpowiedź na pierwsze pytanie (zdjęcie) uruchamia przebieg
  function onFiles(files: File[]) {
    if (files.length === 0) return;
    if (!running) {
      said(`Zdjęcie: ${files[0].name}`);
      setQuestion(null);
      void run(files[0]);
      return;
    }
    answer({ text: `${files.length} zdj.: ${files.map((f) => f.name).join(", ")}`, files });
  }

  function submitText() {
    if (!question || question.files) return;
    const text = draft.trim();
    if (!text) return;
    answer({ text });
  }

  return (
    <>
      <button
        type="button"
        onClick={openAgent}
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
            className="w-full max-w-2xl h-[85vh] flex flex-col bg-warm-white border border-sand shadow-xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand shrink-0">
              <h2 className="font-serif text-xl text-espresso flex items-center gap-2">
                <Bot size={20} strokeWidth={1.5} className="text-clay" />
                Agent dodawania produktów
              </h2>
              <button type="button" onClick={close} aria-label="Zamknij" className="p-1 text-charcoal/80 hover:text-espresso">
                <X size={18} />
              </button>
            </div>

            {/* Dziennik rozmowy */}
            <div ref={logRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-cream/40">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.who === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                      m.who === "user"
                        ? "bg-espresso text-cream"
                        : "bg-warm-white border border-sand text-charcoal"
                    }`}
                  >
                    {m.text}
                    {m.images && m.images.length > 0 && (
                      <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {m.images.map((url, i) => (
                          <div key={`${url}-${i}`} className="relative aspect-[4/3] bg-cream border border-sand overflow-hidden">
                            <Image src={url} alt={`Zdjęcie ${i + 1}`} fill unoptimized className="object-contain" sizes="120px" />
                            <span className="absolute left-1 top-1 bg-espresso/80 text-cream text-[9px] px-1">{i + 1}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {busyLabel && (
                <div className="flex items-center gap-2 text-sm text-charcoal/80">
                  <Loader2 size={14} className="animate-spin text-clay" />
                  {busyLabel}
                </div>
              )}
              {done && (
                <div className="border border-sand bg-warm-white px-4 py-3 text-sm">
                  <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-1">Koszt tego przebiegu</p>
                  <p className="font-serif text-2xl text-espresso">
                    {pln(done.costUsd * usdPlnRate)}
                    <span className="text-sm text-charcoal/80 ml-2">({usd(done.costUsd)}, kurs {usdPlnRate.toFixed(2).replace(".", ",")} zł)</span>
                  </p>
                  <p className="text-[11px] text-charcoal/80 mt-1">Wg stawek Google AI z cennika w kodzie – kwota orientacyjna.</p>
                  {done.id && (
                    <button
                      type="button"
                      onClick={() => { setOpen(false); reset(); router.push(`/admin/produkty/${done.id}`); }}
                      className="mt-3 bg-clay hover:bg-espresso text-cream text-xs tracking-widest uppercase px-5 py-2.5 transition-colors"
                    >
                      Otwórz produkt
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Pole odpowiedzi */}
            <div className="border-t border-sand px-5 py-4 shrink-0 space-y-3">
              {question && <p className="text-sm text-espresso">{question.text}</p>}
              {question?.choices && (
                <div className="flex flex-wrap gap-2">
                  {question.choices.map((c) => (
                    <button
                      key={c.value + c.label}
                      type="button"
                      onClick={() => answer({ text: c.value, label: c.label })}
                      className="border border-clay text-clay hover:bg-clay hover:text-cream text-xs px-3 py-1.5 transition-colors"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
              {question?.files ? (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-sand hover:border-clay cursor-pointer py-4 text-xs tracking-widest uppercase text-charcoal/80 transition-colors">
                  <Upload size={16} strokeWidth={1.5} />
                  {running ? "Wybierz zdjęcia" : "Wybierz zdjęcie produktu"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple={running}
                    className="hidden"
                    onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
                  />
                </label>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); submitText(); }}
                  className="flex gap-2"
                >
                  <input
                    type={question?.input === "number" ? "text" : "text"}
                    inputMode={question?.input === "number" ? "decimal" : undefined}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={!question || question.input === "none"}
                    placeholder={question ? (question.placeholder ?? "Odpowiedz…") : (running ? "Agent pracuje…" : "")}
                    className="flex-1 min-w-0 bg-cream border border-sand focus:border-clay outline-none px-4 py-2.5 text-espresso text-sm disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!question || question.input === "none" || !draft.trim()}
                    className="bg-clay hover:bg-espresso text-cream text-xs tracking-widest uppercase px-4 py-2.5 transition-colors disabled:bg-sand disabled:text-charcoal/40"
                  >
                    Wyślij
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
