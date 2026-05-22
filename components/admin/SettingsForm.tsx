"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import RichEditor from "@/components/admin/RichEditor";
import ImageUploader from "@/components/admin/ImageUploader";

type Section =
  | "omnie"
  | "warsztaty"
  | "regulamin"
  | "polityka"
  | "kontakt"
  | "wysylka"
  | "platnosci_przelew"
  | "platnosci_blik"
  | "platnosci_p24"
  | "platnosci_payu";

type CategoryId = "omnie" | "warsztaty" | "regulamin" | "polityka" | "kontakt" | "wysylka" | "platnosci";

interface SidebarItem {
  id: Section;
  label: string;
}

interface SidebarCategory {
  id: CategoryId;
  label: string;
  items: SidebarItem[];
}

const CATEGORIES: SidebarCategory[] = [
  { id: "omnie", label: "O mnie", items: [{ id: "omnie", label: "Zdjęcie i treść" }] },
  { id: "warsztaty", label: "Warsztaty", items: [{ id: "warsztaty", label: "Zdjęcie i tekst" }] },
  { id: "regulamin", label: "Regulamin", items: [{ id: "regulamin", label: "Treść regulaminu" }] },
  { id: "polityka", label: "Polityka prywatności", items: [{ id: "polityka", label: "Treść polityki" }] },
  { id: "kontakt", label: "Kontakt", items: [{ id: "kontakt", label: "Dane kontaktowe" }] },
  { id: "wysylka", label: "Wysyłka", items: [{ id: "wysylka", label: "Koszty i progi" }] },
  {
    id: "platnosci",
    label: "Płatności",
    items: [
      { id: "platnosci_przelew", label: "Przelew tradycyjny" },
      { id: "platnosci_blik", label: "BLIK" },
      { id: "platnosci_p24", label: "Przelewy24" },
      { id: "platnosci_payu", label: "PayU" },
    ],
  },
];

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

export default function SettingsForm({ initial }: Props) {
  const [activeSection, setActiveSection] = useState<Section>("omnie");
  const [openCategories, setOpenCategories] = useState<Set<CategoryId>>(new Set(["omnie"]));
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

  const toggleCategory = (id: CategoryId, firstItem: Section) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setActiveSection(firstItem);
      }
      return next;
    });
    if (!openCategories.has(id)) {
      setActiveSection(firstItem);
    } else {
      setActiveSection(firstItem);
    }
  };

  const selectItem = (catId: CategoryId, sectionId: Section) => {
    setOpenCategories((prev) => new Set([...prev, catId]));
    setActiveSection(sectionId);
  };

  return (
    <div className="flex gap-0 border border-sand min-h-[640px]">
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

      {/* Sidebar */}
      <nav className="w-60 flex-shrink-0 bg-warm-white border-r border-sand">
        {CATEGORIES.map((cat) => {
          const isOpen = openCategories.has(cat.id);
          const hasMany = cat.items.length > 1;

          return (
            <div key={cat.id}>
              <button
                onClick={() => toggleCategory(cat.id, cat.items[0].id)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs tracking-widest uppercase text-charcoal hover:bg-sand transition-colors border-b border-sand/50"
              >
                <span>{cat.label}</span>
                {hasMany ? (
                  isOpen ? (
                    <ChevronDown size={14} className="text-charcoal/50" />
                  ) : (
                    <ChevronRight size={14} className="text-charcoal/50" />
                  )
                ) : null}
              </button>

              {isOpen && hasMany && (
                <div className="border-b border-sand/50">
                  {cat.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectItem(cat.id, item.id)}
                      className={`w-full text-left px-6 py-2.5 text-xs transition-colors ${
                        activeSection === item.id
                          ? "bg-espresso text-cream"
                          : "text-charcoal/70 hover:bg-sand hover:text-charcoal"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {isOpen && !hasMany && (
                <div className="border-b border-sand/50">
                  <button
                    onClick={() => selectItem(cat.id, cat.items[0].id)}
                    className={`w-full text-left px-6 py-2.5 text-xs transition-colors ${
                      activeSection === cat.items[0].id
                        ? "bg-espresso text-cream"
                        : "text-charcoal/70 hover:bg-sand hover:text-charcoal"
                    }`}
                  >
                    {cat.items[0].label}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Panel treści */}
      <div className="flex-1 p-8 bg-cream min-w-0">

        {activeSection === "omnie" && (
          <div className="max-w-2xl space-y-6">
            <h2 className="font-serif text-xl text-espresso mb-2">O mnie</h2>
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
            <SaveButton
              onClick={() => save([
                { key: "about_hero_image", value: aboutImage },
                { key: "about_story", value: aboutStory },
              ])}
              label="Zapisz stronę O mnie"
            />
          </div>
        )}

        {activeSection === "warsztaty" && (
          <div className="max-w-2xl space-y-6">
            <h2 className="font-serif text-xl text-espresso mb-2">Warsztaty</h2>
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
            <SaveButton
              onClick={() => save([
                { key: "workshops_hero_image", value: workshopsImage },
                { key: "workshops_intro", value: workshopsIntro },
              ])}
              label="Zapisz stronę Warsztaty"
            />
          </div>
        )}

        {activeSection === "regulamin" && (
          <div className="max-w-2xl space-y-4">
            <h2 className="font-serif text-xl text-espresso mb-2">Regulamin</h2>
            <RichEditor value={regulamin} onChange={setRegulamin} />
            <SaveButton
              onClick={() => save([{ key: "regulamin", value: regulamin }])}
              label="Zapisz regulamin"
            />
          </div>
        )}

        {activeSection === "polityka" && (
          <div className="max-w-2xl space-y-4">
            <h2 className="font-serif text-xl text-espresso mb-2">Polityka prywatności</h2>
            <RichEditor value={polityka} onChange={setPolityka} />
            <SaveButton
              onClick={() => save([{ key: "polityka_prywatnosci", value: polityka }])}
              label="Zapisz politykę prywatności"
            />
          </div>
        )}

        {activeSection === "kontakt" && (
          <div className="max-w-md space-y-5">
            <h2 className="font-serif text-xl text-espresso mb-2">Dane kontaktowe</h2>
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

        {activeSection === "wysylka" && (
          <div className="max-w-md space-y-6">
            <h2 className="font-serif text-xl text-espresso mb-2">Wysyłka</h2>
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

        {activeSection === "platnosci_przelew" && (
          <div className="max-w-md space-y-5">
            <h2 className="font-serif text-xl text-espresso mb-2">Przelew tradycyjny</h2>
            <p className="text-xs text-charcoal/50">Zawsze dostępny jako metoda płatności.</p>
            <Field label="Imię i nazwisko / Nazwa odbiorcy" value={bankName} setter={setBankName} />
            <Field label="Numer konta (IBAN)" value={bankNumber} setter={setBankNumber} mono />
            <Field label="Nazwa banku" value={bankBankName} setter={setBankBankName} />
            <Field label="Prefiks tytułu przelewu" value={bankTitle} setter={setBankTitle} />
            <p className="text-xs text-charcoal/40">
              Tytuł wysyłany do kupującego: „[prefiks] #NR_ZAMÓWIENIA"
            </p>
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

        {activeSection === "platnosci_blik" && (
          <div className="max-w-md space-y-5">
            <h2 className="font-serif text-xl text-espresso mb-2">BLIK</h2>
            <div className="flex items-center justify-between">
              <span className="text-xs tracking-widest uppercase text-charcoal/60">Włącz BLIK</span>
              <Toggle checked={blikEnabled} onChange={setBlikEnabled} />
            </div>
            {blikEnabled && (
              <Field
                label="Numer telefonu do BLIK"
                value={blikPhone}
                setter={setBlikPhone}
                type="tel"
                placeholder="+48 600 000 000"
              />
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

        {activeSection === "platnosci_p24" && (
          <div className="max-w-md space-y-5">
            <h2 className="font-serif text-xl text-espresso mb-2">Przelewy24</h2>
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

        {activeSection === "platnosci_payu" && (
          <div className="max-w-md space-y-5">
            <h2 className="font-serif text-xl text-espresso mb-2">PayU</h2>
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
    </div>
  );
}
