"use client";

import { useState } from "react";
import RichEditor from "@/components/admin/RichEditor";
import ImageUploader from "@/components/admin/ImageUploader";
import FocalPointPicker from "@/components/admin/FocalPointPicker";

interface Props {
  section: string;
  initial: {
    home_hero_image: string;
    home_hero_position: string;
    home_about_image: string;
    home_about_position: string;
    home_workshops_image: string;
    home_workshops_position: string;
    about_hero_image: string;
    about_story: string;
    workshops_hero_image: string;
    workshops_intro: string;
    regulamin: string;
    polityka_prywatnosci: string;
    contact_phone: string;
    contact_email: string;
    contact_instagram: string;
    contact_facebook: string;
    contact_youtube: string;
    contact_whatsapp: string;
    shipping_cost: string;
    shipping_free_enabled: string;
    shipping_free_from: string;
    shipping_time: string;
    payment_bank_account_name: string;
    payment_bank_account_number: string;
    payment_bank_name: string;
    payment_bank_transfer_title: string;
    payment_blik_enabled: string;
    payment_blik_phone: string;
    payment_stripe_enabled: string;
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
      <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">{label}</label>
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
      className="bg-clay hover:bg-espresso text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
    >
      {label}
    </button>
  );
}

export default function SettingsForm({ section, initial }: Props) {
  const [toast, setToast] = useState<"ok" | false>(false);
  const [errMsg, setErrMsg] = useState("");

  // Strona główna
  const [homeHeroImage, setHomeHeroImage] = useState(initial.home_hero_image);
  const [homeHeroPos, setHomeHeroPos] = useState(initial.home_hero_position);
  const [homeAboutImage, setHomeAboutImage] = useState(initial.home_about_image);
  const [homeAboutPos, setHomeAboutPos] = useState(initial.home_about_position);
  const [homeWorkshopsImage, setHomeWorkshopsImage] = useState(initial.home_workshops_image);
  const [homeWorkshopsPos, setHomeWorkshopsPos] = useState(initial.home_workshops_position);

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
  const [facebook, setFacebook] = useState(initial.contact_facebook);
  const [youtube, setYoutube] = useState(initial.contact_youtube);
  const [whatsapp, setWhatsapp] = useState(initial.contact_whatsapp);

  // Wysyłka
  const [shippingCost, setShippingCost] = useState(initial.shipping_cost);
  const [freeEnabled, setFreeEnabled] = useState(initial.shipping_free_enabled === "true");
  const [freeFrom, setFreeFrom] = useState(initial.shipping_free_from);
  const [shippingTime, setShippingTime] = useState(initial.shipping_time);

  // Przelew
  const [bankName, setBankName] = useState(initial.payment_bank_account_name);
  const [bankNumber, setBankNumber] = useState(initial.payment_bank_account_number);
  const [bankBankName, setBankBankName] = useState(initial.payment_bank_name);
  const [bankTitle, setBankTitle] = useState(initial.payment_bank_transfer_title);

  // BLIK phone (numer telefonu do przelewu BLIK — część sekcji przelewu)
  const [blikPhone, setBlikPhone] = useState(initial.payment_blik_phone);

  // Stripe
  const [stripeEnabled, setStripeEnabled] = useState(initial.payment_stripe_enabled === "true");

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
        <div className="fixed top-6 right-6 z-50 bg-espresso text-cream text-sm px-5 py-3 shadow-lg">
          Zapisano!
        </div>
      )}
      {errMsg && (
        <div className="fixed top-6 right-6 z-50 bg-red-700 text-white text-sm px-5 py-4 shadow-lg max-w-sm">
          <p className="font-medium mb-1">Błąd zapisu</p>
          <p className="text-xs opacity-90 break-words">{errMsg}</p>
          <button
            onClick={() => setErrMsg("")}
            className="mt-2 text-xs underline opacity-70 hover:opacity-100"
          >
            Zamknij
          </button>
        </div>
      )}

      {section === "strona_glowna" && (
        <div className="max-w-2xl space-y-8">
          <h2 className="font-serif text-2xl text-espresso">Strona główna — zdjęcia</h2>

          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Sekcja hero (nagłówek)</h3>
            <p className="text-xs text-charcoal/40">Pierwsze zdjęcie widoczne po wejściu na stronę — duże, pełnoekranowe tło.</p>
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
            <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Sekcja „O mnie&rdquo;</h3>
            <p className="text-xs text-charcoal/40">Tło sekcji z historią — widoczne za tekstem na stronie głównej.</p>
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
          </div>

          <div className="border-t border-sand pt-6 space-y-4">
            <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Sekcja „Warsztaty&rdquo;</h3>
            <p className="text-xs text-charcoal/40">Tło sekcji warsztatów — widoczne za tekstem na stronie głównej.</p>
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
          </div>

          <SaveButton
            onClick={() => save([
              { key: "home_hero_image",        value: homeHeroImage },
              { key: "home_hero_position",     value: homeHeroPos },
              { key: "home_about_image",       value: homeAboutImage },
              { key: "home_about_position",    value: homeAboutPos },
              { key: "home_workshops_image",   value: homeWorkshopsImage },
              { key: "home_workshops_position",value: homeWorkshopsPos },
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
            <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">Treść — historia</label>
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
            <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">Tekst wprowadzający</label>
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
          <Field label="Instagram (np. @unique.ceramics)" value={instagram} setter={setInstagram} />
          <Field label="Facebook (pełny URL strony)" value={facebook} setter={setFacebook} placeholder="https://facebook.com/..." />
          <Field label="YouTube (pełny URL kanału)" value={youtube} setter={setYoutube} placeholder="https://youtube.com/..." />
          <Field label="WhatsApp (numer telefonu, np. 48668443706)" value={whatsapp} setter={setWhatsapp} placeholder="48668443706" />
          <p className="text-xs text-charcoal/50">Facebook, YouTube i WhatsApp wyświetlają się w stopce tylko gdy są wypełnione.</p>
          <SaveButton
            onClick={() => save([
              { key: "contact_phone", value: phone },
              { key: "contact_email", value: email },
              { key: "contact_instagram", value: instagram },
              { key: "contact_facebook", value: facebook },
              { key: "contact_youtube", value: youtube },
              { key: "contact_whatsapp", value: whatsapp },
            ])}
            label="Zapisz kontakt"
          />
        </div>
      )}

      {section === "wysylka" && (
        <div className="max-w-md space-y-6">
          <h2 className="font-serif text-2xl text-espresso">Wysyłka</h2>
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-widest uppercase text-charcoal/80">Darmowa wysyłka</span>
            <Toggle checked={freeEnabled} onChange={setFreeEnabled} />
          </div>
          <Field label="Koszt wysyłki (zł)" value={shippingCost} setter={setShippingCost} type="number" />
          {freeEnabled && (
            <Field label="Darmowa wysyłka od (zł)" value={freeFrom} setter={setFreeFrom} type="number" />
          )}
          <Field label="Czas realizacji (tekst na karcie produktu)" value={shippingTime} setter={setShippingTime} placeholder="np. 2–4 dni robocze" />
          <SaveButton
            onClick={() => save([
              { key: "shipping_cost", value: shippingCost },
              { key: "shipping_free_enabled", value: freeEnabled ? "true" : "false" },
              { key: "shipping_free_from", value: freeFrom },
              { key: "shipping_time", value: shippingTime },
            ])}
            label="Zapisz wysyłkę"
          />
        </div>
      )}

      {section === "platnosci_przelew" && (
        <div className="max-w-md space-y-5">
          <h2 className="font-serif text-2xl text-espresso">Przelew bankowy / BLIK</h2>
          <p className="text-xs text-charcoal/50">
            Zawsze dostępny jako metoda płatności. Dane zostaną wysłane klientowi e-mailem po złożeniu zamówienia.
          </p>
          <Field label="Imię i nazwisko / Nazwa odbiorcy" value={bankName} setter={setBankName} />
          <Field label="Numer konta (IBAN)" value={bankNumber} setter={setBankNumber} mono />
          <Field label="Nazwa banku" value={bankBankName} setter={setBankBankName} />
          <Field label="Prefiks tytułu przelewu" value={bankTitle} setter={setBankTitle} />
          <p className="text-xs text-charcoal/40">Tytuł wysyłany do kupującego: „[prefiks] #NR_ZAMÓWIENIA&rdquo;</p>
          <div className="border-t border-sand pt-5">
            <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">Przelew BLIK na telefon</p>
            <p className="text-xs text-charcoal/50 mb-3">
              Opcjonalnie. Jeśli podasz numer, klient zobaczy go obok danych do przelewu bankowego.
            </p>
            <Field label="Numer telefonu do BLIK" value={blikPhone} setter={setBlikPhone} type="tel" placeholder="+48 600 000 000" />
          </div>
          <SaveButton
            onClick={() => save([
              { key: "payment_bank_account_name", value: bankName },
              { key: "payment_bank_account_number", value: bankNumber },
              { key: "payment_bank_name", value: bankBankName },
              { key: "payment_bank_transfer_title", value: bankTitle },
              { key: "payment_blik_phone", value: blikPhone },
            ])}
            label="Zapisz"
          />
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
            <p>Klucze Stripe ustawiasz w pliku <span className="font-mono">.env.local</span> — nie są przechowywane w bazie danych:</p>
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
