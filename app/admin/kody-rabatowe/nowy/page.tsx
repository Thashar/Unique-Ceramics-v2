export const dynamic = "force-dynamic";

import DiscountCodeForm from "@/components/admin/DiscountCodeForm";

export default function NewDiscountCodePage() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-2">Nowy kod rabatowy</h1>
      <p className="text-sm text-charcoal/80 mb-8">
        Klient wpisuje kod przy składaniu zamówienia – rabat schodzi z cen produktów.
      </p>
      <DiscountCodeForm />
    </div>
  );
}
