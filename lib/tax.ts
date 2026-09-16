// Rozliczenie podatkowe sprzedaży – czyste funkcje (bez bazy), wspólne dla
// tabeli miesięcznej w `/admin/analityki`, karty rocznej i raportu PDF
// (`/api/admin/reports/[year]/[month]`). Jedno miejsce liczy, trzy pokazują –
// dzięki temu PDF nigdy nie rozjeżdża się z panelem. Testy: `tests/tax.test.ts`.
//
// Dwa tryby działalności (ustawienie `tax_mode`):
//  • **nierejestrowana** (`unregistered`, domyślny) – przychód z „innych źródeł"
//    rozliczany w PIT-36 wg skali; panel liczy orientacyjnie 12% (albo 32% po
//    ręcznym zaznaczeniu miesiąca), bez ZUS, z kwartalnym limitem przychodu
//    (`DznSection`). Zachowanie sprzed 16.09.2026 – nie zmieniamy go.
//  • **działalność gospodarcza** (`registered`) – forma opodatkowania
//    (`tax_form`): skala (zaliczki narastająco, kwota wolna, próg 120 000 zł),
//    liniowy 19% albo ryczałt (stawka z ustawień), do tego koszty miesięczne,
//    ZUS społeczne i składka zdrowotna liczona wg formy.
//
// VAT (`tax_vat_enabled`) jest niezależny od trybu: ceny w sklepie są wtedy
// **brutto**, przychód do PIT liczymy netto, a panel pokazuje VAT należny
// (bez VAT naliczonego z zakupów – ten zna tylko księgowość).
//
// Wszystkie kwoty są **orientacyjne** – progi, stawki i limity zmieniają się
// co rok; stałe poniżej opisują stan na 2026. Zaokrąglamy do groszy.

// ── Konfiguracja ──────────────────────────────────────────────────────────────

export type TaxMode = "unregistered" | "registered";
export type TaxForm = "scale" | "linear" | "lump";

export type TaxConfig = {
  mode: TaxMode;
  form: TaxForm;
  /** Stawka ryczałtu w % (5,5 wytwórcza / 3 handel / 8,5 usługi). */
  lumpRate: number;
  vatEnabled: boolean;
  /** Stawka VAT w % (23 domyślnie). */
  vatRate: number;
  /** ZUS społeczne miesięcznie (zł); 0 = ulga na start. Odliczane od dochodu. */
  zusSocialMonthly: number;
  /** Minimalne wynagrodzenie (zł) – limit DzN i minimalna składka zdrowotna. */
  minWage: number;
  /** Przeciętne wynagrodzenie (zł) – progi składki zdrowotnej przy ryczałcie. */
  avgWage: number;
};

export const TAX_MODE_KEY = "tax_mode";
export const TAX_FORM_KEY = "tax_form";
export const TAX_LUMP_RATE_KEY = "tax_lump_rate";
export const TAX_VAT_ENABLED_KEY = "tax_vat_enabled";
export const TAX_VAT_RATE_KEY = "tax_vat_rate";
export const TAX_ZUS_SOCIAL_KEY = "tax_zus_social";
export const TAX_AVG_WAGE_KEY = "tax_avg_wage";
/** Minimalne wynagrodzenie – klucz sprzed trybów, zostaje dla zgodności. */
export const TAX_MIN_WAGE_KEY = "dzn_min_wage";

export const TAX_SETTING_KEYS = [
  TAX_MODE_KEY, TAX_FORM_KEY, TAX_LUMP_RATE_KEY, TAX_VAT_ENABLED_KEY, TAX_VAT_RATE_KEY,
  TAX_ZUS_SOCIAL_KEY, TAX_AVG_WAGE_KEY, TAX_MIN_WAGE_KEY,
] as const;

export const TAX_DEFAULTS: Record<(typeof TAX_SETTING_KEYS)[number], string> = {
  [TAX_MODE_KEY]: "unregistered",
  [TAX_FORM_KEY]: "scale",
  [TAX_LUMP_RATE_KEY]: "5.5",
  [TAX_VAT_ENABLED_KEY]: "false",
  [TAX_VAT_RATE_KEY]: "23",
  [TAX_ZUS_SOCIAL_KEY]: "0",
  [TAX_AVG_WAGE_KEY]: "8549.18",
  [TAX_MIN_WAGE_KEY]: "4806",
};

/** Klucz ustawienia z kosztami miesiąca (zł, netto) – tylko działalność gospodarcza. */
export function costsKey(yr: number, mo: number): string {
  return `tax_costs_${yr}_${mo}`;
}

/** Klucz ustawienia „stawka 32% w tym miesiącu" – tylko działalność nierejestrowana. */
export function highKey(yr: number, mo: number): string {
  return `tax_high_${yr}_${mo}`;
}

function num(value: string | undefined, fallback: number, min: number, max: number): number {
  // `Number("")` to 0, nie NaN – puste ustawienie ma wrócić do wartości domyślnej
  const raw = String(value ?? "").trim().replace(",", ".");
  if (raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Konfiguracja z wierszy `Setting`; braki i śmieci wracają do wartości domyślnych. */
export function parseTaxConfig(settings: Record<string, string | undefined>): TaxConfig {
  const mode = settings[TAX_MODE_KEY] === "registered" ? "registered" : "unregistered";
  const formRaw = settings[TAX_FORM_KEY];
  const form: TaxForm = formRaw === "linear" || formRaw === "lump" ? formRaw : "scale";
  return {
    mode,
    form,
    lumpRate: num(settings[TAX_LUMP_RATE_KEY], 5.5, 0, 50),
    vatEnabled: settings[TAX_VAT_ENABLED_KEY] === "true",
    vatRate: num(settings[TAX_VAT_RATE_KEY], 23, 0, 50),
    zusSocialMonthly: num(settings[TAX_ZUS_SOCIAL_KEY], 0, 0, 100_000),
    minWage: num(settings[TAX_MIN_WAGE_KEY], 4806, 1000, 20_000),
    avgWage: num(settings[TAX_AVG_WAGE_KEY], 8549.18, 1000, 50_000),
  };
}

// ── Stałe podatkowe (stan na 2026) ────────────────────────────────────────────

/** Skala: 12% do progu, 32% powyżej; kwota zmniejszająca podatek 3 600 zł rocznie (kwota wolna 30 000 zł). */
export const SCALE_LOW_RATE = 0.12;
export const SCALE_HIGH_RATE = 0.32;
export const SCALE_THRESHOLD = 120_000;
export const SCALE_TAX_REDUCTION = 3_600;

export const LINEAR_RATE = 0.19;

/** Składka zdrowotna: 9% dochodu (skala), 4,9% (liniowy); minimum od 75% płacy minimalnej. */
export const HEALTH_SCALE_RATE = 0.09;
export const HEALTH_LINEAR_RATE = 0.049;
export const HEALTH_MIN_BASE_RATIO = 0.75;
/** Liniowy: składkę zdrowotną wolno odliczyć od dochodu do rocznego limitu (2025: 12 900 zł). */
export const LINEAR_HEALTH_DEDUCTION_LIMIT = 12_900;

/** Ryczałt: składka zdrowotna wg progów przychodu rocznego – % przeciętnego wynagrodzenia jako podstawa, 9% z tego. */
export const LUMP_HEALTH_TIERS = [
  { maxRevenue: 60_000, baseRatio: 0.6 },
  { maxRevenue: 300_000, baseRatio: 1.0 },
  { maxRevenue: Infinity, baseRatio: 1.8 },
] as const;
/** Ryczałt: połowa zapłaconej składki zdrowotnej obniża przychód. */
export const LUMP_HEALTH_DEDUCTION = 0.5;

/** Działalność nierejestrowana: limit przychodu = 225% minimalnego wynagrodzenia na kwartał (od 2026). */
export const DZN_QUARTER_RATIO = 2.25;

export const TAX_FORM_LABELS: Record<TaxForm, string> = {
  scale: "Skala podatkowa (12% / 32%)",
  linear: "Podatek liniowy (19%)",
  lump: "Ryczałt od przychodów",
};

export const LUMP_RATE_HINTS = [
  { rate: 5.5, label: "5,5% – działalność wytwórcza (ceramika własnej produkcji)" },
  { rate: 3, label: "3% – handel (odsprzedaż towarów)" },
  { rate: 8.5, label: "8,5% – usługi (np. warsztaty)" },
] as const;

// ── Pomocnicze ────────────────────────────────────────────────────────────────

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Kwota brutto → netto i VAT należny. Bez VAT: netto = brutto, VAT = 0. */
export function splitVat(gross: number, cfg: Pick<TaxConfig, "vatEnabled" | "vatRate">): { net: number; vat: number } {
  if (!cfg.vatEnabled || cfg.vatRate <= 0) return { net: round2(gross), vat: 0 };
  const net = round2(gross / (1 + cfg.vatRate / 100));
  return { net, vat: round2(gross - net) };
}

/** Roczny PIT wg skali od dochodu (po odliczeniach), z kwotą zmniejszającą; nigdy poniżej zera. */
export function scaleTaxAnnual(income: number): number {
  if (income <= 0) return 0;
  const low = Math.min(income, SCALE_THRESHOLD) * SCALE_LOW_RATE;
  const high = Math.max(0, income - SCALE_THRESHOLD) * SCALE_HIGH_RATE;
  return round2(Math.max(0, low + high - SCALE_TAX_REDUCTION));
}

/** Minimalna miesięczna składka zdrowotna (skala i liniowy) – 9% z 75% płacy minimalnej. */
export function minHealthMonthly(minWage: number): number {
  return round2(minWage * HEALTH_MIN_BASE_RATIO * HEALTH_SCALE_RATE);
}

/** Składka zdrowotna przy ryczałcie – zależy od przychodu narastająco w roku. */
export function lumpHealthMonthly(annualRevenueToDate: number, avgWage: number): number {
  const tier = LUMP_HEALTH_TIERS.find((t) => annualRevenueToDate <= t.maxRevenue) ?? LUMP_HEALTH_TIERS[2];
  return round2(avgWage * tier.baseRatio * HEALTH_SCALE_RATE);
}

// ── Obliczenia miesięczne ─────────────────────────────────────────────────────

export type MonthInput = {
  yr: number;
  mo: number;
  /** Liczba sprzedaży (zamówienia sklepowe + indywidualne + wpisy ręczne). */
  cnt: number;
  /** Przychód brutto z wysyłką – tak, jak klient zapłacił. */
  rev: number;
  /** Koszty wysyłki pobrane od klientów (część `rev`). */
  ship: number;
  /** Koszty uzyskania przychodu wpisane w panelu (netto). Tylko JDG. */
  costs: number;
  /** Ręczne „32% w tym miesiącu". Tylko działalność nierejestrowana. */
  high: boolean;
};

export type MonthResult = MonthInput & {
  /** Przychód netto (bez VAT), z wysyłką. */
  revNet: number;
  /** Wysyłka netto. */
  shipNet: number;
  /** Przychód z produktów netto = revNet − shipNet. */
  productsNet: number;
  vatDue: number;
  /** ZUS społeczne odliczone w tym miesiącu (0 przy braku sprzedaży i w DzN). */
  zusSocial: number;
  /** Składka zdrowotna za miesiąc (0 w DzN). */
  health: number;
  /** Podstawa opodatkowania miesiąca (dochód / przychód wg formy); może być ujemna przy stracie. */
  base: number;
  /** PIT do zapłaty za miesiąc (zaliczka). */
  pit: number;
  /** Krótki opis stawki do tabeli, np. „12%”, „19%”, „5,5%”. */
  rateLabel: string;
};

function pct(rate: number): string {
  return `${String(round2(rate * 100)).replace(".", ",")}%`;
}

/**
 * Liczy rok miesiąc po miesiącu. `months` to **kolejne miesiące jednego roku**
 * rosnąco (luki dozwolone – brakujące miesiące traktujemy jak zero). Skala
 * w JDG jest progresywna narastająco (zaliczka = podatek od dochodu od
 * początku roku minus zaliczki wcześniejsze), dlatego nie da się policzyć
 * miesiąca w oderwaniu od poprzednich.
 */
export function computeYear(months: MonthInput[], cfg: TaxConfig): MonthResult[] {
  const sorted = [...months].sort((a, b) => a.yr - b.yr || a.mo - b.mo);
  const out: MonthResult[] = [];

  let incomeYtd = 0;      // dochód narastająco (skala / liniowy)
  let pitYtd = 0;         // zaliczki zapłacone narastająco
  let revenueYtd = 0;     // przychód netto narastająco (progi zdrowotnej przy ryczałcie)
  let linearHealthDeducted = 0;

  for (const m of sorted) {
    const { net: revNet, vat: vatDue } = splitVat(m.rev, cfg);
    const { net: shipNet } = splitVat(m.ship, cfg);
    const productsNet = round2(revNet - shipNet);
    const active = m.cnt > 0 || m.rev > 0;

    if (cfg.mode === "unregistered") {
      // Jak dotąd: podstawa = przychód z produktów, płaska stawka wg checkboxa
      const rate = m.high ? SCALE_HIGH_RATE : SCALE_LOW_RATE;
      const base = productsNet;
      out.push({
        ...m, revNet, shipNet, productsNet, vatDue,
        zusSocial: 0, health: 0, base,
        pit: active ? round2(Math.max(0, base) * rate) : 0,
        rateLabel: pct(rate),
      });
      continue;
    }

    const zusSocial = active ? round2(cfg.zusSocialMonthly) : 0;
    const minHealth = active ? minHealthMonthly(cfg.minWage) : 0;

    if (cfg.form === "lump") {
      // Ryczałt: podstawa = przychód (z wysyłką – klient płaci za całość),
      // pomniejszony o ZUS społeczne i połowę składki zdrowotnej; koszty nie grają
      revenueYtd += revNet;
      const health = active ? lumpHealthMonthly(revenueYtd, cfg.avgWage) : 0;
      const base = round2(revNet - zusSocial - health * LUMP_HEALTH_DEDUCTION);
      out.push({
        ...m, revNet, shipNet, productsNet, vatDue, zusSocial, health, base,
        pit: round2(Math.max(0, base) * (cfg.lumpRate / 100)),
        rateLabel: pct(cfg.lumpRate / 100),
      });
      continue;
    }

    // Skala i liniowy: dochód = przychód z produktów − koszty − ZUS społeczne
    const incomeBeforeHealth = round2(productsNet - m.costs - zusSocial);
    const healthRate = cfg.form === "scale" ? HEALTH_SCALE_RATE : HEALTH_LINEAR_RATE;
    const health = active ? round2(Math.max(minHealth, Math.max(0, incomeBeforeHealth) * healthRate)) : 0;

    let income = incomeBeforeHealth;
    if (cfg.form === "linear") {
      // Liniowy: zdrowotna odliczana od dochodu do rocznego limitu
      const deductible = Math.min(health, Math.max(0, LINEAR_HEALTH_DEDUCTION_LIMIT - linearHealthDeducted));
      linearHealthDeducted += deductible;
      income = round2(income - deductible);
    }

    incomeYtd += income;
    let pit: number;
    let rateLabel: string;
    if (cfg.form === "scale") {
      // Zaliczka = podatek roczny od dochodu narastająco − zaliczki dotychczasowe
      const dueYtd = scaleTaxAnnual(incomeYtd);
      pit = round2(Math.max(0, dueYtd - pitYtd));
      pitYtd += pit;
      rateLabel = pct(incomeYtd > SCALE_THRESHOLD ? SCALE_HIGH_RATE : SCALE_LOW_RATE);
    } else {
      const dueYtd = round2(Math.max(0, incomeYtd) * LINEAR_RATE);
      pit = round2(Math.max(0, dueYtd - pitYtd));
      pitYtd += pit;
      rateLabel = pct(LINEAR_RATE);
    }

    out.push({ ...m, revNet, shipNet, productsNet, vatDue, zusSocial, health, base: income, pit, rateLabel });
  }

  return out;
}

/** Sumy roku z wyników miesięcznych – do karty rocznej i stopki tabeli. */
export type YearSummary = {
  rev: number; revNet: number; ship: number; shipNet: number; productsNet: number;
  vatDue: number; costs: number; zusSocial: number; health: number; base: number; pit: number; cnt: number;
};

export function summarizeYear(results: MonthResult[]): YearSummary {
  const s: YearSummary = {
    rev: 0, revNet: 0, ship: 0, shipNet: 0, productsNet: 0,
    vatDue: 0, costs: 0, zusSocial: 0, health: 0, base: 0, pit: 0, cnt: 0,
  };
  for (const r of results) {
    s.rev += r.rev; s.revNet += r.revNet; s.ship += r.ship; s.shipNet += r.shipNet;
    s.productsNet += r.productsNet; s.vatDue += r.vatDue; s.costs += r.costs;
    s.zusSocial += r.zusSocial; s.health += r.health; s.base += r.base; s.pit += r.pit; s.cnt += r.cnt;
  }
  for (const k of Object.keys(s) as (keyof YearSummary)[]) s[k] = round2(s[k]);
  return s;
}

/** Limit kwartalny działalności nierejestrowanej. */
export function dznQuarterLimit(minWage: number): number {
  return round2(minWage * DZN_QUARTER_RATIO);
}
