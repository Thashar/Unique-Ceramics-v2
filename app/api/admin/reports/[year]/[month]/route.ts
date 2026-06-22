export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
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

  // Definiujemy query przed try/catch, żeby TypeScript wywnioskował typ z include
  // Tylko opłacone zamówienia (paymentStatus=PAID) — niezbędne do rozliczenia podatkowego
  const ordersQuery = db.order.findMany({
    where: {
      status:        { not: "CANCELLED" },
      paymentStatus: "PAID",
      createdAt:     { gte: periodStart, lt: periodEnd },
    },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  let orders: Awaited<typeof ordersQuery>;
  try {
    orders = await ordersQuery;
  } catch {
    return new Response("Błąd bazy danych", { status: 500 });
  }

  // ── Sumy ─────────────────────────────────────────────────────────────────────

  const totalRevenue  = orders.reduce((s, o) => s + o.total,        0);
  const totalShipping = orders.reduce((s, o) => s + o.shippingCost, 0);
  const totalProducts = totalRevenue - totalShipping;
  const avgOrder      = orders.length > 0 ? totalRevenue / orders.length : 0;

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

  // Kolumny (suma = 772)
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
  // 20+58+132+200+120+74+60+108 = 772 ✓

  const FS      = 7;
  const FS_HDR  = 6.5;
  const ROW_PAD = 3.5;
  const HDR_H   = 13;
  let   pageNum = 1;

  // ── Stopka ────────────────────────────────────────────────────────────────────
  function drawFooter() {
    const yf = PH - MBT + 9;
    doc.font(R).fontSize(6.5).fillColor("#9A7A6A")
       .text(
         "Unique Ceramics · kontakt@uniqueceramics.pl · Familijna 23, 44-164 Kleszczow k. Gliwic",
         ML, yf, { width: TW - 60, align: "left", lineBreak: false }
       );
    doc.font(R).fontSize(6.5).fillColor("#9A7A6A")
       .text(`Strona ${pageNum}`, ML, yf, { width: TW, align: "right", lineBreak: false });
  }

  // ── Nagłówek tabeli ───────────────────────────────────────────────────────────
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
    // Separatory pionowe
    cx = ML;
    for (let i = 1; i < COLS.length; i++) {
      cx += COLS[i - 1].w;
      doc.strokeColor("#4A3F38").lineWidth(0.3)
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
       `Bez zamowien anulowanych`,
       ML, posY, { lineBreak: false }
     );

  posY += 12;

  doc.strokeColor("#E8DFD0").lineWidth(0.5)
     .moveTo(ML, posY).lineTo(ML + TW, posY).stroke();

  posY += 8;

  // ── Podsumowanie ──────────────────────────────────────────────────────────────
  const summary: [string, string][] = [
    ["ZAMOWIEN",              String(orders.length)],
    ["PRZYCHOD BRUTTO",       fmtMoney(totalRevenue)],
    ["KOSZTY WYSYLKI",        fmtMoney(totalShipping)],
    ["PRZYCHOD Z PRODUKTOW",  fmtMoney(totalProducts)],
    ["SR. WARTOSC ZAMOWIENIA",fmtMoney(avgOrder)],
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

  posY += SBH + 10;

  // ── Tabela ────────────────────────────────────────────────────────────────────
  posY = drawTableHeader(posY);
  drawFooter();

  if (orders.length === 0) {
    doc.font(R).fontSize(9).fillColor("#9A7A6A")
       .text("Brak zamowien w tym miesiacu.", ML, posY + 14, {
         width: TW, align: "center",
       });
  }

  for (let idx = 0; idx < orders.length; idx++) {
    const order = orders[idx];

    // Klient: imię + email (2 linie) + numer zamówienia
    const customerText = [
      `${order.firstName} ${order.lastName}`,
      order.email,
      `#${order.id.slice(0, 8).toUpperCase()}`,
    ].filter(Boolean).join("\n");

    // Produkty: max 5 pozycji — dłuższe listy obcinamy z adnotacją
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
      fmtDate(new Date(order.createdAt)),
      customerText,
      productsText,
      addressText,
      shippingText,
      paymentText,
      fmtMoney(order.total),
    ];

    // Wysokość wiersza: mierzymy każdą komórkę + 20% margines bezpieczeństwa
    // (heightOfString może zaniżać przy złożonych łamaniach), max 70 pt
    let maxH = 0;
    cells.forEach((text, ci) => {
      const h = doc.font(R).fontSize(FS).heightOfString(text, { width: COLS[ci].w - 8 });
      if (h > maxH) maxH = h;
    });
    const rowH = Math.max(Math.ceil(maxH * 1.2) + ROW_PAD * 2, 16);

    // Przełom strony
    if (posY + rowH > PH - MBT - 4) {
      doc.addPage();
      pageNum++;
      posY = MT;
      drawFooter();
      posY = drawTableHeader(posY);
    }

    // Tło wiersza
    doc.fillColor(idx % 2 === 0 ? "#FDFCFB" : "#F5F0E8")
       .rect(ML, posY, TW, rowH)
       .fill();

    // Treść — height MUSI być podane, bo pdfkit bez niego automatycznie dodaje
    // nowe strony przy przepełnieniu komórki, co tworzy puste strony w raporcie
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

    // Separator wiersza
    doc.strokeColor("#E8DFD0").lineWidth(0.3)
       .moveTo(ML, posY + rowH)
       .lineTo(ML + TW, posY + rowH)
       .stroke();

    posY += rowH;
  }

  // Linia zamknięcia + suma
  if (orders.length > 0) {
    doc.strokeColor("#C4A882").lineWidth(0.8)
       .moveTo(ML, posY).lineTo(ML + TW, posY).stroke();

    posY += 8;

    doc.font(B).fontSize(8).fillColor("#2C2825")
       .text(
         `Lacznie ${orders.length} zamowien   |   ` +
         `Przychod brutto: ${fmtMoney(totalRevenue)}   |   ` +
         `Koszty wysylki: ${fmtMoney(totalShipping)}   |   ` +
         `Przychod z produktow: ${fmtMoney(totalProducts)}`,
         ML, posY, { width: TW, align: "right", lineBreak: false }
       );
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
