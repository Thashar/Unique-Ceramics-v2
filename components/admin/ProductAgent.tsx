"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Bot, Loader2, Plus, Redo2, Sparkles, Upload, X } from "lucide-react";
import { uploadErrorMessage } from "@/lib/upload-error";
import { slugifyTitle } from "@/lib/portfolio-slug";
import { PRODUCT_MAX_IMAGES } from "@/lib/product-validation";
import { enProductKey } from "@/lib/i18n-content";
import {
  CAPACITY_ID,
  DEFAULT_CATEGORY_DIMENSIONS,
  describeDimensions,
  dimensionField,
  productDimensionsKey,
  serializeProductDimensions,
  type DimensionId,
  type DimensionValues,
} from "@/lib/product-dimensions";
import type { ProductHints } from "@/lib/product-hints";
import {
  PRODUCT_STEPS,
  checkProduct,
  dictatedName,
  errorsOf,
  isStepId,
  repairProduct,
  stepLabel,
  type ProductCheckInput,
  type StepId,
} from "@/lib/product-checks";
import type { AiVariant } from "@/lib/ai";
import { buildProductDescription, normalizeMeasure } from "@/lib/product-description";

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
 * Oferta, którą agent rozpoznał jako **ten sam wzór** – zwraca ją
 * `/api/admin/product-duplicates` razem z polami potrzebnymi do zapisania
 * zmiany, żeby nie trzeba było dociągać produktu drugim żądaniem.
 */
type ReturningMatch = {
  id: string;
  slug: string;
  name: string;
  description: string;
  images: string[];
  stock: number;
  active: boolean;
  price: number;
  collection: string | null;
  featured: boolean;
  discountPercent: number;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  category: string;
  confidence: number;
  matched: string;
  differences: string;
};

/**
 * Potwierdzenie przed startem – mówi wprost, ile zdjęć pójdzie do modelu,
 * bo każde z nich to osobne płatne wywołanie.
 */
const confirmText = (count: number) =>
  "Agent wykona kilka płatnych wywołań AI (rozpoznanie i opis, " +
  (count > 1 ? `zdjęcia: 1 × AI+ i ${count - 1} × AI` : "zdjęcie AI+") +
  ", kolejne zdjęcia, tłumaczenie) i po drodze zada Ci parę pytań. Kontynuować?";

/**
 * Powitanie agenta składa się z trzech losowanych części: **zwrotu**
 * („Cześć {imię},”), **miłego zdania** i **zaproszenia** do pracy. Każda ma
 * własną listę, więc kombinacji jest kilkaset i okno nie wita dwa razy tak samo.
 *
 * Dwie zasady obowiązujące wszystkie trzy listy:
 * 1. **Bezrodzajowość** – panel obsługuje właścicielka, ale komponent nie zna
 *    płci zalogowanej osoby, więc formy typu „cieszę się, że wpadłaś” odpadają.
 * 2. **Ten sam sens** – zaproszenia różnią się słowami, nie treścią: napisz,
 *    co robimy, albo od razu wyślij zdjęcie, a agent zaczyna dodawanie produktu.
 */
const OPENERS = ["Cześć", "Hej", "Witaj", "Dzień dobry", "O, cześć"];

/** Zaczynają się małą literą, bo doklejają się po „Cześć {imię},”. */
const NICE_LINES = [
  "dobrze Cię widzieć.",
  "miło znów popracować przy Twojej ceramice.",
  "jestem gotowy do pracy – Twoje prace same się nie wystawią.",
  "mam nadzieję, że dzień dobrze się zaczyna.",
  "nowa rzecz z pieca to zawsze dobra wiadomość.",
  "kawa w dłoń i lecimy z nową ofertą.",
  "lubię ten moment, kiedy nowa praca trafia do sklepu.",
  "Twoja ceramika zasługuje na porządną kartę w sklepie.",
  "dobrze, że jesteś – zaraz coś dopiszemy do sklepu.",
  "cieszę się, że zaglądasz – mam wolne ręce.",
  "nowy przedmiot w sklepie to zawsze dobry początek dnia.",
];

const INVITES = [
  "Napisz, co robimy lub od razu wyślij zdjęcie, a rozpocznę procedurę dodawania nowego produktu na sklep 👍🏻",
  "Napisz, co robimy, albo po prostu wrzuć zdjęcie – wtedy od razu zaczynam dodawanie nowego produktu 👍🏻",
  "Powiedz, czym się zajmujemy, albo wyślij zdjęcie, a od razu biorę się za nową ofertę 👍🏻",
  "Daj znać, co robimy, albo wgraj zdjęcie – ruszam wtedy z dodawaniem produktu do sklepu 👍🏻",
  "Napisz, w czym pomóc, albo od razu podrzuć zdjęcie, a zaczynam zakładać nowy produkt 👍🏻",
  "Możesz napisać, co planujemy, albo wysłać zdjęcie – wtedy od razu startuję z nowym produktem 👍🏻",
  "Mów, co robimy, albo wrzuć zdjęcie, a resztą zajmę się sam i dodam produkt do sklepu 👍🏻",
  "Napisz, od czego zaczynamy, albo wyślij zdjęcie – od razu biorę się za dodanie go do sklepu 👍🏻",
];

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/** Samo imię z nazwy konta („Alicja Ulbrich” → „Alicja”), bez śmieci. */
function firstNameOf(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return /^[\p{L}][\p{L}'-]{0,30}$/u.test(first) ? first : "";
}

/**
 * Wołacz imienia – „Cześć Alicja” brzmi po polsku źle, ma być „Cześć Alicjo”.
 * Pełnej odmiany **nie robimy**: imiona męskie („Piotrze”, „Marku”) i zdrobnienia
 * na `-ia` („Kasiu”, ale „Mario”) mają nieregularne formy, a źle odmienione imię
 * jest gorsze od mianownika. Zamieniamy więc tylko przypadek pewny: imię na `-a`,
 * dłuższe niż 3 znaki i nie na `-ia` (Alicja → Alicjo, Anna → Anno, Marta → Marto).
 * Reszta – Ola, Kasia, Maria, Piotr – zostaje w mianowniku, co brzmi potocznie,
 * ale poprawnie.
 */
function vocative(name: string): string {
  if (name.length <= 3 || !name.endsWith("a") || name.endsWith("ia")) return name;
  return `${name.slice(0, -1)}o`;
}

/** Cała pierwsza wiadomość agenta: zwrot + miłe zdanie + zaproszenie. */
function welcomeText(name: string): string {
  const opener = pick(OPENERS);
  const nice = pick(NICE_LINES);
  const head = name
    ? `${opener} ${vocative(name)}, ${nice}`
    : `${opener}! ${nice.charAt(0).toUpperCase()}${nice.slice(1)}`;
  return `${head}\n\n${pick(INVITES)}`;
}

/**
 * Ile zdjęć bierzemy z pierwszego wyboru. Każde to osobne, płatne wywołanie
 * modelu, a produkt i tak ma limit zdjęć (`PRODUCT_MAX_IMAGES` = 30, licząc
 * z wersjami AI) – resztę można dołożyć w pytaniu o kolejne zdjęcia.
 */
const MAX_START_FILES = 10;

/**
 * Ile agent „pisze” powitanie po otwarciu okna. Wiadomość gotowa od razu
 * wygląda jak formularz, a nie jak rozmowa – sekunda z kropkami daje rytm
 * czatu (decyzja właściciela 19.09.2026).
 */
const WELCOME_DELAY_MS = 1000;

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
/** Cena produktu w rozmowie: „76 zł”, „76,50 zł” – bez zer na pusto. */
function zl(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
}

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
 * Wiadomość agenta: `**pogrubienie**`, `[napis](/admin/…)` jako odnośnik, nowe
 * linie i puste linie jako odstępy. Długie myślniki zamieniane na półpauzy –
 * agent ich nie używa, a model bywa głuchy na tę prośbę.
 *
 * Odnośnik prowadzi **wyłącznie w obrębie panelu** (adres musi zaczynać się od
 * `/admin/`) – treść wiadomości bywa układana przez model, więc dowolny adres
 * byłby otwartym przekierowaniem podanym z zewnątrz.
 */
function MessageText({ text }: { text: string }) {
  const lines = text.replace(/[—―]/g, "–").split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (!line.trim()) return <span key={i} className="block h-2" aria-hidden="true" />;
        const parts: ReactNode[] = [];
        line.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(\/admin\/[^)\s]*\))/g).forEach((chunk, j) => {
          const link = /^\[([^\]]+)\]\((\/admin\/[^)\s]*)\)$/.exec(chunk);
          if (chunk.startsWith("**") && chunk.endsWith("**")) {
            parts.push(<strong key={j} className="font-semibold text-espresso">{chunk.slice(2, -2)}</strong>);
          } else if (link) {
            parts.push(
              <a key={j} href={link[2]} target="_blank" rel="noreferrer" className="text-clay underline hover:text-espresso">
                {link[1]}
              </a>
            );
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

/**
 * **Powrót do wcześniejszego kroku.** Właściciel pisze „zmień cenę” albo
 * „wróć do kategorii”, agent przerywa bieżące pytanie i wraca tam, gdzie
 * trzeba. Sygnał leci tą samą drogą co przerwanie przebiegu – przez odrzucenie
 * obietnicy z `ask()` – więc nie trzeba przeplatać przebiegu warunkami.
 */
class Jump extends Error {
  constructor(readonly step: StepId) {
    super(`goto:${step}`);
  }
}

/**
 * „Agent pisze…” – trzy kropki zamiast etykiety. Pokazujemy je wtedy, gdy nie
 * da się nazwać konkretnej czynności: przy powitaniu i przy czytaniu wiadomości
 * od właściciela. Konkretna praca (upload, zdjęcie AI, zapis) ma własny opis
 * przy kręcącym się kółku – tam kropki byłyby krokiem wstecz.
 */
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 bg-cream border border-sand/60 px-3 py-2.5 w-fit" aria-label="Agent pisze">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="uc-typing-dot w-1.5 h-1.5 bg-clay rounded-full"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  );
}

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
  categoryDimensions,
}: {
  usdPlnRate: number;
  categories: Category[];
  collections: Collection[];
  /** Które wymiary opisują produkty danej kategorii (slug → pola). */
  categoryDimensions: Record<string, DimensionId[]>;
  /** Presety promptów (wbudowane + własne) – nazwy do komunikatów. */
  presets: Preset[];
  /** Preset przypisany do przycisku AI / AI+ w ustawieniach – tym stylem generuje agent. */
  defaultPreset: Record<AiVariant, string>;
}) {
  const router = useRouter();
  // Imię do powitania. Z sesji klienckiej, nie z propsa: `SessionProvider`
  // i tak jest zamontowany (`Providers`), więc to zero dodatkowych zapytań,
  // a okno otwiera się dopiero na kliknięcie – nie ma czym migać
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [draft, setDraft] = useState("");
  const [busyLabel, setBusyLabel] = useState("");
  const [done, setDone] = useState<{ id: string; cost: Cost } | null>(null);
  // Kolekcje założone w rozmowie dokładamy do listy od razu
  const [collectionList, setCollectionList] = useState<Collection[]>(collections);
  // Wiadomość pisana w trakcie pytania idzie do modelu – wtedy pole jest zajęte
  const [chatBusy, setChatBusy] = useState(false);
  // „Agent pisze…” – powitanie i czytanie wiadomości; konkretna praca ma `busyLabel`
  const [typing, setTyping] = useState(false);
  const resolverRef = useRef<((a: Answer) => void) | null>(null);
  // Pytanie, na które czeka agent – po odpowiedzi spóźniona wiadomość z modelu
  // nie może odpowiedzieć za właściciela na **kolejne** pytanie
  const questionRef = useRef<Question | null>(null);
  // Koszt bieżącego przebiegu: rozmowa dolicza się do niego spoza `run()`
  const costRef = useRef<Cost | null>(null);
  // Co już wiadomo o produkcie – kontekst dla swobodnych wiadomości
  const factsRef = useRef<string[]>([]);
  const rejectRef = useRef<((e: Error) => void) | null>(null);
  /**
   * **Poprawka właściciela** – to, co powiedział o samym przedmiocie („to nie
   * miska, tylko czarka”). Trzymamy ją przez cały przebieg i podajemy kolejnym
   * krokom jako **wiążącą**: to ona, a nie rozpoznanie ze zdjęcia, decyduje,
   * czym przedmiot jest. Bez tego poprawka ginęła, agent klikał za właściciela
   * kategorię i pisał kartę pod starą nazwą (zgłoszone 19.09.2026).
   */
  const correctionRef = useRef("");
  // **Nazwa podyktowana przez właściciela** („zmień nazwę na Czarka czarna”).
  // Wiążąca do końca przebiegu i **żaden krok jej nie przelicza** – inaczej niż
  // `correctionRef`, które mówi tylko, czym rzecz jest, a nazwę składa model
  const nameRef = useRef("");
  /**
   * Czy w tej chwili wolno **wrócić do wcześniejszego kroku**. Tylko w fazie
   * pytań: w trakcie generowania zdjęć albo zapisu skok zostawiłby przebieg
   * w połowie, więc listy kroków wtedy nawet nie wysyłamy do modelu.
   */
  const jumpableRef = useRef(false);
  // Powitanie wchodzi z opóźnieniem – zamknięcie okna musi je odwołać
  const welcomeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  // Zamknięcie okna w trakcie pracy: kolejny komunikat agenta przerywa przebieg,
  // żeby nie generował zdjęć i nie zapisał produktu „w tle” po zamknięciu
  const abortRef = useRef(false);

  // Otwarte okno zajmuje cały ekran telefonu – strona pod spodem nie może się
  // przewijać, bo gest przy krańcu dziennika przewijał panel produktów
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Dziennik przewija się do ostatniej wiadomości
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, question, busyLabel, typing]);

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
    questionRef.current = q;
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
    questionRef.current = null;
    setQuestion(null);
    setDraft("");
    // Przyciski przy odpowiedzianym pytaniu znikają – zostaje sama treść
    setMessages((prev) => prev.map((m) => (m.choices ? { ...m, choices: undefined } : m)));
    const shown = a.label ?? a.text;
    if (shown) said(shown);
    resolve?.(a);
  }

  /** Przerywa bieżące pytanie i wraca do wskazanego kroku przebiegu. */
  function jump(step: StepId) {
    const reject = rejectRef.current;
    resolverRef.current = null;
    rejectRef.current = null;
    questionRef.current = null;
    setQuestion(null);
    setDraft("");
    setMessages((prev) => prev.map((m) => (m.choices ? { ...m, choices: undefined } : m)));
    reject?.(new Jump(step));
  }

  /** Dopisuje fakt do kontekstu rozmowy („Kategoria: Kubki”). */
  function fact(label: string, value: string) {
    factsRef.current = [...factsRef.current.filter((f) => !f.startsWith(`${label}:`)), `${label}: ${value}`];
  }

  /**
   * Przyjmuje **nazwę podyktowaną przez właściciela** – wchodzi dosłownie,
   * bez dokładania słów i bez pytania modelu o konwencję kategorii.
   *
   * Gdy przebieg jest już w fazie pytań, karta istnieje, więc skaczemy do kroku
   * „nazwa” – ten wstawia nazwę do karty i wraca do przerwanego pytania.
   * Wcześniej wystarczy sam `nameRef`: krok nazwy i tak go czyta.
   */
  function takeName(name: string) {
    nameRef.current = name;
    fact("Nazwa", name);
    sayRaw(`Ustawiam nazwę: **${name}**`);
    if (jumpableRef.current) jump("nazwa");
  }

  function reset() {
    if (welcomeTimer.current) clearTimeout(welcomeTimer.current);
    welcomeTimer.current = null;
    questionRef.current = null;
    factsRef.current = [];
    correctionRef.current = "";
    nameRef.current = "";
    jumpableRef.current = false;
    costRef.current = null;
    setChatBusy(false);
    setTyping(false);
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
    // Losowanie w obsłudze zdarzenia, nie w renderze – `react-hooks/purity`
    const welcome = welcomeText(firstNameOf(session?.user?.name));
    setTyping(true);
    welcomeTimer.current = setTimeout(() => {
      welcomeTimer.current = null;
      setTyping(false);
      sayRaw(welcome);
      // `text` nie trafia na ekran (rysuje je `ask()`, nie `setQuestion`) – służy
      // wyłącznie jako kontekst dla swobodnej wiadomości do agenta
      setQuestion({
        text: "Czekam na zdjęcia nowego produktu – właściciel jeszcze nic nie wgrał.",
        files: true,
        input: "none",
      });
    }, WELCOME_DELAY_MS);
  }

  const presetName = (id: string) => presets.find((p) => p.id === id)?.name ?? id;

  /**
   * Nazwa przedmiotu w konwencji kategorii (`/api/admin/ai-product-name`).
   * Wywołanie **tekstowe, bez zdjęcia** – rodzaj przedmiotu już znamy, płacimy
   * tylko za ubranie go w nazewnictwo sklepu, więc krok można powtórzyć.
   */
  async function nameInCategory(
    category: Category,
    subject: string,
    description: string,
    cost: Cost
  ): Promise<string> {
    setBusyLabel(`Dobieram nazwę w stylu kategorii „${category.label}”…`);
    try {
      const res = await postJson<{ name: string; costUsd?: number }>("/api/admin/ai-product-name", {
        category: category.slug,
        subject,
        description,
      });
      cost.agent += res.costUsd ?? 0;
      return res.name || subject;
    } catch (e) {
      // Nazwa od właściciela wystarczy – nie przerywamy dodawania produktu
      say(`Nie udało się dobrać nazwy (${errorText(e)}) – zostawiam **${subject}**.`);
      return subject;
    } finally {
      setBusyLabel("");
    }
  }

  /** Jedno zdjęcie z modelu. Niepowodzenie nie przerywa przebiegu. */
  async function generateAiImage(
    variant: AiVariant,
    sourceUrl: string,
    what: string,
    cost: Cost
  ): Promise<string | null> {
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
  }

  /**
   * **Czy ten wzór już kiedyś był w sklepie?** Pyta tylko wtedy, gdy trasa
   * wskaże ofertę – a wskazuje wyłącznie taką, **której dziś nie ma w sklepie**
   * (wyprzedana albo wyłączona). Produkt dostępny w sklepie nie jest nawet
   * wspominany, więc przebieg leci dalej bez słowa. Błąd sprawdzania, brak
   * kandydatów i brak klucza AI kończą się tak samo: `null` i nowa oferta.
   */
  async function findReturningProduct(
    url: string,
    category: Category,
    draft: { name: string; description: string },
    cost: Cost
  ): Promise<ReturningMatch | null> {
    setBusyLabel("Sprawdzam, czy takiej oferty już nie było…");
    let match: ReturningMatch | null = null;
    try {
      const res = await postJson<{ match: ReturningMatch | null; costUsd?: number }>(
        "/api/admin/product-duplicates",
        { url, category: category.slug, draft }
      );
      cost.agent += res.costUsd ?? 0;
      match = res.match;
    } catch {
      // Sprawdzanie jest dodatkiem – nie ma prawa zatrzymać dodawania produktu
      return null;
    }
    if (!match) return null;

    const state = match.stock <= 0 ? "Wyprzedana." : "Wyłączona w sklepie.";
    const answered = await ask({
      text:
        `**Znalazłem podobną ofertę:** ${match.name}` +
        (match.differences ? ` – ${match.differences}` : "") +
        `\n${state}\n\n[Otwórz ofertę](/admin/produkty/${match.id})\n\n` +
        "Odświeżyć tamtą ofertę zamiast zakładać nową?",
      choices: [
        { value: "refresh", label: "Tak – odśwież tamtą" },
        { value: "new", label: "Nie – nowa oferta" },
      ],
      input: "none",
    });
    return answered.text === "refresh" ? match : null;
  }

  /**
   * Odświeżenie istniejącej oferty zamiast zakładania nowej: nowe zdjęcia idą
   * na początek karty (AI+ jako główne), **stare zostają**, a właściciel podaje
   * tylko liczbę sztuk. Ceny, opisu, kategorii i kolekcji nie ruszamy – to ta
   * sama oferta, więc karta i tłumaczenie w ogóle nie powstają (i nie kosztują).
   */
  async function refreshExisting(
    match: ReturningMatch,
    originalUrl: string,
    restUrls: string[],
    cost: Cost
  ) {
    fact("Tryb", `odświeżanie oferty „${match.name}”`);
    say(
      `**Odświeżam ofertę:** ${match.name}.\n\n` +
        "Nowej oferty nie zakładam – cena, opis, kategoria i kolekcja zostają jak były. " +
        "Przerobię zdjęcia i zapytam tylko o liczbę sztuk."
    );

    const aiPlus = await generateAiImage("ai_plus", originalUrl, "(scena)", cost);
    const freshAi: string[] = [];
    for (const [i, url] of restUrls.entries()) {
      const ai = await generateAiImage("ai", url, `kolejnego zdjęcia ${i + 1}`, cost);
      if (ai) freshAi.push(ai);
    }
    const generated = [aiPlus, ...freshAi].filter((u): u is string => Boolean(u));
    const uploaded = [originalUrl, ...restUrls];
    let incoming = [...generated, ...uploaded];
    if (generated.length > 0) {
      const a = await ask({
        text:
          `Nowe zdjęcia: **${generated.length}** z AI i **${uploaded.length}** wrzucone. ` +
          "Dołożyć do oferty same zdjęcia z AI?",
        choices: [
          { value: "yes", label: "Tak, tylko wygenerowane" },
          { value: "no", label: "Nie, dołóż wszystkie" },
        ],
        input: "none",
      });
      if (a.text === "yes") incoming = generated;
    }

    let stock = 1;
    for (;;) {
      const a = await ask({
        text: `**Ile sztuk** wraca do sklepu? (teraz w ofercie jest ${match.stock})`,
        input: "number",
        placeholder: "np. 1",
        choices: [
          ...[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} szt.` })),
          { value: String(match.stock), label: "Pomiń – zostaw jak jest", kind: "skip" as const },
        ],
        skipLast: true,
      });
      const parsed = parseCount(a.text);
      if (parsed === null) {
        say("Podaj liczbę sztuk, np. 1.");
        continue;
      }
      stock = parsed;
      break;
    }

    // Nowe zdjęcia na początek (pierwsze jest główne), stare zostają za nimi
    const images = [...incoming, ...match.images].slice(0, PRODUCT_MAX_IMAGES);
    setBusyLabel("Zapisuję zmiany w ofercie…");
    const res = await fetch(`/api/admin/products/${match.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: match.name,
        slug: match.slug,
        description: match.description,
        price: match.price,
        category: match.category,
        collection: match.collection,
        stock,
        featured: match.featured,
        // Wyprzedana oferta z ceną i sztukami wraca do sklepu sama
        active: match.price > 0 && stock > 0 ? true : match.active,
        discountPercent: match.discountPercent,
        discountStartsAt: match.discountStartsAt,
        discountEndsAt: match.discountEndsAt,
        images,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `Błąd ${res.status}`);

    say(
      `**Gotowe.** Odświeżyłem ofertę **${match.name}**.\n\n` +
        `**Zdjęcia:** ${images.length} (nowe na początku)\n` +
        `**Sztuk:** ${stock}\n` +
        `**Status:** ${match.price > 0 && stock > 0 ? "aktywna, widoczna w sklepie" : "nieaktywna"}`
    );
    setBusyLabel("");
    setDone({ id: match.id, cost });
    router.refresh();
  }

  // ── Przebieg agenta ───────────────────────────────────────────────────────
  async function run(startFiles: File[]) {
    setRunning(true);
    const cost: Cost = { images: 0, content: 0, translation: 0, agent: 0 };
    costRef.current = cost;
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
        /** Nazwy produktów wzorcowych – kontrola pilnuje, żeby nazwa nie była ich kopią. */
        examples?: string[];
        /** Ze wzorów zostaje już tylko zwrot o wypale – reszta to nie model. */
        extras?: { firingNote: string };
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
      let category = categories.find((c) => c.slug === cat.text) ?? categories.find((c) => c.slug === first.category)!;
      fact("Kategoria", category.label);

      // 3. Nazwa: kategoria się zmieniła albo właściciel poprawił rozpoznanie
      //
      // ⚠️ **Rodzaj przedmiotu zna właściciel, nie model.** Gdy powie, czym
      // rzecz jest („to nie miska, tylko czarka”), jego słowo jest wiążące do
      // końca przebiegu: idzie do nazwy, do karty (`correction`) i blokuje
      // nazwę (`lockName`). Do 19.09.2026 poprawka ginęła i agent pisał kartę
      // pod starą nazwą, mimo że kategorię zdążył już zmienić
      let subject = correctionRef.current;
      // Nazwa podyktowana wprost jest gotowa – nie ma czego liczyć ani o co pytać
      let lockedName = nameRef.current;
      if (lockedName) {
        fact("Nazwa", lockedName);
      } else if (subject || category.slug !== first.category) {
        const proposed = await nameInCategory(
          category,
          subject || first.draft.name,
          first.draft.description,
          cost
        );
        if (subject) {
          // Właściciel powiedział, czym to jest – nie ma o co pytać
          lockedName = proposed;
          say(`Przyjmuję poprawkę: **${subject}**\n\n**Nazwa:** ${proposed}`);
        } else {
          // Sama zmiana kategorii nie mówi, czy zmienił się rodzaj przedmiotu –
          // proponujemy nazwę w nowej konwencji i pytamy zamiast zgadywać
          const a = await ask({
            text:
              `Kategoria zmieniona na **${category.label}** – w tej kategorii nazwałbym ten przedmiot:\n\n` +
              `**${proposed}**\n\nZostawiamy, czy napiszesz, co to jest?`,
            choices: [
              { value: "keep", label: `Zostaw: ${proposed}` },
              { value: "own", label: "Napiszę, co to jest", kind: "create" },
            ],
            input: "text",
            placeholder: "np. czarka do herbaty",
          });
          // Wpisać można od razu w polu na dole – wtedy „Napiszę…” jest zbędne
          const typed =
            a.text === "keep"
              ? ""
              : a.text === "own"
              ? (
                  await ask({
                    text: "Napisz, **co to za przedmiot** – resztę (motyw, kolor, szkliwo) mam ze zdjęcia.",
                    input: "text",
                    placeholder: "np. czarka do herbaty",
                  })
                ).text.trim()
              : a.text.trim();
          if (typed) {
            subject = typed;
            correctionRef.current = typed;
            lockedName = await nameInCategory(category, typed, first.draft.description, cost);
            say(`**Nazwa:** ${lockedName}`);
          } else {
            lockedName = proposed;
          }
        }
        if (subject) fact("Poprawka właściciela", subject);
        fact("Nazwa", lockedName);
      }
      // Dalsze kroki pracują na nazwie uzgodnionej z właścicielem
      const draftForRun = lockedName ? { ...first.draft, name: lockedName } : first.draft;

      // 4. Wracający wzór: czy tę rzecz już kiedyś wystawialiśmy?
      // Porównujemy **tylko z ofertami spoza sklepu** (wyprzedane i wyłączone) –
      // produkt dostępny w sklepie nie jest nawet wspominany (decyzja
      // właściciela 19.09.2026). Sprawdzanie nigdy nie zatrzymuje przebiegu:
      // błąd, brak kandydatów i brak klucza AI po prostu lecą dalej
      const refresh = await findReturningProduct(originalUrl, category, draftForRun, cost);
      if (refresh) {
        await refreshExisting(refresh, originalUrl, restUrls, cost);
        return;
      }

      // 5. Karta w stylu kategorii (automatycznie po potwierdzeniu)
      setBusyLabel(
        lockedName
          ? `Piszę opis w stylu kategorii „${category.label}”…`
          : `Piszę nazwę i opis w stylu kategorii „${category.label}”…`
      );
      let card = await postJson<CardResponse>("/api/admin/ai-product-card", {
        url: originalUrl,
        category: category.slug,
        draft: draftForRun,
        // Poprawka właściciela jest nadrzędna nad zdjęciem i nad wzorami,
        // a uzgodnionej nazwy model nie tyka
        correction: subject,
        lockName: Boolean(lockedName),
      });
      cost.content += card.costUsd ?? 0;
      let extras = card.extras ?? { firingNote: "" };
      fact("Nazwa", card.name);
      say(
        `**Kategoria:** ${category.label}\n\n` +
          `**Nazwa:** ${card.name}\n\n` +
          `**Opis:**\n${card.description}` +
          (extras.firingNote ? `\n\n**Zdanie o wypale (ze wzorów):**\n${extras.firingNote}` : "") +
          "\n\nO wymiary i cenę zapytam po zdjęciach – wezmę je z podobnych produktów w sklepie."
      );

      // Zdjęcie AI+ ze zdjęcia głównego – preset przypisany do przycisku
      const generate = (variant: AiVariant, sourceUrl: string, what: string) =>
        generateAiImage(variant, sourceUrl, what, cost);
      const aiPlus = await generate("ai_plus", originalUrl, "(scena)");
      // Pozostałe wgrane zdjęcia idą od razu na **AI** – to ten sam przedmiot
      // z innej strony, więc scena (AI+) należy się tylko zdjęciu prowadzącemu
      const extrasOriginal: string[] = [...restUrls];
      const extrasAi: string[] = [];
      for (const [i, url] of restUrls.entries()) {
        const ai = await generate("ai", url, `kolejnego zdjęcia ${i + 1}`);
        if (ai) extrasAi.push(ai);
      }

      // 5. Zestaw zdjęć i kolejne zdjęcia produktu – jedno naraz: tryb, plik, generowanie
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

      // 6. Dane od właściciela – każde pytanie jest **krokiem, do którego da
      // się wrócić**. Właściciel pisze „zmień cenę” albo „wróć do kategorii”,
      // trasa rozmowy oddaje `goto`, a `jump()` przerywa bieżące pytanie
      // sygnałem `Jump`. Przerwany krok wraca na wierzch stosu, więc po
      // poprawce agent pyta o niego jeszcze raz (decyzja właściciela 19.09.2026)
      const data = {
        price: 0,
        stock: 0,
        collection: null as string | null,
        /** Wartości wymiarów – pola wyznacza kategoria, nie model. */
        dims: {} as DimensionValues,
      };
      let known = collectionList;

      /** Wymiary tej kategorii – po powrocie do kroku „kategoria” inne. */
      const usedDims = () => categoryDimensions[category.slug] ?? DEFAULT_CATEGORY_DIMENSIONS;
      /** Wymiary w opisie i w kontroli karty – zawsze liczone z bieżących pól. */
      const described = () => describeDimensions(data.dims, usedDims());

      // **Podpowiedzi z prawdziwych produktów sklepu** – ceny i wymiary
      // podobnych rzeczy z tej kategorii. ⚠️ Nie ma tu modelu: to odczyt bazy
      // i porównanie nazw, więc nic nie kosztuje. Do 19.09.2026 cenę
      // podpowiadała mediana dwóch losowych produktów i agent zaproponował
      // 88 zł, których nie miał żaden produkt w sklepie
      let hints: ProductHints = { prices: [], dimensions: [], matched: 0, scanned: 0 };
      const loadHints = async () => {
        try {
          hints = await postJson<ProductHints>("/api/admin/product-hints", {
            category: category.slug,
            name: card.name,
          });
        } catch (e) {
          // Brak podpowiedzi nie zatrzymuje dodawania – agent po prostu zapyta
          console.error("[agent] podpowiedzi:", e);
          hints = { prices: [], dimensions: [], matched: 0, scanned: 0 };
        }
      };

      const askPrice = async () => {
        for (;;) {
          // ⚠️ **Żadnych średnich ani median.** Pokazujemy wyłącznie kwoty,
          // za które naprawdę stoi produkt w sklepie, razem z jego nazwą –
          // żeby było widać, skąd się wzięły. Gdy nic nie pasuje po nazwie,
          // nie podpowiadamy nic i mówimy to wprost
          const options = hints.prices;
          const where =
            options.length === 0
              ? hints.scanned === 0
                ? " W tej kategorii nie ma jeszcze innych produktów, więc nie mam się czym podeprzeć."
                : ` Nie znalazłem w sklepie produktu o podobnej nazwie (przejrzałem ${hints.scanned}), więc ceny nie podpowiadam.`
              : options.length === 1
              ? ` Podobne produkty w sklepie kosztują **${zl(options[0].price)} zł** (${options[0].names.join(", ")}).`
              : ` Podobne produkty w sklepie mają różne ceny – wybierz jedną albo wpisz własną.`;
          const a = await ask({
            text: `Jaka ma być **cena** (zł)? Wpisz kwotę w polu na dole.${where}`,
            input: "number",
            placeholder: options.length > 0 ? String(options[0].price) : "np. 85",
            choices: [
              { value: "0", label: "Pomiń – ustalę później (produkt zostanie nieaktywny)", kind: "skip" },
              ...options.map((o) => ({
                value: String(o.price),
                label: `${zl(o.price)} zł – ${o.count > 1 ? `${o.count} produkty, np. ` : ""}${o.names[0]}`,
              })),
            ],
          });
          const parsed = parseMoney(a.text);
          if (parsed === null) { say("Nie rozumiem tej kwoty – wpisz samą liczbę, np. 85."); continue; }
          data.price = parsed;
          break;
        }
        fact("Cena", data.price > 0 ? `${data.price} zł` : "jeszcze nieustalona");
        say(data.price > 0 ? `**Cena:** ${data.price.toFixed(2).replace(".", ",")} zł` : "**Cena:** do ustalenia (0 zł)");
      };

      const askStock = async () => {
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
          data.stock = parsed;
          break;
        }
        fact("Sztuk", String(data.stock));
        say(`**Stan magazynowy:** ${data.stock} szt.`);
      };

      const askCollection = async () => {
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
          if (a.text !== "__new__") { data.collection = a.text || null; break; }
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
            const body = await res.json().catch(() => null);
            if (res.ok && body?.slug) { created = { slug: body.slug, label: body.label ?? label }; break; }
            lastError = body?.error ?? `Błąd ${res.status}`;
            if (res.status !== 409) break;
          }
          setBusyLabel("");
          if (!created) {
            say(`Nie udało się założyć kolekcji (${lastError}) – wybierz istniejącą albo pomiń.`);
            continue;
          }
          known = [...known, created];
          setCollectionList(known);
          data.collection = created.slug;
          say(`**Założyłem kolekcję:** ${created.label}`);
          break;
        }
        say(data.collection ? `**Kolekcja:** ${known.find((c) => c.slug === data.collection)?.label ?? data.collection}` : "**Kolekcja:** brak");
      };

      /**
       * Pyta o jeden wymiar. **O co pytamy, mówi kategoria** (Kategorie →
       * Wymiary kategorii), a nie model czytający dwa losowe produkty – do
       * 19.09.2026 przy każdym produkcie wychodziły inne etykiety. Podpowiedź
       * to wartość, którą ma najwięcej podobnych produktów w sklepie.
       */
      const askDimension = async (id: DimensionId) => {
        const field = dimensionField(id);
        const hint = hints.dimensions.find((h) => h.id === id);
        const shown = hint ? normalizeMeasure(hint.value, field.unit) : "";
        const a = await ask({
          text:
            `Podaj **${field.label}** (${field.unit})` +
            (hint
              ? ` – ${hint.count > 1 ? `${hint.count} podobnych produktów ma` : "podobny produkt ma"} ${shown}.`
              : "."),
          input: "number",
          placeholder: hint?.value ?? field.example,
          choices: [
            { value: "", label: `Pomiń – ${field.label}`, kind: "skip" },
            ...(hint ? [{ value: hint.value, label: `Użyj: ${shown}` }] : []),
          ],
        });
        const raw = a.text.trim();
        if (raw) data.dims[id] = raw;
        else delete data.dims[id];
        say(raw ? `**${field.label}:** ${normalizeMeasure(raw, field.unit)}` : `**${field.label}:** pominięte`);
      };

      const askDimensions = async () => {
        const fields = usedDims().filter((id) => id !== CAPACITY_ID);
        if (fields.length === 0) {
          say(`Kategoria **${category.label}** nie ma przypisanych wymiarów – pomijam ten krok.`);
          return;
        }
        for (const id of fields) await askDimension(id);
      };

      const askCapacity = async () => {
        if (!usedDims().includes(CAPACITY_ID)) return;
        await askDimension(CAPACITY_ID);
      };

      /** Nowa nazwa w konwencji kategorii – właściciel mówi, czym rzecz jest. */
      const redoName = async () => {
        // Właściciel podyktował nazwę – wstawiamy ją i wracamy, bez pytania
        if (nameRef.current && nameRef.current !== card.name) {
          lockedName = nameRef.current;
          card = { ...card, name: lockedName, slug: slugifyTitle(lockedName) || card.slug };
          fact("Nazwa", card.name);
          say(`**Nazwa:** ${card.name}`);
          await loadHints();
          return;
        }
        const a = await ask({
          text: "Napisz, **co to za przedmiot** – resztę (motyw, kolor, szkliwo) mam ze zdjęcia.",
          input: "text",
          placeholder: "np. czarka do herbaty",
          choices: [{ value: "", label: `Pomiń – zostaw: ${card.name}`, kind: "skip" }],
        });
        const typed = a.text.trim();
        if (!typed) return;
        subject = typed;
        correctionRef.current = typed;
        // Właściciel mówi tu, **czym rzecz jest** – wcześniej podyktowana nazwa
        // przestaje obowiązywać, bo model ma ułożyć nową w konwencji kategorii
        nameRef.current = "";
        lockedName = await nameInCategory(category, typed, card.description, cost);
        card = { ...card, name: lockedName, slug: slugifyTitle(lockedName) || card.slug };
        fact("Nazwa", card.name);
        say(`**Nazwa:** ${card.name}`);
        // Nowa nazwa = inne produkty podobne, więc i inne ceny do podpowiedzi
        await loadHints();
      };

      /**
       * Powrót do kategorii **przepisuje kartę** – styl opisu i zdanie o wypale
       * biorą się ze wzorów tej kategorii, więc sam podmieniony slug byłby
       * kłamstwem. Zdjęć to nie rusza (są już opłacone), a zebranych wymiarów
       * nie kasujemy: średnica przedmiotu nie zmienia się od zmiany kategorii.
       */
      const redoCategory = async () => {
        const a = await ask({
          text: "Do której **kategorii** ma trafić ten produkt?",
          choices: [
            { value: "", label: `Pomiń – zostaw: ${category.label}`, kind: "skip" },
            ...categories.filter((c) => c.slug !== category.slug).map((c) => ({ value: c.slug, label: c.label })),
          ],
          input: "none",
        });
        const picked = categories.find((c) => c.slug === a.text);
        if (!picked || picked.slug === category.slug) return;
        category = picked;
        fact("Kategoria", category.label);
        lockedName = nameRef.current || await nameInCategory(category, subject || card.name, card.description, cost);
        setBusyLabel(`Przepisuję kartę w stylu kategorii „${category.label}”…`);
        const again = await postJson<CardResponse>("/api/admin/ai-product-card", {
          url: originalUrl,
          category: category.slug,
          draft: { name: lockedName, description: card.description },
          correction: subject,
          lockName: true,
        });
        cost.content += again.costUsd ?? 0;
        card = again;
        extras = again.extras ?? extras;
        setBusyLabel("");
        fact("Nazwa", card.name);
        say(`**Kategoria:** ${category.label}\n\n**Nazwa:** ${card.name}\n\n**Opis:**\n${card.description}`);
        // Inna kategoria = inne wymiary do wypełnienia i inna pula cen
        await loadHints();
      };

      const runStep = async (id: StepId) => {
        if (id === "kategoria") return redoCategory();
        if (id === "nazwa") return redoName();
        if (id === "cena") return askPrice();
        if (id === "sztuki") return askStock();
        if (id === "kolekcja") return askCollection();
        if (id === "wymiary") return askDimensions();
        return askCapacity();
      };

      /**
       * Krok razem z obsługą skoków. Stos, nie licznik: przerwany krok zostaje
       * pod spodem, więc po załatwieniu poprawki agent wraca do pytania, które
       * właściciel przerwał. Bezpiecznik na wypadek zapętlenia próśb.
       */
      const runWithJumps = async (first: StepId) => {
        const stack: StepId[] = [first];
        for (let guard = 0; stack.length > 0 && guard < 12; guard++) {
          const id = stack[stack.length - 1];
          try {
            await runStep(id);
            stack.pop();
          } catch (e) {
            if (!(e instanceof Jump)) throw e;
            if (e.step !== id) stack.push(e.step);
          }
        }
      };

      /**
       * Pytanie **poza** listą kroków (oryginały, kontrola, widoczność), które
       * też wolno przerwać powrotem. Bez tego skok przy takim pytaniu wyleciałby
       * z całego przebiegu jako nieobsłużony błąd.
       */
      const askSafe = async (q: Question): Promise<Answer> => {
        for (let guard = 0; guard < 12; guard++) {
          try {
            return await ask(q);
          } catch (e) {
            if (!(e instanceof Jump)) throw e;
            await runWithJumps(e.step);
          }
        }
        throw new Error("Za dużo powrotów pod rząd – zamknij okno i zacznij od nowa.");
      };

      // Podpowiedzi czytamy **po ustaleniu nazwy** – „Czarka czarna” ma
      // kosztować tyle, co inne czarki, a nie tyle, co średnia kubków
      setBusyLabel("Sprawdzam ceny i wymiary podobnych produktów…");
      await loadHints();
      setBusyLabel("");
      if (hints.matched > 0) {
        say(
          `Znalazłem w sklepie **${hints.matched}** podobnych produktów – z nich biorę podpowiedzi ceny i wymiarów.`
        );
      }

      jumpableRef.current = true;
      const order: StepId[] = ["cena", "sztuki", "kolekcja", "wymiary"];
      if (usedDims().includes(CAPACITY_ID)) order.push("pojemnosc");
      for (const id of order) await runWithJumps(id);

      // 7. Wrzucone oryginały: zostawić w karcie, czy zostawić same zdjęcia z AI?
      // Pytamy tylko wtedy, gdy jest czym je zastąpić – bez zdjęcia z AI karta
      // zostałaby pusta. Pliki w Storage zostają (sprząta je Ustawienia → Zdjęcia)
      if (generated().length > 0) {
        const a = await askSafe({
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

      // 8. Opis, tłumaczenie i **kontrola karty przed zapisem** – w pętli,
      // bo poprawka wraca do kroku i wszystko trzeba policzyć od nowa.
      // Sprawdzanie jest deterministyczne (`lib/product-checks.ts`): nie pyta
      // modelu, więc nic nie kosztuje i za każdym razem mówi to samo
      let description = "";
      let english: { name: string; description: string } | null = null;
      let translatedFor = "";
      let warned = "";
      for (let round = 0; round < 8; round++) {
        const shownDims = described();
        description = buildProductDescription({
          description: card.description,
          firingNote: extras.firingNote,
          dimensions: shownDims.dimensions,
          capacity: shownDims.capacity,
        });
        say(`**Pełny opis produktu:**\n${description}`);

        // Tłumaczymy dopiero, gdy treść naprawdę się zmieniła – poprawka ceny
        // nie ma powodu kosztować drugiego wywołania modelu
        const toTranslate = `${card.name}\n${description}`;
        if (toTranslate !== translatedFor) {
          setBusyLabel("Tłumaczę nazwę i opis na angielski…");
          try {
            const tr = await postJson<{ texts: string[]; costUsd?: number }>("/api/admin/ai-translate", {
              texts: [card.name, description],
              agent: true,
            });
            english = { name: tr.texts[0] ?? "", description: tr.texts[1] ?? "" };
            cost.translation += tr.costUsd ?? 0;
            translatedFor = toTranslate;
            say(`**Wersja angielska**\n\n**Name:** ${english.name}\n\n**Description:**\n${english.description}`);
          } catch (e) {
            say(`Tłumaczenia nie udało się zrobić (${errorText(e)}) – uzupełnisz je w zakładce EN produktu.`);
          }
          setBusyLabel("");
        }

        // Drobiazgi agent poprawia sam – nie ma o co pytać
        const repaired = repairProduct({
          name: card.name,
          slug: card.slug,
          description,
          price: data.price,
          stock: data.stock,
          images,
          active: data.price > 0 && data.stock > 0,
          examples: card.examples ?? [],
          dimensions: shownDims.dimensions,
          english,
        });
        if (repaired.fixes.length > 0) say(`Poprawiłem sam: ${repaired.fixes.join(", ")}.`);
        const checked: ProductCheckInput = repaired.input;
        card = { ...card, name: checked.name, slug: checked.slug };
        description = checked.description;
        images = checked.images;

        const issues = checkProduct(checked);
        const errors = errorsOf(issues);
        const warnings = issues.filter((i) => i.level === "warning");
        const warningText = warnings.map((w) => `• ${w.message}`).join("\n");
        if (warningText && warningText !== warned) {
          warned = warningText;
          say(`**Do wiadomości:**\n${warningText}`);
        }
        if (errors.length === 0) break;

        // Kroki, do których da się wrócić, żeby poprawić zgłoszone rzeczy
        const fixable: StepId[] = [];
        for (const e of errors) if (e.step && !fixable.includes(e.step)) fixable.push(e.step);
        const a = await askSafe({
          text:
            `**Sprawdziłem kartę przed zapisem** i coś się nie zgadza:\n\n` +
            errors.map((e) => `• ${e.message}`).join("\n") +
            "\n\nCo robimy?",
          choices: [
            ...fixable.map((step) => ({ value: step as string, label: `Popraw: ${stepLabel(step)}`, kind: "create" as const })),
            { value: "save", label: "Zapisz mimo to" },
          ],
          input: "none",
        });
        if (a.text === "save") break;
        if (isStepId(a.text)) await runWithJumps(a.text);
      }
      // 9. Widoczność i zapis
      let active = false;
      if (data.price > 0 && data.stock > 0) {
        const a = await askSafe({
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

      // Od zapisu nie ma już powrotu – lista kroków znika z kontekstu rozmowy
      jumpableRef.current = false;
      setBusyLabel("Zapisuję produkt…");
      const base = {
        name: card.name,
        description,
        price: data.price,
        category: category.slug,
        collection: data.collection,
        stock: data.stock,
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

      // Wymiary i wersja angielska idą do `Setting` jednym żądaniem. Wymiary
      // zapisujemy **zawsze** – nieudane tłumaczenie nie może ich zabrać,
      // bo to z nich składa się opis i podpowiedzi kolejnych produktów
      const extraSettings = [
        { key: productDimensionsKey(saved.id), value: serializeProductDimensions(data.dims) },
        ...(english && (english.name || english.description)
          ? [{ key: enProductKey(saved.id), value: JSON.stringify(english) }]
          : []),
      ];
      const extraRes = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extraSettings),
      });
      if (!extraRes.ok) {
        say("Produkt zapisany, ale wymiary lub tłumaczenie się nie zapisały – uzupełnij je w karcie produktu.");
      }

      say(
        `**Gotowe.** Zapisałem produkt **${card.name}**.\n\n` +
          `**Status:** ${active ? "aktywny, widoczny w sklepie" : "nieaktywny"}\n` +
          `**Zdjęcia:** ${images.length}\n` +
          `**Cena:** ${data.price.toFixed(2).replace(".", ",")} zł\n` +
          `**Sztuk:** ${data.stock}`
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

  /**
   * Wysłanie treści z pola na dole. Sama liczba przy pytaniu o liczbę idzie
   * wprost jako odpowiedź (bez wywołania modelu); **wszystko inne jest
   * swobodną wiadomością do agenta** – model ją interpretuje i albo wybiera
   * jeden z pokazanych przycisków, albo podaje wartość do pola, albo po prostu
   * odpowiada. Decyzję, czy wybór jest dopuszczalny, podejmuje ten kod, a nie
   * model – dzięki temu nietrafiona odpowiedź kończy się zdaniem w rozmowie,
   * a nie ruchem w przebiegu.
   */
  async function submitText() {
    if (!question || chatBusy) return;
    const text = draft.trim();
    if (!text) return;
    if (question.input === "number" && /^[\d\s.,]+$/.test(text)) {
      answer({ text });
      return;
    }
    // ⚠️ **Nazwę podyktowaną wprost czytamy sami, bez modelu.** Na „zmień nazwę
    // na Czarka czarna” model odesłał poprawkę „Nazwa produktu to Czarka czarka”,
    // a krok nazwy dopisał do niej swoje („…ciemna z jasnym dnem”) – zgłoszone
    // 19.09.2026. Wzorzec przepisuje nazwę znak po znaku i nic nie kosztuje
    const dictated = dictatedName(text);
    if (dictated) {
      said(text);
      setDraft("");
      takeName(dictated);
      return;
    }

    const asked = question;
    said(text);
    setDraft("");
    setChatBusy(true);
    setTyping(true);
    try {
      const res = await postJson<{
        reply?: string; choice?: string; value?: string; correction?: string; name?: string; goto?: string; costUsd?: number;
      }>(
        "/api/admin/ai-agent-chat",
        {
          message: text,
          question: asked.text,
          options: (asked.choices ?? []).map((c) => ({ value: c.value, label: c.label })),
          input: asked.input ?? "none",
          state: factsRef.current.join("\n"),
          // Kroki do cofnięcia podajemy tylko wtedy, gdy przebieg jest w fazie
          // pytań – inaczej model obiecałby powrót, którego nie da się zrobić
          steps: jumpableRef.current ? PRODUCT_STEPS.map((s) => ({ id: s.id, label: s.label })) : [],
        }
      );
      if (costRef.current) costRef.current.agent += res.costUsd ?? 0;
      // Poprawka faktu obowiązuje do końca przebiegu – także wtedy, gdy
      // właściciel zdążył już kliknąć przycisk i odpowiedź trafia w próżnię
      if (res.correction) {
        correctionRef.current = res.correction;
        fact("Poprawka właściciela", res.correction);
      }
      // Gotowa nazwa wyprzedza wszystko inne – trasa zeruje przy niej wybór,
      // wartość i powrót, więc nie ma czego jeszcze rozpatrywać
      if (res.name) {
        if (res.reply) sayRaw(res.reply);
        takeName(res.name);
        return;
      }
      // Właściciel mógł w międzyczasie kliknąć przycisk – wtedy zostaje sama odpowiedź
      if (questionRef.current !== asked) {
        if (res.reply) sayRaw(res.reply);
        return;
      }
      // Powrót do wcześniejszego kroku ma pierwszeństwo przed wszystkim innym
      if (res.goto && isStepId(res.goto) && jumpableRef.current) {
        if (res.reply) sayRaw(res.reply);
        jump(res.goto);
        return;
      }
      const picked = res.choice ? asked.choices?.find((c) => c.value === res.choice) : undefined;
      if (picked) {
        if (res.reply) sayRaw(res.reply);
        // Odpowiedź właściciela jest już w rozmowie – nie powtarzamy jej etykietą
        answer({ text: picked.value, label: "" });
        return;
      }
      if (res.value && asked.input && asked.input !== "none") {
        if (res.reply) sayRaw(res.reply);
        answer({ text: res.value, label: "" });
        return;
      }
      // Przy pytaniu tekstowym poprawka jest odpowiedzią na nie; przy pytaniu
      // z samymi przyciskami zostaje zapisana, a wyboru dokonuje właściciel –
      // agent nie przechodzi dalej sam (decyzja właściciela 19.09.2026)
      if (res.correction && asked.input === "text") {
        if (res.reply) sayRaw(res.reply);
        answer({ text: res.correction, label: "" });
        return;
      }
      sayRaw(res.reply || "Nie jestem pewien, co z tym zrobić – możesz doprecyzować?");
    } catch (e) {
      sayRaw(`Nie udało się odpowiedzieć (${errorText(e)}). Możesz wybrać przyciskiem albo napisać jeszcze raz.`);
    } finally {
      setChatBusy(false);
      setTyping(false);
    }
  }

  // Pisać można **przy każdym pytaniu**: także przy tych z samymi przyciskami
  // i przy wyborze zdjęcia – treść spoza oczekiwanej odpowiedzi trafia do
  // agenta jako swobodna wiadomość
  const textInputActive = Boolean(question && !chatBusy);
  // Przyciski w rozmowie działają tylko przy bieżącym (jeszcze nieodpowiedzianym)
  // pytaniu; przy pytaniu o plik „Pomiń” w rozmowie odpowiada bez plików
  const choicesActive = Boolean(question?.choices) && !chatBusy;

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
        // `dvh`, nie `vh`: na telefonie `vh` liczy się od widoku **bez** pasków
        // przeglądarki, więc okno wystawało pod adres u góry i pod pasek na dole
        // (zgłoszone 19.09.2026). Do `sm:` okno zajmuje cały ekran, wyżej wraca
        // wyśrodkowany kafelek z marginesem
        <div className="fixed inset-0 z-[100] flex items-stretch sm:items-center justify-center sm:p-4 bg-espresso/60" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Agent dodawania produktów"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl h-[100dvh] sm:h-[85dvh] flex flex-col bg-warm-white sm:border sm:border-sand sm:shadow-xl"
          >
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-sand shrink-0">
              <h2 className="font-serif text-base sm:text-xl text-espresso flex items-center gap-2 min-w-0">
                <Bot size={20} strokeWidth={1.5} className="text-clay shrink-0" />
                <span className="truncate">Agent dodawania produktów</span>
              </h2>
              <button type="button" onClick={close} aria-label="Zamknij" className="-mr-2 p-2 text-charcoal/80 hover:text-espresso shrink-0">
                <X size={20} />
              </button>
            </div>

            {/* Dziennik rozmowy */}
            <div ref={logRef} className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-3 bg-cream/40">
              {messages.map((m) => {
                const wide = Boolean(m.images?.length || m.choices?.length);
                return (
                  <div key={m.id} className={`flex ${m.who === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={
                        m.who === "user"
                          // Odpowiedzi właściciela: drobne, na jasnym piaskowym tle –
                          // ciemny dymek przytłaczał rozmowę (17.09.2026)
                          ? "max-w-[85%] sm:max-w-[75%] px-3 py-1.5 text-xs leading-relaxed bg-sand/60 text-espresso"
                          : `${wide ? "w-full" : "max-w-[92%] sm:max-w-[85%]"} px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed bg-warm-white border border-sand text-charcoal`
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
              {typing && <TypingDots />}
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

            {/* Pole odpowiedzi: wybór zdjęć (gdy agent o nie prosi) i **zawsze**
                pole tekstowe – na każdym pytaniu można napisać własnymi słowami.
                Przyciski wyboru stoją w rozmowie */}
            <div className="border-t border-sand px-4 sm:px-5 pt-3 sm:pt-4 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:pb-4 shrink-0 space-y-2">
              {question?.files && (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-sand hover:border-clay cursor-pointer py-3 sm:py-4 text-xs tracking-widest uppercase text-charcoal/80 transition-colors">
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
              )}
              <form onSubmit={(e) => { e.preventDefault(); submitText(); }} className="flex gap-2">
                <input
                  type="text"
                  inputMode={question?.input === "number" ? "decimal" : undefined}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={!textInputActive}
                  placeholder={
                    chatBusy
                      ? "Czytam…"
                      : textInputActive
                      ? (question?.placeholder ?? "Odpowiedz albo napisz, co zrobić…")
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
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
