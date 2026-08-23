import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import {
  BUNDLED_SHIPPING_KEY,
  BUNDLE_OFF,
  bundleFromSettings,
  bundleSummary,
  type BundleConfig,
} from "@/lib/bundled-shipping";
import { activeDiscountPercent, discountedPrice } from "@/lib/product-price";
import { priceOrder, type ShippingMethod } from "@/lib/discount-code";
import { findActiveCode, markCodeUsed } from "@/lib/discount-codes";
import { validateAddress, validateContact } from "@/lib/address-validation";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const PAYMENT_LABEL: Record<string, string> = {
  transfer: "Przelew bankowy",
  blik:     "BLIK",
  stripe:   "Karta (Stripe)",
};

const SHIPPING_LABEL: Record<string, string> = {
  courier:       "Kurier",
  parcel_locker: "Paczkomat InPost",
  pickup:        "Odbiór osobisty",
};

async function sendAdminNotification(params: {
  orderNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  street: string;
  city: string;
  postcode: string;
  note: string | null;
  paymentMethod: string;
  items: { name: string; price: number; quantity: number }[];
  shippingCost: number;
  total: number;
  orderId: string;
  vacationNote?: string;
  shippingMethod?: string;
  parcelLockerCode?: string | null;
  isGuest: boolean;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;

  const {
    orderNumber, firstName, lastName, email, phone,
    street, city, postcode, note, paymentMethod,
    items, shippingCost, total, orderId, vacationNote,
    shippingMethod, parcelLockerCode, isGuest,
  } = params;

  const shippingLabel = SHIPPING_LABEL[shippingMethod ?? "courier"] ?? shippingMethod ?? "Kurier";

  const rows = items
    .map((i) => `${i.name} ×${i.quantity} – ${(i.price * i.quantity).toFixed(2)} zł`)
    .join("\n");

  const adminEmail = process.env.RESEND_FROM_EMAIL?.match(/<(.+)>/)?.[1]
    ?? "kontakt@uniqueceramics.pl";

  const baseUrl = process.env.AUTH_URL ?? "https://uniqueceramics.pl";

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Unique Ceramics <onboarding@resend.dev>",
      to: adminEmail,
      subject: `🛒 Nowe zamówienie #${orderNumber} – ${firstName} ${lastName} – ${total.toFixed(2)} zł`,
      text: [
        `Nowe zamówienie #${orderNumber}`,
        ...(vacationNote ? [``, `⚠️ URLOP: ${vacationNote}`] : []),
        ``,
        `Klient: ${firstName} ${lastName}${isGuest ? " (zamówienie bez konta)" : " (konto w sklepie)"}`,
        `E-mail: ${email}`,
        `Telefon: ${phone || "–"}`,
        `Adres: ${
          shippingMethod === "pickup"
            ? "Odbiór osobisty"
            : shippingMethod === "parcel_locker"
              ? `Paczkomat ${parcelLockerCode ?? "–"}`
              : `${street}, ${postcode} ${city}`
        }`,
        ``,
        `Metoda wysyłki: ${shippingLabel}${shippingMethod === "parcel_locker" && parcelLockerCode ? ` (${parcelLockerCode})` : ""}`,
        `Płatność: ${PAYMENT_LABEL[paymentMethod] ?? paymentMethod}`,
        ``,
        `Zamówione produkty:`,
        rows,
        ``,
        `Wysyłka: ${shippingCost === 0 ? "Gratis" : `${shippingCost.toFixed(2)} zł`}`,
        `Do zapłaty: ${total.toFixed(2)} zł`,
        note ? `\nUwagi klienta: ${note}` : "",
        ``,
        `Panel admina: ${baseUrl}/admin/zamowienia/${orderId}`,
      ].join("\n"),
    });
  } catch {
    // Nie blokuj zamówienia jeśli email nie dotarł
  }
}

// Wspólny e-mail potwierdzający zamówienie dla klienta. Przy przelewie zawiera
// dane do wpłaty, przy płatności kartą – informację o płatności Stripe.
// Wysyłany niezależnie od metody, bo dla gościa jest to jedyny ślad zamówienia.
function buildOrderEmail(params: {
  orderNumber: string;
  firstName: string;
  paymentMethod: "transfer" | "stripe";
  items: { name: string; price: number; quantity: number; lineTotal?: number }[];
  shippingCost: number;
  /** Promocja „Wielosztuki” – zamiast kwoty wysyłki pokazujemy „Darmowa wysyłka”. */
  freeShipping?: boolean;
  /** Użyty kod rabatowy – kwota jest już w cenach pozycji, wiersz jest informacyjny. */
  discountCode?: { code: string; percent: number; amount: number } | null;
  total: number;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  transferTitle?: string;
  blikPhone?: string;
  vacationNote?: string;
  shippingMethod?: string;
  parcelLockerCode?: string | null;
  orderUrl: string;
  isGuest: boolean;
}): string {
  const {
    orderNumber,
    firstName,
    paymentMethod,
    items,
    shippingCost,
    freeShipping,
    discountCode,
    total,
    bankAccountName,
    bankAccountNumber,
    bankName,
    transferTitle,
    blikPhone,
    vacationNote,
    shippingMethod,
    parcelLockerCode,
    orderUrl,
    isGuest,
  } = params;

  const isTransfer = paymentMethod === "transfer";

  const shippingLabel = SHIPPING_LABEL[shippingMethod ?? "courier"] ?? "Kurier";
  const shippingInfo = shippingMethod === "parcel_locker" && parcelLockerCode
    ? `${shippingLabel} – paczkomat <strong style="font-family:monospace;">${parcelLockerCode}</strong>`
    : shippingLabel;

  const itemsHtml = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e0d6;">${i.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e0d6;text-align:center;">×${i.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e0d6;text-align:right;">${(i.lineTotal ?? i.price * i.quantity).toFixed(2).replace(".", ",")} zł</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;">
    <div style="background:#3d2b1f;padding:32px 40px;">
      <p style="color:#c8a882;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 8px;">Unique Ceramics</p>
      <h1 style="color:#f5f0eb;font-size:24px;margin:0;font-weight:normal;">Dziękuję za zamówienie!</h1>
    </div>
    <div style="padding:32px 40px;">
      <p style="color:#4a3728;font-size:15px;margin:0 0 24px;">Cześć ${firstName},</p>
      <p style="color:#6b5748;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Twoje zamówienie <strong style="color:#3d2b1f;">#${orderNumber}</strong> zostało przyjęte.
        ${isTransfer
          ? "Aby je zrealizować, prosimy o dokonanie przelewu na poniższe dane:"
          : "Płatność kartą realizujemy przez Stripe – potwierdzenie transakcji otrzymasz od operatora płatności."}
      </p>
      ${vacationNote ? `
      <div style="background:#fff8f0;border-left:3px solid #c87941;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#6b5748;letter-spacing:0.15em;text-transform:uppercase;">Informacja o realizacji</p>
        <p style="margin:0;font-size:14px;color:#7a4a1e;line-height:1.5;">${vacationNote}</p>
      </div>` : ""}

      <div style="background:#f5f0eb;padding:12px 24px;margin:0 0 20px;font-size:13px;color:#4a3728;">
        <span style="color:#6b5748;font-family:Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Metoda wysyłki: </span>
        ${shippingInfo}
      </div>

      ${isTransfer ? `
      <div style="background:#f5f0eb;border-left:3px solid #c87941;padding:20px 24px;margin:0 0 ${blikPhone ? "16px" : "28px"};">
        <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;color:#6b5748;letter-spacing:0.15em;text-transform:uppercase;">Przelew bankowy</p>
        ${bankAccountName ? `<p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Odbiorca:</strong> ${bankAccountName}</p>` : ""}
        ${bankAccountNumber ? `<p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Numer konta:</strong> <span style="font-family:monospace;">${bankAccountNumber}</span></p>` : ""}
        ${bankName ? `<p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Bank:</strong> ${bankName}</p>` : ""}
        <p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Kwota:</strong> ${total.toFixed(2).replace(".", ",")} zł</p>
        <p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Tytuł przelewu:</strong> ${transferTitle} #${orderNumber}</p>
      </div>` : `
      <div style="background:#f5f0eb;border-left:3px solid #c87941;padding:20px 24px;margin:0 0 28px;">
        <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;color:#6b5748;letter-spacing:0.15em;text-transform:uppercase;">Płatność kartą</p>
        <p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Kwota:</strong> ${total.toFixed(2).replace(".", ",")} zł</p>
        <p style="margin:8px 0 0;font-size:12px;color:#6b5748;line-height:1.6;">
          Jeśli płatność nie została dokończona, możesz ją ponowić przyciskiem „Podgląd zamówienia” poniżej.
        </p>
      </div>`}
      ${isTransfer && blikPhone ? `
      <div style="background:#f5f0eb;border-left:3px solid #c87941;padding:20px 24px;margin:0 0 28px;">
        <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;color:#6b5748;letter-spacing:0.15em;text-transform:uppercase;">Przelew BLIK na telefon</p>
        <p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Numer telefonu:</strong> <span style="font-family:monospace;">${blikPhone}</span></p>
        <p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Kwota:</strong> ${total.toFixed(2).replace(".", ",")} zł</p>
        <p style="margin:8px 0 0;font-size:12px;color:#6b5748;">W tytule przelewu BLIK wpisz: ${transferTitle} #${orderNumber}</p>
      </div>` : ""}

      <table style="width:100%;border-collapse:collapse;margin:0 0 8px;font-size:14px;color:#4a3728;">
        <thead>
          <tr style="background:#f5f0eb;">
            <th style="padding:8px 12px;text-align:left;font-weight:normal;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#6b5748;">Produkt</th>
            <th style="padding:8px 12px;text-align:center;font-weight:normal;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#6b5748;">Ilość</th>
            <th style="padding:8px 12px;text-align:right;font-weight:normal;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#6b5748;">Cena</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <table style="width:100%;font-size:14px;color:#4a3728;">
        ${discountCode ? `
        <tr>
          <td style="padding:6px 12px;text-align:right;color:#6b5748;">Kod rabatowy ${discountCode.code} (−${discountCode.percent}%)</td>
          <td style="padding:6px 12px;text-align:right;width:120px;color:#2f6f3e;">−${discountCode.amount.toFixed(2).replace(".", ",")} zł</td>
        </tr>` : ""}
        <tr>
          <td style="padding:6px 12px;text-align:right;color:#6b5748;">${shippingMethod === "pickup" ? "Odbiór osobisty" : "Wysyłka"}</td>
          <td style="padding:6px 12px;text-align:right;width:120px;">${shippingMethod === "pickup" ? "Bezpłatnie" : freeShipping ? "Darmowa wysyłka" : shippingCost === 0 ? "Gratis" : `${shippingCost.toFixed(2).replace(".", ",")} zł`}</td>
        </tr>
        <tr style="border-top:2px solid #e8e0d6;">
          <td style="padding:10px 12px;text-align:right;font-size:16px;color:#3d2b1f;">Razem</td>
          <td style="padding:10px 12px;text-align:right;font-size:16px;color:#3d2b1f;font-weight:bold;">${total.toFixed(2).replace(".", ",")} zł</td>
        </tr>
      </table>

      <div style="background:#fff8f0;border-left:3px solid #e07b39;padding:14px 20px;margin:28px 0 0;">
        <p style="margin:0;font-size:13px;color:#7a4a1e;line-height:1.6;">
          Prosimy o dokonanie płatności w ciągu <strong>${isTransfer ? "48 godzin" : "24 godzin"}</strong>.
          Po upływie tego czasu zamówienie zostanie automatycznie anulowane, a zarezerwowane produkty wrócą do sprzedaży.
        </p>
      </div>

      <div style="text-align:center;margin:28px 0 0;">
        <a href="${orderUrl}" style="display:inline-block;background:#755F44;color:#faf8f5;text-decoration:none;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;padding:14px 28px;">
          Podgląd zamówienia
        </a>
        ${isGuest ? `
        <p style="margin:12px 0 0;font-size:12px;color:#6b5748;line-height:1.6;">
          Zamówienie złożono bez zakładania konta – zachowaj tego e-maila, to jedyny dostęp do podglądu zamówienia.
        </p>` : ""}
      </div>
    </div>
    <div style="background:#f5f0eb;padding:20px 40px;text-align:center;">
      <p style="color:#6b5748;font-size:12px;margin:0;">© ${new Date().getFullYear()} Unique Ceramics · ręcznie tworzone z sercem</p>
    </div>
  </div>
</body>
</html>`;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  if (await isRateLimited(getClientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: "Zbyt wiele żądań. Spróbuj za chwilę." }, { status: 429 });
  }

  const session = await auth();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane żądania" }, { status: 400 });
  }

  // Zablokuj zalogowanych użytkowników bez kompletnego adresu dostawy.
  // Dotyczy **tylko kuriera** – paczkomat idzie na kod maszyny, a odbiór
  // osobisty odbywa się w pracowni, więc adres nie jest tam do niczego potrzebny
  if (session?.user?.id && String(body.shippingMethod ?? "courier") === "courier") {
    let savedAddress: Record<string, string> | null = null;
    try {
      const key = `user_address_${session.user.id}`;
      const rows = await db.$queryRaw<{ value: string }[]>`
        SELECT value FROM "Setting" WHERE key = ${key}
      `;
      if (rows.length > 0) savedAddress = JSON.parse(rows[0].value);
    } catch { /* ignoruj błąd DB */ }

    const ok = savedAddress
      ? validateAddress({
          firstName: savedAddress.firstName ?? "",
          lastName:  savedAddress.lastName  ?? "",
          street:    savedAddress.street    ?? "",
          postcode:  savedAddress.postcode  ?? "",
          city:      savedAddress.city      ?? "",
        }).valid
      : false;

    if (!ok) {
      return NextResponse.json(
        { error: "Uzupełnij adres dostawy w panelu konta przed złożeniem zamówienia." },
        { status: 400 }
      );
    }
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    street,
    city,
    postcode,
    note,
    paymentMethod,
    shippingMethod,
    parcelLockerCode,
    acceptTerms,
    items,
  } = body;

  // Zamówienie bez konta – akceptacja regulaminu składana jest przy zamówieniu
  // (zalogowany użytkownik zaakceptował go przy rejestracji)
  if (!session?.user?.id && acceptTerms !== true) {
    return NextResponse.json(
      { error: "Zaakceptuj regulamin i politykę prywatności" },
      { status: 400 }
    );
  }

  const ALLOWED_SHIPPING_METHODS = ["courier", "parcel_locker", "pickup"];
  if (!ALLOWED_SHIPPING_METHODS.includes(shippingMethod)) {
    return NextResponse.json({ error: "Nieprawidłowa metoda wysyłki" }, { status: 400 });
  }

  if (shippingMethod === "parcel_locker" && !String(parcelLockerCode ?? "").trim()) {
    return NextResponse.json({ error: "Brak kodu paczkomatu" }, { status: 400 });
  }

  // Walidacja wymaganych pól
  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !paymentMethod) {
    return NextResponse.json({ error: "Brakuje wymaganych pól" }, { status: 400 });
  }

  // Adres jest potrzebny tylko przy kurierze (patrz wyżej)
  const addressRequired = shippingMethod === "courier";

  if (addressRequired && (!street?.trim() || !city?.trim() || !postcode?.trim())) {
    return NextResponse.json({ error: "Brakuje wymaganych pól adresu" }, { status: 400 });
  }

  // Telefon jest niezbędny do doręczenia (kurier dzwoni, InPost wysyła SMS)
  if (shippingMethod !== "pickup" && !phone?.trim()) {
    return NextResponse.json({ error: "Telefon jest wymagany przy wysyłce" }, { status: 400 });
  }

  const ALLOWED_PAYMENT_METHODS = ["transfer", "stripe"];
  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    return NextResponse.json({ error: "Nieprawidłowa metoda płatności" }, { status: 400 });
  }

  if (!validateEmail(email)) {
    return NextResponse.json({ error: "Nieprawidłowy adres e-mail" }, { status: 400 });
  }

  const contactValidation = addressRequired
    ? validateAddress({ firstName, lastName, phone, street, postcode, city })
    : validateContact({ firstName, lastName, phone });
  if (!contactValidation.valid) {
    const firstError = Object.values(contactValidation.errors)[0];
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  if (!items?.length) {
    return NextResponse.json({ error: "Pusty koszyk" }, { status: 400 });
  }

  // Weryfikacja produktów i przeliczenie kwoty po stronie serwera
  const productIds: string[] = items.map((i: { productId: string }) => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, active: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items as { productId: string; quantity: number }[]) {
    if (!item.productId || typeof item.quantity !== "number" || item.quantity < 1) {
      return NextResponse.json({ error: "Nieprawidłowe dane produktu" }, { status: 400 });
    }
    const product = productMap.get(item.productId);
    if (!product) {
      return NextResponse.json({ error: "Produkt nie istnieje lub jest niedostępny" }, { status: 400 });
    }
    if (product.stock < item.quantity) {
      return NextResponse.json(
        { error: `Niewystarczający stan magazynowy dla: ${product.name}` },
        { status: 400 }
      );
    }
  }

  // Kwoty liczone po stronie serwera – nie ufamy wartościom z klienta
  const shippingSettings = await getSettings([
    "shipping_cost",
    "shipping_cost_parcel_locker",
    "shipping_free_enabled",
    "shipping_free_from",
    "vacation_enabled",
    "vacation_end_date",
    "vacation_message",
    BUNDLED_SHIPPING_KEY,
  ]);
  const shippingCostCourier = Number(shippingSettings.shipping_cost) || 18;
  const shippingCostParcel = Number(shippingSettings.shipping_cost_parcel_locker) || 18;

  // Urlop – wylicz notatkę raz, użyj w obu mailach
  let vacationNote: string | undefined;
  if (shippingSettings.vacation_enabled === "true") {
    const customMsg = shippingSettings.vacation_message;
    const endDate = shippingSettings.vacation_end_date;
    if (customMsg) {
      vacationNote = customMsg;
    } else if (endDate) {
      try {
        const formatted = new Date(endDate + "T00:00:00").toLocaleDateString("pl-PL", {
          day: "numeric", month: "long", year: "numeric",
        });
        vacationNote = `Zamówienie zostanie zrealizowane po powrocie z urlopu (od ${formatted}).`;
      } catch {
        vacationNote = "Zamówienie zostanie zrealizowane po powrocie z urlopu.";
      }
    } else {
      vacationNote = "Zamówienie zostanie zrealizowane po powrocie z urlopu.";
    }
  }
  const freeEnabled = shippingSettings.shipping_free_enabled === "true";
  const freeFrom = Number(shippingSettings.shipping_free_from) || 300;

  const typedItems = items as { productId: string; quantity: number }[];

  // Promocja „Wielosztuki”: narzut na wysyłkę jest już w cenach katalogowych,
  // więc próg darmowej wysyłki nie działa – inaczej klient zapłaciłby mniej,
  // niż pokazywał koszyk
  const bundle = bundleFromSettings(shippingSettings);

  // Kod rabatowy sprawdzamy w bazie – z żądania bierzemy samą nazwę.
  // Nieznany, wyłączony albo wygasły kod po prostu nie wchodzi (bez błędu:
  // klient ma dostać zamówienie, a nie komunikat po kliknięciu „Zamawiam”)
  const requestedCode = await findActiveCode(body.discountCode);

  // Ceny pozycji: rabat produktowy schodzi z ceny bazowej, `basePrice` zostaje
  // ceną sprzed przeceny – potrzebuje jej wariant „sam kod rabatowy”
  const pricedItems = typedItems.map((item) => {
    const product = productMap.get(item.productId)!;
    return {
      productId: item.productId,
      quantity: item.quantity,
      price: discountedPrice(product.price, activeDiscountPercent(product)),
      basePrice: product.price,
    };
  });

  // Jedno miejsce liczy całą kwotę: przeceny produktów, „Wielosztuki” i kod
  // (łączony albo – przy niełączonym – korzystniejszy z dwóch wariantów)
  const pricing = priceOrder({
    items: pricedItems,
    bundle,
    code: requestedCode,
    shipping: {
      method: shippingMethod as ShippingMethod,
      courier: shippingCostCourier,
      parcelLocker: shippingCostParcel,
      freeEnabled,
      freeFrom,
    },
  });

  const unitPrice = new Map(pricing.items.map((l) => [l.item.productId, l.unitPrice]));
  const shippingCost = pricing.shippingCost;
  const total = pricing.total;
  const appliedCode = pricing.appliedCode;
  const codeDiscount = pricing.codeDiscount;

  // Atomowo: dekrementacja magazynu + utworzenie zamówienia.
  // Warunek stock >= quantity wykrywa wyścig równoległych zakupów –
  // przy braku stanu cała transakcja jest wycofywana.
  const OUT_OF_STOCK = "OUT_OF_STOCK";
  let order;
  try {
    order = await db.$transaction(async (tx) => {
      for (const item of typedItems) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error(`${OUT_OF_STOCK}:${productMap.get(item.productId)!.name}`);
        }
      }

      return tx.order.create({
        data: {
          userId: session?.user?.id ?? null,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone?.trim() || null,
          // Paczkomat nie ma adresu – w polu ulicy zostaje kod maszyny,
          // żeby zestawienia i raporty nie pokazywały pustego wiersza
          street: shippingMethod === "parcel_locker"
            ? `Paczkomat ${String(parcelLockerCode ?? "").trim()}`
            : String(street ?? "").trim(),
          city: String(city ?? "").trim(),
          postcode: String(postcode ?? "").trim(),
          country: "PL",
          note: note?.trim() || null,
          paymentMethod,
          shippingCost,
          total,
          // Kwota kodu jest już wliczona w ceny pozycji – pola są śladem do zestawień
          discountCode: appliedCode?.code ?? null,
          discountAmount: codeDiscount > 0 ? codeDiscount : null,
          shippingMethod: shippingMethod ?? "courier",
          parcelLockerCode: shippingMethod === "parcel_locker" ? String(parcelLockerCode ?? "").trim() : null,
          items: {
            create: typedItems.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: item.productId,
                name: product.name,
                price: unitPrice.get(item.productId)!,
                quantity: item.quantity,
              };
            }),
          },
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith(OUT_OF_STOCK)) {
      const name = e.message.slice(OUT_OF_STOCK.length + 1);
      return NextResponse.json(
        { error: `Niewystarczający stan magazynowy dla: ${name}` },
        { status: 409 }
      );
    }
    console.error("[checkout] order create error:", e);
    return NextResponse.json({ error: "Błąd tworzenia zamówienia" }, { status: 500 });
  }

  // Powiadomienie dla właściciela sklepu – używamy zweryfikowanych danych z serwera
  const orderNumber = order.id.slice(-8).toUpperCase();
  const isGuest = !session?.user?.id;
  const appUrl = process.env.AUTH_URL ?? "https://uniqueceramics.pl";
  // Gość nie ma panelu konta – linkiem do zamówienia jest strona potwierdzenia
  // (id zamówienia pełni rolę tokenu dostępu, tak jak w /zamowienie/potwierdzenie)
  const orderUrl = isGuest
    ? `${appUrl}/zamowienie/potwierdzenie?id=${order.id}`
    : `${appUrl}/konto/zamowienia/${order.id}`;
  const verifiedItems = typedItems.map((item) => {
    const product = productMap.get(item.productId)!;
    return {
      name: product.name,
      price: unitPrice.get(item.productId)!,
      quantity: item.quantity,
    };
  });
  // Rozbicie pokazywane KLIENTOWI (e-mail, Stripe). W promocji „Wielosztuki”
  // narzut na wysyłkę siedzi w cenach pozycji, a wiersz wysyłki mówi tylko
  // „Darmowa wysyłka” – tak samo jak koszyk i strona zamówienia. Powiadomienie
  // dla właściciela zostaje na kwotach z bazy (ceny bazowe + wysyłka osobno).
  const customerBundle: BundleConfig =
    pricing.bundle.enabled && shippingCost > 0
      ? { enabled: true, surcharge: shippingCost }
      : BUNDLE_OFF;
  const customerLines = bundleSummary(verifiedItems, customerBundle).lines;
  const customerItems = customerLines.map((l) => ({
    name: l.item.name,
    price: l.unitPrice,
    quantity: l.item.quantity,
    lineTotal: l.lineTotal,
  }));

  // Licznik użyć kodu – informacyjny, więc bez await i bez wpływu na zamówienie
  if (appliedCode) void markCodeUsed(appliedCode.code);

  void sendAdminNotification({
    orderNumber, firstName, lastName, email, phone: phone?.trim() || null,
    street, city, postcode, note: note?.trim() || null, paymentMethod,
    items: verifiedItems, shippingCost, total, orderId: order.id, vacationNote,
    isGuest,
    shippingMethod: shippingMethod ?? "courier",
    parcelLockerCode: shippingMethod === "parcel_locker" ? String(parcelLockerCode ?? "").trim() : null,
  });

  // E-mail potwierdzający dla klienta – wysyłany przy obu metodach płatności.
  // Dla zamówienia bez konta jest jedynym potwierdzeniem i jedynym linkiem do zamówienia.
  async function sendCustomerEmail() {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) return;
    try {
      const bankSettings = paymentMethod === "transfer"
        ? await getSettings([
            "payment_bank_account_name",
            "payment_bank_account_number",
            "payment_bank_name",
            "payment_bank_transfer_title",
            "payment_blik_enabled",
            "payment_blik_phone",
          ])
        : null;

      const { Resend } = await import("resend");
      const resend = new Resend(resendApiKey);

      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ??
          "Unique Ceramics <onboarding@resend.dev>",
        to: email,
        subject: bankSettings
          ? `Zamówienie #${orderNumber} – dane do przelewu`
          : `Zamówienie #${orderNumber} – potwierdzenie`,
        html: buildOrderEmail({
          orderNumber,
          firstName,
          paymentMethod: paymentMethod === "stripe" ? "stripe" : "transfer",
          items: customerItems,
          shippingCost,
          freeShipping: customerBundle.enabled,
          discountCode: appliedCode && codeDiscount > 0
            ? { code: appliedCode.code, percent: appliedCode.percent, amount: codeDiscount }
            : null,
          total,
          bankAccountName: bankSettings?.payment_bank_account_name,
          bankAccountNumber: bankSettings?.payment_bank_account_number,
          bankName: bankSettings?.payment_bank_name,
          transferTitle: bankSettings?.payment_bank_transfer_title || "Zamówienie",
          blikPhone: bankSettings?.payment_blik_enabled === "true"
            ? (bankSettings.payment_blik_phone || undefined)
            : undefined,
          vacationNote,
          shippingMethod: shippingMethod ?? "courier",
          parcelLockerCode: shippingMethod === "parcel_locker" ? String(parcelLockerCode ?? "").trim() : null,
          orderUrl,
          isGuest,
        }),
      });
    } catch {
      // Błąd wysyłki nie blokuje zamówienia
    }
  }

  // Stripe – create Checkout session and redirect
  if (paymentMethod === "stripe") {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe nie jest skonfigurowany" }, { status: 500 });
    }
    const stripe = new Stripe(stripeKey);
    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

    // Domyślnie: pozycje po cenach z zamówienia + osobny wiersz wysyłki.
    const plainLineItems = [
      ...verifiedItems.map((item) => ({
        price_data: {
          currency: "pln",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      ...(shippingCost > 0
        ? [{
            price_data: {
              currency: "pln",
              product_data: { name: "Wysyłka" },
              unit_amount: Math.round(shippingCost * 100),
            },
            quantity: 1,
          }]
        : []),
    ];

    // W promocji „Wielosztuki” u operatora płatności też nie może pojawić się
    // kwota wysyłki – narzut jest w cenach pozycji. Reszta z zaokrągleń idzie
    // na jedną sztukę (Stripe nie przyjmuje ujemnych pozycji), a gdyby suma
    // mimo wszystko nie trafiła w kwotę zamówienia, wracamy do rozbicia
    // z osobną wysyłką – klient nie może zapłacić innej kwoty niż zamówił.
    let stripeLineItems = plainLineItems;
    if (customerBundle.enabled) {
      const bundled = customerLines.flatMap((l) => {
        const unit = Math.round(l.unitPrice * 100);
        const lineGr = Math.round(l.lineTotal * 100);
        const rest = lineGr - unit * l.item.quantity;
        const line = (amount: number, quantity: number) => ({
          price_data: {
            currency: "pln",
            product_data: { name: l.item.name },
            unit_amount: amount,
          },
          quantity,
        });
        if (rest === 0) return [line(unit, l.item.quantity)];
        return [line(unit, l.item.quantity - 1), line(unit + rest, 1)].filter(
          (e) => e.quantity > 0
        );
      });
      const sum = bundled.reduce((acc, e) => acc + e.price_data.unit_amount * e.quantity, 0);
      if (sum === Math.round(total * 100)) stripeLineItems = bundled;
      else console.error("[checkout] rozbicie Stripe nie zgadza się z kwotą zamówienia");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: stripeLineItems,
      metadata: { orderId: order.id },
      success_url: `${baseUrl}/zamowienie/potwierdzenie?id=${order.id}`,
      // Porzucona płatność wraca na potwierdzenie z flagą – koszyk jest już
      // wyczyszczony, a zamówienie czeka na wpłatę; stamtąd można ją ponowić
      cancel_url: `${baseUrl}/zamowienie/potwierdzenie?id=${order.id}&platnosc=anulowana`,
    });

    // Czekamy na wysyłkę – dla gościa ten e-mail jest jedynym śladem zamówienia,
    // a po zwróceniu odpowiedzi funkcja serverless może zostać uśpiona
    await sendCustomerEmail();

    return NextResponse.json({ orderId: order.id, stripeUrl: session.url });
  }

  await sendCustomerEmail();

  return NextResponse.json({ orderId: order.id });
}
