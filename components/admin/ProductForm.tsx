"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, X, Trash2, MoveLeft, MoveRight, Sparkles, Loader2 } from "lucide-react";
import { uploadErrorMessage } from "@/lib/upload-error";
import { PRODUCT_MAX_IMAGES } from "@/lib/product-validation";
import {
  MAX_DISCOUNT_PERCENT,
  discountState,
  discountedPrice,
  normalizeDiscountPercent,
} from "@/lib/product-price";
import { dateToWarsawLocal, formatWarsaw, warsawLocalToDate } from "@/lib/warsaw-time";
import { AI_VARIANT_LABEL, type AiVariant } from "@/lib/ai";
import AiImageButtons, { AI_CONFIRM, type AiGenerating } from "@/components/admin/AiImageButtons";

const HOUR_MS = 3_600_000;

/**
 * Gotowe czasy obowiązywania rabatu. Wybór wpisuje datę końca do pola
 * „Do kiedy" (liczoną od początku rabatu albo od teraz), więc właściciel
 * nie musi liczyć terminu w głowie. „Do wskazanej daty" zostawia pole
 * do ręcznej edycji.
 */
const DISCOUNT_DURATIONS: { value: string; label: string }[] = [
  { value: "", label: "Bezterminowo" },
  { value: "24", label: "24 godziny" },
  { value: "48", label: "2 dni" },
  { value: "72", label: "3 dni" },
  { value: "168", label: "7 dni" },
  { value: "336", label: "14 dni" },
  { value: "720", label: "30 dni" },
  { value: "custom", label: "Do wskazanej daty" },
];

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  images: string[];
  category: string;
  /** Slug kolekcji (serii) albo null – produkt nie musi należeć do żadnej. */
  collection: string | null;
  stock: number;
  featured: boolean;
  active: boolean;
  variesFromPhoto: boolean;
  discountPercent: number;
  /** Okno obowiązywania rabatu (z bazy w UTC; w panelu pokazywane po polsku). */
  discountStartsAt: Date | string | null;
  discountEndsAt: Date | string | null;
};

type Category = { slug: string; label: string };
type Collection = { slug: string; label: string };

/** Dane początkowe bez identyfikatora – formularz zostaje w trybie dodawania (duplikowanie produktu). */
export type ProductDraft = Omit<Product, "id">;

export default function ProductForm({
  product,
  initial,
  categories,
  collections = [],
}: {
  product?: Product;
  initial?: ProductDraft;
  categories: Category[];
  collections?: Collection[];
}) {
  const router = useRouter();
  // `product` = edycja istniejącego (PUT + możliwość usunięcia),
  // `initial` = wypełnione pola nowego produktu (kopia) – zapis idzie przez POST
  const base = product ?? initial;
  const [form, setForm] = useState({
    name: base?.name ?? "",
    slug: base?.slug ?? "",
    description: base?.description ?? "",
    price: base?.price?.toString() ?? "",
    category: base?.category ?? categories[0]?.slug ?? "",
    // Pusty string = brak kolekcji; przy zapisie idzie do bazy jako null
    collection: base?.collection ?? "",
    stock: base?.stock?.toString() ?? "0",
    discountPercent: base?.discountPercent?.toString() ?? "0",
    // Pola dat trzymamy w formacie <input type="datetime-local">, czyli
    // w czasie polskim; na ISO (UTC) przeliczamy je dopiero przy zapisie
    discountStartsAt: dateToWarsawLocal(base?.discountStartsAt),
    discountEndsAt: dateToWarsawLocal(base?.discountEndsAt),
    featured: base?.featured ?? false,
    active: base?.active ?? true,
    variesFromPhoto: base?.variesFromPhoto ?? false,
  });
  const [images, setImages] = useState<string[]>(base?.images ?? []);
  // Wybrany czas obowiązywania – sam nie jest zapisywany, tylko wypełnia datę końca
  const [durationPreset, setDurationPreset] = useState(base?.discountEndsAt ? "custom" : "");
  const [uploading, setUploading] = useState(false);
  // Które zdjęcie jest właśnie przerabiane przez AI (indeks + wariant)
  const [generating, setGenerating] = useState<AiGenerating>(null);
  const [filling, setFilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Podgląd przeceny pod polem rabatu – liczony z ceny bez narzutu na wysyłkę
  const discountPreview = (() => {
    const basePrice = parseFloat(form.price);
    const percent = normalizeDiscountPercent(form.discountPercent);
    if (!Number.isFinite(basePrice) || basePrice <= 0 || percent === 0) return null;
    const zl = (v: number) => `${v.toFixed(2).replace(".", ",")} zł`;
    return {
      before: zl(basePrice),
      after: zl(discountedPrice(basePrice, percent)),
      percent,
    };
  })();

  // ── Okno obowiązywania rabatu (czas polski) ────────────────────────────────
  const startsAtDate = form.discountStartsAt ? warsawLocalToDate(form.discountStartsAt) : null;
  const endsAtDate = form.discountEndsAt ? warsawLocalToDate(form.discountEndsAt) : null;
  const windowError =
    (form.discountStartsAt && !startsAtDate) || (form.discountEndsAt && !endsAtDate)
      ? "Nieprawidłowa data rabatu."
      : startsAtDate && endsAtDate && endsAtDate.getTime() <= startsAtDate.getTime()
        ? "Koniec rabatu musi być późniejszy niż jego początek."
        : "";

  /** Opis okna rabatu pod polami – tym samym językiem, co stan w bazie. */
  const discountSummary = (() => {
    const percent = normalizeDiscountPercent(form.discountPercent);
    if (percent === 0) return "Rabat wyłączony – produkt sprzedaje się w cenie podstawowej.";
    if (windowError) return "";
    const state = discountState({
      discountPercent: percent,
      discountStartsAt: startsAtDate,
      discountEndsAt: endsAtDate,
    });
    if (state === "expired") {
      return `Rabat zakończył się ${formatWarsaw(endsAtDate)} – produkt sprzedaje się w cenie podstawowej.`;
    }
    if (state === "scheduled") {
      return endsAtDate
        ? `Rabat włączy się ${formatWarsaw(startsAtDate)} i potrwa do ${formatWarsaw(endsAtDate)}.`
        : `Rabat włączy się ${formatWarsaw(startsAtDate)} i będzie obowiązywał bezterminowo.`;
    }
    if (endsAtDate) {
      return startsAtDate
        ? `Rabat obowiązuje od ${formatWarsaw(startsAtDate)} do ${formatWarsaw(endsAtDate)}.`
        : `Rabat obowiązuje do ${formatWarsaw(endsAtDate)}.`;
    }
    return "Rabat obowiązuje bezterminowo – do chwili wyłączenia go tutaj.";
  })();

  /** Data końca liczona od początku rabatu (albo od teraz, gdy startuje od razu). */
  function endAfterHours(hours: number, startLocal: string): string {
    const from = warsawLocalToDate(startLocal) ?? new Date();
    return dateToWarsawLocal(new Date(from.getTime() + hours * HOUR_MS));
  }

  function setDiscountStart(value: string) {
    set("discountStartsAt", value);
    // Wybrany czas obowiązywania liczy się od początku rabatu – przesuwając
    // start, przesuwamy też koniec
    if (durationPreset && durationPreset !== "custom") {
      set("discountEndsAt", endAfterHours(Number(durationPreset), value));
    }
  }

  function setDiscountDuration(preset: string) {
    setDurationPreset(preset);
    if (preset === "") {
      set("discountEndsAt", "");
      return;
    }
    if (preset === "custom") {
      if (!form.discountEndsAt) set("discountEndsAt", endAfterHours(168, form.discountStartsAt));
      return;
    }
    set("discountEndsAt", endAfterHours(Number(preset), form.discountStartsAt));
  }

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ł/g, "l")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function removeImage(idx: number) {
    if (!confirm("Usunąć to zdjęcie z produktu?")) return;
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  /** Zamiana zdjęcia z sąsiadem – kolejność decyduje, które jest główne (pierwsze). */
  function moveImage(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    setImages((prev) => {
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  /**
   * Wysyła zdjęcie do Google AI i dokłada wynik na koniec listy.
   * Oryginał zostaje – wygenerowana wersja to osobny plik w Storage.
   */
  async function generateWithAi(idx: number, variant: AiVariant) {
    if (generating || uploading) return;
    if (images.length >= PRODUCT_MAX_IMAGES) {
      setError(`Do produktu można dodać maksymalnie ${PRODUCT_MAX_IMAGES} zdjęć.`);
      return;
    }
    if (!confirm(AI_CONFIRM[variant])) return;

    setGenerating({ idx, variant });
    setError("");
    try {
      const res = await fetch("/api/admin/ai-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: images[idx], variant }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        setImages((prev) => [...prev, data.url]);
      } else {
        setError(data?.error ?? "Nie udało się wygenerować zdjęcia.");
      }
    } catch {
      setError("Brak połączenia z serwerem – spróbuj ponownie.");
    } finally {
      setGenerating(null);
    }
  }

  /**
   * Uzupełnia nazwę, slug, kategorię i opis na podstawie zdjęcia głównego.
   * Nadpisuje te pola – dlatego pytamy o potwierdzenie.
   */
  async function fillWithAi() {
    if (filling || generating) return;
    const main = images[0];
    if (!main) {
      setError("Najpierw dodaj zdjęcie produktu – AI uzupełnia dane na jego podstawie.");
      return;
    }
    if (
      !confirm(
        "Uzupełnić dane produktu przez AI na podstawie zdjęcia głównego?\n\nNadpisze to nazwę, slug, kategorię i opis."
      )
    ) {
      return;
    }

    setFilling(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ai-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: main }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error ?? "Nie udało się uzupełnić danych produktu.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        name: data.name || prev.name,
        slug: data.slug || prev.slug,
        // Kategoria przychodzi tylko wtedy, gdy model trafił w istniejącą
        category: data.category || prev.category,
        description: data.description || prev.description,
      }));
    } catch {
      setError("Brak połączenia z serwerem – spróbuj ponownie.");
    } finally {
      setFilling(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setError("");

    let added: string[] = [];
    for (const file of Array.from(files)) {
      if (images.length + added.length >= PRODUCT_MAX_IMAGES) {
        setError(`Do produktu można dodać maksymalnie ${PRODUCT_MAX_IMAGES} zdjęć.`);
        break;
      }
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        added = [...added, data.url];
      } else {
        setError(uploadErrorMessage(res.status, data?.error, file.name));
        break;
      }
    }
    if (added.length > 0) setImages((prev) => [...prev, ...added]);
    setUploading(false);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (windowError) {
      setError(windowError);
      setSaving(false);
      return;
    }

    const body = {
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      // Puste pole w selekcie = produkt poza kolekcjami
      collection: form.collection || null,
      // Puste pole = brak rabatu; walidację zakresu robi validateProduct
      discountPercent: parseInt(form.discountPercent) || 0,
      // Daty wpisywane są w czasie polskim – do bazy idą jako moment w UTC
      discountStartsAt: startsAtDate ? startsAtDate.toISOString() : null,
      discountEndsAt: endsAtDate ? endsAtDate.toISOString() : null,
      images,
    };

    const res = await fetch(
      product ? `/api/admin/products/${product.id}` : "/api/admin/products",
      {
        method: product ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Wystąpił błąd");
      setSaving(false);
      return;
    }

    router.push("/admin/produkty");
    router.refresh();
  }

  async function handleDelete() {
    if (!product) return;
    if (!confirm("Czy na pewno chcesz usunąć ten produkt?")) return;
    await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    router.push("/admin/produkty");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
      )}

      {/* Zdjęcia */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">Zdjęcia produktu</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 items-start gap-2 sm:gap-3 mb-3">
          {images.map((url, i) => (
            <div key={`${i}-${url}`} className="border border-sand bg-warm-white p-1.5">
              <div className="relative w-full aspect-[4/3] bg-cream overflow-hidden">
                {/* contain, nie cover – w edycji ma być widoczne całe zdjęcie */}
                <Image src={url} alt={`Zdjęcie ${i + 1}`} fill className="object-contain" sizes="(max-width: 640px) 33vw, 160px" />
                {i === 0 && images.length > 1 && (
                  <span className="absolute inset-x-0 bottom-0 bg-espresso/90 text-cream text-[9px] tracking-widest uppercase text-center py-0.5">
                    Główne
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <button
                  type="button"
                  onClick={() => moveImage(i, -1)}
                  disabled={i === 0}
                  title="Przesuń w lewo"
                  aria-label={`Przesuń zdjęcie ${i + 1} w lewo`}
                  className="p-1 text-charcoal hover:text-espresso disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MoveLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(i, 1)}
                  disabled={i === images.length - 1}
                  title="Przesuń w prawo"
                  aria-label={`Przesuń zdjęcie ${i + 1} w prawo`}
                  className="p-1 text-charcoal hover:text-espresso disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MoveRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  title="Usuń zdjęcie"
                  aria-label={`Usuń zdjęcie ${i + 1}`}
                  className="p-1 text-red-700 hover:bg-red-50"
                >
                  <X size={14} />
                </button>
              </div>
              {/* Przyciski AI / AI+ (albo plakietka „Wygenerowane”) – wspólny
                  komponent z formularzem projektu portfolio */}
              <AiImageButtons index={i} url={url} generating={generating} onGenerate={generateWithAi} />
            </div>
          ))}
          {images.length < PRODUCT_MAX_IMAGES && (
            <label className={`w-full aspect-[4/3] border-2 border-dashed border-sand flex flex-col items-center justify-center cursor-pointer hover:border-clay transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <Upload size={20} strokeWidth={1.5} className="text-charcoal/80 mb-1" />
              <span className="text-[10px] text-charcoal/80">{uploading ? "Upload..." : "Dodaj"}</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          )}
        </div>
        <p className="text-[11px] text-charcoal/80">
          Pierwsze zdjęcie jest główne – widać je na liście produktów i w koszyku. Strzałki zmieniają
          kolejność, krzyżyk usuwa zdjęcie (maks. {PRODUCT_MAX_IMAGES}).
        </p>
        <p className="text-[11px] text-charcoal/80 mt-1">
          <strong className="font-medium">AI</strong> tworzy wersję zdjęcia na jednolitym, matowym tle,{" "}
          <strong className="font-medium">AI+</strong> – w wystylizowanej scenie. Wynik dodaje się jako
          nowe zdjęcie na końcu listy (oryginał zostaje). Zdjęcia już wygenerowane przez AI
          (oznaczone „Wygenerowane”) nie mają tych przycisków – powtórne przetworzenie gubi wygląd produktu.
          Model dla obu wariantów wybierzesz w Ustawieniach → AI (zdjęcia).
        </p>
        {generating && (
          <p className="text-[11px] text-clay mt-1">
            Generuję wersję {AI_VARIANT_LABEL[generating.variant]} ze zdjęcia {generating.idx + 1} –
            to może potrwać kilkadziesiąt sekund.
          </p>
        )}
      </div>

      {/* Podstawowe */}
      <div className="grid grid-cols-2 gap-6">
        <div className="col-span-2">
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Nazwa *</label>
          <input required value={form.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (!product) set("slug", autoSlug(e.target.value));
            }}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Slug URL *</label>
          <input required value={form.slug} onChange={(e) => set("slug", e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm font-mono" />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Kategoria *</label>
          <select value={form.category} onChange={(e) => set("category", e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm">
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Kolekcja</label>
          <select value={form.collection} onChange={(e) => set("collection", e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm">
            <option value="">Bez kolekcji</option>
            {collections.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
          <p className="text-[11px] text-charcoal/80 mt-1">
            {collections.length === 0
              ? "Kolekcje dodajesz w zakładce Kategorie."
              : "Produkty z tej samej kolekcji polecają się nawzajem przed resztą kategorii."}
          </p>
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Cena (zł) *</label>
          <input required type="number" step="0.01" min="0" value={form.price}
            onChange={(e) => set("price", e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Stan magazynowy</label>
          <input type="number" min="0" value={form.stock}
            onChange={(e) => set("stock", e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
        </div>
        <div className="col-span-2 border border-sand/60 bg-warm-white p-4">
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
            Rabat (%)
          </label>
          <input type="number" min="0" max={MAX_DISCOUNT_PERCENT} step="1" value={form.discountPercent}
            onChange={(e) => set("discountPercent", e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
          <p className="text-xs text-charcoal/80 mt-2 leading-relaxed">
            0 = brak przeceny. Rabat schodzi z ceny produktu i sumuje się z promocją
            „Wielosztuki”.
            {discountPreview && (
              <>
                {" "}Karta produktu pokaże{" "}
                <span className="line-through">{discountPreview.before}</span>{" "}
                <span className="text-espresso">{discountPreview.after}</span>{" "}
                <span className="text-green-700">−{discountPreview.percent}%</span>. Przy
                włączonej promocji „Wielosztuki” obie kwoty niosą narzut na wysyłkę, więc
                pokazany procent będzie odrobinę niższy.
              </>
            )}
          </p>

          {/* Okno obowiązywania – widoczne dopiero przy ustawionym rabacie.
              Wszystkie godziny są w czasie polskim; do bazy trafiają jako UTC. */}
          {normalizeDiscountPercent(form.discountPercent) > 0 && (
            <div className="mt-5 pt-5 border-t border-sand/60">
              <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">
                Czas obowiązywania <span className="text-clay">(czas polski)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="min-w-0">
                  <label className="block text-[11px] text-charcoal/80 mb-1.5">
                    Start rabatu
                  </label>
                  <input
                    type="datetime-local"
                    value={form.discountStartsAt}
                    onChange={(e) => setDiscountStart(e.target.value)}
                    className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
                  />
                  <p className="text-[11px] text-charcoal/80 mt-1">
                    Puste = rabat działa od zapisania produktu.
                  </p>
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] text-charcoal/80 mb-1.5">
                    Czas trwania
                  </label>
                  <select
                    value={durationPreset}
                    onChange={(e) => setDiscountDuration(e.target.value)}
                    className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
                  >
                    {DISCOUNT_DURATIONS.map((d) => (
                      <option key={d.value || "none"} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-charcoal/80 mt-1">
                    Wypełnia pole „Do kiedy”.
                  </p>
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] text-charcoal/80 mb-1.5">
                    Do kiedy
                  </label>
                  <input
                    type="datetime-local"
                    value={form.discountEndsAt}
                    onChange={(e) => {
                      set("discountEndsAt", e.target.value);
                      setDurationPreset(e.target.value ? "custom" : "");
                    }}
                    className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
                  />
                  <p className="text-[11px] text-charcoal/80 mt-1">
                    Puste = rabat bezterminowy.
                  </p>
                </div>
              </div>
              {windowError ? (
                <p className="text-xs text-red-700 mt-3">{windowError}</p>
              ) : (
                <p className="text-xs text-espresso mt-3">{discountSummary}</p>
              )}
              <p className="text-[11px] text-charcoal/80 mt-2 leading-relaxed">
                Po upływie terminu produkt wraca do ceny podstawowej sam – bez wchodzenia
                w panel. Katalog i strona główna mają cache, więc przez chwilę po zmianie
                mogą pokazywać jeszcze poprzednią cenę; zamówienie zawsze liczy się według
                rabatu obowiązującego w chwili złożenia.
              </p>
            </div>
          )}
        </div>
        <div className="col-span-2">
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Opis</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
            rows={4} className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm resize-none" />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fillWithAi}
              disabled={filling || generating !== null || images.length === 0}
              className="inline-flex items-center gap-2 border border-sand bg-cream hover:bg-sand text-espresso text-xs tracking-widest uppercase px-4 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {filling ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles size={14} aria-hidden="true" />
              )}
              Uzupełnij przy użyciu AI
            </button>
            <span className="text-[11px] text-charcoal/80">
              {images.length === 0
                ? "Najpierw dodaj zdjęcie – AI czyta dane z pierwszego zdjęcia."
                : filling
                  ? "Czytam zdjęcie i przygotowuję dane..."
                  : "Ze zdjęcia głównego uzupełni nazwę, slug, kategorię i opis (nadpisze te pola)."}
            </span>
          </div>
        </div>
      </div>

      {/* Opcje */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-8">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.featured}
              onChange={(e) => set("featured", e.target.checked)} className="accent-clay w-4 h-4" />
            <span className="text-sm text-espresso">Wyróżniony na stronie głównej</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.active}
              onChange={(e) => set("active", e.target.checked)} className="accent-clay w-4 h-4" />
            <span className="text-sm text-espresso">Aktywny (widoczny w sklepie)</span>
          </label>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.variesFromPhoto}
            onChange={(e) => set("variesFromPhoto", e.target.checked)} className="accent-clay w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="text-sm text-espresso">Produkt może różnić się od zdjęcia</span>
            <p className="text-xs text-charcoal/80 mt-0.5">Wyświetla informację o naturalnej unikalności ceramiki na stronie produktu.</p>
          </div>
        </label>
      </div>

      {/* Przyciski */}
      <div className="flex items-center gap-4 pt-4 border-t border-sand">
        <button type="submit" disabled={saving}
          className="bg-clay hover:bg-terracotta hover:text-espresso disabled:bg-sand disabled:text-charcoal/40 text-warm-white text-xs tracking-widest uppercase px-8 py-3.5 transition-colors">
          {saving ? "Zapisuję..." : product ? "Zapisz zmiany" : "Dodaj produkt"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-sm text-charcoal/80 hover:text-espresso transition-colors">
          Anuluj
        </button>
        {product && (
          <button type="button" onClick={handleDelete}
            className="ml-auto flex items-center gap-2 text-sm text-red-600 hover:text-red-800 transition-colors">
            <Trash2 size={15} />
            Usuń produkt
          </button>
        )}
      </div>
    </form>
  );
}
