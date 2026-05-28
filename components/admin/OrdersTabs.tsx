"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const STATUSES = [
  { value: "",            label: "Wszystkie" },
  { value: "PENDING",     label: "Nowe" },
  { value: "CONFIRMED",   label: "Potwierdzone" },
  { value: "IN_PROGRESS", label: "W realizacji" },
  { value: "SHIPPED",     label: "Wysłane" },
  { value: "DELIVERED",   label: "Dostarczone" },
  { value: "CANCELLED",   label: "Anulowane" },
];

export default function OrdersTabs({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "";

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  function navigate(status: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1 mb-5 bg-cream p-1.5">
      {STATUSES.map(({ value, label }) => {
        const count = value ? (counts[value] ?? 0) : total;
        const active = current === value;
        return (
          <button
            key={value}
            onClick={() => navigate(value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-wide transition-colors rounded-sm ${
              active
                ? "bg-espresso text-cream"
                : "text-charcoal/55 hover:text-espresso hover:bg-sand/40"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-sm ${
                active ? "bg-white/15 text-cream" : "bg-sand text-charcoal/50"
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
