"use client";

import Image from "next/image";

const STEPS = [0, 25, 50, 75, 100];
const POINTS = STEPS.flatMap((y) => STEPS.map((x) => ({ x, y })));

function toValue(x: number, y: number) { return `${x}% ${y}%`; }

function fromValue(v: string) {
  const [xs, ys] = v.split(" ");
  return { x: parseInt(xs) ?? 50, y: parseInt(ys) ?? 50 };
}

export default function FocalPointPicker({
  imageUrl,
  value,
  onChange,
}: {
  imageUrl: string;
  value: string;
  onChange: (v: string) => void;
}) {
  if (!imageUrl) return null;
  const cur = fromValue(value);

  return (
    <div>
      <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">
        Punkt kadrowania
      </label>
      <div className="relative w-64 overflow-hidden rounded-sm border border-sand bg-mist" style={{ aspectRatio: "16/9" }}>
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover"
          style={{ objectPosition: value }}
          sizes="256px"
          unoptimized
        />
        {/* Siatka 5×5 klikalnych punktów */}
        <div className="absolute inset-0 grid grid-cols-5 grid-rows-5">
          {POINTS.map(({ x, y }) => {
            const active = cur.x === x && cur.y === y;
            return (
              <button
                key={`${x}-${y}`}
                type="button"
                onClick={() => onChange(toValue(x, y))}
                className="flex items-center justify-center"
                title={`Poziomo: ${x}%, pionowo: ${y}%`}
              >
                <span className={`w-2 h-2 rounded-full border transition-all duration-150 ${
                  active
                    ? "bg-terracotta border-white scale-150 shadow-md"
                    : "bg-white/50 border-white/70 hover:bg-terracotta/60 hover:scale-125"
                }`} />
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] text-charcoal/40 mt-1.5">
        Kliknij punkt, który ma pozostać widoczny przy przycinaniu.
      </p>
    </div>
  );
}
