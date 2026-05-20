import type { OrderStatus } from "@prisma/client";

const config: Record<OrderStatus, { label: string; className: string }> = {
  PENDING:     { label: "Oczekuje",    className: "bg-yellow-100 text-yellow-800" },
  CONFIRMED:   { label: "Potwierdzone", className: "bg-blue-100 text-blue-800" },
  IN_PROGRESS: { label: "W realizacji", className: "bg-purple-100 text-purple-800" },
  SHIPPED:     { label: "Wysłane",      className: "bg-indigo-100 text-indigo-800" },
  DELIVERED:   { label: "Dostarczone",  className: "bg-green-100 text-green-800" },
  CANCELLED:   { label: "Anulowane",    className: "bg-red-100 text-red-800" },
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = config[status];
  return (
    <span className={`text-xs tracking-wider uppercase px-2.5 py-1 font-medium ${className}`}>
      {label}
    </span>
  );
}
