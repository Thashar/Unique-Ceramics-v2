export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getFreeShippingPromo } from "@/lib/promos";
import FreeShippingPromoForm from "@/components/admin/FreeShippingPromoForm";

export default async function EditFreeShippingPromoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const promo = await getFreeShippingPromo(id);
  if (!promo) notFound();

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-2">{promo.name}</h1>
      <p className="text-sm text-charcoal/80 mb-8">
        Promocja darmowej wysyłki. Zmiany działają od razu – złożone zamówienia zostają bez zmian.
      </p>
      <FreeShippingPromoForm
        id={promo.id}
        initial={{
          name: promo.name,
          active: promo.active,
          minOrderValue: promo.minOrderValue,
          methods: promo.methods,
          startsAt: promo.startsAt,
          endsAt: promo.endsAt,
        }}
      />
    </div>
  );
}
