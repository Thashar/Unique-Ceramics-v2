"use client";

import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Sparkles, Trash2, X, Check } from "lucide-react";
import {
  AI_PRESET_LIMITS,
  AI_PRODUCT_RULES,
  AI_VARIANT_LABEL,
  allAiPresets,
  isBuiltinPreset,
  parseAiPresets,
  resolveAiPreset,
  type AiPromptPreset,
  type AiVariant,
} from "@/lib/ai";

type Change = { presetsJson: string; activeAi: string; activeAiPlus: string };

/** Identyfikator własnego presetu – czytelny w JSON-ie ustawień. */
function newPresetId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Presety promptów dla przycisków AI i AI+ (zakładka „AI" w ustawieniach).
 *
 * Preset opisuje wyłącznie **scenę** – tło, rekwizyty, światło. Reguły dotyczące
 * produktu (kadr 4:3, wierność koloru, komplet sztuk, skala) dokleja
 * `buildImagePrompt` przy każdym generowaniu, więc żaden preset ich nie omija.
 *
 * Zmiany wracają do `SettingsForm` przez `onChange` i zapisuje je dopiero
 * wspólny przycisk „Zapisz ustawienia AI" (wzorzec jak `WorkshopsOffersEditor`).
 */
export default function AiPromptPresets({
  presetsJson,
  activeAi,
  activeAiPlus,
  onChange,
}: {
  presetsJson: string;
  activeAi: string;
  activeAiPlus: string;
  onChange: (next: Change) => void;
}) {
  const custom = useMemo(() => parseAiPresets(presetsJson), [presetsJson]);
  const all = useMemo(() => allAiPresets(custom), [custom]);

  const [selectedId, setSelectedId] = useState(() => resolveAiPreset("ai", activeAi, custom).id);
  // "view" – tylko podgląd, "edit" – edycja istniejącego, "new" – nowy preset
  const [mode, setMode] = useState<"view" | "edit" | "new">("view");
  const [draftName, setDraftName] = useState("");
  const [draftScene, setDraftScene] = useState("");
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const selected = all.find((p) => p.id === selectedId) ?? all[0];
  const editable = mode !== "view";

  function emit(next: Partial<Change>) {
    onChange({
      presetsJson,
      activeAi,
      activeAiPlus,
      ...next,
    });
  }

  function savePresets(presets: AiPromptPreset[], next?: Partial<Change>) {
    emit({ presetsJson: JSON.stringify(presets), ...next });
  }

  function selectPreset(id: string) {
    setSelectedId(id);
    setMode("view");
    setError("");
    setInfo("");
  }

  /** Edycja wbudowanego presetu tworzy jego kopię – oryginał zostaje nietknięty. */
  function startEdit() {
    if (!selected) return;
    setDraftScene(selected.scene);
    setDraftName(isBuiltinPreset(selected.id) ? `${selected.name} (kopia)` : selected.name);
    setMode(isBuiltinPreset(selected.id) ? "new" : "edit");
    setError("");
    setInfo(
      isBuiltinPreset(selected.id)
        ? "Presetu wbudowanego nie da się nadpisać – zapiszesz go jako nowy, własny preset."
        : ""
    );
  }

  function startNew() {
    setDraftScene("");
    setDraftName("");
    setDescription("");
    setMode("new");
    setError("");
    setInfo("");
  }

  function cancel() {
    setMode("view");
    setDraftScene("");
    setDraftName("");
    setError("");
    setInfo("");
  }

  /** Zamienia polecenie po polsku na angielski opis sceny (płatne wywołanie modelu). */
  async function generate() {
    if (generating) return;
    const text = description.trim();
    if (text.length < 3) {
      setError("Opisz krótko, jak ma wyglądać scena na zdjęciu.");
      return;
    }
    setGenerating(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/admin/ai-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.scene) {
        setDraftScene(data.scene);
        setMode("new");
        setInfo("Prompt gotowy – nadaj mu nazwę i zapisz jako preset.");
      } else {
        setError(data?.error ?? "Nie udało się przygotować promptu.");
      }
    } catch {
      setError("Brak połączenia z serwerem – spróbuj ponownie.");
    } finally {
      setGenerating(false);
    }
  }

  function saveDraft() {
    const name = draftName.trim().slice(0, AI_PRESET_LIMITS.name);
    const scene = draftScene.trim().slice(0, AI_PRESET_LIMITS.scene);
    if (!name) {
      setError("Nadaj presetowi nazwę.");
      return;
    }
    if (!scene) {
      setError("Prompt nie może być pusty.");
      return;
    }

    if (mode === "edit" && selected && !isBuiltinPreset(selected.id)) {
      savePresets(custom.map((p) => (p.id === selected.id ? { ...p, name, scene } : p)));
      setMode("view");
      setInfo("Zmiany w presecie czekają na zapisanie ustawień.");
      setError("");
      return;
    }

    if (custom.length >= AI_PRESET_LIMITS.count) {
      setError(`Możesz mieć maksymalnie ${AI_PRESET_LIMITS.count} własnych presetów.`);
      return;
    }
    const preset: AiPromptPreset = { id: newPresetId(), name, scene };
    savePresets([...custom, preset]);
    setSelectedId(preset.id);
    setMode("view");
    setInfo("Preset dodany – ustaw go dla AI lub AI+ i zapisz ustawienia.");
    setError("");
  }

  function removePreset() {
    if (!selected || isBuiltinPreset(selected.id)) return;
    if (!confirm(`Usunąć preset „${selected.name}"?`)) return;

    const rest = custom.filter((p) => p.id !== selected.id);
    // Preset przypisany do przycisku znika razem z nim – wracamy do wbudowanego
    const fallback = (variant: AiVariant, current: string) =>
      current === selected.id ? resolveAiPreset(variant, "", rest).id : current;

    savePresets(rest, {
      activeAi: fallback("ai", activeAi),
      activeAiPlus: fallback("ai_plus", activeAiPlus),
    });
    // Po usunięciu wracamy na wbudowany „Domyślny AI" – zawsze istnieje
    setSelectedId(allAiPresets(rest)[0].id);
    setMode("view");
    setInfo("");
    setError("");
  }

  function assign(variant: AiVariant) {
    if (!selected) return;
    emit(variant === "ai" ? { activeAi: selected.id } : { activeAiPlus: selected.id });
    setInfo(`Preset „${selected.name}" ustawiony dla ${AI_VARIANT_LABEL[variant]} – zapisz ustawienia.`);
    setError("");
  }

  const badge = (variant: AiVariant) => (
    <span
      key={variant}
      className="text-[10px] tracking-widest uppercase bg-clay text-warm-white px-2 py-0.5"
    >
      Aktywny: {AI_VARIANT_LABEL[variant]}
    </span>
  );

  const secondaryButton =
    "inline-flex items-center gap-2 border border-sand bg-cream hover:bg-sand text-espresso text-xs tracking-widest uppercase px-4 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const primaryButton =
    "inline-flex items-center gap-2 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-xs tracking-widest uppercase px-4 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="border border-sand bg-warm-white p-4 space-y-4">
      <div>
        <h3 className="font-serif text-xl text-espresso">Presety promptów</h3>
        <p className="text-[11px] text-charcoal/80 leading-relaxed mt-1">
          Preset opisuje <strong className="font-medium">scenę</strong> – tło, rekwizyty, światło
          i nastrój zdjęcia. Informacje o samym produkcie (kadr 4:3, wierność koloru szkliwa,
          komplet sztuk, niezmieniona wielkość) dokładane są automatycznie do każdego promptu,
          więc żaden preset ich nie pominie.
        </p>
        <details className="text-[11px] text-charcoal/80 mt-2">
          <summary className="cursor-pointer">Pokaż stałą część promptu (reguły produktu)</summary>
          <p className="mt-2 bg-cream border border-sand p-3 leading-5">{AI_PRODUCT_RULES}</p>
        </details>
      </div>

      {/* Wybór presetu */}
      <div className="space-y-2">
        <label className="block text-xs tracking-widest uppercase text-charcoal/80">
          Preset
        </label>
        <select
          value={selected?.id ?? ""}
          onChange={(e) => selectPreset(e.target.value)}
          disabled={editable}
          className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors disabled:bg-mist disabled:text-charcoal/80"
        >
          {all.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.id === activeAi ? " · AI" : ""}
              {p.id === activeAiPlus ? " · AI+" : ""}
            </option>
          ))}
        </select>
        {!editable && selected && (
          <div className="flex flex-wrap gap-1.5">
            {selected.id === activeAi && badge("ai")}
            {selected.id === activeAiPlus && badge("ai_plus")}
            {isBuiltinPreset(selected.id) && (
              <span className="text-[10px] tracking-widest uppercase border border-sand bg-cream text-charcoal/80 px-2 py-0.5">
                Wbudowany
              </span>
            )}
          </div>
        )}
      </div>

      {/* Nazwa – tylko przy edycji i tworzeniu */}
      {editable && (
        <div className="space-y-2">
          <label className="block text-xs tracking-widest uppercase text-charcoal/80">
            Nazwa presetu
          </label>
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={AI_PRESET_LIMITS.name}
            placeholder="np. Święta Bożego Narodzenia"
            className="w-full min-w-0 bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
          />
        </div>
      )}

      {/* Treść promptu – do odczytu, dopóki nie wejdziesz w edycję */}
      <div className="space-y-2">
        <label className="block text-xs tracking-widest uppercase text-charcoal/80">
          Prompt sceny {editable ? "(edycja)" : "(podgląd)"}
        </label>
        <textarea
          value={editable ? draftScene : (selected?.scene ?? "")}
          onChange={(e) => setDraftScene(e.target.value)}
          readOnly={!editable}
          rows={8}
          maxLength={AI_PRESET_LIMITS.scene}
          className={`w-full bg-warm-white border border-sand outline-none px-4 py-3 text-espresso text-xs leading-5 transition-colors ${
            editable ? "focus:border-clay" : "bg-mist cursor-default"
          }`}
        />
      </div>

      {error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">{error}</p>
      )}
      {!error && info && (
        <p className="bg-cream border border-sand text-charcoal/80 text-xs px-3 py-2">{info}</p>
      )}

      {/* Akcje */}
      {!editable ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={startEdit} className={secondaryButton}>
            <Pencil size={14} aria-hidden="true" />
            Edytuj prompt
          </button>
          <button type="button" onClick={startNew} className={secondaryButton}>
            <Plus size={14} aria-hidden="true" />
            Generuj nowy prompt
          </button>
          <button
            type="button"
            onClick={() => assign("ai")}
            disabled={!selected || selected.id === activeAi}
            className={secondaryButton}
          >
            <Check size={14} aria-hidden="true" />
            Ustaw dla AI
          </button>
          <button
            type="button"
            onClick={() => assign("ai_plus")}
            disabled={!selected || selected.id === activeAiPlus}
            className={secondaryButton}
          >
            <Check size={14} aria-hidden="true" />
            Ustaw dla AI+
          </button>
          {selected && !isBuiltinPreset(selected.id) && (
            <button
              type="button"
              onClick={removePreset}
              className="inline-flex items-center gap-2 text-xs text-red-700 hover:text-red-800 transition-colors px-2 py-2.5"
            >
              <Trash2 size={14} aria-hidden="true" />
              Usuń preset
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Polecenie dla AI – dostępne przy tworzeniu nowego promptu */}
          {mode === "new" && (
            <div className="space-y-2 border border-sand bg-cream p-3">
              <label className="block text-xs tracking-widest uppercase text-charcoal/80">
                Opisz scenę po polsku
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={AI_PRESET_LIMITS.description}
                placeholder="np. Zdjęcie przedmiotu na stole, biały obrus, kolorystyka świąteczna, choinka, bombki, pierniki"
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={generate}
                  disabled={generating}
                  className={primaryButton}
                >
                  {generating ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles size={14} aria-hidden="true" />
                  )}
                  {generating ? "Przygotowuję prompt..." : "Przygotuj prompt przez AI"}
                </button>
                <span className="text-[11px] text-charcoal/80">
                  Wynik pojawi się w polu powyżej – możesz go poprawić przed zapisaniem.
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={saveDraft} className={primaryButton}>
              <Check size={14} aria-hidden="true" />
              {mode === "edit" ? "Zapisz zmiany" : "Zapisz jako preset"}
            </button>
            <button type="button" onClick={cancel} className={secondaryButton}>
              <X size={14} aria-hidden="true" />
              Anuluj
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-charcoal/80">
        Presety i przypisania zapisuje przycisk „Zapisz ustawienia AI&rdquo; na dole strony.
      </p>
    </div>
  );
}
