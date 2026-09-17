"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import WorkshopsOffersEditor from "@/components/admin/WorkshopsOffersEditor";
import AboutValuesEditor from "@/components/admin/AboutValuesEditor";
import TranslateButton from "@/components/admin/TranslateButton";
import { Field, MultilineField, SaveButton } from "@/components/admin/settings-fields";
import { translateJson, translateTexts } from "@/lib/admin-translate";
import { enSettingKey } from "@/lib/i18n-content";
import { ENGLISH_SETTING_KEYS } from "@/lib/english-settings";
import {
  HOME_ABOUT_DEFAULT_EN,
  HOME_HERO_DEFAULT_EN,
  HOME_WORKSHOPS_DEFAULT_EN,
} from "@/lib/home-sections";
import { ABOUT_VALUES_TITLE_DEFAULT_EN } from "@/lib/about-values";

// Jodit działa tylko w przeglądarce – ten sam import co w formularzu projektu
const RichEditor = dynamic(() => import("@/components/admin/RichEditor"), { ssr: false });

// Lista kluczy per zakładka siedzi w `lib/english-settings.ts` (moduł neutralny) –
// z pliku `"use client"` strona serwerowa dostawałaby referencję zamiast tablicy

/** Pola JSON – tłumaczone strukturalnie (`translateJson`), nie jako jeden napis. */
const JSON_KEYS = new Set(["about_values", "workshops_offers", "workshops_includes", "workshops_faq"]);

interface Props {
  section: string;
  /** Angielskie wartości z bazy, kluczowane **polskim** kluczem (bez `en_`). */
  initial: Record<string, string>;
  /** Bieżąca polska treść z formularza – źródło dla tłumaczenia. */
  source: Record<string, string>;
  save: (pairs: { key: string; value: string }[]) => Promise<void>;
}

/**
 * Angielska wersja zakładki ustawień – te same pola co po polsku, zapisywane
 * pod kluczami `en_*`. Przycisk „Przetłumacz przez AI” bierze bieżącą polską
 * treść z formularza (nawet niezapisaną) i wypełnia wszystkie pola sekcji;
 * właściciel może je poprawić przed zapisem.
 */
export default function SettingsEnglish({ section, initial, source, save }: Props) {
  const keys = ENGLISH_SETTING_KEYS[section] ?? [];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(keys.map((k) => [k, initial[k] ?? ""]))
  );
  const set = (key: string) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  const hasContent = keys.some((k) => values[k]?.trim());

  async function translateAll() {
    // Zwykłe teksty jednym żądaniem, JSON-y osobno – każdy zachowuje strukturę
    const plainKeys = keys.filter((k) => !JSON_KEYS.has(k) && (source[k] ?? "").trim());
    const next: Record<string, string> = {};
    if (plainKeys.length > 0) {
      const translated = await translateTexts(plainKeys.map((k) => source[k]));
      plainKeys.forEach((k, i) => { next[k] = translated[i]; });
    }
    for (const k of keys.filter((k) => JSON_KEYS.has(k) && (source[k] ?? "").trim())) {
      next[k] = await translateJson(source[k]);
    }
    setValues((prev) => ({ ...prev, ...next }));
  }

  const saveAll = () => save(keys.map((k) => ({ key: enSettingKey(k), value: values[k] ?? "" })));

  return (
    <div className="space-y-8">
      <div className="bg-mist border border-sand p-4 text-xs text-charcoal/80 leading-relaxed space-y-3">
        <p>
          Treść pokazywana na wersji angielskiej strony (<code className="font-mono">/en</code>).
          <strong> Puste pole nie ukrywa elementu</strong> – strona pokaże wtedy polski tekst
          (albo angielski domyślny, jeśli polski też jest domyślny). Ukrywa się wyłącznie
          pustym polem w zakładce PL.
        </p>
        <TranslateButton
          onTranslate={translateAll}
          hasContent={hasContent}
          label="Przetłumacz całą sekcję przez AI"
        />
      </div>

      {section === "strona_glowna" && (
        <>
          <Group title="Sekcja hero (nagłówek)">
            <Field label="Napis nad nagłówkiem" value={values.home_hero_eyebrow} setter={set("home_hero_eyebrow")} placeholder={HOME_HERO_DEFAULT_EN.eyebrow} />
            <MultilineField label="Nagłówek" value={values.home_hero_title} setter={set("home_hero_title")} placeholder={HOME_HERO_DEFAULT_EN.title} rows={2} />
            <MultilineField label="Opis" value={values.home_hero_text} setter={set("home_hero_text")} placeholder={HOME_HERO_DEFAULT_EN.text} rows={4} />
            <Field label="Przycisk główny (do sklepu)" value={values.home_hero_cta_primary} setter={set("home_hero_cta_primary")} placeholder={HOME_HERO_DEFAULT_EN.ctaPrimary} />
            <Field label="Przycisk drugi (do „O mnie”)" value={values.home_hero_cta_secondary} setter={set("home_hero_cta_secondary")} placeholder={HOME_HERO_DEFAULT_EN.ctaSecondary} />
            <Field label="Napis przy strzałce na dole" value={values.home_hero_scroll} setter={set("home_hero_scroll")} placeholder={HOME_HERO_DEFAULT_EN.scroll} />
          </Group>
          <Group title="Sekcja „O mnie”">
            <Field label="Napis nad nagłówkiem" value={values.home_about_eyebrow} setter={set("home_about_eyebrow")} placeholder={HOME_ABOUT_DEFAULT_EN.eyebrow} />
            <MultilineField label="Nagłówek" value={values.home_about_title} setter={set("home_about_title")} placeholder={HOME_ABOUT_DEFAULT_EN.title} rows={2} />
            <MultilineField label="Opis" value={values.home_about_text} setter={set("home_about_text")} placeholder={HOME_ABOUT_DEFAULT_EN.text} rows={5} />
            <Field label="Przycisk" value={values.home_about_cta} setter={set("home_about_cta")} placeholder={HOME_ABOUT_DEFAULT_EN.cta} />
          </Group>
          <Group title="Sekcja „Warsztaty”">
            <Field label="Napis nad nagłówkiem" value={values.home_workshops_eyebrow} setter={set("home_workshops_eyebrow")} placeholder={HOME_WORKSHOPS_DEFAULT_EN.eyebrow} />
            <MultilineField label="Nagłówek" value={values.home_workshops_title} setter={set("home_workshops_title")} placeholder={HOME_WORKSHOPS_DEFAULT_EN.title} rows={2} />
            <MultilineField label="Opis" value={values.home_workshops_text} setter={set("home_workshops_text")} placeholder={HOME_WORKSHOPS_DEFAULT_EN.text} rows={5} />
            <Field label="Przycisk" value={values.home_workshops_cta} setter={set("home_workshops_cta")} placeholder={HOME_WORKSHOPS_DEFAULT_EN.cta} />
          </Group>
          <SaveButton onClick={saveAll} label="Zapisz wersję angielską" />
        </>
      )}

      {section === "omnie" && (
        <>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">Treść – historia (EN)</label>
            <RichEditor value={values.about_story} onChange={set("about_story")} />
          </div>
          <Group title="Sekcja „Jak pracuję” (EN)">
            <Field label="Nagłówek sekcji" value={values.about_values_title} setter={set("about_values_title")} placeholder={ABOUT_VALUES_TITLE_DEFAULT_EN} />
            <AboutValuesEditor json={values.about_values} onChange={set("about_values")} />
          </Group>
          <SaveButton onClick={saveAll} label="Zapisz wersję angielską" />
        </>
      )}

      {section === "warsztaty" && (
        <>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">Tekst wprowadzający (EN)</label>
            <RichEditor value={values.workshops_intro} onChange={set("workshops_intro")} contentClass="rich-content-lg" />
          </div>
          <div className="border-t border-sand pt-6">
            <WorkshopsOffersEditor
              offersJson={values.workshops_offers}
              includesJson={values.workshops_includes}
              faqJson={values.workshops_faq}
              onOffersChange={set("workshops_offers")}
              onIncludesChange={set("workshops_includes")}
              onFaqChange={set("workshops_faq")}
            />
          </div>
          <SaveButton onClick={saveAll} label="Zapisz wersję angielską" />
        </>
      )}

      {section === "kontakt" && (
        <>
          <MultilineField
            label="Godziny otwarcia (EN)"
            value={values.contact_hours}
            setter={set("contact_hours")}
            placeholder={"Tue–Thu 5–7 pm\nSat 3–5 pm"}
          />
          <SaveButton onClick={saveAll} label="Zapisz wersję angielską" />
        </>
      )}

      {section === "urlop" && (
        <>
          <Field
            label="Komunikat urlopowy (EN)"
            value={values.vacation_message}
            setter={set("vacation_message")}
            placeholder="The studio is on holiday – orders resume on"
          />
          <p className="text-[11px] text-charcoal/80">
            Data powrotu z zakładki PL jest dokładana automatycznie, po angielsku.
          </p>
          <SaveButton onClick={saveAll} label="Zapisz wersję angielską" />
        </>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-sand pt-6 space-y-4">
      <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/80">{title}</h3>
      {children}
    </div>
  );
}
