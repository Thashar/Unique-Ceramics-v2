"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, X, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { uploadErrorMessage } from "@/lib/upload-error";
import { PROJECT_MAX_IMAGES } from "@/lib/portfolio-validation";
import { AI_VARIANT_LABEL, type AiVariant } from "@/lib/ai";
import AiImageButtons, { AI_CONFIRM, type AiGenerating } from "@/components/admin/AiImageButtons";
import LangSwitch from "@/components/admin/LangSwitch";
import TranslateButton from "@/components/admin/TranslateButton";
import { translateTexts } from "@/lib/admin-translate";
import { enProjectKey, type ProjectTranslation } from "@/lib/i18n-content";
import type { Locale } from "@/lib/i18n";

const RichEditor = dynamic(() => import("@/components/admin/RichEditor"), { ssr: false });

type Project = {
  id: string;
  title: string;
  description: string;
  images: string[];
  order: number;
  active: boolean;
};

export default function ProjectForm({
  project,
  english,
}: {
  project?: Project;
  /** Angielski tytuł i opis z `Setting` (`en_project_{id}`) – zakładka EN formularza. */
  english?: ProjectTranslation;
}) {
  const router = useRouter();
  // PL / EN – jak w formularzu produktu: angielska wersja to osobne pola,
  // zapisywane po zapisie projektu pod `en_project_{id}`
  const [lang, setLang] = useState<Locale>("pl");
  const [enTitle, setEnTitle] = useState(english?.title ?? "");
  const [enDescription, setEnDescription] = useState(english?.description ?? "");
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [images, setImages] = useState<string[]>(project?.images ?? []);
  const [order, setOrder] = useState(project?.order?.toString() ?? "0");
  const [active, setActive] = useState(project?.active ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState<AiGenerating>(null);

  /**
   * Wysyła zdjęcie projektu do Google AI i dokłada wynik na koniec listy –
   * dokładnie tak samo jak w formularzu produktu (oryginał zostaje, a zapis
   * do bazy następuje dopiero przy zapisaniu projektu).
   */
  async function generateWithAi(idx: number, variant: AiVariant) {
    if (generating || uploading) return;
    if (images.length >= PROJECT_MAX_IMAGES) {
      setError(`Do projektu można dodać maksymalnie ${PROJECT_MAX_IMAGES} zdjęć.`);
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setError("");
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        setImages((prev) => [...prev, data.url]);
      } else {
        setError(uploadErrorMessage(res.status, data?.error, file.name));
        break;
      }
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      title: title.trim(),
      description,
      images,
      order: parseInt(order) || 0,
      active,
    };

    const url = project ? `/api/admin/portfolio/${project.id}` : "/api/admin/portfolio";
    const method = project ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setSaving(false);
      setError("Nie udało się zapisać projektu.");
      return;
    }

    // Wersja angielska osobno, do `Setting` – nowy projekt ma id dopiero po zapisie
    const saved = await res.json().catch(() => null);
    const projectId: string | undefined = project?.id ?? saved?.id;
    const hadEnglish = Boolean(english?.title || english?.description);
    if (projectId && (enTitle.trim() || enDescription.trim() || hadEnglish)) {
      const value = JSON.stringify({ title: enTitle.trim(), description: enDescription });
      const enRes = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ key: enProjectKey(projectId), value }]),
      });
      if (!enRes.ok) {
        setSaving(false);
        setError("Projekt zapisany, ale nie udało się zapisać wersji angielskiej – spróbuj ponownie.");
        return;
      }
    }
    setSaving(false);
    router.push("/admin/projekty");
    router.refresh();
  }

  /** Tłumaczy bieżący polski tytuł i opis (HTML z edytora zostaje HTML-em). */
  async function translateProject() {
    const [t, d] = await translateTexts([title, description]);
    setEnTitle(t);
    setEnDescription(d);
  }
  // Pola polskie są w zakładce EN tylko ukryte – przy błędzie walidacji wracamy na PL
  const showPolish = () => setLang("pl");

  async function handleDelete() {
    if (!project || !confirm("Na pewno usunąć ten projekt?")) return;
    const res = await fetch(`/api/admin/portfolio/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/projekty");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Przełącznik języka treści – u góry po prawej */}
      <div className="flex justify-end">
        <LangSwitch value={lang} onChange={setLang} />
      </div>

      {lang === "en" && (
        <div className="space-y-6">
          <div className="bg-mist border border-sand p-4 text-xs text-charcoal/80 leading-relaxed space-y-3">
            <p>
              Tytuł i opis pokazywane na wersji angielskiej (<code className="font-mono">/en</code>).
              Puste pole = strona pokaże polski tekst. Zapisują się razem z projektem.
            </p>
            <TranslateButton
              onTranslate={translateProject}
              hasContent={Boolean(enTitle.trim() || enDescription.trim())}
              label="Przetłumacz tytuł i opis przez AI"
            />
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Tytuł (EN)</label>
            <input
              type="text"
              value={enTitle}
              onChange={(e) => setEnTitle(e.target.value)}
              placeholder={title}
              className="w-full border border-sand bg-warm-white px-4 py-3 text-sm text-charcoal focus:outline-none focus:border-terracotta transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">Opis (EN)</label>
            <RichEditor value={enDescription} onChange={setEnDescription} contentClass="rich-content-sm" />
          </div>
        </div>
      )}

      {/* Pola polskie – ukryte (nie odmontowane) w zakładce EN */}
      <div className={lang === "en" ? "hidden" : "space-y-8"}>
      {/* Tytuł */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
          Tytuł
        </label>
        <input
          type="text"
          required
          onInvalid={showPolish}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-sand bg-warm-white px-4 py-3 text-sm text-charcoal focus:outline-none focus:border-terracotta transition-colors"
          placeholder="Tytuł projektu"
        />
      </div>

      {/* Zdjęcia */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">
          Zdjęcia
        </label>
        {images.length > 0 && (
          <div className="grid grid-cols-3 items-start gap-3 mb-3">
            {images.map((url, i) => (
              <div key={`${i}-${url}`} className="border border-sand bg-warm-white p-1.5">
                <div className="relative aspect-[4/3] group overflow-hidden bg-cream">
                  <Image src={url} alt="" fill className="object-cover" unoptimized sizes="200px" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                  {i > 0 && (
                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                      {i + 1}
                    </span>
                  )}
                </div>
                {/* Przyciski AI / AI+ – ten sam komponent co przy produktach */}
                <AiImageButtons index={i} url={url} generating={generating} onGenerate={generateWithAi} />
              </div>
            ))}
          </div>
        )}
        <label
          className={`flex items-center gap-2 border border-dashed border-sand px-4 py-3 cursor-pointer text-sm text-charcoal/80 hover:border-terracotta hover:text-clay transition-colors ${
            uploading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <Upload size={16} />
          {uploading ? "Wgrywanie..." : "Dodaj zdjęcia"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
            disabled={uploading}
          />
        </label>
        <p className="text-xs text-charcoal/80 mt-1">
          Pierwsze zdjęcie wyświetla się jako główne (maks. {PROJECT_MAX_IMAGES} zdjęć).
        </p>
        <p className="text-xs text-charcoal/80 mt-1">
          <strong className="font-medium">AI</strong> tworzy wersję zdjęcia na jednolitym, matowym tle,{" "}
          <strong className="font-medium">AI+</strong> – w wystylizowanej scenie. Wynik dodaje się jako
          nowe zdjęcie na końcu listy (oryginał zostaje). Zdjęcia już wygenerowane
          (oznaczone „Wygenerowane”) nie mają tych przycisków. Model wybierzesz
          w Ustawieniach → AI (zdjęcia i opisy).
        </p>
        {generating && (
          <p className="text-xs text-clay mt-1">
            Generuję wersję {AI_VARIANT_LABEL[generating.variant]} ze zdjęcia {generating.idx + 1} –
            to może potrwać kilkadziesiąt sekund.
          </p>
        )}
      </div>

      {/* Opis */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">
          Opis
        </label>
        <RichEditor value={description} onChange={setDescription} contentClass="rich-content-sm" />
      </div>

      {/* Kolejność */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
          Kolejność
        </label>
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="w-24 border border-sand bg-warm-white px-4 py-3 text-sm text-charcoal focus:outline-none focus:border-terracotta transition-colors"
        />
        <p className="text-xs text-charcoal/80 mt-1">Niższa liczba = wyżej na liście.</p>
      </div>

      {/* Aktywny */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="w-4 h-4 accent-terracotta"
        />
        <label htmlFor="active" className="text-sm text-charcoal cursor-pointer">
          Widoczny na stronie
        </label>
      </div>
      </div>

      {error && <p className="text-red-700 text-sm">{error}</p>}

      <div className="flex items-center gap-4 pt-4 border-t border-sand">
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 bg-espresso text-warm-white text-sm tracking-widest uppercase hover:bg-clay transition-colors disabled:opacity-50"
        >
          {saving ? "Zapisywanie..." : project ? "Zapisz zmiany" : "Dodaj projekt"}
        </button>
        {project && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 px-6 py-3 border border-red-200 text-red-700 text-sm hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            Usuń projekt
          </button>
        )}
      </div>
    </form>
  );
}
