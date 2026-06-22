"use client";

import { useState } from "react";
import { Plus, Trash2, MoveUp, MoveDown, ChevronDown, ChevronUp } from "lucide-react";

export type WorkshopOffer = {
  id: number;
  iconName: string;
  title: string;
  description: string;
  duration: string;
  maxPeople: string;
  priceLabel: string;
  level: string;
  active: boolean;
};

export type WorkshopInclude = {
  id: number;
  iconName: string;
  label: string;
};

export type WorkshopFaq = {
  id: number;
  question: string;
  answer: string;
};

const OFFER_ICONS = [
  { value: "Cake",         label: "Tort" },
  { value: "Gem",          label: "Klejnot" },
  { value: "Building2",    label: "Budynek" },
  { value: "Leaf",         label: "Liść" },
  { value: "Users",        label: "Osoby" },
  { value: "Gift",         label: "Prezent" },
  { value: "Star",         label: "Gwiazda" },
  { value: "Heart",        label: "Serce" },
  { value: "Coffee",       label: "Kawa" },
  { value: "Flame",        label: "Płomień" },
  { value: "Camera",       label: "Aparat" },
  { value: "Palette",      label: "Paleta" },
  { value: "Package",      label: "Paczka" },
  { value: "GraduationCap", label: "Absolwent" },
  { value: "Globe",        label: "Globus" },
  { value: "Music",        label: "Muzyka" },
  { value: "Award",        label: "Nagroda" },
  { value: "CheckCircle",  label: "Zaznaczenie" },
];

const INCLUDE_ICONS = [
  { value: "Package",       label: "Paczka" },
  { value: "GraduationCap", label: "Absolwent" },
  { value: "Flame",         label: "Płomień" },
  { value: "CheckCircle",   label: "Zaznaczenie" },
  { value: "Camera",        label: "Aparat" },
  { value: "Coffee",        label: "Kawa" },
  { value: "Gift",          label: "Prezent" },
  { value: "Star",          label: "Gwiazda" },
  { value: "Heart",         label: "Serce" },
  { value: "Music",         label: "Muzyka" },
  { value: "Award",         label: "Nagroda" },
  { value: "Scissors",      label: "Nożyczki" },
];

function safeParse<T>(json: string): T[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

function nextId(items: { id: number }[]): number {
  return items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className={`w-12 h-6 rounded-full transition-colors ${checked ? "bg-espresso" : "bg-sand"} relative`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-cream transition-all ${checked ? "left-7" : "left-1"}`} />
      </div>
    </label>
  );
}

// --- Edytor kart ofert ---

function OffersEditor({ json, onChange }: { json: string; onChange: (v: string) => void }) {
  const [items, setItems] = useState<WorkshopOffer[]>(() => safeParse<WorkshopOffer>(json));
  const [expanded, setExpanded] = useState<number | null>(null);

  const emit = (next: WorkshopOffer[]) => {
    setItems(next);
    onChange(JSON.stringify(next));
  };

  const update = (id: number, patch: Partial<WorkshopOffer>) =>
    emit(items.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const remove = (id: number) => {
    if (!confirm("Usunąć ten warsztat?")) return;
    if (expanded === id) setExpanded(null);
    emit(items.filter((w) => w.id !== id));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    emit(next);
  };

  const moveDown = (idx: number) => {
    if (idx === items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    emit(next);
  };

  const add = () => {
    const w: WorkshopOffer = {
      id: nextId(items),
      iconName: "Star",
      title: "Nowy warsztat",
      description: "",
      duration: "",
      maxPeople: "",
      priceLabel: "",
      level: "Każdy poziom",
      active: true,
    };
    const next = [...items, w];
    emit(next);
    setExpanded(w.id);
  };

  return (
    <div className="space-y-2">
      {items.map((w, idx) => (
        <div key={w.id} className={`border ${w.active ? "border-sand" : "border-sand/40 opacity-60"} bg-warm-white`}>
          {/* Nagłówek karty */}
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-cream/60 transition-colors"
            onClick={() => setExpanded(expanded === w.id ? null : w.id)}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${w.active ? "bg-clay" : "bg-sand"}`} />
            <span className="flex-1 text-sm text-espresso font-medium truncate">{w.title || "(bez tytułu)"}</span>
            <span className="text-xs text-charcoal/40 shrink-0 hidden sm:block">{w.priceLabel}</span>
            <div
              className="flex items-center gap-0.5 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                title="Przesuń wyżej"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="p-1.5 text-charcoal/30 hover:text-charcoal disabled:opacity-20 transition-colors"
              >
                <MoveUp size={14} />
              </button>
              <button
                title="Przesuń niżej"
                onClick={() => moveDown(idx)}
                disabled={idx === items.length - 1}
                className="p-1.5 text-charcoal/30 hover:text-charcoal disabled:opacity-20 transition-colors"
              >
                <MoveDown size={14} />
              </button>
              <button
                title="Usuń"
                onClick={() => remove(w.id)}
                className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {expanded === w.id
              ? <ChevronUp size={16} className="text-charcoal/40 shrink-0" />
              : <ChevronDown size={16} className="text-charcoal/40 shrink-0" />
            }
          </div>

          {/* Pola edycji */}
          {expanded === w.id && (
            <div className="px-4 pb-5 space-y-4 border-t border-sand">
              <div className="flex items-center justify-between pt-4">
                <span className="text-xs tracking-widest uppercase text-charcoal/60">Widoczny na stronie</span>
                <Toggle checked={w.active} onChange={(v) => update(w.id, { active: v })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-charcoal/60 mb-1.5">Ikona</label>
                  <select
                    value={w.iconName}
                    onChange={(e) => update(w.id, { iconName: e.target.value })}
                    className="w-full bg-cream border border-sand text-espresso text-sm px-3 py-2.5 outline-none focus:border-clay"
                  >
                    {OFFER_ICONS.map((ic) => (
                      <option key={ic.value} value={ic.value}>{ic.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-charcoal/60 mb-1.5">Poziom / oznaczenie</label>
                  <input
                    type="text"
                    value={w.level}
                    onChange={(e) => update(w.id, { level: e.target.value })}
                    className="w-full bg-cream border border-sand text-espresso text-sm px-3 py-2.5 outline-none focus:border-clay"
                    placeholder="np. Każdy poziom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-charcoal/60 mb-1.5">Tytuł</label>
                <input
                  type="text"
                  value={w.title}
                  onChange={(e) => update(w.id, { title: e.target.value })}
                  className="w-full bg-cream border border-sand text-espresso text-sm px-3 py-2.5 outline-none focus:border-clay"
                />
              </div>

              <div>
                <label className="block text-xs text-charcoal/60 mb-1.5">Opis</label>
                <textarea
                  value={w.description}
                  onChange={(e) => update(w.id, { description: e.target.value })}
                  rows={3}
                  className="w-full bg-cream border border-sand text-espresso text-sm px-3 py-2.5 outline-none focus:border-clay resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-charcoal/60 mb-1.5">Czas trwania</label>
                  <input
                    type="text"
                    value={w.duration}
                    onChange={(e) => update(w.id, { duration: e.target.value })}
                    className="w-full bg-cream border border-sand text-espresso text-sm px-3 py-2.5 outline-none focus:border-clay"
                    placeholder="np. 3 godziny"
                  />
                </div>
                <div>
                  <label className="block text-xs text-charcoal/60 mb-1.5">Liczba uczestników</label>
                  <input
                    type="text"
                    value={w.maxPeople}
                    onChange={(e) => update(w.id, { maxPeople: e.target.value })}
                    className="w-full bg-cream border border-sand text-espresso text-sm px-3 py-2.5 outline-none focus:border-clay"
                    placeholder="np. od 4 osób"
                  />
                </div>
                <div>
                  <label className="block text-xs text-charcoal/60 mb-1.5">Cena</label>
                  <input
                    type="text"
                    value={w.priceLabel}
                    onChange={(e) => update(w.id, { priceLabel: e.target.value })}
                    className="w-full bg-cream border border-sand text-espresso text-sm px-3 py-2.5 outline-none focus:border-clay"
                    placeholder="np. od 80 zł / os."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={add}
        className="flex items-center gap-2 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors py-2 mt-1"
      >
        <Plus size={14} />
        Dodaj warsztat
      </button>
    </div>
  );
}

// --- Edytor sekcji "Co zawiera" ---

function IncludesEditor({ json, onChange }: { json: string; onChange: (v: string) => void }) {
  const [items, setItems] = useState<WorkshopInclude[]>(() => safeParse<WorkshopInclude>(json));

  const emit = (next: WorkshopInclude[]) => {
    setItems(next);
    onChange(JSON.stringify(next));
  };

  const update = (id: number, patch: Partial<WorkshopInclude>) =>
    emit(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const remove = (id: number) => emit(items.filter((i) => i.id !== id));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    emit(next);
  };

  const moveDown = (idx: number) => {
    if (idx === items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    emit(next);
  };

  const add = () =>
    emit([...items, { id: nextId(items), iconName: "CheckCircle", label: "" }]);

  return (
    <div className="space-y-2">
      {items.map((inc, idx) => (
        <div key={inc.id} className="flex items-center gap-2">
          <div className="flex flex-col shrink-0">
            <button
              onClick={() => moveUp(idx)}
              disabled={idx === 0}
              className="p-1 text-charcoal/30 hover:text-charcoal disabled:opacity-20 transition-colors"
            >
              <MoveUp size={12} />
            </button>
            <button
              onClick={() => moveDown(idx)}
              disabled={idx === items.length - 1}
              className="p-1 text-charcoal/30 hover:text-charcoal disabled:opacity-20 transition-colors"
            >
              <MoveDown size={12} />
            </button>
          </div>
          <select
            value={inc.iconName}
            onChange={(e) => update(inc.id, { iconName: e.target.value })}
            className="w-36 shrink-0 bg-warm-white border border-sand text-espresso text-xs px-2 py-2 outline-none focus:border-clay"
          >
            {INCLUDE_ICONS.map((ic) => (
              <option key={ic.value} value={ic.value}>{ic.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={inc.label}
            onChange={(e) => update(inc.id, { label: e.target.value })}
            className="flex-1 bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay"
            placeholder="Co zawiera warsztat..."
          />
          <button
            onClick={() => remove(inc.id)}
            className="p-1.5 text-red-400 hover:text-red-600 shrink-0 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-2 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors py-2 mt-1"
      >
        <Plus size={14} />
        Dodaj pozycję
      </button>
    </div>
  );
}

// --- Edytor FAQ ---

function FaqEditor({ json, onChange }: { json: string; onChange: (v: string) => void }) {
  const [items, setItems] = useState<WorkshopFaq[]>(() => safeParse<WorkshopFaq>(json));

  const emit = (next: WorkshopFaq[]) => {
    setItems(next);
    onChange(JSON.stringify(next));
  };

  const update = (id: number, patch: Partial<WorkshopFaq>) =>
    emit(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const remove = (id: number) => {
    if (!confirm("Usunąć to pytanie?")) return;
    emit(items.filter((i) => i.id !== id));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    emit(next);
  };

  const moveDown = (idx: number) => {
    if (idx === items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    emit(next);
  };

  const add = () =>
    emit([...items, { id: nextId(items), question: "", answer: "" }]);

  return (
    <div className="space-y-3">
      {items.map((faq, idx) => (
        <div key={faq.id} className="border border-sand bg-warm-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-charcoal/40">Pytanie {idx + 1}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="p-1 text-charcoal/30 hover:text-charcoal disabled:opacity-20 transition-colors"
              >
                <MoveUp size={14} />
              </button>
              <button
                onClick={() => moveDown(idx)}
                disabled={idx === items.length - 1}
                className="p-1 text-charcoal/30 hover:text-charcoal disabled:opacity-20 transition-colors"
              >
                <MoveDown size={14} />
              </button>
              <button
                onClick={() => remove(faq.id)}
                className="p-1 text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <input
            type="text"
            value={faq.question}
            onChange={(e) => update(faq.id, { question: e.target.value })}
            className="w-full bg-cream border border-sand text-espresso text-sm px-3 py-2.5 outline-none focus:border-clay"
            placeholder="Pytanie..."
          />
          <textarea
            value={faq.answer}
            onChange={(e) => update(faq.id, { answer: e.target.value })}
            rows={2}
            className="w-full bg-cream border border-sand text-espresso text-sm px-3 py-2.5 outline-none focus:border-clay resize-none"
            placeholder="Odpowiedź..."
          />
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-2 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors py-2"
      >
        <Plus size={14} />
        Dodaj pytanie
      </button>
    </div>
  );
}

// --- Eksport główny ---

interface WorkshopsOffersEditorProps {
  offersJson: string;
  includesJson: string;
  faqJson: string;
  onOffersChange: (json: string) => void;
  onIncludesChange: (json: string) => void;
  onFaqChange: (json: string) => void;
}

export default function WorkshopsOffersEditor({
  offersJson,
  includesJson,
  faqJson,
  onOffersChange,
  onIncludesChange,
  onFaqChange,
}: WorkshopsOffersEditorProps) {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Oferta warsztatów</h3>
          <p className="text-xs text-charcoal/40 mt-1">Karty widoczne na stronie /warsztaty. Możesz zmieniać kolejność strzałkami.</p>
        </div>
        <OffersEditor json={offersJson} onChange={onOffersChange} />
      </div>

      <div className="border-t border-sand pt-8 space-y-4">
        <div>
          <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Co zawiera warsztat?</h3>
          <p className="text-xs text-charcoal/40 mt-1">Ikony i opisy w sekcji poniżej listy ofert.</p>
        </div>
        <IncludesEditor json={includesJson} onChange={onIncludesChange} />
      </div>

      <div className="border-t border-sand pt-8 space-y-4">
        <div>
          <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Często zadawane pytania</h3>
          <p className="text-xs text-charcoal/40 mt-1">Pytania i odpowiedzi na dole strony /warsztaty.</p>
        </div>
        <FaqEditor json={faqJson} onChange={onFaqChange} />
      </div>
    </div>
  );
}
