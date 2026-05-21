"use client";

import { useState } from "react";
import RichEditor from "@/components/admin/RichEditor";
import ImageUploader from "@/components/admin/ImageUploader";

type Tab = "omnie" | "warsztaty" | "regulamin" | "polityka" | "kontakt" | "wysylka" | "platnosci";

interface Props {
  initial: {
    about_hero_image: string;
    about_story: string;
    workshops_hero_image: string;
    workshops_intro: string;
    regulamin: string;
    polityka_prywatnosci: string;
    contact_phone: string;
    contact_email: string;
    contact_instagram: string;
    shipping_cost: string;
    shipping_free_enabled: string;
    shipping_free_from: string;
    // Płatności
    payment_bank_account_name: string;
    payment_bank_account_number: string;
    payment_bank_name: string;
    payment_bank_transfer_title: string;
    payment_blik_enabled: string;
    payment_blik_phone: string;
    payment_przelewy24_enabled: string;
    payment_przelewy24_merchant_id: string;
    payment_przelewy24_pos_id: string;
    payment_przelewy24_api_key: string;
    payment_przelewy24_crc: string;
    payment_payu_enabled: string;
    payment_payu_pos_id: string;
    payment_payu_md5: string;
    payment_payu_oauth_client_id: string;
    payment_payu_oauth_client_secret: string;
    payment_payu_sandbox: string;
  };
}

export default function SettingsForm({ initial }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("omnie");
  const [toast, setToast] = useState<"ok" | "err" | false>(false);

  // O mnie
  const [aboutImage, setAboutImage] = useState(initial.about_hero_image);
  const [aboutStory, setAboutStory] = useState(initial.about_story);

  // Warsztaty
  const [workshopsImage, setWorkshopsImage] = useState(initial.workshops_hero_image);
  const [workshopsIntro, setWorkshopsIntro] = useState(initial.workshops_intro);

  // Regulamin
  const [regulamin, setRegulamin] = useState(initial.regulamin);

  // Polityka prywatności
  const [polityka, setPolityka] = useState(initial.polityka_prywatnosci);

  // Kontakt
  const [phone, setPhone] = useState(initial.contact_phone);
  const [email, setEmail] = useState(initial.contact_email);
  const [instagram, setInstagram] = useState(initial.contact_instagram);
  // Wysyłka
  const [shippingCost, setShippingCost] = useState(initial.shipping_cost);
  const [freeEnabled, setFreeEnabled] = useState(initial.shipping_free_enabled === "true");
  const [freeFrom, setFreeFrom] = useState(initial.shipping_free_from);

  // Płatności — przelew
  const [bankName, setBankName] = useState(initial.payment_bank_account_name);
  const [bankNumber, setBankNumber] = useState(initial.payment_bank_account_number);
  const [bankBankName, setBankBankName] = useState(initial.payment_bank_name);
  const [bankTitle, setBankTitle] = useState(initial.payment_bank_transfer_title);
  // BLIK
  const [blikEnabled, setBlikEnabled] = useState(initial.payment_blik_enabled === "true");
  const [blikPhone, setBlikPhone] = useState(initial.payment_blik_phone);
  // Przelewy24
  const [p24Enabled, setP24Enabled] = useState(initial.payment_przelewy24_enabled === "true");
  const [p24MerchantId, setP24MerchantId] = useState(initial.payment_przelewy24_merchant_id);
  const [p24PosId, setP24PosId] = useState(initial.payment_przelewy24_pos_id);
  const [p24ApiKey, setP24ApiKey] = useState(initial.payment_przelewy24_api_key);
  const [p24Crc, setP24Crc] = useState(initial.payment_przelewy24_crc);
  // PayU
  const [payuEnabled, setPayuEnabled] = useState(initial.payment_payu_enabled === "true");
  const [payuPosId, setPayuPosId] = useState(initial.payment_payu_pos_id);
  const [payuMd5, setPayuMd5] = useState(initial.payment_payu_md5);
  const [payuClientId, setPayuClientId] = useState(initial.payment_payu_oauth_client_id);
  const [payuClientSecret, setPayuClientSecret] = useState(initial.payment_payu_oauth_client_secret);
  const [payuSandbox, setPayuSandbox] = useState(initial.payment_payu_sandbox === "true");

  const showToast = (type: "ok" | "err") => {
    setToast(type);
    setTimeout(() => setToast(false), 3000);
  };

  const save = async (pairs: { key: string; value: string }[]) => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pairs),
      });
      const data = await res.json();
      showToast(data.ok ? "ok" : "err");
    } catch {
      showToast("err");
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "omnie", label: "O mnie" },
    { id: "warsztaty", label: "Warsztaty" },
    { id: "regulamin", label: "Regulamin" },
    { id: "polityka", label: "Polityka prywatności" },
    { id: "kontakt", label: "Kontakt" },
    { id: "wysylka", label: "Wysyłka" },
    { id: "platnosci", label: "Płatności" },
  ];

  return (
    <div className="w-full max-w-2xl">
      {toast === "ok" && (
        <div className="fixed top-6 right-6 z-50 bg-espresso text-cream text-sm px-5 py-3 shadow-lg">
          Zapisano!
        </div>
      )}
      {toast === "err" && (
        <div className="fixed top-6 right-6 z-50 bg-red-700 text-white text-sm px-5 py-3 shadow-lg max-w-xs">
          Błąd zapisu — tabela Setting nie istnieje w bazie. Uruchom SQL w Supabase.
        </div>
      )}

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs tracking-widest uppercase transition-colors whitespace-nowrap ${
              activeTab === t.id ? "bg-espresso text-cream" : "bg-cream text-charcoal hover:bg-sand"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: O mnie */}
      {activeTab === "omnie" && (
        <div className="bg-cream p-6 space-y-6">
          <ImageUploader
            currentUrl={aboutImage}
            onUploaded={(url) => setAboutImage(url)}
            label="Zdjęcie nagłówka (hero + sidebar)"
          />
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-3">
              Treść — historia
            </label>
            <RichEditor value={aboutStory} onChange={setAboutStory} />
          </div>
          <button
            onClick={() => save([
              { key: "about_hero_image", value: aboutImage },
              { key: "about_story", value: aboutStory },
            ])}
            className="bg-espresso hover:bg-clay text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            Zapisz stronę O mnie
          </button>
        </div>
      )}

      {/* Tab: Warsztaty */}
      {activeTab === "warsztaty" && (
        <div className="bg-cream p-6 space-y-6">
          <ImageUploader
            currentUrl={workshopsImage}
            onUploaded={(url) => setWorkshopsImage(url)}
            label="Zdjęcie nagłówka (hero)"
          />
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-3">
              Tekst wprowadzający
            </label>
            <RichEditor value={workshopsIntro} onChange={setWorkshopsIntro} />
          </div>
          <button
            onClick={() => save([
              { key: "workshops_hero_image", value: workshopsImage },
              { key: "workshops_intro", value: workshopsIntro },
            ])}
            className="bg-espresso hover:bg-clay text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            Zapisz stronę Warsztaty
          </button>
        </div>
      )}

      {/* Tab: Regulamin */}
      {activeTab === "regulamin" && (
        <div className="bg-cream p-6">
          <RichEditor value={regulamin} onChange={setRegulamin} />
          <button
            onClick={() => save([{ key: "regulamin", value: regulamin }])}
            className="mt-4 bg-espresso hover:bg-clay text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            Zapisz regulamin
          </button>
        </div>
      )}

      {/* Tab: Polityka prywatności */}
      {activeTab === "polityka" && (
        <div className="bg-cream p-6">
          <RichEditor value={polityka} onChange={setPolityka} />
          <button
            onClick={() => save([{ key: "polityka_prywatnosci", value: polityka }])}
            className="mt-4 bg-espresso hover:bg-clay text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            Zapisz politykę prywatności
          </button>
        </div>
      )}

      {/* Tab: Kontakt */}
      {activeTab === "kontakt" && (
        <div className="bg-cream p-6 space-y-5">
          {[
            { label: "Telefon", value: phone, setter: setPhone, key: "contact_phone", type: "tel" },
            { label: "E-mail", value: email, setter: setEmail, key: "contact_email", type: "email" },
            { label: "Instagram", value: instagram, setter: setInstagram, key: "contact_instagram", type: "text" },
          ].map(({ label, value, setter, type }) => (
            <div key={label}>
              <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
              />
            </div>
          ))}
          <button
            onClick={() => save([
              { key: "contact_phone", value: phone },
              { key: "contact_email", value: email },
              { key: "contact_instagram", value: instagram },
            ])}
            className="bg-espresso hover:bg-clay text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            Zapisz kontakt
          </button>
        </div>
      )}

      {/* Tab: Płatności */}
      {activeTab === "platnosci" && (
        <div className="bg-cream p-6 space-y-8">

          {/* Przelew tradycyjny */}
          <div>
            <p className="text-xs tracking-widest uppercase text-charcoal/60 mb-4 pb-2 border-b border-sand">
              Przelew tradycyjny (zawsze dostępny)
            </p>
            <div className="space-y-4">
              {[
                { label: "Imię i nazwisko / Nazwa odbiorcy", value: bankName, setter: setBankName },
                { label: "Numer konta (IBAN)", value: bankNumber, setter: setBankNumber },
                { label: "Nazwa banku", value: bankBankName, setter: setBankBankName },
                { label: "Prefiks tytułu przelewu", value: bankTitle, setter: setBankTitle },
              ].map(({ label, value, setter }) => (
                <div key={label}>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">{label}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
                  />
                </div>
              ))}
              <p className="text-xs text-charcoal/40">
                Tytuł przelewu wysyłany do kupującego: „[prefiks] #NR_ZAMÓWIENIA"
              </p>
            </div>
          </div>

          {/* BLIK */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-sand mb-4">
              <p className="text-xs tracking-widest uppercase text-charcoal/60">BLIK</p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only" checked={blikEnabled} onChange={(e) => setBlikEnabled(e.target.checked)} />
                <div className={`w-12 h-6 rounded-full transition-colors ${blikEnabled ? "bg-espresso" : "bg-sand"} relative`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-cream transition-all ${blikEnabled ? "left-7" : "left-1"}`} />
                </div>
              </label>
            </div>
            {blikEnabled && (
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Numer telefonu do BLIK</label>
                <input
                  type="tel"
                  value={blikPhone}
                  onChange={(e) => setBlikPhone(e.target.value)}
                  placeholder="+48 600 000 000"
                  className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
                />
              </div>
            )}
          </div>

          {/* Przelewy24 */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-sand mb-4">
              <p className="text-xs tracking-widest uppercase text-charcoal/60">Przelewy24</p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only" checked={p24Enabled} onChange={(e) => setP24Enabled(e.target.checked)} />
                <div className={`w-12 h-6 rounded-full transition-colors ${p24Enabled ? "bg-espresso" : "bg-sand"} relative`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-cream transition-all ${p24Enabled ? "left-7" : "left-1"}`} />
                </div>
              </label>
            </div>
            {p24Enabled && (
              <div className="space-y-4">
                {[
                  { label: "Merchant ID", value: p24MerchantId, setter: setP24MerchantId },
                  { label: "POS ID", value: p24PosId, setter: setP24PosId },
                  { label: "API Key", value: p24ApiKey, setter: setP24ApiKey },
                  { label: "CRC Key", value: p24Crc, setter: setP24Crc },
                ].map(({ label, value, setter }) => (
                  <div key={label}>
                    <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">{label}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm font-mono"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PayU */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-sand mb-4">
              <p className="text-xs tracking-widest uppercase text-charcoal/60">PayU</p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only" checked={payuEnabled} onChange={(e) => setPayuEnabled(e.target.checked)} />
                <div className={`w-12 h-6 rounded-full transition-colors ${payuEnabled ? "bg-espresso" : "bg-sand"} relative`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-cream transition-all ${payuEnabled ? "left-7" : "left-1"}`} />
                </div>
              </label>
            </div>
            {payuEnabled && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs tracking-widest uppercase text-charcoal/60">Tryb sandbox (testowy)</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only" checked={payuSandbox} onChange={(e) => setPayuSandbox(e.target.checked)} />
                    <div className={`w-12 h-6 rounded-full transition-colors ${payuSandbox ? "bg-espresso" : "bg-sand"} relative`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-cream transition-all ${payuSandbox ? "left-7" : "left-1"}`} />
                    </div>
                  </label>
                </div>
                {[
                  { label: "POS ID", value: payuPosId, setter: setPayuPosId },
                  { label: "MD5 Key (drugi klucz)", value: payuMd5, setter: setPayuMd5 },
                  { label: "OAuth — Client ID", value: payuClientId, setter: setPayuClientId },
                  { label: "OAuth — Client Secret", value: payuClientSecret, setter: setPayuClientSecret },
                ].map(({ label, value, setter }) => (
                  <div key={label}>
                    <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">{label}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm font-mono"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => save([
              { key: "payment_bank_account_name", value: bankName },
              { key: "payment_bank_account_number", value: bankNumber },
              { key: "payment_bank_name", value: bankBankName },
              { key: "payment_bank_transfer_title", value: bankTitle },
              { key: "payment_blik_enabled", value: blikEnabled ? "true" : "false" },
              { key: "payment_blik_phone", value: blikPhone },
              { key: "payment_przelewy24_enabled", value: p24Enabled ? "true" : "false" },
              { key: "payment_przelewy24_merchant_id", value: p24MerchantId },
              { key: "payment_przelewy24_pos_id", value: p24PosId },
              { key: "payment_przelewy24_api_key", value: p24ApiKey },
              { key: "payment_przelewy24_crc", value: p24Crc },
              { key: "payment_payu_enabled", value: payuEnabled ? "true" : "false" },
              { key: "payment_payu_pos_id", value: payuPosId },
              { key: "payment_payu_md5", value: payuMd5 },
              { key: "payment_payu_oauth_client_id", value: payuClientId },
              { key: "payment_payu_oauth_client_secret", value: payuClientSecret },
              { key: "payment_payu_sandbox", value: payuSandbox ? "true" : "false" },
            ])}
            className="bg-espresso hover:bg-clay text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            Zapisz płatności
          </button>
        </div>
      )}

      {/* Tab: Wysyłka */}
      {activeTab === "wysylka" && (
        <div className="bg-cream p-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-widest uppercase text-charcoal/60">Darmowa wysyłka</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only" checked={freeEnabled} onChange={(e) => setFreeEnabled(e.target.checked)} />
              <div className={`w-12 h-6 rounded-full transition-colors ${freeEnabled ? "bg-espresso" : "bg-sand"} relative`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-cream transition-all ${freeEnabled ? "left-7" : "left-1"}`} />
              </div>
            </label>
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Koszt wysyłki (zł)</label>
            <input type="number" min="0" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)}
              className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors" />
          </div>
          {freeEnabled && (
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Darmowa wysyłka od (zł)</label>
              <input type="number" min="0" value={freeFrom} onChange={(e) => setFreeFrom(e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors" />
            </div>
          )}
          <button
            onClick={() => save([
              { key: "shipping_cost", value: shippingCost },
              { key: "shipping_free_enabled", value: freeEnabled ? "true" : "false" },
              { key: "shipping_free_from", value: freeFrom },
            ])}
            className="bg-espresso hover:bg-clay text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            Zapisz wysyłkę
          </button>
        </div>
      )}
    </div>
  );
}
