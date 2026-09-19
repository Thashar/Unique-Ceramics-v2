"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Bot, Loader2, Plus, Redo2, Sparkles, Upload, X } from "lucide-react";
import { uploadErrorMessage } from "@/lib/upload-error";
import { slugifyTitle } from "@/lib/portfolio-slug";
import { enProductKey } from "@/lib/i18n-content";
import type { AiVariant } from "@/lib/ai";
import {
  DEFAULT_DIMENSION_LABELS,
  buildProductDescription,
  normalizeMeasure,
  type DimensionValue,
} from "@/lib/product-description";

/**
 * „Agent dodawania produktów” – rozmowa w oknie panelu: jedno albo kilka
 * zdjęć tego samego przedmiotu na wejściu, kompletny produkt na wyjściu. Agent **na każdym kroku pisze, co
 * zrobił i co wybrał** (istotne rzeczy pogrubione, sekcje od nowej linii),
 * a tam, gdzie nie może zgadnąć, **pyta** – przyciski z gotowymi wyborami
 * stoją **pod wypowiedzią agenta w oknie rozmowy**, a pole na dole służy
 * do odpowiedzi tekstowych (cena, liczba sztuk).
 *
 * Przebieg (`run()`, zwykła funkcja `async`; pytania przez `ask()` – obietnica
 * rozwiązywana przez UI; każdy krok to osobne żądanie, bo generowanie
 * zdjęcia trwa do 60 s i nie zmieściłoby się w jednej funkcji):
 * 1. upload zdjęć (`/api/admin/upload`) – **jedno albo kilka naraz**
 *    (maks. `MAX_START_FILES`) → podgląd w rozmowie,
 * 2. rozpoznanie i **propozycja kategorii** (`/api/admin/ai-product-card`
 *    bez `category`) → przyciski „Zostaw” / inne kategorie. Rozpoznanie,
 *    kategoria, nazwa i opis idą **zawsze z pierwszego zdjęcia** – pozostałe
 *    to ten sam przedmiot z innej strony, więc modelu o nie nie pytamy,
 * 3. po potwierdzeniu **automatycznie**: karta w stylu i formatowaniu
 *    produktów z tej kategorii (`ai-product-card` z `category` + `draft`)
 *    i **przerobienie wszystkich wgranych zdjęć**: pierwsze na **AI+**
 *    (scena), **każde kolejne na AI** (jednolite tło) – `/api/admin/ai-image`
 *    z presetem przypisanym do przycisku w Ustawieniach → AI. Przy jednym
 *    zdjęciu wychodzi samo AI+, jak dotąd (decyzja właściciela 17.09.2026:
 *    wersja AI ze zdjęcia głównego nie powstaje sama),
 * 4. podgląd wszystkich zdjęć i pytanie o **kolejne zdjęcie** – przyciski
 *    „Kolejne AI+” / „Kolejne AI” (z plusem) i pod nimi „Wystarczy, idziemy
 *    dalej”; po wyborze trybu plik, generowanie i znowu podgląd. Kolejność
 *    w karcie: AI+, wersje AI kolejnych zdjęć, **oryginały na końcu**,
 * 5. pytania o cenę (z **sugestią** – mediana cen produktów wzorcowych), liczbę
 *    sztuk i kolekcję – tu można też **założyć nową kolekcję** (przycisk
 *    z plusem, potem nazwa; `POST /api/admin/collections`, slug z nazwy),
 * 6. **wymiary i pojemność** – etykiety i podpowiedzi wartości pochodzą ze
 *    wzorów (`extras` z trasy), a opis składa `buildProductDescription`
 *    w stałym układzie: opis (2 zdania), zdanie o wypale ze wzorów,
 *    „Wymiary:”, „Pojemność:” – model nie skleja tego sam, bo potrafił wkleić
 *    wymiary dwa razy i zostawić znacznik w tekście (17.09.2026),
 * 7. tłumaczenie nazwy i pełnego opisu (`/api/admin/ai-translate`),
 * 8. pytanie, czy **usunąć wrzucone oryginały** z karty (zostają same
 *    zdjęcia z AI; pliki w Storage sprząta Ustawienia → Zdjęcia) – tylko gdy
 *    jest choć jedno zdjęcie z AI, potem przy cenie i stanie > 0 pytanie,
 *    czy włączyć produkt; zapis (`POST /api/admin/products`, zajęty slug →
 *    sufiks) i `en_product_{id}`.
 *
 * **Każde pytanie da się pominąć** przyciskiem – wtedy pole zostaje puste
 * (cena 0 = produkt nieaktywny, wymiar bez wartości nie trafia do opisu).
 * **Układ przycisków** (decyzja właściciela 17.09.2026): „Pomiń” (strzałka)
 * i „Utwórz…” (plus) stoją zawsze w **pierwszym rzędzie**, pozostałe wybory
 * w kolejnych – `Choice.kind`. Jedyny wyjątek to liczba sztuk: 1, 2, 3, 4,
 * a „Pomiń” na końcu (`Question.skipLast`).
 *
 * Na końcu podsumowanie z kosztem przebiegu w PLN i USD (suma `costUsd`
 * z odpowiedzi tras × kurs z Ustawień → AI). Agent nie pisze, na czym się
 * wzorował – po prostu się wzoruje (decyzja właściciela 17.09.2026).
 */

type Category = { slug: string; label: string };
type Collection = { slug: string; label: string };
type Preset = { id: string; name: string };

type Choice = {
  value: string;
  label: string;
  /** `skip` – pomiń (strzałka), `create` – utwórz (plus); oba w pierwszym rzędzie przycisków. */
  kind?: "skip" | "create";
};
type Msg = {
  id: number;
  who: "agent" | "user";
  text: string;
  images?: string[];
  /** Przyciski wyboru pod wypowiedzią – aktywne tylko przy ostatnim pytaniu. */
  choices?: Choice[];
  skipLast?: boolean;
};
type Question = {
  text: string;
  choices?: Choice[];
  /** Pole tekstowe na dole: liczba, tekst albo brak (przy samych przyciskach). */
  input?: "text" | "number" | "none";
  placeholder?: string;
  /** Pytanie o pliki – na dole pokazuje wybór zdjęć. */
  files?: boolean;
  /** „Pomiń” na końcu jednego rzędu zamiast na początku (tylko liczba sztuk). */
  skipLast?: boolean;
};
type Answer = { text: string; files?: File[]; label?: string };

/**
 * Potwierdzenie przed startem – mówi wprost, ile zdjęć pójdzie do modelu,
 * bo każde z nich to osobne płatne wywołanie.
 */
const confirmText = (count: number) =>
  "Agent wykona kilka płatnych wywołań AI (rozpoznanie i opis, " +
  (count > 1 ? `zdjęcia: 1 × AI+ i ${count - 1} × AI` : "zdjęcie AI+") +
  ", kolejne zdjęcia, tłumaczenie) i po drodze zada Ci parę pytań. Kontynuować?";

/**
 * Ile zdjęć bierzemy z pierwszego wyboru. Każde to osobne, płatne wywołanie
 * modelu, a produkt i tak ma limit zdjęć (`PRODUCT_MAX_IMAGES` = 30, licząc
 * z wersjami AI) – resztę można dołożyć w pytaniu o kolejne zdjęcia.
 */
const MAX_START_FILES = 10;

/** Ile razy próbujemy wolnego sluga kolekcji, gdy nazwa się powtarza. */
const COLLECTION_SLUG_ATTEMPTS = 6;

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
/** Niskie kwoty (poniżej 5 gr) z czterema miejscami, żeby nie pokazywać „0,00 zł” za realne wywołanie. */
function pln(value: number): string {
  return `${value.toFixed(value > 0 && value < 0.05 ? 4 : 2).replace(".", ",")} zł`;
}
function parseMoney(text: string): number | null {
  const n = parseFloat(text.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}
function parseCount(text: string): number | null {
  const n = parseInt(text.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function errorText(e: unknown): string {
  return (e instanceof Error ? e.message : "błąd").replace(/[—―]/g, "–");
}

/**
 * Wiadomość agenta: `**pogrubienie**`, nowe linie i puste linie jako odstępy.
 * Długie myślniki zamieniane na półpauzy – agent ich nie używa, a model bywa
 * głuchy na tę prośbę.
 */
function MessageText({ text }: { text: string }) {
  const lines = text.replace(/[—―]/g, "–").split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (!line.trim()) return <span key={i} className="block h-2" aria-hidden="true" />;
        const parts: ReactNode[] = [];
        line.split(/(\*\*[^*]+\*\*)/g).forEach((chunk, j) => {
          if (chunk.startsWith("**") && chunk.endsWith("**")) {
            parts.push(<strong key={j} className="font-semibold text-espresso">{chunk.slice(2, -2)}</strong>);
          } else if (chunk) {
            parts.push(chunk);
          }
        });
        return <span key={i} className="block">{parts}</span>;
      })}
    </>
  );
}

/** Sygnał przerwania przebiegu – rzucany, gdy okno zostanie zamknięte w trakcie. */
class Aborted extends Error {}

const CHOICE_CLASS =
  "inline-flex items-center gap-1.5 border border-clay text-clay hover:bg-clay hover:text-cream text-xs px-3 py-1.5 transition-colors disabled:opacity-50";

/**
 * Przyciski wyboru: „Pomiń” (strzałka) i „Utwórz…” (plus) w **pierwszym
 * rzędzie**, pozostałe opcje w kolejnych. `skipLast` (liczba sztuk) układa
 * wszystko w jednym rzędzie z „Pomiń” na końcu.
 */
function ChoiceRows({
  choices,
  skipLast,
  disabled,
  onPick,
}: {
  choices: Choice[];
  skipLast: boolean;
  disabled: boolean;
  onPick: (c: Choice) => void;
}) {
  const button = (c: Choice) => (
    <button key={c.value + c.label} type="button" disabled={disabled} onClick={() => onPick(c)} className={CHOICE_CLASS}>
      {c.kind === "skip" && <Redo2 size={13} strokeWidth={1.75} aria-hidden="true" />}
      {c.kind === "create" && <Plus size={13} strokeWidth={2} aria-hidden="true" />}
      {c.label}
    </button>
  );
  if (skipLast) {
    const rest = choices.filter((c) => c.kind !== "skip");
    const skip = choices.filter((c) => c.kind === "skip");
    return <div className="mt-3 flex flex-wrap gap-2">{[...rest, ...skip].map(button)}</div>;
  }
  const first = choices.filter((c) => c.kind === "skip" || c.kind === "create");
  const rest = choices.filter((c) => !c.kind);
  return (
    <div className="mt-3 space-y-2">
      {first.length > 0 && <div className="flex flex-wrap gap-2">{first.map(button)}</div>}
      {rest.length > 0 && <div className="flex flex-wrap gap-2">{rest.map(button)}</div>}
    </div>
  );
}

/**
 * Koszt przebiegu w USD z podziałem na to, za co się płaci:
 * - `images` – zdjęcia AI,
 * - `content` – treść karty produktu (nazwa i opis w stylu kategorii, krok 2),
 * - `translation` – tłumaczenie na angielski,
 * - `agent` – rozmowa z agentem: jego rozumowanie, czyli rozpoznanie zdjęcia
 *   i dobór kategorii (krok 1). Same pytania i przyciski nie wołają modelu.
 */
type Cost = { images: number; content: number; translation: number; agent: number };
const total = (c: Cost) => c.images + c.content + c.translation + c.agent;

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
  /** Presety promptów (wbudowane + własne) – nazwy do komunikatów. */
  presets: Preset[];
  /** Preset przypisany do przycisku AI / AI+ w ustawieniach – tym stylem generuje agent. */
  defaultPreset: Record<AiVariant, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [draft, setDraft] = useState("");
  const [busyLabel, setBusyLabel] = useState("");
  const [done, setDone] = useState<{ id: string; cost: Cost } | null>(null);
  // Kolekcje założone w rozmowie dokładamy do listy od razu
  const [collectionList, setCollectionList] = useState<Collection[]>(collections);
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

  function sayRaw(text: string, images?: string[], choices?: Choice[], skipLast?: boolean) {
    setMessages((prev) => [...prev, { id: nextId.current++, who: "agent", text, images, choices, skipLast }]);
  }
  function say(text: string, images?: string[]) {
    if (abortRef.current) throw new Aborted("przerwane");
    sayRaw(text, images);
  }
  function said(text: string) {
    setMessages((prev) => [...prev, { id: nextId.current++, who: "user", text }]);
  }

  /**
   * Zadaje pytanie i czeka na odpowiedź. Przyciski wyboru trafiają do rozmowy
   * jako wiadomość agenta (pod treścią pytania); pole tekstowe / wybór plików
   * zostaje na dole okna.
   */
  function ask(q: Question): Promise<Answer> {
    if (abortRef.current) return Promise.reject(new Aborted("przerwane"));
    setBusyLabel("");
    sayRaw(q.text, undefined, q.choices, q.skipLast);
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
    // Przyciski przy odpowiedzianym pytaniu znikają – zostaje sama treść
    setMessages((prev) => prev.map((m) => (m.choices ? { ...m, choices: undefined } : m)));
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
    sayRaw(
      "Cześć! Na początek **wgraj zdjęcia produktu** – jedno albo kilka ujęć tego samego przedmiotu " +
        `(maks. ${MAX_START_FILES}).\n\n` +
        "**Zrobię sam:**\n" +
        "• rozpoznam przedmiot i zaproponuję **kategorię** (z pierwszego zdjęcia)\n" +
        "• napiszę **nazwę i opis** w stylu Twojego sklepu\n" +
        "• przerobię zdjęcia: **pierwsze na AI+** (scena), **każde kolejne na AI** (jednolite tło)\n" +
        "• przetłumaczę kartę na **angielski** i **zapiszę produkt**\n\n" +
        "**Zapytam Cię o:**\n" +
        "• potwierdzenie **kategorii** i ewentualne **kolejne zdjęcia**\n" +
        "• **cenę**, **liczbę sztuk** i **kolekcję**\n" +
        "• **wymiary** i **pojemność**\n\n" +
        "Każde pytanie możesz **pominąć** przyciskiem, a okno zamknąć w dowolnej chwili."
    );
    setQuestion({ text: "", files: true, input: "none" });
  }

  // ── Przebieg agenta ───────────────────────────────────────────────────────
  async function run(startFiles: File[]) {
    setRunning(true);
    const cost: Cost = { images: 0, content: 0, translation: 0, agent: 0 };
    const presetName = (id: string) => presets.find((p) => p.id === id)?.name ?? id;
    try {
      const files = startFiles.slice(0, MAX_START_FILES);
      if (!confirm(confirmText(files.length))) throw new Aborted("anulowane");
      if (startFiles.length > files.length) {
        sayRaw(`Biorę pierwsze **${MAX_START_FILES}** zdjęć – resztę dołożysz w pytaniu o kolejne zdjęcia.`);
      }

      // 1. Upload – wszystkie wgrane zdjęcia naraz. Pierwsze jest **zdjęciem
      // prowadzącym**: z niego idzie rozpoznanie, kategoria, nazwa i opis,
      // a także wersja AI+; pozostałe to ten sam przedmiot z innej strony
      setBusyLabel(files.length > 1 ? `Wgrywam zdjęcie 1 z ${files.length}…` : "Wgrywam zdjęcie…");
      const originalUrl = await uploadFile(files[0]);
      const restUrls: string[] = [];
      for (const [i, file] of files.slice(1).entries()) {
        setBusyLabel(`Wgrywam zdjęcie ${i + 2} z ${files.length}…`);
        try {
          restUrls.push(await uploadFile(file));
        } catch (e) {
          // Jedno zdjęcie mniej nie psuje przebiegu – pierwsze i tak już jest
          say(`Nie udało się wgrać **${file.name}** (${errorText(e)}) – **pomijam je**.`);
        }
      }
      const uploaded = [originalUrl, ...restUrls];
      say(
        uploaded.length > 1
          ? `**Wgrane zdjęcia:** ${uploaded.length}\n\n` +
              "Nazwę, opis i kategorię ustalę z **pierwszego** zdjęcia. Z niego zrobię wersję **AI+** (scena), " +
              "a z pozostałych wersje **AI** (jednolite tło) – **od razu, bez pytania**."
          : "**Zdjęcie wgrane.**",
        uploaded
      );

      // 2. Rozpoznanie i propozycja kategorii
      setBusyLabel("Rozpoznaję, co jest na zdjęciu, i dobieram kategorię…");
      type CardResponse = {
        name: string; slug: string; category: string; categoryLabel: string; categoryMatched: boolean;
        description: string; draft: { name: string; description: string }; costUsd: number;
        extras?: {
          firingNote: string;
          dimensions: { label: string; example: string }[];
          capacity: { present: boolean; example: string };
          suggestedPrice: number;
        };
      };
      const first = await postJson<CardResponse>("/api/admin/ai-product-card", { url: originalUrl });
      cost.agent += first.costUsd ?? 0;
      if (!first.category) throw new Error("W sklepie nie ma żadnej kategorii – dodaj ją najpierw w zakładce Kategorie.");
      say(
        `**Rozpoznałem:** ${first.name}\n\n` +
          (first.categoryMatched
            ? `**Proponowana kategoria:** ${first.categoryLabel}`
            : `Nie byłem pewien kategorii – **proponuję:** ${first.categoryLabel}`)
      );
      const cat = await ask({
        text: "Czy kategoria jest właściwa?",
        choices: [
          { value: first.category, label: `Tak, zostaw: ${first.categoryLabel}` },
          ...categories.filter((c) => c.slug !== first.category).map((c) => ({ value: c.slug, label: c.label })),
        ],
        input: "none",
      });
      const category = categories.find((c) => c.slug === cat.text) ?? categories.find((c) => c.slug === first.category)!;

      // 3. Karta w stylu kategorii (automatycznie po potwierdzeniu)
      setBusyLabel(`Piszę nazwę i opis w stylu kategorii „${category.label}”…`);
      const card = await postJson<CardResponse>("/api/admin/ai-product-card", {
        url: originalUrl,
        category: category.slug,
        draft: first.draft,
      });
      cost.content += card.costUsd ?? 0;
      const extras = card.extras ?? {
        firingNote: "",
        dimensions: [],
        capacity: { present: false, example: "" },
        suggestedPrice: 0,
      };
      say(
        `**Kategoria:** ${category.label}\n\n` +
          `**Nazwa:** ${card.name}\n\n` +
          `**Opis:**\n${card.description}` +
          (extras.firingNote ? `\n\n**Zdanie o wypale (ze wzorów):**\n${extras.firingNote}` : "") +
          "\n\nO wymiary, pojemność i cenę zapytam po zdjęciach."
      );

      // Zdjęcie AI+ ze zdjęcia głównego – preset przypisany do przycisku
      const generate = async (variant: AiVariant, sourceUrl: string, what: string): Promise<string | null> => {
        const label = variant === "ai_plus" ? "AI+" : "AI";
        setBusyLabel(`Generuję zdjęcie ${label} ${what}…`);
        try {
          const gen = await postJson<{ url: string; costUsd?: number; preset?: string }>("/api/admin/ai-image", {
            url: sourceUrl,
            variant,
            presetId: defaultPreset[variant],
            agent: true,
          });
          cost.images += gen.costUsd ?? 0;
          say(`**Zdjęcie ${label}** ${what} gotowe (styl: ${gen.preset ?? presetName(defaultPreset[variant])}).`, [gen.url]);
          return gen.url;
        } catch (e) {
          say(`Zdjęcia ${label} ${what} nie udało się wygenerować (${errorText(e)}) – **idę dalej bez niego**.`);
          return null;
        }
      };
      const aiPlus = await generate("ai_plus", originalUrl, "(scena)");
      // Pozostałe wgrane zdjęcia idą od razu na **AI** – to ten sam przedmiot
      // z innej strony, więc scena (AI+) należy się tylko zdjęciu prowadzącemu
      const extrasOriginal: string[] = [...restUrls];
      const extrasAi: string[] = [];
      for (const [i, url] of restUrls.entries()) {
        const ai = await generate("ai", url, `kolejnego zdjęcia ${i + 1}`);
        if (ai) extrasAi.push(ai);
      }

      // 4. Zestaw zdjęć i kolejne zdjęcia produktu – jedno naraz: tryb, plik, generowanie
      const generated = () => [aiPlus, ...extrasAi].filter((u): u is string => Boolean(u));
      const originals = () => [originalUrl, ...extrasOriginal];
      const currentSet = () => [...generated(), ...originals()];
      for (;;) {
        say(
          `**Zestaw zdjęć** (${currentSet().length}) w kolejności, w jakiej trafi do karty: AI+, wersje AI kolejnych zdjęć, oryginały na końcu.`,
          currentSet()
        );
        const a = await ask({
          text: "Chcesz dodać **kolejne zdjęcie** tego produktu?",
          choices: [
            { value: "ai_plus", label: "Kolejne AI+", kind: "create" },
            { value: "ai", label: "Kolejne AI", kind: "create" },
            { value: "next", label: "Wystarczy, idziemy dalej" },
          ],
          input: "none",
        });
        if (a.text === "next") break;
        const variant: AiVariant = a.text === "ai_plus" ? "ai_plus" : "ai";
        const files = await ask({
          text: `Wybierz zdjęcie (jedno) – zrobię z niego wersję **${variant === "ai_plus" ? "AI+" : "AI"}**.`,
          files: true,
          input: "none",
          choices: [{ value: "", label: "Pomiń – wróć do zestawu", kind: "skip" }],
        });
        const f = files.files?.[0];
        if (!f) continue;
        setBusyLabel(`Wgrywam ${f.name}…`);
        let url: string;
        try {
          url = await uploadFile(f);
        } catch (e) {
          say(`Nie udało się wgrać **${f.name}** (${errorText(e)}).`);
          continue;
        }
        extrasOriginal.push(url);
        const ai = await generate(variant, url, `kolejnego zdjęcia ${extrasOriginal.length}`);
        if (ai) extrasAi.push(ai);
      }
      let images = currentSet();

      // 5. Cena (z sugestią ze wzorów), liczba sztuk, kolekcja – każde do pominięcia
      let price = 0;
      for (;;) {
        const suggested = extras.suggestedPrice > 0 ? extras.suggestedPrice : 0;
        const a = await ask({
          text:
            "Jaka ma być **cena** (zł)? Wpisz kwotę w polu na dole" +
            (suggested ? ` albo przyjmij sugestię – podobne produkty w tej kategorii kosztują ok. **${suggested} zł**.` : "."),
          input: "number",
          placeholder: suggested ? String(suggested) : "np. 85",
          choices: [
            { value: "0", label: "Pomiń – ustalę później (produkt zostanie nieaktywny)", kind: "skip" },
            ...(suggested ? [{ value: String(suggested), label: `Użyj sugerowanej: ${suggested} zł` }] : []),
          ],
        });
        const parsed = parseMoney(a.text);
        if (parsed === null) { say("Nie rozumiem tej kwoty – wpisz samą liczbę, np. 85."); continue; }
        price = parsed;
        break;
      }
      say(price > 0 ? `**Cena:** ${price.toFixed(2).replace(".", ",")} zł` : "**Cena:** do ustalenia (0 zł)");

      let stock = 0;
      for (;;) {
        const a = await ask({
          text: "Ile **sztuk** jest dostępnych?",
          input: "number",
          placeholder: "np. 3",
          choices: [
            ...[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} szt.` })),
            { value: "0", label: "Pomiń (0 szt.)", kind: "skip" },
          ],
          skipLast: true,
        });
        const parsed = parseCount(a.text);
        if (parsed === null) { say("Podaj liczbę sztuk, np. 2."); continue; }
        stock = parsed;
        break;
      }
      say(`**Stan magazynowy:** ${stock} szt.`);

      let collection: string | null = null;
      let known = collectionList;
      for (;;) {
        const a = await ask({
          text: "Do której **kolekcji** (serii) należy ten produkt?",
          choices: [
            { value: "", label: "Pomiń – bez kolekcji", kind: "skip" },
            { value: "__new__", label: "Utwórz nową kolekcję", kind: "create" },
            ...known.map((c) => ({ value: c.slug, label: c.label })),
          ],
          input: "none",
        });
        if (a.text !== "__new__") { collection = a.text || null; break; }
        // Nowa kolekcja: nazwa z pola, slug z nazwy; zajęty slug dostaje sufiks
        const named = await ask({
          text: "Jak ma się nazywać **nowa kolekcja**? Wpisz nazwę w polu na dole.",
          input: "text",
          placeholder: "np. Seria leśna",
          choices: [{ value: "", label: "Pomiń – wróć do wyboru kolekcji", kind: "skip" }],
        });
        const label = named.text.trim().slice(0, 60);
        if (!label) continue;
        const base = slugifyTitle(label) || "kolekcja";
        setBusyLabel(`Zakładam kolekcję „${label}”…`);
        let created: Collection | null = null;
        let lastError = "";
        for (let attempt = 0; attempt < COLLECTION_SLUG_ATTEMPTS && !created; attempt++) {
          const slug = (attempt === 0 ? base : `${base}-${attempt + 1}`).slice(0, 60);
          const res = await fetch("/api/admin/collections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, label, order: known.length }),
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.slug) { created = { slug: data.slug, label: data.label ?? label }; break; }
          lastError = data?.error ?? `Błąd ${res.status}`;
          if (res.status !== 409) break;
        }
        setBusyLabel("");
        if (!created) {
          say(`Nie udało się założyć kolekcji (${lastError}) – wybierz istniejącą albo pomiń.`);
          continue;
        }
        known = [...known, created];
        setCollectionList(known);
        collection = created.slug;
        say(`**Założyłem kolekcję:** ${created.label}`);
        break;
      }
      say(collection ? `**Kolekcja:** ${known.find((c) => c.slug === collection)?.label ?? collection}` : "**Kolekcja:** brak");

      // 6. Wymiary i pojemność – etykiety i podpowiedzi ze wzorów; opis składa
      // `buildProductDescription` w stałym układzie
      const labels = extras.dimensions.length > 0
        ? extras.dimensions
        : DEFAULT_DIMENSION_LABELS.map((label) => ({ label, example: "" }));
      const dimensions: DimensionValue[] = [];
      for (const dim of labels) {
        const example = dim.example ? normalizeMeasure(dim.example, "cm") : "";
        const a = await ask({
          text:
            `Podaj **${dim.label}** (cm)` +
            (example ? ` – podobne produkty mają ${example}.` : "."),
          input: "number",
          placeholder: example || "np. 8",
          choices: [
            { value: "", label: "Pomiń ten wymiar", kind: "skip" },
            ...(example ? [{ value: example, label: `Użyj: ${example}` }] : []),
          ],
        });
        const value = a.text ? normalizeMeasure(a.text, "cm") : "";
        dimensions.push({ label: dim.label, value });
        say(value ? `**${dim.label}:** ${value}` : `**${dim.label}:** pominięte`);
      }

      let capacity = "";
      if (extras.capacity.present) {
        const example = extras.capacity.example ? normalizeMeasure(extras.capacity.example, "ml") : "";
        const a = await ask({
          text: "Podaj **pojemność** (ml)" + (example ? ` – podobne produkty mają ${example}.` : "."),
          input: "number",
          placeholder: example || "np. 300",
          choices: [
            { value: "", label: "Pomiń pojemność", kind: "skip" },
            ...(example ? [{ value: example, label: `Użyj: ${example}` }] : []),
          ],
        });
        capacity = a.text ? normalizeMeasure(a.text, "ml") : "";
        say(capacity ? `**Pojemność:** ${capacity}` : "**Pojemność:** pominięta");
      }

      const description = buildProductDescription({
        description: card.description,
        firingNote: extras.firingNote,
        dimensions,
        capacity,
      });
      say(`**Pełny opis produktu:**\n${description}`);

      // 7. Angielska wersja
      setBusyLabel("Tłumaczę nazwę i opis na angielski…");
      let english: { name: string; description: string } | null = null;
      try {
        const tr = await postJson<{ texts: string[]; costUsd?: number }>("/api/admin/ai-translate", {
          texts: [card.name, description],
          agent: true,
        });
        english = { name: tr.texts[0] ?? "", description: tr.texts[1] ?? "" };
        cost.translation += tr.costUsd ?? 0;
        say(`**Wersja angielska**\n\n**Name:** ${english.name}\n\n**Description:**\n${english.description}`);
      } catch (e) {
        say(`Tłumaczenia nie udało się zrobić (${errorText(e)}) – uzupełnisz je w zakładce EN produktu.`);
      }

      // 8. Wrzucone oryginały: zostawić w karcie, czy zostawić same zdjęcia z AI?
      // Pytamy tylko wtedy, gdy jest czym je zastąpić – bez zdjęcia z AI karta
      // zostałaby pusta. Pliki w Storage zostają (sprząta je Ustawienia → Zdjęcia)
      if (generated().length > 0) {
        const a = await ask({
          text:
            `W karcie są **${originals().length}** wrzucone zdjęcia (oryginały) i **${generated().length}** z AI. ` +
            "Usunąć oryginały z karty i zostawić same zdjęcia z AI?",
          choices: [
            { value: "yes", label: "Tak, usuń wrzucone – zostaw wygenerowane" },
            { value: "no", label: "Nie, zostaw wszystkie" },
          ],
          input: "none",
        });
        if (a.text === "yes") {
          images = generated();
          say(`**Zdjęcia w karcie:** ${images.length} (same wygenerowane). Wrzucone pliki zostają w magazynie – usuniesz je w Ustawieniach → Zdjęcia.`, images);
        }
      }

      // 9. Widoczność i zapis
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
        say("Bez ceny albo bez sztuk produkt zostaje **nieaktywny** – włączysz go po uzupełnieniu.");
      }

      setBusyLabel("Zapisuję produkt…");
      const base = {
        name: card.name,
        description,
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
        `**Gotowe.** Zapisałem produkt **${card.name}**.\n\n` +
          `**Status:** ${active ? "aktywny, widoczny w sklepie" : "nieaktywny"}\n` +
          `**Zdjęcia:** ${images.length}\n` +
          `**Cena:** ${price.toFixed(2).replace(".", ",")} zł\n` +
          `**Sztuk:** ${stock}`
      );
      setBusyLabel("");
      setDone({ id: saved.id, cost });
      router.refresh();
    } catch (e) {
      setBusyLabel("");
      if (e instanceof Aborted) {
        sayRaw("Przerwano.");
      } else {
        sayRaw(`**Nie udało się dokończyć:** ${errorText(e)}\n\nMożesz zamknąć okno i spróbować ponownie.`);
      }
      if (total(cost) > 0) setDone({ id: "", cost });
    } finally {
      setRunning(false);
      setQuestion(null);
    }
  }

  // Wybór plików: pierwszy wybór uruchamia przebieg (z całą listą – pierwsze
  // zdjęcie prowadzi, reszta dołącza do karty), kolejne odpowiadają na pytanie
  function onFiles(files: File[]) {
    if (files.length === 0) return;
    if (!running) {
      said(files.length > 1 ? `${files.length} zdj.: ${files.map((f) => f.name).join(", ")}` : `Zdjęcie: ${files[0].name}`);
      setQuestion(null);
      void run(files);
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

  const textInputActive = Boolean(question && !question.files && question.input !== "none");
  // Przyciski w rozmowie działają tylko przy bieżącym (jeszcze nieodpowiedzianym)
  // pytaniu; przy pytaniu o plik „Pomiń” w rozmowie odpowiada bez plików
  const choicesActive = Boolean(question?.choices);

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
              {messages.map((m) => {
                const wide = Boolean(m.images?.length || m.choices?.length);
                return (
                  <div key={m.id} className={`flex ${m.who === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={
                        m.who === "user"
                          // Odpowiedzi właściciela: drobne, na jasnym piaskowym tle –
                          // ciemny dymek przytłaczał rozmowę (17.09.2026)
                          ? "max-w-[75%] px-3 py-1.5 text-xs leading-relaxed bg-sand/60 text-espresso"
                          : `${wide ? "w-full" : "max-w-[85%]"} px-4 py-3 text-sm leading-relaxed bg-warm-white border border-sand text-charcoal`
                      }
                    >
                      {m.who === "agent" ? <MessageText text={m.text} /> : m.text}
                      {m.images && m.images.length > 0 && (
                        // Podgląd na pełną szerokość dymka – w dymku dopasowanym do
                        // krótkiego tekstu siatka kurczyła się do ikonek
                        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {m.images.map((url, i) => (
                            <div key={`${url}-${i}`} className="relative aspect-[4/3] bg-cream border border-sand overflow-hidden">
                              <Image src={url} alt={`Zdjęcie ${i + 1}`} fill unoptimized className="object-contain" sizes="160px" />
                              <span className="absolute left-1 top-1 bg-espresso/80 text-cream text-[10px] px-1.5 py-0.5">{i + 1}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {m.choices && m.choices.length > 0 && (
                        // Przyciski wyboru pod wypowiedzią agenta – aktywne przy
                        // bieżącym pytaniu; po odpowiedzi znikają z wiadomości.
                        // „Pomiń” i „Utwórz…” stoją w pierwszym rzędzie, reszta niżej;
                        // przy liczbie sztuk „Pomiń” idzie na koniec jednego rzędu
                        <ChoiceRows choices={m.choices} skipLast={Boolean(m.skipLast)} disabled={!choicesActive} onPick={(c) => answer({ text: c.value, label: c.label })} />
                      )}
                    </div>
                  </div>
                );
              })}
              {busyLabel && (
                <div className="flex items-center gap-2 text-sm text-charcoal/80">
                  <Loader2 size={14} className="animate-spin text-clay" />
                  {busyLabel}
                </div>
              )}
              {done && (
                <div className="border border-sand bg-warm-white px-4 py-3 text-sm">
                  <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-2">Koszt tego przebiegu</p>
                  {/* Rozbicie: nazwy po lewej, kwoty po prawej – siatka, nie flex,
                      żeby na telefonie nic nie łamało się między kolumnami */}
                  <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
                    {([
                      ["Generowanie zdjęć", done.cost.images],
                      ["Treść karty produktu", done.cost.content],
                      ["Tłumaczenie na angielski", done.cost.translation],
                      ["Rozmowa z agentem", done.cost.agent],
                    ] as [string, number][]).map(([label, value]) => (
                      <div key={label} className="contents">
                        <dt className="text-charcoal/80">{label}</dt>
                        <dd className="text-right tabular-nums text-espresso whitespace-nowrap">{pln(value * usdPlnRate)}</dd>
                      </div>
                    ))}
                    <div className="contents">
                      <dt className="border-t border-sand pt-2 mt-1 font-medium text-espresso">Razem</dt>
                      <dd className="border-t border-sand pt-2 mt-1 text-right font-serif text-xl text-espresso tabular-nums whitespace-nowrap">
                        {pln(total(done.cost) * usdPlnRate)}
                      </dd>
                    </div>
                  </dl>
                  <p className="text-[11px] text-charcoal/80 mt-2">
                    {usd(total(done.cost))} po kursie {usdPlnRate.toFixed(2).replace(".", ",")} zł – wg stawek Google AI z cennika w kodzie, kwota orientacyjna.
                  </p>
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

            {/* Pole odpowiedzi – tekst albo pliki; przyciski wyboru są w rozmowie */}
            <div className="border-t border-sand px-5 py-4 shrink-0">
              {question?.files ? (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-sand hover:border-clay cursor-pointer py-4 text-xs tracking-widest uppercase text-charcoal/80 transition-colors">
                  <Upload size={16} strokeWidth={1.5} />
                  {running ? "Wybierz zdjęcia" : "Wybierz zdjęcia produktu"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
                  />
                </label>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); submitText(); }} className="flex gap-2">
                  <input
                    type="text"
                    inputMode={question?.input === "number" ? "decimal" : undefined}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={!textInputActive}
                    placeholder={
                      textInputActive
                        ? (question?.placeholder ?? "Odpowiedz…")
                        : question
                        ? "Wybierz odpowiedź przyciskiem w rozmowie"
                        : running
                        ? "Agent pracuje…"
                        : ""
                    }
                    className="flex-1 min-w-0 bg-cream border border-sand focus:border-clay outline-none px-4 py-2.5 text-espresso text-sm disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!textInputActive || !draft.trim()}
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
