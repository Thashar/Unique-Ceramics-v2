"use client";

import { useState } from "react";
import RichEditor from "@/components/admin/RichEditor";
import ImageUploader from "@/components/admin/ImageUploader";

type Tab = "omnie" | "warsztaty" | "regulamin" | "polityka" | "kontakt" | "wysylka";

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
