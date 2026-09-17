"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import RichEditor from "@/components/admin/RichEditor";
import { Field, MultilineField, SaveButton } from "@/components/admin/settings-fields";
import SettingsEnglish from "@/components/admin/SettingsEnglish";
import LangSwitch from "@/components/admin/LangSwitch";
import type { Locale } from "@/lib/i18n";
import ImageUploader from "@/components/admin/ImageUploader";
import FocalPointPicker from "@/components/admin/FocalPointPicker";
import GalleryEditor from "@/components/admin/GalleryEditor";
import WorkshopsOffersEditor from "@/components/admin/WorkshopsOffersEditor";
import AiPromptPresets from "@/components/admin/AiPromptPresets";
import AboutValuesEditor from "@/components/admin/AboutValuesEditor";
import ImageVariantsPanel from "@/components/admin/ImageVariantsPanel";
import StorageCleanupPanel from "@/components/admin/StorageCleanupPanel";
import { parseGallery, galleryHead } from "@/lib/gallery";
import { ABOUT_VALUES_TITLE_DEFAULT } from "@/lib/about-values";
import { t } from "@/lib/dictionary";

// Domyślne teksty nagłówków /o-mnie i /warsztaty – ze słownika, jako podpowiedzi pól
const ABOUT_HEAD_DEFAULT = t("pl").about;
const WORKSHOPS_HEAD_DEFAULT = t("pl").workshops;
import {
  MAX_SIMILARITY_SCORE,
  SIMILARITY_RULES,
  SIMILARITY_THRESHOLDS,
  SIMILAR_LIMIT,
  SIMILAR_MIN_SCORE_KEY,
  normalizeMinScore,
} from "@/lib/similar-products";
import {
  HOME_ABOUT_DEFAULT,
  HOME_HERO_DEFAULT,
  HOME_WORKSHOPS_DEFAULT,
} from "@/lib/home-sections";
import {
  AI_IMAGE_MODELS,
  AI_MODEL_PRICING,
  AI_MODEL_SETTING_KEY,
  AI_PRESET_SETTING_KEY,
  AI_PRESETS_SETTING_KEY,
  AI_TEXT_MODELS,
  AI_TEXT_MODEL_SETTING_KEY,
  AI_AGENT_MODEL_SETTING_KEY,
  resolveAiAgentModel,
  aiCostPerImageUsd,
  buildImagePrompt,
  buildProductFillPrompt,
  parseAiPresets,
  resolveAiModel,
  resolveAiPreset,
  resolveAiTextModel,
} from "@/lib/ai";
import type { AiUsagePeriod, AiUsageStats } from "@/lib/ai-usage";
import {
  LUMP_RATE_HINTS, TAX_AVG_WAGE_KEY, TAX_FORM_KEY, TAX_FORM_LABELS, TAX_LUMP_RATE_KEY, TAX_MIN_WAGE_KEY,
  TAX_MODE_KEY, TAX_VAT_ENABLED_KEY, TAX_VAT_RATE_KEY, TAX_ZUS_SOCIAL_KEY, parseTaxConfig,
  type TaxForm, type TaxMode,
} from "@/lib/tax";

interface Props {
  section: string;
  initial: {
    home_hero_image: string;
    home_hero_position: string;
    home_hero_eyebrow: string;
    home_hero_title: string;
    home_hero_text: string;
    home_hero_cta_primary: string;
    home_hero_cta_secondary: string;
    home_hero_scroll: string;
    home_about_image: string;
    home_about_position: string;
    home_about_eyebrow: string;
    home_about_title: string;
    home_about_text: string;
    home_about_cta: string;
    home_workshops_image: string;
    home_workshops_position: string;
    home_workshops_eyebrow: string;
    home_workshops_title: string;
    home_workshops_text: string;
    home_workshops_cta: string;
    about_hero_image: string;
    about_hero_position: string;
    about_hero_eyebrow: string;
    about_hero_title: string;
    about_hero_overlay_color: string;
    about_hero_overlay_opacity: string;
    about_hero_height: string;
    about_content_gallery: string;
    about_content_image: string;
    about_content_position: string;
    about_story: string;
    about_values_title: string;
    about_values: string;
    workshops_hero_image: string;
    workshops_hero_position: string;
    workshops_hero_eyebrow: string;
    workshops_hero_title: string;
    workshops_hero_overlay_color: string;
    workshops_hero_overlay_opacity: string;
    workshops_hero_height: string;
    workshops_content_gallery: string;
    workshops_content_image: string;
    workshops_content_position: string;
    workshops_intro: string;
    workshops_includes_gallery: string;
    workshops_offers: string;
    workshops_includes: string;
    workshops_faq: string;
    regulamin: string;
    polityka_prywatnosci: string;
    contact_phone: string;
    contact_email: string;
    contact_instagram: string;
    contact_facebook: string;
    contact_youtube: string;
    contact_whatsapp: string;
    contact_hours: string;
    contact_address_street: string;
    contact_address_city: string;
    contact_address_region: string;
    shipping_cost: string;
    shipping_cost_parcel_locker: string;
    shipping_time: string;
    low_stock_badge_enabled: string;
    payment_bank_account_name: string;
    payment_bank_account_number: string;
    payment_bank_name: string;
    payment_bank_transfer_title: string;
    payment_blik_enabled: string;
    payment_blik_phone: string;
    payment_stripe_enabled: string;
    vacation_enabled: string;
    vacation_end_date: string;
    vacation_message: string;
    custom_order_notify_email_enabled: string;
    ai_image_model: string;
    ai_image_model_plus: string;
    ai_text_model: string;
    ai_agent_model: string;
    ai_usd_pln_rate: string;
    ai_prompt_presets: string;
    ai_prompt_preset_ai: string;
    ai_prompt_preset_ai_plus: string;
    similar_min_score: string;
    // Podatki (`lib/tax.ts`)
    tax_mode: string;
    tax_form: string;
    tax_lump_rate: string;
    tax_vat_enabled: string;
    tax_vat_rate: string;
    tax_zus_social: string;
    tax_avg_wage: string;
    dzn_min_wage: string;
  };
  /** Statystyki zużycia AI – liczone tylko dla zakładki „AI (zdjęcia)” */
  aiUsage?: AiUsageStats | null;
  /**
   * Angielskie wersje ustawień (klucze `en_*` z bazy), kluczowane **polskim**
   * kluczem – edytowane po przełączeniu zakładki na EN (`SettingsEnglish`).
   */
  english?: Record<string, string>;
}

const MODEL_LABEL = new Map<string, string>([
  ...AI_IMAGE_MODELS.map((m) => [m.id, m.label] as [string, string]),
  ...AI_TEXT_MODELS.map((m) => [m.id, m.label] as [string, string]),
]);

/** Przykładowa kategoria tylko do podglądu promptu – realna lista idzie z bazy. */
const PROMPT_PREVIEW_CATEGORIES = [{ slug: "kubki", label: "Kubki" }];

/** Etykieta stawki modelu tekstowego: wejście / wyjście za 1 mln tokenów. */
function tokenRate(model: string): string {
  const price = AI_MODEL_PRICING[model];
  if (!price) return "stawka nieznana";
  return `$${price.inputPer1M} / $${price.outputPer1M} za 1 mln tokenów`;
}

const VARIANT_LABEL: Record<string, string> = {
  ai: "AI (zdjęcie)",
  ai_plus: "AI+ (zdjęcie)",
  product_fill: "Uzupełnianie opisu",
  product_card: "Karta w stylu kategorii",
  translate: "Tłumaczenie na angielski",
  prompt_build: "Układanie promptu",
  // Warianty z agenta dodawania produktów (prefiks `agent_`)
  agent_ai: "Agent – zdjęcie AI",
  agent_ai_plus: "Agent – zdjęcie AI+",
  agent_product_fill: "Agent – rozpoznanie i kategoria",
  agent_product_card: "Agent – nazwa i opis",
  agent_translate: "Agent – tłumaczenie",
};

/**
 * Ile zjadł agent dodawania produktów – suma wariantów z prefiksem `agent_`
 * z podziałem na zdjęcia, treść karty i tłumaczenie. Sama rozmowa (pytania,
 * przyciski) nie woła modelu, więc nie ma jej w rejestrze.
 */
function agentUsage(byVariant: AiUsageStats["byVariant"]) {
  const pick = (names: string[]) =>
    byVariant
      .filter((v) => names.includes(v.variant))
      .reduce((acc, v) => ({ count: acc.count + v.count, costUsd: acc.costUsd + v.costUsd }), { count: 0, costUsd: 0 });
  const images = pick(["agent_ai", "agent_ai_plus"]);
  const content = pick(["agent_product_card"]);
  const translation = pick(["agent_translate"]);
  // Rozmowa z agentem = jego rozumowanie: rozpoznanie zdjęcia i dobór kategorii
  const agent = pick(["agent_product_fill"]);
  return {
    images,
    content,
    translation,
    agent,
    total: {
      count: images.count + content.count + translation.count + agent.count,
      costUsd: images.costUsd + content.costUsd + translation.costUsd + agent.costUsd,
    },
  };
}

/** Kwoty AI bywają rzędu setnych centa – pokazujemy tyle miejsc, ile ma sens. */
function usd(value: number): string {
  if (value === 0) return "$0";
  return value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
}

function pln(value: number, rate: number): string {
  const converted = value * rate;
  // Niskie kwoty (poniżej 5 gr) z czterema miejscami – realne wywołanie nie może pokazać „0,00 zł”
  return `${converted.toFixed(converted > 0 && converted < 0.05 ? 4 : 2).replace(".", ",")} zł`;
}

/** Kafelek okresu: łączny koszt na wierzchu, pod spodem rozbicie zdjęcia / teksty. */
function UsageCard({ period, rate }: { period: AiUsagePeriod; rate: number }) {
  return (
    <div className="border border-sand bg-warm-white p-4">
      <p className="text-xs tracking-widest uppercase text-charcoal/80">{period.label}</p>
      <p className="font-serif text-2xl text-espresso mt-1">{usd(period.costUsd)}</p>
      {rate > 0 && <p className="text-xs text-charcoal/80">{pln(period.costUsd, rate)}</p>}
      <dl className="mt-2 space-y-0.5 text-[11px] text-charcoal/80">
        <div className="flex justify-between gap-2">
          <dt>Zdjęcia ({period.image.count})</dt>
          <dd className="tabular-nums">{usd(period.image.costUsd)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Teksty ({period.text.count})</dt>
          <dd className="tabular-nums">{usd(period.text.costUsd)}</dd>
        </div>
      </dl>
    </div>
  );
}

function hexToRgba(hex: string, opacity: string): string {
  try {
    const c = (hex || "#2C2825").replace("#", "");
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const a = Math.max(0, Math.min(100, parseInt(opacity) || 0)) / 100;
    return `rgba(${r},${g},${b},${a})`;
  } catch {
    return "rgba(44,40,37,0.5)";
  }
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className={`w-12 h-6 rounded-full transition-colors ${checked ? "bg-espresso" : "bg-sand"} relative`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-cream transition-all ${checked ? "left-7" : "left-1"}`} />
      </div>
    </label>
  );
}

/**
 * Teksty pełnoekranowej sekcji strony głównej („O mnie", „Warsztaty").
 * Ten sam układ pól co w hero – tam jednak są dwa przyciski i napis przy
 * strzałce, więc hero ma własny zestaw pól zamiast tego komponentu.
 */
function SectionTextFields({
  eyebrow, setEyebrow, title, setTitle, text, setText, cta, setCta, defaults, ctaLabel,
}: {
  eyebrow: string;
  setEyebrow: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  text: string;
  setText: (v: string) => void;
  cta: string;
  setCta: (v: string) => void;
  defaults: { eyebrow: string; title: string; text: string; cta: string };
  ctaLabel: string;
}) {
  return (
    <div className="space-y-4 pt-2">
      <p className="text-xs text-charcoal/80">
        Napisy na tej sekcji. <strong>Puste pole ukrywa dany element</strong>. W nagłówku Enter łamie
        wiersz, a w opisie pusta linia robi odstęp między akapitami.
      </p>
      <Field label="Napis nad nagłówkiem" value={eyebrow} setter={setEyebrow} placeholder={defaults.eyebrow} />
      <MultilineField label="Nagłówek" value={title} setter={setTitle} placeholder={defaults.title} rows={2} />
      <MultilineField label="Opis" value={text} setter={setText} placeholder={defaults.text} rows={5} />
      <Field label={ctaLabel} value={cta} setter={setCta} placeholder={defaults.cta} />
    </div>
  );
}

const noopSubscribe = () => () => {};

/**
 * Komunikaty renderujemy przez portal do `body`. `position: fixed` liczy się względem
 * najbliższego przodka z `transform`/`filter`/`will-change`, a nie zawsze względem okna –
 * wewnątrz formularza komunikat lądował przez to na górze dokumentu zamiast ekranu.
 * Portal wyprowadza go poza całe drzewo, więc pozycja jest zawsze względem okna.
 */
function Toast({ children }: { children: React.ReactNode }) {
  // Bez `setState` w efekcie (reguła react-hooks) – serwer widzi `false`, klient `true`
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function OverlayControl({
  imageUrl, position, color, opacity, onColorChange, onOpacityChange, aspectRatio = "16/9",
}: {
  imageUrl: string; position: string; color: string; opacity: string;
  onColorChange: (v: string) => void; onOpacityChange: (v: string) => void;
  aspectRatio?: string;
}) {
  const pct = parseInt(opacity) || 0;
  return (
    <div className="space-y-3">
      <label className="block text-xs tracking-widest uppercase text-charcoal/80">Maska na zdjęcie (podgląd na żywo)</label>
      {imageUrl ? (
        <div className="relative w-full overflow-hidden rounded-sm border border-sand" style={{ aspectRatio }}>
          <Image src={imageUrl} alt="" fill className="object-cover" style={{ objectPosition: position }} sizes="100%" unoptimized />
          <div className="absolute inset-0" style={{ backgroundColor: hexToRgba(color, opacity) }} />
        </div>
      ) : (
        <div
          className="w-full border border-sand border-dashed rounded-sm flex items-center justify-center text-charcoal/80 text-xs"
          style={{ aspectRatio }}
        >
          Najpierw wybierz zdjęcie
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-charcoal/80">Kolor:</span>
          <input
            type="color"
            value={color || "#2C2825"}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-8 h-8 cursor-pointer border border-sand rounded p-0.5 bg-warm-white"
          />
          <span className="text-[11px] text-charcoal/80 font-mono">{color}</span>
        </div>
        <div className="flex items-center gap-2 min-w-[220px]">
          <span className="text-xs text-charcoal/80 shrink-0">Przezroczystość:</span>
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={(e) => onOpacityChange(e.target.value)}
            className="flex-1 accent-clay"
          />
          <span className="text-xs text-charcoal/80 w-7 text-right">{pct}%</span>
        </div>
      </div>
      <p className="text-[11px] text-charcoal/80">Podgląd natychmiastowy. Na stronie efekt widoczny po zapisaniu.</p>
    </div>
  );
}

/**
 * Nagłówek zakładki z przełącznikiem PL / EN po prawej. Przełącznik pokazuje
 * się tylko w zakładkach, które mają treść do przetłumaczenia.
 */
function SectionHeading({
  title,
  lang,
  onLang,
  translatable,
}: {
  title: string;
  lang: Locale;
  onLang: (l: Locale) => void;
  translatable: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="font-serif text-2xl text-espresso">{title}</h2>
      {translatable && <LangSwitch value={lang} onChange={onLang} />}
    </div>
  );
}

export default function SettingsForm({ section, initial, aiUsage, english = {} }: Props) {
  const [toast, setToast] = useState<"ok" | false>(false);
  const [errMsg, setErrMsg] = useState("");
  // PL / EN – przełącznik u góry po prawej w zakładkach, które mają wersję
  // angielską (patrz `ENGLISH_SETTING_KEYS` w `SettingsEnglish`)
  const [lang, setLang] = useState<Locale>("pl");

  // Strona główna
  const [homeHeroImage, setHomeHeroImage] = useState(initial.home_hero_image);
  const [homeHeroPos, setHomeHeroPos] = useState(initial.home_hero_position);
  // Teksty hero – każdy element osobno, bo puste pole ma go ukryć
  const [heroEyebrow, setHeroEyebrow] = useState(initial.home_hero_eyebrow);
  const [heroTitle, setHeroTitle] = useState(initial.home_hero_title);
  const [heroText, setHeroText] = useState(initial.home_hero_text);
  const [heroCtaPrimary, setHeroCtaPrimary] = useState(initial.home_hero_cta_primary);
  const [heroCtaSecondary, setHeroCtaSecondary] = useState(initial.home_hero_cta_secondary);
  const [heroScroll, setHeroScroll] = useState(initial.home_hero_scroll);
  const [homeAboutImage, setHomeAboutImage] = useState(initial.home_about_image);
  const [homeAboutPos, setHomeAboutPos] = useState(initial.home_about_position);
  const [homeWorkshopsImage, setHomeWorkshopsImage] = useState(initial.home_workshops_image);
  const [homeWorkshopsPos, setHomeWorkshopsPos] = useState(initial.home_workshops_position);
  // Teksty sekcji „O mnie" i „Warsztaty" – ten sam układ pól co w hero
  const [aboutEyebrow, setAboutEyebrow] = useState(initial.home_about_eyebrow);
  const [aboutTitle, setAboutTitle] = useState(initial.home_about_title);
  const [aboutText, setAboutText] = useState(initial.home_about_text);
  const [aboutCta, setAboutCta] = useState(initial.home_about_cta);
  const [workshopsEyebrow, setWorkshopsEyebrow] = useState(initial.home_workshops_eyebrow);
  const [workshopsTitle, setWorkshopsTitle] = useState(initial.home_workshops_title);
  const [workshopsText, setWorkshopsText] = useState(initial.home_workshops_text);
  const [workshopsCta, setWorkshopsCta] = useState(initial.home_workshops_cta);

  // O mnie
  const [aboutImage, setAboutImage] = useState(initial.about_hero_image);
  const [aboutHeroPos, setAboutHeroPos] = useState(initial.about_hero_position);
  const [aboutHeroEyebrow, setAboutHeroEyebrow] = useState(initial.about_hero_eyebrow);
  const [aboutHeroTitle, setAboutHeroTitle] = useState(initial.about_hero_title);
  const [aboutOverlayColor, setAboutOverlayColor] = useState(initial.about_hero_overlay_color);
  const [aboutOverlayOpacity, setAboutOverlayOpacity] = useState(initial.about_hero_overlay_opacity);
  const [aboutHeroHeight, setAboutHeroHeight] = useState(initial.about_hero_height);
  // Galeria przy opisie – stare pojedyncze zdjęcie staje się pierwszym elementem
  const [aboutGallery, setAboutGallery] = useState(() =>
    JSON.stringify(parseGallery(initial.about_content_gallery, initial.about_content_image, initial.about_content_position))
  );
  const [aboutStory, setAboutStory] = useState(initial.about_story);
  const [similarMinScore, setSimilarMinScore] = useState(
    String(normalizeMinScore(initial.similar_min_score))
  );
  const [aboutValuesTitle, setAboutValuesTitle] = useState(initial.about_values_title);
  const [aboutValues, setAboutValues] = useState(initial.about_values);

  // Warsztaty
  const [workshopsImage, setWorkshopsImage] = useState(initial.workshops_hero_image);
  const [workshopsHeroPos, setWorkshopsHeroPos] = useState(initial.workshops_hero_position);
  const [workshopsHeroEyebrow, setWorkshopsHeroEyebrow] = useState(initial.workshops_hero_eyebrow);
  const [workshopsHeroTitle, setWorkshopsHeroTitle] = useState(initial.workshops_hero_title);
  const [workshopsOverlayColor, setWorkshopsOverlayColor] = useState(initial.workshops_hero_overlay_color);
  const [workshopsOverlayOpacity, setWorkshopsOverlayOpacity] = useState(initial.workshops_hero_overlay_opacity);
  const [workshopsHeroHeight, setWorkshopsHeroHeight] = useState(initial.workshops_hero_height);
  const [workshopsGallery, setWorkshopsGallery] = useState(() =>
    JSON.stringify(parseGallery(initial.workshops_content_gallery, initial.workshops_content_image, initial.workshops_content_position))
  );
  const [workshopsIntro, setWorkshopsIntro] = useState(initial.workshops_intro);
  // Galeria przy liście „Co zawiera warsztat?" – osobna od tej przy wprowadzeniu
  const [workshopsIncludesGallery, setWorkshopsIncludesGallery] = useState(() =>
    JSON.stringify(parseGallery(initial.workshops_includes_gallery))
  );
  const [workshopsOffers, setWorkshopsOffers] = useState(initial.workshops_offers);
  const [workshopsIncludes, setWorkshopsIncludes] = useState(initial.workshops_includes);
  const [workshopsFaq, setWorkshopsFaq] = useState(initial.workshops_faq);

  // Regulamin
  const [regulamin, setRegulamin] = useState(initial.regulamin);

  // Polityka prywatności
  const [polityka, setPolityka] = useState(initial.polityka_prywatnosci);

  // Kontakt
  const [phone, setPhone] = useState(initial.contact_phone);
  const [email, setEmail] = useState(initial.contact_email);
  const [instagram, setInstagram] = useState(initial.contact_instagram);
  const [facebook, setFacebook] = useState(initial.contact_facebook);
  const [youtube, setYoutube] = useState(initial.contact_youtube);
  const [whatsapp, setWhatsapp] = useState(initial.contact_whatsapp);
  const [hours, setHours] = useState(initial.contact_hours);
  const [addrStreet, setAddrStreet] = useState(initial.contact_address_street);
  const [addrCity, setAddrCity] = useState(initial.contact_address_city);
  const [addrRegion, setAddrRegion] = useState(initial.contact_address_region);

  // Wysyłka
  const [shippingCost, setShippingCost] = useState(initial.shipping_cost);
  const [shippingCostParcel, setShippingCostParcel] = useState(initial.shipping_cost_parcel_locker);
  const [shippingTime, setShippingTime] = useState(initial.shipping_time);
  // Plakietka „Ostatnie sztuki” na kafelkach (stan ≤ 2) – właściciel może ją wyłączyć
  const [lowStockBadge, setLowStockBadge] = useState(initial.low_stock_badge_enabled !== "false");

  // Przelew
  const [bankName, setBankName] = useState(initial.payment_bank_account_name);
  const [bankNumber, setBankNumber] = useState(initial.payment_bank_account_number);
  const [bankBankName, setBankBankName] = useState(initial.payment_bank_name);
  const [bankTitle, setBankTitle] = useState(initial.payment_bank_transfer_title);

  // BLIK
  const [blikEnabled, setBlikEnabled] = useState(initial.payment_blik_enabled === "true");
  const [blikPhone, setBlikPhone] = useState(initial.payment_blik_phone);

  // Stripe
  const [stripeEnabled, setStripeEnabled] = useState(initial.payment_stripe_enabled === "true");

  // Podatki – wartości przechodzą przez `parseTaxConfig`, żeby stare/puste
  // ustawienia wracały do defaultów tak samo jak w analityce i raporcie PDF
  const taxInitial = parseTaxConfig(initial);
  const [taxMode, setTaxMode] = useState<TaxMode>(taxInitial.mode);
  const [taxForm, setTaxForm] = useState<TaxForm>(taxInitial.form);
  const [taxLumpRate, setTaxLumpRate] = useState(String(taxInitial.lumpRate).replace(".", ","));
  const [taxVatEnabled, setTaxVatEnabled] = useState(taxInitial.vatEnabled);
  const [taxVatRate, setTaxVatRate] = useState(String(taxInitial.vatRate).replace(".", ","));
  const [taxZusSocial, setTaxZusSocial] = useState(String(taxInitial.zusSocialMonthly).replace(".", ","));
  const [taxMinWage, setTaxMinWage] = useState(String(taxInitial.minWage).replace(".", ","));
  const [taxAvgWage, setTaxAvgWage] = useState(String(taxInitial.avgWage).replace(".", ","));

  // Urlop
  const [vacationEnabled, setVacationEnabled] = useState(initial.vacation_enabled === "true");
  const [vacationEndDate, setVacationEndDate] = useState(initial.vacation_end_date);
  const [vacationMessage, setVacationMessage] = useState(initial.vacation_message);

  // Zamówienia indywidualne
  const [customOrderNotifyEnabled, setCustomOrderNotifyEnabled] = useState(
    initial.custom_order_notify_email_enabled !== "false"
  );

  // AI (zdjęcia produktów) – model spoza allowlisty wraca do domyślnego
  const [aiModel, setAiModel] = useState(() => resolveAiModel("ai", initial.ai_image_model));
  const [aiModelPlus, setAiModelPlus] = useState(() =>
    resolveAiModel("ai_plus", initial.ai_image_model_plus)
  );
  const [aiTextModel, setAiTextModel] = useState(() => resolveAiTextModel(initial.ai_text_model));
  // Model rozumowania agenta dodawania produktów – domyślnie ten sam co tekstowy
  const [aiAgentModel, setAiAgentModel] = useState(() =>
    resolveAiAgentModel(initial.ai_agent_model, initial.ai_text_model)
  );
  const [aiRate, setAiRate] = useState(initial.ai_usd_pln_rate);
  // Presety promptów: własne trzymamy jako JSON (tak trafiają do ustawień),
  // a osobno identyfikator presetu przypisanego do każdego z przycisków
  const [aiPresets, setAiPresets] = useState(initial.ai_prompt_presets);
  const [aiPresetAi, setAiPresetAi] = useState(initial.ai_prompt_preset_ai);
  const [aiPresetAiPlus, setAiPresetAiPlus] = useState(initial.ai_prompt_preset_ai_plus);
  // Test cenowy „wysyłka w cenie produktu"
  const aiRateNumber = Math.max(0, parseFloat(aiRate.replace(",", ".")) || 0);

  const save = async (pairs: { key: string; value: string }[]) => {
    setErrMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pairs),
      });
      const data = await res.json();
      if (data.ok) {
        setToast("ok");
        setTimeout(() => setToast(false), 3000);
      } else {
        setErrMsg(data.error ?? "Nieznany błąd serwera");
      }
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Błąd połączenia z serwerem");
    }
  };

  return (
    <div className="relative">
      {toast === "ok" && (
        <Toast>
          <div className="fixed top-6 right-6 z-50 bg-espresso text-cream text-sm px-5 py-3 shadow-lg">
            Zapisano!
          </div>
        </Toast>
      )}
      {errMsg && (
        <Toast>
          <div className="fixed top-6 right-6 z-50 bg-red-700 text-white text-sm px-5 py-4 shadow-lg max-w-sm">
            <p className="font-medium mb-1">Błąd zapisu</p>
            <p className="text-xs opacity-90 break-words">{errMsg}</p>
            <button
              onClick={() => setErrMsg("")}
              className="mt-2 text-xs underline hover:opacity-80"
            >
              Zamknij
            </button>
          </div>
        </Toast>
      )}

      {section === "strona_glowna" && (
        <div className="max-w-2xl space-y-8">
          <SectionHeading title="Strona główna" lang={lang} onLang={setLang} translatable />
          {lang === "en" ? (
            <SettingsEnglish
              section="strona_glowna"
              initial={english}
              source={{
                home_hero_eyebrow: heroEyebrow, home_hero_title: heroTitle, home_hero_text: heroText,
                home_hero_cta_primary: heroCtaPrimary, home_hero_cta_secondary: heroCtaSecondary, home_hero_scroll: heroScroll,
                home_about_eyebrow: aboutEyebrow, home_about_title: aboutTitle, home_about_text: aboutText, home_about_cta: aboutCta,
                home_workshops_eyebrow: workshopsEyebrow, home_workshops_title: workshopsTitle, home_workshops_text: workshopsText, home_workshops_cta: workshopsCta,
              }}
              save={save}
            />
          ) : (
            <>

              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/80">Sekcja hero (nagłówek)</h3>
                <p className="text-xs text-charcoal/80">Pierwsze zdjęcie widoczne po wejściu na stronę – duże, pełnoekranowe tło.</p>
                <ImageUploader
                  currentUrl={homeHeroImage}
                  onUploaded={(url) => setHomeHeroImage(url)}
                  label="Zdjęcie hero"
                />
                <FocalPointPicker
                  imageUrl={homeHeroImage}
                  value={homeHeroPos}
                  onChange={setHomeHeroPos}
                />
              </div>

              <div className="border-t border-sand pt-6 space-y-4">
                <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/80">Teksty sekcji hero</h3>
                <p className="text-xs text-charcoal/80">
                  Napisy na pierwszym ekranie strony głównej. <strong>Puste pole ukrywa dany element</strong> –
                  można zostawić samo zdjęcie. W nagłówku i opisie Enter łamie wiersz.
                </p>
                <Field
                  label="Napis nad nagłówkiem"
                  value={heroEyebrow}
                  setter={setHeroEyebrow}
                  placeholder={HOME_HERO_DEFAULT.eyebrow}
                />
                <MultilineField
                  label="Nagłówek"
                  value={heroTitle}
                  setter={setHeroTitle}
                  placeholder={HOME_HERO_DEFAULT.title}
                  rows={2}
                />
                <MultilineField
                  label="Opis pod nagłówkiem"
                  value={heroText}
                  setter={setHeroText}
                  placeholder={HOME_HERO_DEFAULT.text}
                  rows={4}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Przycisk 1 (do sklepu)"
                    value={heroCtaPrimary}
                    setter={setHeroCtaPrimary}
                    placeholder={HOME_HERO_DEFAULT.ctaPrimary}
                  />
                  <Field
                    label={"Przycisk 2 (do „O mnie”)"}
                    value={heroCtaSecondary}
                    setter={setHeroCtaSecondary}
                    placeholder={HOME_HERO_DEFAULT.ctaSecondary}
                  />
                </div>
                <Field
                  label="Napis przy strzałce na dole"
                  value={heroScroll}
                  setter={setHeroScroll}
                  placeholder={HOME_HERO_DEFAULT.scroll}
                />
              </div>

              <div className="border-t border-sand pt-6 space-y-4">
                <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/80">Sekcja „O mnie&rdquo;</h3>
                <p className="text-xs text-charcoal/80">Tło sekcji z historią – widoczne za tekstem na stronie głównej.</p>
                <ImageUploader
                  currentUrl={homeAboutImage}
                  onUploaded={(url) => setHomeAboutImage(url)}
                  label="Zdjęcie sekcji O mnie"
                />
                <FocalPointPicker
                  imageUrl={homeAboutImage}
                  value={homeAboutPos}
                  onChange={setHomeAboutPos}
                />
                <SectionTextFields
                  eyebrow={aboutEyebrow}
                  setEyebrow={setAboutEyebrow}
                  title={aboutTitle}
                  setTitle={setAboutTitle}
                  text={aboutText}
                  setText={setAboutText}
                  cta={aboutCta}
                  setCta={setAboutCta}
                  defaults={HOME_ABOUT_DEFAULT}
                  ctaLabel={'Przycisk (do „O mnie”)'}
                />
              </div>

              <div className="border-t border-sand pt-6 space-y-4">
                <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/80">Sekcja „Warsztaty&rdquo;</h3>
                <p className="text-xs text-charcoal/80">Tło sekcji warsztatów – widoczne za tekstem na stronie głównej.</p>
                <ImageUploader
                  currentUrl={homeWorkshopsImage}
                  onUploaded={(url) => setHomeWorkshopsImage(url)}
                  label="Zdjęcie sekcji Warsztaty"
                />
                <FocalPointPicker
                  imageUrl={homeWorkshopsImage}
                  value={homeWorkshopsPos}
                  onChange={setHomeWorkshopsPos}
                />
                <SectionTextFields
                  eyebrow={workshopsEyebrow}
                  setEyebrow={setWorkshopsEyebrow}
                  title={workshopsTitle}
                  setTitle={setWorkshopsTitle}
                  text={workshopsText}
                  setText={setWorkshopsText}
                  cta={workshopsCta}
                  setCta={setWorkshopsCta}
                  defaults={HOME_WORKSHOPS_DEFAULT}
                  ctaLabel={'Przycisk (do „Warsztaty”)'}
                />
              </div>

              <SaveButton
                onClick={() => save([
                  { key: "home_hero_image",        value: homeHeroImage },
                  { key: "home_hero_position",     value: homeHeroPos },
                  { key: "home_hero_eyebrow",         value: heroEyebrow },
                  { key: "home_hero_title",           value: heroTitle },
                  { key: "home_hero_text",            value: heroText },
                  { key: "home_hero_cta_primary",     value: heroCtaPrimary },
                  { key: "home_hero_cta_secondary",   value: heroCtaSecondary },
                  { key: "home_hero_scroll",          value: heroScroll },
                  { key: "home_about_image",       value: homeAboutImage },
                  { key: "home_about_position",       value: homeAboutPos },
                  { key: "home_about_eyebrow",        value: aboutEyebrow },
                  { key: "home_about_title",          value: aboutTitle },
                  { key: "home_about_text",           value: aboutText },
                  { key: "home_about_cta",            value: aboutCta },
                  { key: "home_workshops_image",      value: homeWorkshopsImage },
                  { key: "home_workshops_position",   value: homeWorkshopsPos },
                  { key: "home_workshops_eyebrow",    value: workshopsEyebrow },
                  { key: "home_workshops_title",      value: workshopsTitle },
                  { key: "home_workshops_text",       value: workshopsText },
                  { key: "home_workshops_cta",        value: workshopsCta },
                ])}
                label="Zapisz stronę główną"
              />
            </>
          )}
        </div>
      )}

      {section === "omnie" && (
        <div className="max-w-2xl space-y-8">
          <SectionHeading title="O mnie" lang={lang} onLang={setLang} translatable />
          {lang === "en" ? (
            <SettingsEnglish
              section="omnie"
              initial={english}
              source={{
                about_hero_eyebrow: aboutHeroEyebrow,
                about_hero_title: aboutHeroTitle,
                about_story: aboutStory,
                about_values_title: aboutValuesTitle,
                about_values: aboutValues,
              }}
              save={save}
            />
          ) : (
            <>

              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/80">Zdjęcie nagłówka (hero)</h3>
                <ImageUploader
                  currentUrl={aboutImage}
                  onUploaded={(url) => setAboutImage(url)}
                  label="Zdjęcie hero"
                />
                <FocalPointPicker imageUrl={aboutImage} value={aboutHeroPos} onChange={setAboutHeroPos} aspectRatio="3/1" />
                <OverlayControl
                  imageUrl={aboutImage}
                  position={aboutHeroPos}
                  color={aboutOverlayColor}
                  opacity={aboutOverlayOpacity}
                  onColorChange={setAboutOverlayColor}
                  onOpacityChange={setAboutOverlayOpacity}
                  aspectRatio="3/1"
                />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs tracking-widest uppercase text-charcoal/80">Wysokość nagłówka z obrazem</label>
                    <span className="text-sm font-medium text-espresso tabular-nums">{aboutHeroHeight}vh</span>
                  </div>
                  <input type="range" min="30" max="80" step="5" value={aboutHeroHeight} onChange={(e) => setAboutHeroHeight(e.target.value)} className="w-full accent-clay" />
                  <p className="text-[11px] text-charcoal/80">Aktywne gdy zdjęcie jest ustawione. Bez zdjęcia nagłówek ma jasne tło jak w /kontakt.</p>
                </div>
              </div>

              {/* Teksty nagłówka – jak na stronie głównej; pusty napis nad nagłówkiem
                  znika, pusty nagłówek wraca do domyślnego (strona musi mieć h1) */}
              <div className="border-t border-sand pt-6 space-y-4">
                <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/80">Teksty nagłówka</h3>
                <p className="text-xs text-charcoal/80">Wyświetlane na zdjęciu hero albo na jasnym tle, gdy zdjęcia nie ma. Pusty napis nad nagłówkiem go ukrywa; pusty nagłówek wraca do domyślnego.</p>
                <Field label="Napis nad nagłówkiem" value={aboutHeroEyebrow} setter={setAboutHeroEyebrow} placeholder={ABOUT_HEAD_DEFAULT.eyebrow} />
                <Field label="Nagłówek (h1)" value={aboutHeroTitle} setter={setAboutHeroTitle} placeholder={ABOUT_HEAD_DEFAULT.title} />
              </div>

              <div className="border-t border-sand pt-6 space-y-4">
                <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/80">Galeria przy opisie (prawa kolumna)</h3>
                <p className="text-xs text-charcoal/80">Jeżeli pusta – kolumna zdjęć znika, tekst zajmuje całą szerokość.</p>
                <GalleryEditor json={aboutGallery} onChange={setAboutGallery} />
              </div>

              <div className="border-t border-sand pt-6">
                <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">Treść – historia</label>
                <RichEditor value={aboutStory} onChange={setAboutStory} />
              </div>

              <div className="border-t border-sand pt-6 space-y-4">
                <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/80">Sekcja „Jak pracuję&rdquo;</h3>
                <p className="text-xs text-charcoal/80">Karty pod treścią strony. Pusty nagłówek ukrywa sam tytuł sekcji, brak kart – całą sekcję.</p>
                <div className="space-y-1.5">
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80">Nagłówek sekcji</label>
                  <input
                    type="text"
                    value={aboutValuesTitle}
                    onChange={(e) => setAboutValuesTitle(e.target.value)}
                    className="w-full bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay"
                    placeholder={ABOUT_VALUES_TITLE_DEFAULT}
                  />
                </div>
                <AboutValuesEditor json={aboutValues} onChange={setAboutValues} />
              </div>

              <SaveButton
                onClick={() => save([
                  { key: "about_hero_image",           value: aboutImage },
                  { key: "about_hero_position",        value: aboutHeroPos },
                  { key: "about_hero_overlay_color",   value: aboutOverlayColor },
                  { key: "about_hero_overlay_opacity", value: aboutOverlayOpacity },
                  { key: "about_hero_height",          value: aboutHeroHeight },
                  { key: "about_hero_eyebrow",         value: aboutHeroEyebrow },
                  { key: "about_hero_title",           value: aboutHeroTitle },
                  { key: "about_content_gallery",      value: aboutGallery },
                  // Stare klucze trzymamy zgodne z pierwszym zdjęciem galerii (zgodność wstecz)
                  { key: "about_content_image",        value: galleryHead(aboutGallery).url },
                  { key: "about_content_position",     value: galleryHead(aboutGallery).position },
                  { key: "about_story",                value: aboutStory },
                  { key: "about_values_title",         value: aboutValuesTitle },
                  { key: "about_values",               value: aboutValues },
                ])}
                label="Zapisz stronę O mnie"
              />
            </>
          )}
        </div>
      )}


      {section === "warsztaty" && (
        <div className="max-w-2xl space-y-8">
          <SectionHeading title="Warsztaty" lang={lang} onLang={setLang} translatable />
          {lang === "en" ? (
            <SettingsEnglish
              section="warsztaty"
              initial={english}
              source={{
                workshops_hero_eyebrow: workshopsHeroEyebrow,
                workshops_hero_title: workshopsHeroTitle,
                workshops_intro: workshopsIntro,
                workshops_offers: workshopsOffers,
                workshops_includes: workshopsIncludes,
                workshops_faq: workshopsFaq,
              }}
              save={save}
            />
          ) : (
            <>

              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/80">Zdjęcie nagłówka (hero)</h3>
                <ImageUploader
                  currentUrl={workshopsImage}
                  onUploaded={(url) => setWorkshopsImage(url)}
                  label="Zdjęcie hero"
                />
                <FocalPointPicker imageUrl={workshopsImage} value={workshopsHeroPos} onChange={setWorkshopsHeroPos} aspectRatio="3/1" />
                <OverlayControl
                  imageUrl={workshopsImage}
                  position={workshopsHeroPos}
                  color={workshopsOverlayColor}
                  opacity={workshopsOverlayOpacity}
                  onColorChange={setWorkshopsOverlayColor}
                  onOpacityChange={setWorkshopsOverlayOpacity}
                  aspectRatio="3/1"
                />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs tracking-widest uppercase text-charcoal/80">Wysokość nagłówka z obrazem</label>
                    <span className="text-sm font-medium text-espresso tabular-nums">{workshopsHeroHeight}vh</span>
                  </div>
                  <input type="range" min="30" max="80" step="5" value={workshopsHeroHeight} onChange={(e) => setWorkshopsHeroHeight(e.target.value)} className="w-full accent-clay" />
                  <p className="text-[11px] text-charcoal/80">Aktywne gdy zdjęcie jest ustawione. Bez zdjęcia nagłówek ma jasne tło jak w /kontakt.</p>
                </div>
              </div>

              {/* Teksty nagłówka – jak na stronie głównej; pusty napis nad nagłówkiem
                  znika, pusty nagłówek wraca do domyślnego (strona musi mieć h1) */}
              <div className="border-t border-sand pt-6 space-y-4">
                <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/80">Teksty nagłówka</h3>
                <p className="text-xs text-charcoal/80">Wyświetlane na zdjęciu hero albo na jasnym tle, gdy zdjęcia nie ma. Pusty napis nad nagłówkiem go ukrywa; pusty nagłówek wraca do domyślnego. Nagłówek z „Gliwice” pomaga w wyszukiwarce – nie usuwaj nazwy miasta bez potrzeby.</p>
                <Field label="Napis nad nagłówkiem" value={workshopsHeroEyebrow} setter={setWorkshopsHeroEyebrow} placeholder={WORKSHOPS_HEAD_DEFAULT.eyebrow} />
                <Field label="Nagłówek (h1)" value={workshopsHeroTitle} setter={setWorkshopsHeroTitle} placeholder={WORKSHOPS_HEAD_DEFAULT.title} />
              </div>

              <div className="border-t border-sand pt-6 space-y-4">
                <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/80">Galeria przy opisie (prawa kolumna)</h3>
                <p className="text-xs text-charcoal/80">Jeżeli pusta – kolumna zdjęć znika, tekst zajmuje całą szerokość.</p>
                <GalleryEditor json={workshopsGallery} onChange={setWorkshopsGallery} />
              </div>

              <div className="border-t border-sand pt-6">
                <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">Tekst wprowadzający</label>
                <RichEditor value={workshopsIntro} onChange={setWorkshopsIntro} contentClass="rich-content-lg" />
              </div>

              <div className="border-t border-sand pt-6 space-y-4">
                <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/80">Galeria przy „Co zawiera warsztat?&rdquo;</h3>
                <p className="text-xs text-charcoal/80">Zdjęcia obok listy z wyposażeniem warsztatu. Jeżeli pusta – lista zajmuje całą szerokość.</p>
                <GalleryEditor json={workshopsIncludesGallery} onChange={setWorkshopsIncludesGallery} />
              </div>

              <div className="border-t border-sand pt-6">
                <WorkshopsOffersEditor
                  offersJson={workshopsOffers}
                  includesJson={workshopsIncludes}
                  faqJson={workshopsFaq}
                  onOffersChange={setWorkshopsOffers}
                  onIncludesChange={setWorkshopsIncludes}
                  onFaqChange={setWorkshopsFaq}
                />
              </div>

              <SaveButton
                onClick={() => save([
                  { key: "workshops_hero_image",           value: workshopsImage },
                  { key: "workshops_hero_position",        value: workshopsHeroPos },
                  { key: "workshops_hero_overlay_color",   value: workshopsOverlayColor },
                  { key: "workshops_hero_overlay_opacity", value: workshopsOverlayOpacity },
                  { key: "workshops_hero_height",          value: workshopsHeroHeight },
                  { key: "workshops_hero_eyebrow",         value: workshopsHeroEyebrow },
                  { key: "workshops_hero_title",           value: workshopsHeroTitle },
                  { key: "workshops_content_gallery",      value: workshopsGallery },
                  // Stare klucze trzymamy zgodne z pierwszym zdjęciem galerii (zgodność wstecz)
                  { key: "workshops_content_image",        value: galleryHead(workshopsGallery).url },
                  { key: "workshops_content_position",     value: galleryHead(workshopsGallery).position },
                  { key: "workshops_intro",                value: workshopsIntro },
                  { key: "workshops_includes_gallery",     value: workshopsIncludesGallery },
                  { key: "workshops_offers",               value: workshopsOffers },
                  { key: "workshops_includes",             value: workshopsIncludes },
                  { key: "workshops_faq",                  value: workshopsFaq },
                ])}
                label="Zapisz stronę Warsztaty"
              />
            </>
          )}
        </div>
      )}

      {section === "regulamin" && (
        <div className="max-w-2xl space-y-4">
          <h2 className="font-serif text-2xl text-espresso">Regulamin</h2>
          <RichEditor value={regulamin} onChange={setRegulamin} />
          <SaveButton
            onClick={() => save([{ key: "regulamin", value: regulamin }])}
            label="Zapisz regulamin"
          />
        </div>
      )}

      {section === "polityka" && (
        <div className="max-w-2xl space-y-4">
          <h2 className="font-serif text-2xl text-espresso">Polityka prywatności</h2>
          <RichEditor value={polityka} onChange={setPolityka} />
          <SaveButton
            onClick={() => save([{ key: "polityka_prywatnosci", value: polityka }])}
            label="Zapisz politykę prywatności"
          />
        </div>
      )}

      {section === "kontakt" && (
        <div className="max-w-md space-y-5">
          <SectionHeading title="Dane kontaktowe" lang={lang} onLang={setLang} translatable />
          {lang === "en" ? (
            <SettingsEnglish
              section="kontakt"
              initial={english}
              source={{ contact_hours: hours }}
              save={save}
            />
          ) : (
            <>
              <Field label="Telefon" value={phone} setter={setPhone} type="tel" />
              <Field label="E-mail" value={email} setter={setEmail} type="email" />
              <Field label="Instagram (np. @unique.ceramics)" value={instagram} setter={setInstagram} />
              <Field label="Facebook (pełny URL strony)" value={facebook} setter={setFacebook} placeholder="https://facebook.com/..." />
              <Field label="YouTube (pełny URL kanału)" value={youtube} setter={setYoutube} placeholder="https://youtube.com/..." />
              <Field label="WhatsApp (numer telefonu, np. 48668443706)" value={whatsapp} setter={setWhatsapp} placeholder="48668443706" />
              <p className="text-xs text-charcoal/80">Facebook, YouTube i WhatsApp wyświetlają się w stopce tylko gdy są wypełnione.</p>

              <h2 className="font-serif text-2xl text-espresso pt-4">Adres pracowni</h2>
              <Field label="Ulica i numer" value={addrStreet} setter={setAddrStreet} placeholder="ul. Familijna 23" />
              <Field label="Kod pocztowy i miejscowość" value={addrCity} setter={setAddrCity} placeholder="44-164 Kleszczów (k. Gliwic)" />
              <Field label="Województwo (opcjonalnie)" value={addrRegion} setter={setAddrRegion} placeholder="woj. śląskie" />

              <h2 className="font-serif text-2xl text-espresso pt-4">Godziny otwarcia</h2>
              <MultilineField
                label="Godziny otwarcia (Enter = nowy wiersz)"
                value={hours}
                setter={setHours}
                rows={3}
                placeholder={"Wt–Czw 17:00–19:00\nSo 15:00–17:00"}
              />
              <p className="text-xs text-charcoal/80">
                Adres i godziny wyświetlają się w kolumnie &bdquo;Kontakt&rdquo; w stopce oraz na stronie /kontakt.
                Każdy <strong>Enter</strong> łamie wiersz dokładnie w tym miejscu – przecinek też rozdziela wpisy,
                ale wtedy o złamaniu decyduje szerokość ekranu.
                Godziny trafiają do danych strukturalnych (SEO), więc zachowaj format
                <span className="font-mono"> Skrót dni HH:MM–HH:MM</span> w każdym wierszu,
                np. <span className="font-mono">Wt–Czw 17:00–19:00</span>.
              </p>

              <SaveButton
                onClick={() => save([
                  { key: "contact_phone", value: phone },
                  { key: "contact_email", value: email },
                  { key: "contact_instagram", value: instagram },
                  { key: "contact_facebook", value: facebook },
                  { key: "contact_youtube", value: youtube },
                  { key: "contact_whatsapp", value: whatsapp },
                  { key: "contact_hours", value: hours },
                  { key: "contact_address_street", value: addrStreet },
                  { key: "contact_address_city", value: addrCity },
                  { key: "contact_address_region", value: addrRegion },
                ])}
                label="Zapisz kontakt"
              />
            </>
          )}
        </div>
      )}

      {section === "wysylka" && (
        <div className="max-w-md space-y-6">
          <h2 className="font-serif text-2xl text-espresso">Wysyłka</h2>
          <Field label="Koszt wysyłki – Kurier (zł)" value={shippingCost} setter={setShippingCost} type="number" />
          <Field label="Koszt wysyłki – Paczkomat InPost (zł)" value={shippingCostParcel} setter={setShippingCostParcel} type="number" />
          <Field label="Czas realizacji (tekst na karcie produktu)" value={shippingTime} setter={setShippingTime} placeholder="np. 2–4 dni robocze" />
          {/* Darmowa wysyłka jest promocją z oknem czasu, nie stałym progiem –
              stąd odesłanie zamiast pól */}
          <p className="text-xs text-charcoal/80 leading-relaxed border border-sand bg-cream p-3">
            Darmowa wysyłka ma własną promocję z terminem obowiązywania – ustawisz ją
            w zakładce{" "}
            <Link href="/admin/promocje" className="text-clay underline underline-offset-2">
              Promocje
            </Link>
            . Odbiór osobisty jest bezpłatny zawsze.
          </p>

          <SaveButton
            onClick={() => save([
              { key: "shipping_cost", value: shippingCost },
              { key: "shipping_cost_parcel_locker", value: shippingCostParcel },
              { key: "shipping_time", value: shippingTime },
            ])}
            label="Zapisz wysyłkę"
          />
        </div>
      )}

      {section === "platnosci_przelew" && (
        <div className="max-w-md space-y-5">
          <h2 className="font-serif text-2xl text-espresso">Przelew bankowy / BLIK</h2>
          <p className="text-xs text-charcoal/80">
            Zawsze dostępny jako metoda płatności. Dane zostaną wysłane klientowi e-mailem po złożeniu zamówienia.
          </p>
          <Field label="Imię i nazwisko / Nazwa odbiorcy" value={bankName} setter={setBankName} />
          <Field label="Numer konta (IBAN)" value={bankNumber} setter={setBankNumber} mono />
          <Field label="Nazwa banku" value={bankBankName} setter={setBankBankName} />
          <Field label="Prefiks tytułu przelewu" value={bankTitle} setter={setBankTitle} />
          <p className="text-xs text-charcoal/80">Tytuł wysyłany do kupującego: „[prefiks] #NR_ZAMÓWIENIA&rdquo;</p>
          <div className="border-t border-sand pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs tracking-widest uppercase text-charcoal/80">Przelew BLIK na telefon</p>
              <Toggle checked={blikEnabled} onChange={setBlikEnabled} />
            </div>
            {blikEnabled && (
              <>
                <p className="text-xs text-charcoal/80 mb-3">
                  Klient zobaczy numer BLIK obok danych do przelewu bankowego.
                </p>
                <Field label="Numer telefonu do BLIK" value={blikPhone} setter={setBlikPhone} type="tel" placeholder="+48 600 000 000" />
              </>
            )}
          </div>
          <SaveButton
            onClick={() => save([
              { key: "payment_bank_account_name", value: bankName },
              { key: "payment_bank_account_number", value: bankNumber },
              { key: "payment_bank_name", value: bankBankName },
              { key: "payment_bank_transfer_title", value: bankTitle },
              { key: "payment_blik_enabled", value: blikEnabled ? "true" : "false" },
              { key: "payment_blik_phone", value: blikPhone },
            ])}
            label="Zapisz"
          />
        </div>
      )}

      {section === "urlop" && (
        <div className="max-w-md space-y-6">
          <SectionHeading title="Urlop" lang={lang} onLang={setLang} translatable />
          {lang === "en" ? (
            <SettingsEnglish
              section="urlop"
              initial={english}
              source={{ vacation_message: vacationMessage }}
              save={save}
            />
          ) : (
            <>
              <p className="text-xs text-charcoal/80 leading-relaxed">
                Gdy urlop jest włączony, w sklepie pojawia się pasek informacyjny,
                a zamówienia złożone w tym czasie zawierają wzmiankę w e-mailu potwierdzającym.
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs tracking-widest uppercase text-charcoal/80">Tryb urlopu aktywny</span>
                <Toggle checked={vacationEnabled} onChange={setVacationEnabled} />
              </div>

              {vacationEnabled && (
                <>
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                      Realizacja zamówień od
                    </label>
                    <input
                      type="date"
                      value={vacationEndDate}
                      onChange={(e) => setVacationEndDate(e.target.value)}
                      className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
                    />
                    <p className="text-[11px] text-charcoal/80 mt-1">
                      Jeśli puste – komunikat nie będzie zawierał daty.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                      Własna wiadomość (opcjonalnie)
                    </label>
                    <input
                      type="text"
                      value={vacationMessage}
                      onChange={(e) => setVacationMessage(e.target.value)}
                      placeholder="Jestem na urlopie – zamówienia będą realizowane od..."
                      className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
                    />
                    <p className="text-[11px] text-charcoal/80 mt-1">
                      Jeśli puste – komunikat zostanie wygenerowany automatycznie na podstawie daty.
                    </p>
                  </div>
                </>
              )}

              <SaveButton
                onClick={() => save([
                  { key: "vacation_enabled", value: vacationEnabled ? "true" : "false" },
                  { key: "vacation_end_date", value: vacationEndDate },
                  { key: "vacation_message", value: vacationMessage },
                ])}
                label="Zapisz ustawienia urlopu"
              />
            </>
          )}
        </div>
      )}

      {section === "zam_indywidualne" && (
        <div className="max-w-md space-y-6">
          <h2 className="font-serif text-2xl text-espresso">Zamówienia indywidualne</h2>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs tracking-widest uppercase text-charcoal/80">Powiadomienia e-mail</span>
              <p className="text-[11px] text-charcoal/80 mt-0.5">
                Gdy włączone – przy każdym nowym zamówieniu indywidualnym
                zostanie wysłany e-mail na adres kontaktowy sklepu.
              </p>
            </div>
            <Toggle checked={customOrderNotifyEnabled} onChange={setCustomOrderNotifyEnabled} />
          </div>

          <SaveButton
            onClick={() => save([
              { key: "custom_order_notify_email_enabled", value: customOrderNotifyEnabled ? "true" : "false" },
            ])}
            label="Zapisz"
          />
        </div>
      )}

      {section === "proponowane" && (
        <div className="max-w-2xl space-y-6">
          <h2 className="font-serif text-2xl text-espresso">Proponowane produkty</h2>
          <p className="text-xs text-charcoal/80 leading-relaxed">
            Pod kartą produktu stoi karuzela „Mogą Ci się spodobać” – do {SIMILAR_LIMIT} pozycji,
            bez wyprzedanych. Każdy produkt ze sklepu dostaje punkty za to, czym przypomina
            oglądany, a do karuzeli trafiają te z najwyższym wynikiem.
          </p>

          <div className="border border-sand">
            <div className="flex items-center justify-between px-4 py-2 bg-cream text-[11px] tracking-widest uppercase text-charcoal/80">
              <span>Podobieństwo</span>
              <span>Punkty</span>
            </div>
            <div className="divide-y divide-sand">
              {SIMILARITY_RULES.map((rule) => (
                <div key={rule.label} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm text-espresso">{rule.label}</p>
                    <p className="text-[11px] text-charcoal/80 mt-0.5">{rule.hint}</p>
                  </div>
                  <span className="text-sm font-medium text-espresso tabular-nums shrink-0">
                    +{rule.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-charcoal/80">
            Punkty się sumują – produkt z tej samej kolekcji i kategorii, w zbliżonej cenie,
            zbiera {SIMILARITY_RULES[0].points + SIMILARITY_RULES[1].points + SIMILARITY_RULES[2].points} pkt.
            Remisy rozstrzygane są stale, więc kolejność nie skacze przy odświeżeniu strony.
          </p>

          <div className="border-t border-sand pt-6 space-y-3">
            <label className="block text-xs tracking-widest uppercase text-charcoal/80">
              Minimalna liczba punktów
            </label>
            <select
              value={similarMinScore}
              onChange={(e) => setSimilarMinScore(e.target.value)}
              className="w-full bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay"
            >
              {SIMILARITY_THRESHOLDS.map((threshold) => (
                <option key={threshold.value} value={String(threshold.value)}>
                  {threshold.label}
                </option>
              ))}
              {/* Wartość spoza listy (wpisana wcześniej ręcznie) ma zostać widoczna */}
              {!SIMILARITY_THRESHOLDS.some((t) => String(t.value) === similarMinScore) && (
                <option value={similarMinScore}>Własny próg: {similarMinScore} pkt</option>
              )}
            </select>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={MAX_SIMILARITY_SCORE}
                step={1}
                value={similarMinScore}
                onChange={(e) => setSimilarMinScore(e.target.value)}
                className="w-28 bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay"
              />
              <span className="text-[11px] text-charcoal/80">
                pkt (0–{MAX_SIMILARITY_SCORE}); 0 = bez progu
              </span>
            </div>
            <p className="text-[11px] text-charcoal/80 leading-relaxed">
              Produkt poniżej progu nie trafi do karuzeli. Przy wysokim progu sekcja potrafi
              zniknąć z karty produktu – to zamierzone: lepiej nie proponować nic, niż coś
              niepasującego. Zmiana działa po odświeżeniu stron sklepu (do minuty).
            </p>
          </div>

          {/* Plakietki na kafelkach – to samo miejsce, co reszta ustawień „jak pokazujemy produkty” */}
          <div className="border-t border-sand pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="block text-xs tracking-widest uppercase text-charcoal/80">Plakietka „Ostatnie sztuki”</span>
                <p className="text-[11px] text-charcoal/80 mt-1">
                  Na kafelkach produktów, których zostały 1–2 sztuki – w katalogu, na stronie głównej i w karuzeli „Mogą Ci się spodobać”.
                </p>
              </div>
              <Toggle checked={lowStockBadge} onChange={setLowStockBadge} />
            </div>
          </div>

          <SaveButton
            onClick={() => save([
              { key: SIMILAR_MIN_SCORE_KEY, value: String(normalizeMinScore(similarMinScore)) },
              { key: "low_stock_badge_enabled", value: lowStockBadge ? "true" : "false" },
            ])}
            label="Zapisz ustawienia proponowanych"
          />
        </div>
      )}

      {section === "podatki" && (
        <div className="max-w-2xl space-y-6">
          <h2 className="font-serif text-2xl text-espresso">Podatki</h2>
          <p className="text-xs text-charcoal/80 leading-relaxed">
            Ustawienia decydują, jak <Link href="/admin/analityki" className="text-clay hover:text-espresso">Analityka</Link> i raporty PDF
            liczą PIT, składki i VAT. Nie zmieniają cen w sklepie ani treści regulaminu – to trzeba poprawić osobno.
            Kwoty są orientacyjne; progi i stawki zmieniają się co rok.
          </p>

          {/* Tryb działalności */}
          <div className="space-y-2">
            <span className="block text-xs tracking-widest uppercase text-charcoal/80">Forma działalności</span>
            {([
              ["unregistered", "Działalność nierejestrowana", "PIT wg skali od przychodu z produktów (12% albo 32% zaznaczane ręcznie), bez ZUS, limit przychodu 225% płacy minimalnej na kwartał."],
              ["registered", "Działalność gospodarcza (JDG)", "Forma opodatkowania do wyboru, koszty wpisywane co miesiąc w Analityce, ZUS społeczne i składka zdrowotna liczone automatycznie."],
            ] as const).map(([value, label, hint]) => (
              <label key={value} className={`flex items-start gap-3 border p-3 cursor-pointer transition-colors ${taxMode === value ? "border-clay bg-cream" : "border-sand bg-warm-white hover:border-clay/60"}`}>
                <input type="radio" name="tax_mode" value={value} checked={taxMode === value} onChange={() => setTaxMode(value)} className="mt-1 accent-clay" />
                <span>
                  <span className="block text-sm text-espresso">{label}</span>
                  <span className="block text-[11px] text-charcoal/80 mt-0.5 leading-relaxed">{hint}</span>
                </span>
              </label>
            ))}
          </div>

          {taxMode === "registered" && (
            <div className="space-y-5 border-t border-sand pt-5">
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Forma opodatkowania</label>
                <select
                  value={taxForm}
                  onChange={(e) => setTaxForm(e.target.value as TaxForm)}
                  className="w-full bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay"
                >
                  {(Object.keys(TAX_FORM_LABELS) as TaxForm[]).map((f) => (
                    <option key={f} value={f}>{TAX_FORM_LABELS[f]}</option>
                  ))}
                </select>
                <p className="text-[11px] text-charcoal/80 mt-1 leading-relaxed">
                  {taxForm === "scale" && "Zaliczki liczone narastająco: kwota wolna 30 000 zł, 12% do 120 000 zł dochodu, 32% powyżej. Składka zdrowotna 9% dochodu."}
                  {taxForm === "linear" && "19% od dochodu. Składka zdrowotna 4,9% dochodu, odliczana od dochodu do rocznego limitu."}
                  {taxForm === "lump" && "Podatek od przychodu (bez kosztów), pomniejszonego o ZUS społeczne i połowę składki zdrowotnej. Zdrowotna wg progów przychodu: 60 000 / 300 000 zł."}
                </p>
              </div>

              {taxForm === "lump" && (
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Stawka ryczałtu (%)</label>
                  <input
                    type="text" inputMode="decimal" value={taxLumpRate} onChange={(e) => setTaxLumpRate(e.target.value)}
                    className="w-32 bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay tabular-nums"
                  />
                  <ul className="text-[11px] text-charcoal/80 mt-2 space-y-0.5">
                    {LUMP_RATE_HINTS.map((h) => (
                      <li key={h.rate}>
                        <button type="button" onClick={() => setTaxLumpRate(String(h.rate).replace(".", ","))} className="text-clay hover:text-espresso">
                          {h.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">ZUS społeczne miesięcznie (zł)</label>
                <input
                  type="text" inputMode="decimal" value={taxZusSocial} onChange={(e) => setTaxZusSocial(e.target.value)}
                  className="w-32 bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay tabular-nums"
                />
                <p className="text-[11px] text-charcoal/80 mt-1">
                  0 przy uldze na start (pierwsze 6 miesięcy). Potem „mały ZUS” albo pełna składka – kwota z ZUS. Odliczana od dochodu.
                </p>
              </div>

              {taxForm === "lump" && (
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Przeciętne wynagrodzenie (zł)</label>
                  <input
                    type="text" inputMode="decimal" value={taxAvgWage} onChange={(e) => setTaxAvgWage(e.target.value)}
                    className="w-32 bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay tabular-nums"
                  />
                  <p className="text-[11px] text-charcoal/80 mt-1">
                    Przeciętne miesięczne wynagrodzenie w sektorze przedsiębiorstw w IV kwartale poprzedniego roku (GUS) – podstawa składki zdrowotnej przy ryczałcie.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-sand pt-5">
            <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Minimalne wynagrodzenie (zł)</label>
            <input
              type="text" inputMode="decimal" value={taxMinWage} onChange={(e) => setTaxMinWage(e.target.value)}
              className="w-32 bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay tabular-nums"
            />
            <p className="text-[11px] text-charcoal/80 mt-1">
              {taxMode === "registered"
                ? "Podstawa minimalnej składki zdrowotnej (9% z 75% tej kwoty)."
                : "Podstawa limitu działalności nierejestrowanej (225% na kwartał). Edytowalne także w Analityce."}
            </p>
          </div>

          {/* VAT */}
          <div className="border-t border-sand pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs tracking-widest uppercase text-charcoal/80">Podatnik VAT</span>
              <Toggle checked={taxVatEnabled} onChange={setTaxVatEnabled} />
            </div>
            {taxVatEnabled ? (
              <>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Stawka VAT (%)</label>
                  <input
                    type="text" inputMode="decimal" value={taxVatRate} onChange={(e) => setTaxVatRate(e.target.value)}
                    className="w-32 bg-warm-white border border-sand text-espresso text-sm px-3 py-2 outline-none focus:border-clay tabular-nums"
                  />
                </div>
                <p className="text-[11px] text-charcoal/80 leading-relaxed">
                  Ceny w sklepie traktowane są jako <strong className="font-medium">brutto</strong> – analityka wylicza z nich netto i VAT należny,
                  a PIT liczy od netto. VAT naliczony z zakupów odejmie księgowość.
                </p>
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[12px] p-3 leading-relaxed">
                  <strong className="font-medium">Pamiętaj o regulaminie.</strong> Obecna treść (punkty o cenach i rachunkach) mówi, że sprzedawca
                  nie jest podatnikiem VAT i nie wystawia faktur. Po włączeniu VAT popraw ją w zakładce „Regulamin”, a w e-mailach
                  i na rachunkach podawaj kwoty z VAT.
                </div>
              </>
            ) : (
              <p className="text-[11px] text-charcoal/80">
                Zwolnienie podmiotowe obowiązuje do 200 000 zł sprzedaży rocznie (art. 113 ustawy o VAT). Po przekroczeniu – włącz VAT.
              </p>
            )}
          </div>

          <SaveButton
            onClick={() => save([
              { key: TAX_MODE_KEY, value: taxMode },
              { key: TAX_FORM_KEY, value: taxForm },
              { key: TAX_LUMP_RATE_KEY, value: taxLumpRate.replace(",", ".") },
              { key: TAX_VAT_ENABLED_KEY, value: taxVatEnabled ? "true" : "false" },
              { key: TAX_VAT_RATE_KEY, value: taxVatRate.replace(",", ".") },
              { key: TAX_ZUS_SOCIAL_KEY, value: taxZusSocial.replace(",", ".") },
              { key: TAX_AVG_WAGE_KEY, value: taxAvgWage.replace(",", ".") },
              { key: TAX_MIN_WAGE_KEY, value: taxMinWage.replace(",", ".") },
            ])}
            label="Zapisz ustawienia podatków"
          />
        </div>
      )}

      {section === "zdjecia" && (
        <div className="space-y-8">
          <ImageVariantsPanel />
          <StorageCleanupPanel />
        </div>
      )}

      {section === "ai" && (
        <div className="max-w-2xl space-y-6">
          <h2 className="font-serif text-2xl text-espresso">AI – zdjęcia i opisy produktów</h2>
          <p className="text-xs text-charcoal/80 leading-relaxed">
            W edycji produktu pod każdym zdjęciem są przyciski <strong className="font-medium">AI</strong> i{" "}
            <strong className="font-medium">AI+</strong> (nowe zdjęcie na podstawie istniejącego), a pod
            opisem przycisk <strong className="font-medium">Uzupełnij przy użyciu AI</strong> (nazwa, slug,
            kategoria i opis ze zdjęcia głównego). Tutaj wybierasz model dla każdego z tych zadań –
            przy nazwie modelu widać jego stawkę.
          </p>

          <AiPromptPresets
            presetsJson={aiPresets}
            activeAi={aiPresetAi}
            activeAiPlus={aiPresetAiPlus}
            onChange={({ presetsJson, activeAi, activeAiPlus }) => {
              setAiPresets(presetsJson);
              setAiPresetAi(activeAi);
              setAiPresetAiPlus(activeAiPlus);
            }}
          />

          {[
            {
              variant: "ai" as const,
              title: "AI – produkt na jednolitym tle",
              value: aiModel,
              setter: setAiModel,
            },
            {
              variant: "ai_plus" as const,
              title: "AI+ – produkt w wystylizowanej scenie",
              value: aiModelPlus,
              setter: setAiModelPlus,
            },
          ].map(({ variant, title, value, setter }) => (
            <div key={variant} className="space-y-2 border border-sand bg-warm-white p-4">
              <label className="block text-xs tracking-widest uppercase text-charcoal/80">{title}</label>
              <select
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
              >
                {AI_IMAGE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} – {usd(aiCostPerImageUsd(m.id))} / zdjęcie
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-charcoal/80">
                Orientacyjny koszt jednego zdjęcia: {usd(aiCostPerImageUsd(value))}
                {aiRateNumber > 0 && <> (~{pln(aiCostPerImageUsd(value), aiRateNumber)})</>}
              </p>
              <p className="text-[11px] text-charcoal/80">
                Preset:{" "}
                <span className="text-espresso">
                  {resolveAiPreset(
                    variant,
                    variant === "ai" ? aiPresetAi : aiPresetAiPlus,
                    parseAiPresets(aiPresets)
                  ).name}
                </span>
              </p>
              <details className="text-[11px] text-charcoal/80">
                <summary className="cursor-pointer">Pokaż prompt wysyłany do modelu</summary>
                <p className="mt-2 bg-cream border border-sand p-3 leading-5 whitespace-pre-line">
                  {buildImagePrompt(
                    resolveAiPreset(
                      variant,
                      variant === "ai" ? aiPresetAi : aiPresetAiPlus,
                      parseAiPresets(aiPresets)
                    ).scene
                  )}
                </p>
              </details>
            </div>
          ))}

          <div className="space-y-2 border border-sand bg-warm-white p-4">
            <label className="block text-xs tracking-widest uppercase text-charcoal/80">
              Uzupełnianie opisu – model tekstowy
            </label>
            <select
              value={aiTextModel}
              onChange={(e) => setAiTextModel(e.target.value)}
              className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
            >
              {AI_TEXT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} – {tokenRate(m.id)}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-charcoal/80">
              Stawka za 1 mln tokenów (wejście / wyjście): {tokenRate(aiTextModel)}. Jedno uzupełnienie
              to zdjęcie plus kilkaset tokenów, więc koszt jest ułamkiem centa – dokładna kwota trafia
              do statystyk poniżej.
            </p>
            <details className="text-[11px] text-charcoal/80">
              <summary className="cursor-pointer">Pokaż prompt wysyłany do modelu</summary>
              <p className="mt-2 bg-cream border border-sand p-3 leading-5 whitespace-pre-line">
                {buildProductFillPrompt(PROMPT_PREVIEW_CATEGORIES)}
              </p>
              <p className="mt-1">
                W prawdziwym wywołaniu lista kategorii jest podstawiana z kategorii sklepu –
                model może wybrać tylko istniejącą.
              </p>
            </details>
          </div>

          <div className="space-y-2 border border-sand bg-warm-white p-4">
            <label className="block text-xs tracking-widest uppercase text-charcoal/80">
              Agent dodawania produktów – model rozumowania
            </label>
            <select
              value={aiAgentModel}
              onChange={(e) => setAiAgentModel(e.target.value)}
              className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
            >
              {AI_TEXT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} – {tokenRate(m.id)}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-charcoal/80">
              Model, który w agencie rozpoznaje produkt na zdjęciu, dobiera kategorię i pisze nazwę
              oraz opis na wzór produktów z tej kategorii (dwa wywołania na produkt). Mocniejszy model
              trafniej czyta motywy i napisy na ceramice; tłumaczenie i zwykłe uzupełnianie opisu
              nadal idą modelem tekstowym powyżej.
            </p>
          </div>

          <div className="max-w-xs">
            <Field
              label="Kurs USD → PLN (do przeliczania kosztów)"
              value={aiRate}
              setter={setAiRate}
            />
            <p className="text-[11px] text-charcoal/80 mt-1">
              Google rozlicza AI w dolarach – kurs służy tylko do pokazania kosztu w złotówkach.
            </p>
          </div>

          <SaveButton
            onClick={() => save([
              { key: AI_MODEL_SETTING_KEY.ai, value: aiModel },
              { key: AI_MODEL_SETTING_KEY.ai_plus, value: aiModelPlus },
              { key: AI_TEXT_MODEL_SETTING_KEY, value: aiTextModel },
              { key: AI_AGENT_MODEL_SETTING_KEY, value: aiAgentModel },
              { key: "ai_usd_pln_rate", value: aiRate },
              { key: AI_PRESETS_SETTING_KEY, value: aiPresets },
              { key: AI_PRESET_SETTING_KEY.ai, value: aiPresetAi },
              { key: AI_PRESET_SETTING_KEY.ai_plus, value: aiPresetAiPlus },
            ])}
            label="Zapisz ustawienia AI"
          />

          <div className="p-4 bg-cream border border-sand text-xs text-charcoal/80 leading-relaxed space-y-2">
            <p className="font-medium">Konfiguracja klucza API</p>
            <p>
              Klucz do Google AI ustawiasz w pliku <span className="font-mono">.env.local</span> – nie jest
              przechowywany w bazie danych:
            </p>
            <pre className="font-mono text-[11px] bg-warm-white border border-sand p-3 leading-5 overflow-x-auto">GOOGLE_AI_API_KEY=...</pre>
            <p>
              Klucz wygenerujesz w Google AI Studio. Bez niego przyciski AI zwrócą komunikat o braku
              konfiguracji. Każde kliknięcie to płatne wywołanie modelu.
            </p>
          </div>

          {/* ── Statystyki zużycia ── */}
          <div className="space-y-4 pt-6 border-t border-sand">
            <h3 className="font-serif text-xl text-espresso">Zużycie i koszty</h3>

            {!aiUsage?.available ? (
              <p className="text-xs text-charcoal/80 bg-cream border border-sand p-4 leading-relaxed">
                Statystyki są niedostępne – prawdopodobnie brakuje tabeli zużycia w bazie.
                Wykonaj migrację <span className="font-mono">manual_add_ai_image_usage.sql</span> na
                Supabase, a licznik zacznie zbierać dane od kolejnego generowania.
              </p>
            ) : aiUsage.total.count === 0 ? (
              <p className="text-xs text-charcoal/80 bg-cream border border-sand p-4 leading-relaxed">
                AI nie było jeszcze używane. Statystyki pojawią się po pierwszym wygenerowaniu zdjęcia
                lub uzupełnieniu opisu w edycji produktu.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <UsageCard period={aiUsage.currentMonth} rate={aiRateNumber} />
                  <UsageCard period={aiUsage.previousMonth} rate={aiRateNumber} />
                  <UsageCard period={aiUsage.total} rate={aiRateNumber} />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-sand">
                    <thead className="bg-cream text-charcoal/80">
                      <tr>
                        <th className="text-left font-medium px-3 py-2">Model</th>
                        <th className="text-left font-medium px-3 py-2">Rodzaj</th>
                        <th className="text-right font-medium px-3 py-2">Wywołań</th>
                        <th className="text-right font-medium px-3 py-2">Tokeny (wej./wyj.)</th>
                        <th className="text-right font-medium px-3 py-2">Koszt</th>
                      </tr>
                    </thead>
                    <tbody className="text-espresso">
                      {aiUsage.byModel.map((row) => (
                        <tr key={row.model} className="border-t border-sand">
                          <td className="px-3 py-2">{MODEL_LABEL.get(row.model) ?? row.model}</td>
                          <td className="px-3 py-2 text-charcoal/80">
                            {row.kind === "text" ? "Tekst" : "Zdjęcia"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-charcoal/80">
                            {row.promptTokens.toLocaleString("pl-PL")} / {row.outputTokens.toLocaleString("pl-PL")}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {usd(row.costUsd)}
                            {aiRateNumber > 0 && (
                              <span className="block text-[11px] text-charcoal/80">
                                {pln(row.costUsd, aiRateNumber)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Koszt agenta dodawania produktów – osobno od ręcznych przycisków AI */}
                {(() => {
                  const agent = agentUsage(aiUsage.byVariant);
                  if (agent.total.count === 0) return null;
                  const rows: [string, { count: number; costUsd: number }][] = [
                    ["Generowanie zdjęć", agent.images],
                    ["Treść karty produktu", agent.content],
                    ["Tłumaczenie na angielski", agent.translation],
                    ["Rozmowa z agentem", agent.agent],
                  ];
                  const money = (v: number) => (aiRateNumber > 0 ? pln(v, aiRateNumber) : usd(v));
                  return (
                    <div className="border border-sand bg-warm-white p-4 space-y-2 text-sm">
                      <p className="text-xs tracking-widest uppercase text-charcoal/80">Agent dodawania produktów</p>
                      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
                        {rows.map(([label, b]) => (
                          <div key={label} className="contents">
                            <dt className="text-charcoal/80">{label} <span className="text-[11px]">({b.count} ×)</span></dt>
                            <dd className="text-right tabular-nums text-espresso whitespace-nowrap">{money(b.costUsd)}</dd>
                          </div>
                        ))}
                        <div className="contents">
                          <dt className="border-t border-sand pt-2 mt-1 font-medium text-espresso">Razem</dt>
                          <dd className="border-t border-sand pt-2 mt-1 text-right font-serif text-xl text-espresso tabular-nums whitespace-nowrap">{money(agent.total.costUsd)}</dd>
                        </div>
                      </dl>
                      <p className="text-[11px] text-charcoal/80">
                        Liczone od 17.09.2026 – wcześniejsze wywołania agenta są w ogólnych statystykach, bez rozróżnienia.
                      </p>
                    </div>
                  );
                })()}

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-charcoal/80">
                  {aiUsage.byVariant.map((v) => (
                    <span key={v.variant}>
                      {VARIANT_LABEL[v.variant] ?? v.variant}: {v.count} × ({usd(v.costUsd)})
                    </span>
                  ))}
                  {aiUsage.lastUsedAt && (
                    <span>
                      Ostatnie generowanie:{" "}
                      {new Date(aiUsage.lastUsedAt).toLocaleString("pl-PL", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  )}
                </div>

                {aiUsage.estimatedCount > 0 && (
                  <p className="text-[11px] text-charcoal/80">
                    {aiUsage.estimatedCount} z {aiUsage.total.count} wpisów ma koszt oszacowany –
                    model nie zwrócił wtedy liczników tokenów, więc przyjęto typowe zużycie na zdjęcie.
                  </p>
                )}
              </>
            )}

            <p className="text-[11px] text-charcoal/80">
              Koszty liczone są ze stawek Google AI (stan 07.2026) i mają charakter orientacyjny –
              wiążące jest rozliczenie w Google Cloud / AI Studio.
            </p>
          </div>
        </div>
      )}

      {section === "platnosci_stripe" && (
        <div className="max-w-md space-y-5">
          <h2 className="font-serif text-2xl text-espresso">Stripe (karta płatnicza)</h2>
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-widest uppercase text-charcoal/80">Włącz płatność kartą</span>
            <Toggle checked={stripeEnabled} onChange={setStripeEnabled} />
          </div>
          <div className="p-4 bg-cream border border-sand text-xs text-charcoal/80 leading-relaxed space-y-2">
            <p className="font-medium text-charcoal/80">Konfiguracja kluczy API</p>
            <p>Klucze Stripe ustawiasz w pliku <span className="font-mono">.env.local</span> – nie są przechowywane w bazie danych:</p>
            <pre className="font-mono text-[11px] bg-warm-white border border-sand p-3 leading-5 overflow-x-auto">{`STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...`}</pre>
            <p>Klucze znajdziesz w panelu Stripe → Developers → API keys. Webhook dodaj pod adresem <span className="font-mono">/api/stripe/webhook</span> z eventem <span className="font-mono">checkout.session.completed</span>.</p>
          </div>
          <SaveButton
            onClick={() => save([
              { key: "payment_stripe_enabled", value: stripeEnabled ? "true" : "false" },
            ])}
            label="Zapisz Stripe"
          />
        </div>
      )}
    </div>
  );
}
