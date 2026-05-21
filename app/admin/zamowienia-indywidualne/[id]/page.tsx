export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail } from "lucide-react";
import CustomOrderActions from "@/components/admin/CustomOrderActions";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-yellow-100 text-yellow-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nowe",
  IN_REVIEW: "W trakcie",
  DONE: "Zrealizowane",
  CANCELLED: "Anulowane",
};

export default async function AdminCustomOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await db.customOrder.findUnique({ where: { id } });
  if (!order) notFound();

  const mailSubject = encodeURIComponent(`Odpowiedź na zamówienie indywidualne — ${order.orderType}`);

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/zamowienia-indywidualne"
        className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        Zamówienia indywidualne
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-espresso">Zamówienie indywidualne</h1>
          <p className="text-xs font-mono text-charcoal/40 mt-1">{order.id}</p>
        </div>
        <span
          className={`text-[10px] tracking-widest uppercase px-3 py-1.5 ${STATUS_COLORS[order.status] ?? "bg-sand text-charcoal"}`}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-cream p-6">
          <h2 className="text-xs tracking-widest uppercase text-charcoal/50 mb-4">Klient</h2>
          <p className="text-sm font-medium text-espresso">{order.customerName}</p>
          <p className="text-sm text-charcoal/60 mt-1">{order.customerEmail}</p>
          {order.customerPhone && (
            <p className="text-sm text-charcoal/60 mt-0.5">{order.customerPhone}</p>
          )}
          <a
            href={`mailto:${order.customerEmail}?subject=${mailSubject}`}
            className="inline-flex items-center gap-2 mt-4 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors"
          >
            <Mail size={13} strokeWidth={1.5} />
            Odpowiedz e-mailem
          </a>
        </div>

        <div className="bg-cream p-6">
          <h2 className="text-xs tracking-widest uppercase text-charcoal/50 mb-4">Szczegóły</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-charcoal/50 text-xs">Rodzaj:</span>
              <p className="text-espresso">{order.orderType}</p>
            </div>
            {order.budget && (
              <div>
                <span className="text-charcoal/50 text-xs">Budżet:</span>
                <p className="text-espresso">{order.budget}</p>
              </div>
            )}
            {order.deadline && (
              <div>
                <span className="text-charcoal/50 text-xs">Termin:</span>
                <p className="text-espresso">{order.deadline}</p>
              </div>
            )}
            <div>
              <span className="text-charcoal/50 text-xs">Data zgłoszenia:</span>
              <p className="text-espresso">
                {new Date(order.createdAt).toLocaleDateString("pl-PL", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-cream p-6 mb-6">
        <h2 className="text-xs tracking-widest uppercase text-charcoal/50 mb-4">Opis zamówienia</h2>
        <p className="text-sm text-charcoal/80 leading-relaxed whitespace-pre-wrap">{order.description}</p>
      </div>

      <CustomOrderActions
        orderId={order.id}
        currentStatus={order.status}
        currentNotes={order.adminNotes}
      />
    </div>
  );
}
