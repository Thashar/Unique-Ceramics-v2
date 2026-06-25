export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require("pdfkit") as typeof import("pdfkit");

// ── Stałe ─────────────────────────────────────────────────────────────────────

const MONTHS_PL = [
  "Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
  "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień",
];

const SHIPPING_LABELS: Record<string, string> = {
  courier:       "Kurier",
  parcel_locker: "Paczkomat",
  pickup:        "Odbiór os.",
};

const PAYMENT_LABELS: Record<string, string> = {
  transfer: "Przelew",
  stripe:   "Karta",
  blik:     "BLIK",
};

// ── Cache czcionek (trwa przez cały cykl życia instancji) ─────────────────────

let cachedRegular: Buffer | null = null;
let cachedBold:    Buffer | null = null;
let fontsFailed = false;

async function loadFonts(): Promise<{ regular: Buffer; bold: Buffer } | null> {
  if (cachedRegular && cachedBold) return { regular: cachedRegular, bold: cachedBold };
  if (fontsFailed) return null;
  try {
    const [rr, rb] = await Promise.allSettled([
      fetch("https://github.com/google/fonts/raw/main/ofl/lato/Lato-Regular.ttf"),
      fetch("https://github.com/google/fonts/raw/main/ofl/lato/Lato-Bold.ttf"),
    ]);
    if (
      rr.status === "fulfilled" && rr.value.ok &&
      rb.status === "fulfilled" && rb.value.ok
    ) {
      cachedRegular = Buffer.from(await rr.value.arrayBuffer());
      cachedBold    = Buffer.from(await rb.value.arrayBuffer());
      return { regular: cachedRegular, bold: cachedBold };
    }
  } catch { /* ignoruj — fallback do Helvetica */ }
  fontsFailed = true;
  return null;
}

// ── Formatowanie ──────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return n.toFixed(2).replace(".", ",") + " zł";
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return new Response("Brak dostępu", { status: 403 });
  }

  const { year, month } = await params;
  const yr = parseInt(year,  10);
  const mo = parseInt(month, 10);

  if (isNaN(yr) || isNaN(mo) || mo < 1 || mo > 12 || yr < 2020 || yr > 2100) {
    return new Response("Nieprawidłowy okres", { status: 400 });
  }

  const periodStart = new Date(yr, mo - 1, 1);
  const periodEnd   = new Date(yr, mo,     1);

  // Zamówienia sklepowe — tylko opłacone (PAID). Przychód rozpoznawany wg daty
  // wpłaty (paidAt → createdAt jako fallback dla starych zamówień bez paidAt).
  // COALESCE niewyrażalny w Prisma where — filtrujemy po stronie aplikacji.
  const ordersQuery = db.order.findMany({
    where: {
      status:        { not: "CANCELLED" },
      paymentStatus: "PAID",
    },
    include: { items: true },
  });

  // Zamówienia indywidualne — statusy PAID lub DONE, z podaną ceną
  const customOrdersQuery = db.customOrder.findMany({
    where: {
      status:    { in: ["PAID", "DONE"] },
      price:     { not: null },
      createdAt: { gte: periodStart, lt: periodEnd },
    },
    orderBy: { createdAt: "asc" },
  });

  let allPaidOrders: Awaited<typeof ordersQuery>;
  let customOrders: Awaited<typeof customOrdersQuery>;
  try {
    [allPaidOrders, customOrders] = await Promise.all([ordersQuery, customOrdersQuery]);
  } catch {
    return new Response("Błąd bazy danych", { status: 500 });
  }

  // Data rozpoznania przychodu i filtr do bieżącego miesiąca
  const recognitionDate = (o: { paidAt: Date | null; createdAt: Date }) =>
    o.paidAt ?? o.createdAt;

  const orders = allPaidOrders
    .filter((o) => {
      const r = recognitionDate(o);
      return r >= periodStart && r < periodEnd;
    })
    .sort((a, b) => recognitionDate(a).getTime() - recognitionDate(b).getTime());

  // ── Sumy sklepowych ───────────────────────────────────────────────────────────

  const shopRevenue   = orders.reduce((s, o) => s + o.total,        0);
  const shopShipping  = orders.reduce((s, o) => s + o.shippingCost, 0);
  const shopProducts  = shopRevenue - shopShipping;

  // ── Sumy indywidualnych ───────────────────────────────────────────────────────

  const customRevenue  = customOrders.reduce((s, o) => s + (o.price        ?? 0), 0);
  const customShipping = customOrders.reduce((s, o) => s + (o.shippingCost ?? 0), 0);

  // ── Łącznie ───────────────────────────────────────────────────────────────────

  const totalCount    = orders.length + customOrders.length;
  const totalRevenue  = shopRevenue  + customRevenue + customShipping;
  const totalShipping = shopShipping + customShipping;
  const totalProducts = shopProducts + customRevenue;

  // ── Podatek dochodowy (PIT) ─────────────────────────────────────────────────
  // Podstawa opodatkowania = przychód z produktów. Wysyłka jest kosztem uzyskania
  // przychodu (przychód z wysyłki ≈ koszt nadania), więc nie podlega opodatkowaniu.
  // Stawka 12% (domyślnie) lub 32% — gdy w panelu analityki zaznaczono podwyższoną
  // stawkę dla danego miesiąca (klucz Setting: tax_high_{rok}_{miesiac}).
  const taxHigh = (await getSetting(`tax_high_${yr}_${mo}`).catch(() => "false")) === "true";
  const taxRate = taxHigh ? 0.32 : 0.12;
  const taxBase = Math.round(totalProducts * 100) / 100;
  const taxDue  = Math.round(taxBase * taxRate * 100) / 100;

  // ── PDF ───────────────────────────────────────────────────────────────────────

  const fonts = await loadFonts();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new (PDFDocument as any)({
    size:    "A4",
    layout:  "landscape",
    margins: { top: 35, bottom: 42, left: 35, right: 35 },
    bufferPages: true,
    info: {
      Title:   `Raport – ${MONTHS_PL[mo - 1]} ${yr}`,
      Author:  "Unique Ceramics",
      Subject: `Raport sprzedaży za ${MONTHS_PL[mo - 1]} ${yr}`,
    },
  });

  if (fonts) {
    doc.registerFont("R", fonts.regular);
    doc.registerFont("B", fonts.bold);
  }
  const R = fonts ? "R" : "Helvetica";
  const B = fonts ? "B" : "Helvetica-Bold";

  // Wymiary
  const PW  = doc.page.width;   // 842
  const PH  = doc.page.height;  // 595
  const ML  = 35;
  const MT  = 35;
  const MBT = 42;
  const TW  = PW - ML * 2;     // 772

  // Kolumny tabeli zamówień sklepowych (suma = 772)
  const COLS = [
    { label: "Nr",            w:  20, align: "right" as const },
    { label: "Data",          w:  58, align: "left"  as const },
    { label: "Klient",        w: 132, align: "left"  as const },
    { label: "Produkty",      w: 200, align: "left"  as const },
    { label: "Adres dostawy", w: 120, align: "left"  as const },
    { label: "Dostawa",       w:  74, align: "left"  as const },
    { label: "Platnosc",      w:  60, align: "left"  as const },
    { label: "Razem",         w: 108, align: "right" as const },
  ];

  // Kolumny tabeli zamówień indywidualnych (suma = 772)
  const CUSTOM_COLS = [
    { label: "Nr",       w:  40, align: "left"  as const },
    { label: "Data",     w:  52, align: "left"  as const },
    { label: "Klient",   w: 115, align: "left"  as const },
    { label: "Rodzaj",   w: 100, align: "left"  as const },
    { label: "Opis",     w: 155, align: "left"  as const },
    { label: "Adres",    w: 105, align: "left"  as const },
    { label: "Wysylka",  w:  55, align: "right" as const },
    { label: "Wplacono", w:  65, align: "right" as const },
    { label: "Cena",     w:  85, align: "right" as const },
  ];
  // 40+52+115+100+155+105+55+65+85 = 772 ✓

  const FS      = 7;
  const FS_HDR  = 6.5;
  const ROW_PAD = 3.5;
  const HDR_H   = 13;
  let   pageNum = 1;

  // ── Stopka ────────────────────────────────────────────────────────────────────
  // Tekst stopki ląduje poniżej dolnego marginesu strony (page.maxY()), co w pdfkit
  // wywołałoby automatyczne dodanie nowej strony. Na czas rysowania zerujemy dolny
  // margines, żeby uniknąć rozbicia dokumentu na kolejne strony.
  function drawFooter() {
    const prevBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const yf = PH - MBT + 9;
    doc.font(R).fontSize(6.5).fillColor("#9A7A6A")
       .text(
         "Unique Ceramics · kontakt@uniqueceramics.pl · Familijna 23, 44-164 Kleszczow k. Gliwic",
         ML, yf, { width: TW - 60, align: "left", lineBreak: false }
       );
    doc.font(R).fontSize(6.5).fillColor("#9A7A6A")
       .text(`Strona ${pageNum}`, ML, yf, { width: TW, align: "right", lineBreak: false });

    doc.page.margins.bottom = prevBottom;
  }

  // ── Nagłówek tabeli sklepowej ─────────────────────────────────────────────────
  function drawTableHeader(startY: number): number {
    doc.fillColor("#2C2825").rect(ML, startY, TW, HDR_H).fill();
    let cx = ML;
    for (const col of COLS) {
      doc.font(B).fontSize(FS_HDR).fillColor("#FAF8F5")
         .text(col.label === "Platnosc" ? "Platnosc" : col.label,
               cx + 4, startY + 3, {
                 width: col.w - 8,
                 align: col.align,
                 lineBreak: false,
               });
      cx += col.w;
    }
    cx = ML;
    for (let i = 1; i < COLS.length; i++) {
      cx += COLS[i - 1].w;
      doc.strokeColor("#4A3F38").lineWidth(0.3)
         .moveTo(cx, startY).lineTo(cx, startY + HDR_H).stroke();
    }
    return startY + HDR_H;
  }

  // ── Nagłówek tabeli zamówień indywidualnych ───────────────────────────────────
  function drawCustomTableHeader(startY: number): number {
    doc.fillColor("#6B21A8").rect(ML, startY, TW, HDR_H).fill();
    let cx = ML;
    for (const col of CUSTOM_COLS) {
      doc.font(B).fontSize(FS_HDR).fillColor("#FAF8F5")
         .text(col.label, cx + 4, startY + 3, {
           width: col.w - 8,
           align: col.align,
           lineBreak: false,
         });
      cx += col.w;
    }
    cx = ML;
    for (let i = 1; i < CUSTOM_COLS.length; i++) {
      cx += CUSTOM_COLS[i - 1].w;
      doc.strokeColor("#9333EA").lineWidth(0.3)
         .moveTo(cx, startY).lineTo(cx, startY + HDR_H).stroke();
    }
    return startY + HDR_H;
  }

  // ── Nagłówek dokumentu ────────────────────────────────────────────────────────
  let posY = MT;

  doc.font(B).fontSize(17).fillColor("#2C2825")
     .text("UNIQUE CERAMICS", ML, posY, { lineBreak: false });

  doc.font(R).fontSize(9).fillColor("#8B7355")
     .text(`Raport miesieczny · ${MONTHS_PL[mo - 1]} ${yr}`,
           ML, posY + 3, { width: TW, align: "right", lineBreak: false });

  posY += 22;

  const periodEndDisplay = new Date(periodEnd.getTime() - 86_400_000);
  doc.font(R).fontSize(7).fillColor("#9A7A6A")
     .text(
       `Wygenerowano: ${new Date().toLocaleString("pl-PL", {
         day: "numeric", month: "long", year: "numeric",
         hour: "2-digit", minute: "2-digit",
       })}  ·  ` +
       `Okres: ${fmtDate(periodStart)} – ${fmtDate(periodEndDisplay)}  ·  ` +
       `Sklep: ${orders.length} zam. oplaconych  ·  Indywidualne: ${customOrders.length} zam.`,
       ML, posY, { lineBreak: false }
     );

  posY += 12;

  doc.strokeColor("#E8DFD0").lineWidth(0.5)
     .moveTo(ML, posY).lineTo(ML + TW, posY).stroke();

  posY += 8;

  // ── Podsumowanie ──────────────────────────────────────────────────────────────
  const summary: [string, string][] = [
    ["ZAMOWIEN LACZNIE",        String(totalCount)],
    ["PRZYCHOD BRUTTO",         fmtMoney(totalRevenue)],
    ["KOSZTY WYSYLKI",          fmtMoney(totalShipping)],
    ["PRZYCHOD Z PRODUKTOW",    fmtMoney(totalProducts)],
    [`PODATEK PIT (${taxHigh ? "32" : "12"}%)`, fmtMoney(taxDue)],
  ];

  const SW  = TW / summary.length;
  const SBH = 33;

  doc.fillColor("#F5F0E8").rect(ML, posY, TW, SBH).fill();
  doc.strokeColor("#E8DFD0").lineWidth(0.5).rect(ML, posY, TW, SBH).stroke();

  let sx = ML;
  for (let i = 0; i < summary.length; i++) {
    const [label, value] = summary[i];
    doc.font(B).fontSize(10).fillColor("#2C2825")
       .text(value, sx + 8, posY + 6, { width: SW - 16, align: "left", lineBreak: false });
    doc.font(R).fontSize(5.5).fillColor("#8B7355")
       .text(label, sx + 8, posY + 21, { width: SW - 16, align: "left", lineBreak: false });
    if (i > 0) {
      doc.strokeColor("#E8DFD0").lineWidth(0.5)
         .moveTo(sx, posY + 5).lineTo(sx, posY + SBH - 5).stroke();
    }
    sx += SW;
  }

  posY += SBH + 6;

  // Nota o podstawie opodatkowania
  doc.font(R).fontSize(6.5).fillColor("#9A7A6A")
     .text(
       `Podstawa opodatkowania PIT = przychod z produktow (wysylka jest kosztem uzyskania przychodu i nie podlega opodatkowaniu)  ·  ` +
       `Stawka ${taxHigh ? "32" : "12"}%  ·  Podatek do odprowadzenia: ${fmtMoney(taxDue)}`,
       ML, posY, { width: TW, align: "left", lineBreak: false }
     );

  posY += 12;

  // ── Tabela zamówień sklepowych ────────────────────────────────────────────────
  posY = drawTableHeader(posY);
  drawFooter();

  if (orders.length === 0) {
    doc.font(R).fontSize(9).fillColor("#9A7A6A")
       .text("Brak zamowien sklepowych w tym miesiacu.", ML, posY + 14, {
         width: TW, align: "center",
       });
    posY += 30;
  }

  for (let idx = 0; idx < orders.length; idx++) {
    const order = orders[idx];

    const customerText = [
      `${order.firstName} ${order.lastName}`,
      order.email,
      `#${order.id.slice(0, 8).toUpperCase()}`,
    ].filter(Boolean).join("\n");

    const MAX_ITEMS = 5;
    const allItemLines = order.items.map(
      (i) =>
        `${i.name}  x${i.quantity}  ` +
        `${(i.price * i.quantity).toFixed(2).replace(".", ",")} zl`,
    );
    const productsText =
      allItemLines.slice(0, MAX_ITEMS).join("\n") +
      (allItemLines.length > MAX_ITEMS
        ? `\n+ ${allItemLines.length - MAX_ITEMS} wiecej`
        : "");

    let addressText: string;
    if (order.shippingMethod === "pickup") {
      addressText = "Odbior osobisty\nw pracowni ceramicznej";
    } else if (order.shippingMethod === "parcel_locker") {
      addressText = `Paczkomat InPost\n${order.parcelLockerCode ?? "—"}`;
    } else {
      addressText = [
        order.street ?? "",
        `${order.postcode ?? ""} ${order.city ?? ""}`.trim(),
        order.country ?? "Polska",
      ]
        .filter(Boolean)
        .join("\n");
    }

    const shippingLabel = SHIPPING_LABELS[order.shippingMethod] ?? order.shippingMethod;
    const shippingText  = `${shippingLabel}\n${order.shippingCost === 0 ? "Gratis" : fmtMoney(order.shippingCost)}`;

    const paymentLabel  = PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod;
    const paymentStatus = order.paymentStatus === "PAID" ? "Oplacone" : "Oczekuje";
    const paymentText   = `${paymentLabel}\n${paymentStatus}`;

    const cells = [
      String(idx + 1),
      fmtDate(recognitionDate(order)),
      customerText,
      productsText,
      addressText,
      shippingText,
      paymentText,
      fmtMoney(order.total),
    ];

    let maxH = 0;
    cells.forEach((text, ci) => {
      const h = doc.font(R).fontSize(FS).heightOfString(text, { width: COLS[ci].w - 8 });
      if (h > maxH) maxH = h;
    });
    const rowH = Math.max(Math.ceil(maxH * 1.2) + ROW_PAD * 2, 16);

    if (posY + rowH > PH - MBT - 4) {
      doc.addPage();
      pageNum++;
      posY = MT;
      drawFooter();
      posY = drawTableHeader(posY);
    }

    doc.fillColor(idx % 2 === 0 ? "#FDFCFB" : "#F5F0E8")
       .rect(ML, posY, TW, rowH)
       .fill();

    const cellH = rowH - ROW_PAD * 2;
    let cx = ML;
    cells.forEach((text, ci) => {
      doc.font(R).fontSize(FS).fillColor("#2C2825")
         .text(text, cx + 4, posY + ROW_PAD, {
           width:     COLS[ci].w - 8,
           height:    cellH,
           ellipsis:  true,
           align:     COLS[ci].align,
           lineBreak: true,
         });
      cx += COLS[ci].w;
    });

    doc.strokeColor("#E8DFD0").lineWidth(0.3)
       .moveTo(ML, posY + rowH)
       .lineTo(ML + TW, posY + rowH)
       .stroke();

    posY += rowH;
  }

  if (orders.length > 0) {
    doc.strokeColor("#C4A882").lineWidth(0.8)
       .moveTo(ML, posY).lineTo(ML + TW, posY).stroke();

    posY += 8;

    doc.font(B).fontSize(8).fillColor("#2C2825")
       .text(
         `Lacznie ${orders.length} zamowien sklepowych   |   ` +
         `Przychod brutto: ${fmtMoney(shopRevenue)}   |   ` +
         `Koszty wysylki: ${fmtMoney(shopShipping)}   |   ` +
         `Przychod z produktow: ${fmtMoney(shopProducts)}`,
         ML, posY, { width: TW, align: "right", lineBreak: false }
       );
    posY += 16;
  }

  // ── Tabela zamówień indywidualnych ────────────────────────────────────────────
  if (customOrders.length > 0) {
    // Nagłówek sekcji
    if (posY + 60 > PH - MBT - 4) {
      doc.addPage();
      pageNum++;
      posY = MT;
      drawFooter();
    }

    posY += 4;
    doc.font(B).fontSize(9).fillColor("#6B21A8")
       .text("Zamowienia indywidualne (Oplacone / Zrealizowane)", ML, posY, { lineBreak: false });
    posY += 14;

    posY = drawCustomTableHeader(posY);

    for (let idx = 0; idx < customOrders.length; idx++) {
      const co = customOrders[idx];

      const clientText = [
        co.customerName,
        co.customerEmail,
        co.customerPhone ?? "",
      ].filter(Boolean).join("\n");

      const descText = co.description.slice(0, 300) + (co.description.length > 300 ? "..." : "");

      const STATUS_LABEL_MAP: Record<string, string> = { PAID: "Oplacone", DONE: "Zrealizowane" };
      const statusLabel = STATUS_LABEL_MAP[co.status] ?? co.status;

      const addressText = [
        co.street ?? "",
        [co.postcode, co.city].filter(Boolean).join(" "),
      ].filter(Boolean).join("\n") || "—";

      const cells = [
        `IND-${co.orderNumber}\n${statusLabel}`,
        fmtDate(new Date(co.createdAt)),
        clientText,
        co.orderType,
        descText,
        addressText,
        co.shippingCost != null ? fmtMoney(co.shippingCost) : "—",
        co.paidAmount   != null ? fmtMoney(co.paidAmount)   : "—",
        fmtMoney(co.price ?? 0),
      ];

      let maxH = 0;
      cells.forEach((text, ci) => {
        const h = doc.font(R).fontSize(FS).heightOfString(text, { width: CUSTOM_COLS[ci].w - 8 });
        if (h > maxH) maxH = h;
      });
      const rowH = Math.max(Math.ceil(maxH * 1.2) + ROW_PAD * 2, 16);

      if (posY + rowH > PH - MBT - 4) {
        doc.addPage();
        pageNum++;
        posY = MT;
        drawFooter();
        posY = drawCustomTableHeader(posY);
      }

      doc.fillColor(idx % 2 === 0 ? "#FDFAFF" : "#F5F0FE")
         .rect(ML, posY, TW, rowH)
         .fill();

      const cellH = rowH - ROW_PAD * 2;
      let cx = ML;
      cells.forEach((text, ci) => {
        doc.font(R).fontSize(FS).fillColor("#2C2825")
           .text(text, cx + 4, posY + ROW_PAD, {
             width:     CUSTOM_COLS[ci].w - 8,
             height:    cellH,
             ellipsis:  true,
             align:     CUSTOM_COLS[ci].align,
             lineBreak: true,
           });
        cx += CUSTOM_COLS[ci].w;
      });

      doc.strokeColor("#E8DFD0").lineWidth(0.3)
         .moveTo(ML, posY + rowH)
         .lineTo(ML + TW, posY + rowH)
         .stroke();

      posY += rowH;
    }

    // Suma zamówień indywidualnych
    doc.strokeColor("#9333EA").lineWidth(0.8)
       .moveTo(ML, posY).lineTo(ML + TW, posY).stroke();

    posY += 8;

    doc.font(B).fontSize(8).fillColor("#6B21A8")
       .text(
         `Lacznie ${customOrders.length} zamowien indywidualnych   |   ` +
         `Przychod z produktow: ${fmtMoney(customRevenue)}   |   ` +
         `Koszty wysylki: ${fmtMoney(customShipping)}`,
         ML, posY, { width: TW, align: "right", lineBreak: false }
       );

    posY += 16;

    // Suma łączna
    if (orders.length > 0) {
      doc.strokeColor("#C4A882").lineWidth(1.2)
         .moveTo(ML, posY).lineTo(ML + TW, posY).stroke();

      posY += 8;

      doc.font(B).fontSize(9).fillColor("#2C2825")
         .text(
           `LACZNIE ${totalCount} zamowien   |   Przychod brutto: ${fmtMoney(totalRevenue)}   |   ` +
           `w tym wysylka: ${fmtMoney(totalShipping)}   |   Przychod netto: ${fmtMoney(totalProducts)}`,
           ML, posY, { width: TW, align: "right", lineBreak: false }
         );
    }
  }

  // ── Buffer ────────────────────────────────────────────────────────────────────
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });

  const filename = `raport-${yr}-${String(mo).padStart(2, "0")}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
