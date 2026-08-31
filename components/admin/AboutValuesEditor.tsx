"use client";

import { useState } from "react";
import { Plus, Trash2, MoveUp, MoveDown } from "lucide-react";
import { MAX_ABOUT_VALUES, parseAboutValues, type AboutValue } from "@/lib/about-values";

interface Props {
  json: string;
  onChange: (json: string) => void;
}

function nextId(items: AboutValue[]): number {
  return items.reduce((max, i) => Math.max(max, i.id), 0) + 1;
}

/** Karty sekcji „Jak pracuję” na /o-mnie – tekst bez formatowania, więc zwykłe pola. */
export default function AboutValuesEditor({ json, onChange }: Props) {
  const [items, setItems] = useState<AboutValue[]>(() => parseAboutValues(json));

  const emit = (next: AboutValue[]) => {
    setItems(next);
    onChange(JSON.stringify(next));
  };

  const update = (id: number, patch: Partial<AboutValue>) =>
    emit(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const remove = (id: number) => {
    if (!confirm("Usunąć tę kartę?")) return;
    emit(items.filter((i) => i.id !== id));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    emit(next);
  };

  const add = () => emit([...items, { id: nextId(items), title: "", text: "" }]);

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={item.id} className="border border-sand bg-warm-white p-4 space-y-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex flex-col shrink-0">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="p-1 text-charcoal/80 hover:text-charcoal disabled:opacity-20 transition-colors"
                aria-label="Przesuń wyżej"
              >
                <MoveUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === items.length - 1}
                className="p-1 text-charcoal/80 hover:text-charcoal disabled:opacity-20 transition-colors"
                aria-label="Przesuń niżej"
              >
                <MoveDown size={12} />
              </button>
            </div>
            {/* `min-w-0` obowiązkowe – bez niego pole rozpycha kolumnę ustawień */}
            <input
              type="text"
              value={item.title}
              onChange={(e) => update(item.id, { title: e.target.value })}
              className="flex-1 min-w-0 bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay"
              placeholder="Nagłówek karty, np. Ręcznie"
            />
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="p-1.5 text-red-600 hover:text-red-800 shrink-0 transition-colors"
              aria-label="Usuń kartę"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <textarea
            value={item.text}
            onChange={(e) => update(item.id, { text: e.target.value })}
            rows={3}
            className="w-full min-w-0 bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay resize-y"
            placeholder="Treść karty"
          />
        </div>
      ))}

      {items.length < MAX_ABOUT_VALUES && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-2 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors py-2"
        >
          <Plus size={14} />
          Dodaj kartę
        </button>
      )}
      <p className="text-[11px] text-charcoal/80">
        Maksymalnie {MAX_ABOUT_VALUES} kart. Bez kart cała sekcja znika ze strony.
      </p>
    </div>
  );
}
