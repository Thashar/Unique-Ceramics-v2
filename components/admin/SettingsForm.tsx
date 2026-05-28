"use client";

import { useState } from "react";
import RichEditor from "@/components/admin/RichEditor";
import ImageUploader from "@/components/admin/ImageUploader";

interface Props {
  section: string;
  initial: {
    home_hero_image: string;
    home_about_image: string;
    home_workshops_image: string;
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

function Field({ label, value, setter, type = "text", placeholder, mono }: {
  label: string;
  value: string;
  setter: (v: string) => void;
  type?: string;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => setter(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors${mono ? " font-mono" : ""}`}
      />
    </div>
  );
}

function SaveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="bg-espresso hover:bg-clay text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
    >
      {label}
    </button>
  );
}

export default function SettingsForm({ section, initial }: Props) {
  const [toast, setToast] = useState<"ok" | "err" | false>(false);

  // Strona główna
  const [homeHeroImage, setHomeHeroImage] = useState(initial.home_hero_image);
  const [homeAboutImage, setHomeAboutImage] = useState(initial.home_about_image);
  const [homeWorkshopsImage, setHomeWorkshopsImage] = useState(initial.home_workshops_image);

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

  // Przelew
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

  return (
    <div className="relative">
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

      {section === "strona_glowna" && (
        <div className="max-w-2xl space-y-8">
          <h2 className="font-serif text-2xl text-espresso">Strona główna — zdjęcia</h2>
          <div className="space-y-3">
            <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Zdjęcie nagłówka (sekcja hero)</h3>
            <p className="text-xs text-charcoal/40">Pierwsze zdjęcie widoczne po wejściu na stronę — duże, pełnoekranowe tło.</p>
            <ImageUploader
              currentUrl={homeHeroImage}
              onUploaded={(url) => setHomeHeroImage(url)}
              label="Zdjęcie hero"
            />
          </div>
          <div className="border-t border-sand pt-6 space-y-3">
            <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Zdjęcie sekcji „O mnie"</h3>
            <p className="text-xs text-charcoal/40">Tło sekcji z historią — widoczne za tekstem na stronie głównej.</p>
            <ImageUploader
              currentUrl={homeAboutImage}
              onUploaded={(url) => setHomeAboutImage(url)}
              label="Zdjęcie sekcji O mnie"
            />
          </div>
          <div className="border-t border-sand pt-6 space-y-3">
            <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Zdjęcie sekcji „Warsztaty"</h3>
            <p className="text-xs text-charcoal/40">Tło sekcji warsztatów — widoczne za tekstem na stronie głównej.</p>
            <ImageUploader
              currentUrl={homeWorkshopsImage}
              onUploaded={(url) => setHomeWorkshopsImage(url)}
              label="Zdjęcie sekcji Warsztaty"
            />
          </div>
          <SaveButton
            onClick={() => save([
              { key: "home_hero_image", value: homeHeroImage },
              { key: "home_about_image", value: homeAboutImage },
              { key: "home_workshops_image", value: homeWorkshopsImage },
            ])}
            label="Zapisz zdjęcia strony głównej"
          />
        </div>
      )}

      {section === "omnie" && (
        <div className="max-w-2xl space-y-6">
          <h2 className="font-serif text-2xl text-espresso">O mnie</h2>
          <ImageUploader
            currentUrl={aboutImage}
            onUploaded={(url) => setAboutImage(url)}
            label="Zdjęcie nagłówka (hero + sidebar)"
          />
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-3">Treść — historia</label>
            <RichEditor value={aboutStory} onChange={setAboutStory} />
          </div>
          <SaveButton
            onClick={() => save([
              { key: "about_hero_image", value: aboutImage },
              { key: "about_story", value: aboutStory },
            ])}
            label="Zapisz stronę O mnie"
          />
        </div>
      )}

      {section === "warsztaty" && (
        <div className="max-w-2xl space-y-6">
          <h2 className="font-serif text-2xl text-espresso">Warsztaty</h2>
          <ImageUploader
            currentUrl={workshopsImage}
            onUploaded={(url) => setWorkshopsImage(url)}
            label="Zdjęcie nagłówka (hero)"
          />
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-3">Tekst wprowadzający</label>
            <RichEditor value={workshopsIntro} onChange={setWorkshopsIntro} />
          </div>
          <SaveButton
            onClick={() => save([
              { key: "workshops_hero_image", value: workshopsImage },
              { key: "workshops_intro", value: workshopsIntro },
            ])}
            label="Zapisz stronę Warsztaty"
          />
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
          <h2 className="font-serif text-2xl text-espresso">Dane kontaktowe</h2>
          <Field label="Telefon" value={phone} setter={setPhone} type="tel" />
          <Field label="E-mail" value={email} setter={setEmail} type="email" />
          <Field label="Instagram" value={instagram} setter={setInstagram} />
          <SaveButton
            onClick={() => save([
              { key: "contact_phone", value: phone },
              { key: "contact_email", value: email },
              { key: "contact_instagram", value: instagram },
            ])}
            label="Zapisz kontakt"
          />
        </div>
      )}

      {section === "wysylka" && (
        <div className="max-w-md space-y-6">
          <h2 className="font-serif text-2xl text-espresso">Wysyłka</h2>
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-widest uppercase text-charcoal/60">Darmowa wysyłka</span>
            <Toggle checked={freeEnabled} onChange={setFreeEnabled} />
          </div>
          <Field label="Koszt wysyłki (zł)" value={shippingCost} setter={setShippingCost} type="number" />
          {freeEnabled && (
            <Field label="Darmowa wysyłka od (zł)" value={freeFrom} setter={setFreeFrom} type="number" />
          )}
          <SaveButton
            onClick={() => save([
              { key: "shipping_cost", value: shippingCost },
              { key: "shipping_free_enabled", value: freeEnabled ? "true" : "false" },
              { key: "shipping_free_from", value: freeFrom },
            ])}
            label="Zapisz wysyłkę"
          />
        </div>
      )}

      {section === "platnosci_przelew" && (
        <div className="max-w-md space-y-5">
          <h2 className="font-serif text-2xl text-espresso">Przelew tradycyjny</h2>
          <p className="text-xs text-charcoal/50">Zawsze dostępny jako metoda płatności.</p>
          <Field label="Imię i nazwisko / Nazwa odbiorcy" value={bankName} setter={setBankName} />
          <Field label="Numer konta (IBAN)" value={bankNumber} setter={setBankNumber} mono />
          <Field label="Nazwa banku" value={bankBankName} setter={setBankBankName} />
          <Field label="Prefiks tytułu przelewu" value={bankTitle} setter={setBankTitle} />
          <p className="text-xs text-charcoal/40">Tytuł wysyłany do kupującego: „[prefiks] #NR_ZAMÓWIENIA"</p>
          <SaveButton
            onClick={() => save([
              { key: "payment_bank_account_name", value: bankName },
              { key: "payment_bank_account_number", value: bankNumber },
              { key: "payment_bank_name", value: bankBankName },
              { key: "payment_bank_transfer_title", value: bankTitle },
            ])}
            label="Zapisz przelew"
          />
        </div>
      )}

      {section === "platnosci_blik" && (
        <div className="max-w-md space-y-5">
          <h2 className="font-serif text-2xl text-espresso">BLIK</h2>
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-widest uppercase text-charcoal/60">Włącz BLIK</span>
            <Toggle checked={blikEnabled} onChange={setBlikEnabled} />
          </div>
          {blikEnabled && (
            <Field label="Numer telefonu do BLIK" value={blikPhone} setter={setBlikPhone} type="tel" placeholder="+48 600 000 000" />
          )}
          <SaveButton
            onClick={() => save([
              { key: "payment_blik_enabled", value: blikEnabled ? "true" : "false" },
              { key: "payment_blik_phone", value: blikPhone },
            ])}
            label="Zapisz BLIK"
          />
        </div>
      )}

      {section === "platnosci_p24" && (
        <div className="max-w-md space-y-5">
          <h2 className="font-serif text-2xl text-espresso">Przelewy24</h2>
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-widest uppercase text-charcoal/60">Włącz Przelewy24</span>
            <Toggle checked={p24Enabled} onChange={setP24Enabled} />
          </div>
          {p24Enabled && (
            <>
              <Field label="Merchant ID" value={p24MerchantId} setter={setP24MerchantId} mono />
              <Field label="POS ID" value={p24PosId} setter={setP24PosId} mono />
              <Field label="API Key" value={p24ApiKey} setter={setP24ApiKey} mono />
              <Field label="CRC Key" value={p24Crc} setter={setP24Crc} mono />
            </>
          )}
          <SaveButton
            onClick={() => save([
              { key: "payment_przelewy24_enabled", value: p24Enabled ? "true" : "false" },
              { key: "payment_przelewy24_merchant_id", value: p24MerchantId },
              { key: "payment_przelewy24_pos_id", value: p24PosId },
              { key: "payment_przelewy24_api_key", value: p24ApiKey },
              { key: "payment_przelewy24_crc", value: p24Crc },
            ])}
            label="Zapisz Przelewy24"
          />
        </div>
      )}

      {section === "platnosci_payu" && (
        <div className="max-w-md space-y-5">
          <h2 className="font-serif text-2xl text-espresso">PayU</h2>
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-widest uppercase text-charcoal/60">Włącz PayU</span>
            <Toggle checked={payuEnabled} onChange={setPayuEnabled} />
          </div>
          {payuEnabled && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-widest uppercase text-charcoal/60">Tryb sandbox (testowy)</span>
                <Toggle checked={payuSandbox} onChange={setPayuSandbox} />
              </div>
              <Field label="POS ID" value={payuPosId} setter={setPayuPosId} mono />
              <Field label="MD5 Key (drugi klucz)" value={payuMd5} setter={setPayuMd5} mono />
              <Field label="OAuth — Client ID" value={payuClientId} setter={setPayuClientId} mono />
              <Field label="OAuth — Client Secret" value={payuClientSecret} setter={setPayuClientSecret} mono />
            </>
          )}
          <SaveButton
            onClick={() => save([
              { key: "payment_payu_enabled", value: payuEnabled ? "true" : "false" },
              { key: "payment_payu_pos_id", value: payuPosId },
              { key: "payment_payu_md5", value: payuMd5 },
              { key: "payment_payu_oauth_client_id", value: payuClientId },
              { key: "payment_payu_oauth_client_secret", value: payuClientSecret },
              { key: "payment_payu_sandbox", value: payuSandbox ? "true" : "false" },
            ])}
            label="Zapisz PayU"
          />
        </div>
      )}
    </div>
  );
}
