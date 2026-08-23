export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getDiscountCode } from "@/lib/discount-codes";
import DiscountCodeForm from "@/components/admin/DiscountCodeForm";

export default async function EditDiscountCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const code = await getDiscountCode(id);
  if (!code) notFound();

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-2">Kod {code.code}</h1>
      <p className="text-sm text-charcoal/80 mb-8">
        Użyty w {code.usedCount} {code.usedCount === 1 ? "zamówieniu" : "zamówieniach"}.
      </p>
      <DiscountCodeForm
        id={code.id}
        initial={{
          code: code.code,
          percent: code.percent,
          active: code.active,
          stackable: code.stackable,
          startsAt: code.startsAt,
          endsAt: code.endsAt,
        }}
      />
    </div>
  );
}
