import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import CheckoutForm from "./CheckoutForm";

export default async function CheckoutPage() {
  const session = await auth();

  const settings = await getSettings([
    "payment_blik_enabled",
    "payment_blik_phone",
    "payment_przelewy24_enabled",
    "payment_payu_enabled",
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
      label: "Przelew bankowy",
      desc: "Dane do przelewu otrzymasz e-mailem po złożeniu zamówienia.",
    },
    ...(settings.payment_blik_enabled === "true"
      ? [
          {
            value: "blik",
            label: "BLIK",
            desc: settings.payment_blik_phone
              ? `Wyślemy Ci kod BLIK na numer ${settings.payment_blik_phone}.`
              : "Numer BLIK zostanie podany po złożeniu zamówienia.",
          },
        ]
      : []),
    ...(settings.payment_przelewy24_enabled === "true"
      ? [
          {
            value: "przelewy24",
            label: "Przelewy24",
            desc: "Szybka płatność online przez Przelewy24.",
          },
        ]
      : []),
    ...(settings.payment_payu_enabled === "true"
      ? [
          {
            value: "payu",
            label: "PayU",
            desc: "Szybka płatność online przez PayU.",
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
