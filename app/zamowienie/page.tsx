export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import CheckoutForm from "./CheckoutForm";

export default async function CheckoutPage() {
  const session = await auth();

  const settings = await getSettings([
    "payment_blik_phone",
    "payment_stripe_enabled",
    "shipping_cost",
    "shipping_free_enabled",
    "shipping_free_from",
  ]);

  let savedAddress = null;
  if (session?.user?.id) {
    try {
      const key = `user_address_${session.user.id}`;
      const rows = await db.$queryRaw<{ value: string }[]>`
        SELECT value FROM "Setting" WHERE key = ${key}
      `;
      if (rows.length > 0) savedAddress = JSON.parse(rows[0].value);
    } catch {
      // Setting table may not exist yet — address just won't be prefilled
    }
  }

  const paymentMethods = [
    {
      value: "transfer",
      label: "Przelew bankowy / BLIK",
      desc: settings.payment_blik_phone
        ? `Dane do przelewu bankowego oraz numer do przelewu BLIK otrzymasz e-mailem.`
        : "Dane do przelewu bankowego otrzymasz e-mailem po złożeniu zamówienia.",
    },
    ...(settings.payment_stripe_enabled === "true" && process.env.STRIPE_SECRET_KEY
      ? [
          {
            value: "stripe",
            label: "Karta płatnicza (Stripe)",
            desc: "Bezpieczna płatność kartą — Visa, Mastercard. Obsługiwane przez Stripe.",
          },
        ]
      : []),
  ];

  return (
    <CheckoutForm
      userEmail={session?.user?.email ?? ""}
      savedAddress={savedAddress}
      paymentMethods={paymentMethods}
      shippingCost={Number(settings.shipping_cost) || 18}
      shippingFreeEnabled={settings.shipping_free_enabled === "true"}
      shippingFreeFrom={Number(settings.shipping_free_from) || 300}
    />
  );
}
