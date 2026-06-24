"use client";

import { useState } from "react";
import Image from "next/image";
import RichEditor from "@/components/admin/RichEditor";
import ImageUploader from "@/components/admin/ImageUploader";
import FocalPointPicker from "@/components/admin/FocalPointPicker";
import WorkshopsOffersEditor from "@/components/admin/WorkshopsOffersEditor";

interface Props {
  section: string;
  initial: {
    home_hero_image: string;
    home_hero_position: string;
    home_about_image: string;
    home_about_position: string;
    home_workshops_image: string;
    home_workshops_position: string;
    shop_hero_image: string;
    shop_hero_position: string;
    shop_hero_overlay_color: string;
    shop_hero_overlay_opacity: string;
    shop_hero_height: string;
    shop_subtitle: string;
    about_hero_image: string;
    about_hero_position: string;
    about_hero_overlay_color: string;
    about_hero_overlay_opacity: string;
    about_hero_height: string;
    about_content_image: string;
    about_content_position: string;
    about_story: string;
    workshops_hero_image: string;
    workshops_hero_position: string;
    workshops_hero_overlay_color: string;
    workshops_hero_overlay_opacity: string;
    workshops_hero_height: string;
    workshops_content_image: string;
    workshops_content_position: string;
    workshops_intro: string;
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
    shipping_cost: string;
    shipping_cost_parcel_locker: string;
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
    vacation_enabled: string;
    vacation_end_date: string;
    vacation_message: string;
    custom_order_notify_email_enabled: string;
  };
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
          className="w-full border border-sand border-dashed rounded-sm flex items-center justify-center text-charcoal/30 text-xs"
          style={{ aspectRatio }}
        >
          Najpierw wybierz zdjęcie
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-charcoal/60">Kolor:</span>
          <input
            type="color"
            value={color || "#2C2825"}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-8 h-8 cursor-pointer border border-sand rounded p-0.5 bg-warm-white"
          />
          <span className="text-[11px] text-charcoal/40 font-mono">{color}</span>
        </div>
        <div className="flex items-center gap-2 min-w-[220px]">
          <span className="text-xs text-charcoal/60 shrink-0">Przezroczystość:</span>
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={(e) => onOpacityChange(e.target.value)}
            className="flex-1 accent-clay"
          />
          <span className="text-xs text-charcoal/60 w-7 text-right">{pct}%</span>
        </div>
      </div>
      <p className="text-[11px] text-charcoal/40">Podgląd natychmiastowy. Na stronie efekt widoczny po zapisaniu.</p>
    </div>
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

  // Sklep
  const [shopHeroImage, setShopHeroImage] = useState(initial.shop_hero_image);
  const [shopHeroPos, setShopHeroPos] = useState(initial.shop_hero_position);
  const [shopOverlayColor, setShopOverlayColor] = useState(initial.shop_hero_overlay_color);
  const [shopOverlayOpacity, setShopOverlayOpacity] = useState(initial.shop_hero_overlay_opacity);
  const [shopHeroHeight, setShopHeroHeight] = useState(initial.shop_hero_height);
  const [shopSubtitle, setShopSubtitle] = useState(initial.shop_subtitle);

  // O mnie
  const [aboutImage, setAboutImage] = useState(initial.about_hero_image);
  const [aboutHeroPos, setAboutHeroPos] = useState(initial.about_hero_position);
  const [aboutOverlayColor, setAboutOverlayColor] = useState(initial.about_hero_overlay_color);
  const [aboutOverlayOpacity, setAboutOverlayOpacity] = useState(initial.about_hero_overlay_opacity);
  const [aboutHeroHeight, setAboutHeroHeight] = useState(initial.about_hero_height);
  const [aboutContentImage, setAboutContentImage] = useState(initial.about_content_image);
  const [aboutContentPos, setAboutContentPos] = useState(initial.about_content_position);
  const [aboutStory, setAboutStory] = useState(initial.about_story);

  // Warsztaty
  const [workshopsImage, setWorkshopsImage] = useState(initial.workshops_hero_image);
  const [workshopsHeroPos, setWorkshopsHeroPos] = useState(initial.workshops_hero_position);
  const [workshopsOverlayColor, setWorkshopsOverlayColor] = useState(initial.workshops_hero_overlay_color);
  const [workshopsOverlayOpacity, setWorkshopsOverlayOpacity] = useState(initial.workshops_hero_overlay_opacity);
  const [workshopsHeroHeight, setWorkshopsHeroHeight] = useState(initial.workshops_hero_height);
  const [workshopsContentImage, setWorkshopsContentImage] = useState(initial.workshops_content_image);
  const [workshopsContentPos, setWorkshopsContentPos] = useState(initial.workshops_content_position);
  const [workshopsIntro, setWorkshopsIntro] = useState(initial.workshops_intro);
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

  // Wysyłka
  const [shippingCost, setShippingCost] = useState(initial.shipping_cost);
  const [shippingCostParcel, setShippingCostParcel] = useState(initial.shipping_cost_parcel_locker);
  const [freeEnabled, setFreeEnabled] = useState(initial.shipping_free_enabled === "true");
  const [freeFrom, setFreeFrom] = useState(initial.shipping_free_from);
  const [shippingTime, setShippingTime] = useState(initial.shipping_time);

  // Przelew
  const [bankName, setBankName] = useState(initial.payment_bank_account_name);
  const [bankNumber, setBankNumber] = useState(initial.payment_bank_account_number);
  const [bankBankName, setBankBankName] = useState(initial.payment_bank_name);
  const [bankTitle, setBankTitle] = useState(initial.payment_bank_transfer_title);

  // BLIK phone
  const [blikPhone, setBlikPhone] = useState(initial.payment_blik_phone);

  // Stripe
  const [stripeEnabled, setStripeEnabled] = useState(initial.payment_stripe_enabled === "true");

  // Urlop
  const [vacationEnabled, setVacationEnabled] = useState(initial.vacation_enabled === "true");
  const [vacationEndDate, setVacationEndDate] = useState(initial.vacation_end_date);
  const [vacationMessage, setVacationMessage] = useState(initial.vacation_message);

  // Zamówienia indywidualne
  const [customOrderNotifyEnabled, setCustomOrderNotifyEnabled] = useState(
    initial.custom_order_notify_email_enabled !== "false"
  );

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
              { key: "home_about_position",       value: homeAboutPos },
              { key: "home_workshops_image",      value: homeWorkshopsImage },
              { key: "home_workshops_position",   value: homeWorkshopsPos },
            ])}
            label="Zapisz zdjęcia strony głównej"
          />
        </div>
      )}

      {section === "sklep" && (
        <div className="max-w-2xl space-y-8">
          <h2 className="font-serif text-2xl text-espresso">Sklep</h2>

          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Podtytuł strony</h3>
            <p className="text-xs text-charcoal/40">Tekst widoczny pod nagłówkiem &bdquo;Sklep&rdquo; gdy brak zdjęcia hero.</p>
            <Field
              label="Podtytuł"
              value={shopSubtitle}
              setter={setShopSubtitle}
              placeholder="Każdy przedmiot jest unikalny — tworzony ręcznie z lokalnej gliny."
            />
          </div>

          <div className="border-t border-sand pt-6 space-y-4">
            <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Zdjęcie nagłówka (hero) — opcjonalne</h3>
            <p className="text-xs text-charcoal/40">Jeśli ustawione — zastępuje podtytuł i wypełnia nagłówek strony sklepu.</p>
            <ImageUploader
              currentUrl={shopHeroImage}
              onUploaded={(url) => setShopHeroImage(url)}
              label="Zdjęcie hero"
            />
            {shopHeroImage && (
              <>
                <FocalPointPicker imageUrl={shopHeroImage} value={shopHeroPos} onChange={setShopHeroPos} aspectRatio="3/1" />
                <OverlayControl
                  imageUrl={shopHeroImage}
                  position={shopHeroPos}
                  color={shopOverlayColor}
                  opacity={shopOverlayOpacity}
                  onColorChange={setShopOverlayColor}
                  onOpacityChange={setShopOverlayOpacity}
                  aspectRatio="3/1"
                />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs tracking-widest uppercase text-charcoal/80">Wysokość nagłówka z obrazem</label>
                    <span className="text-sm font-medium text-espresso tabular-nums">{shopHeroHeight}vh</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    step="5"
                    value={shopHeroHeight}
                    onChange={(e) => setShopHeroHeight(e.target.value)}
                    className="w-full accent-clay"
                  />
                </div>
              </>
            )}
          </div>

          <SaveButton
            onClick={() => save([
              { key: "shop_subtitle",             value: shopSubtitle },
              { key: "shop_hero_image",            value: shopHeroImage },
              { key: "shop_hero_position",         value: shopHeroPos },
              { key: "shop_hero_overlay_color",    value: shopOverlayColor },
              { key: "shop_hero_overlay_opacity",  value: shopOverlayOpacity },
              { key: "shop_hero_height",           value: shopHeroHeight },
            ])}
            label="Zapisz ustawienia sklepu"
          />
        </div>
      )}

      {section === "omnie" && (
        <div className="max-w-2xl space-y-8">
          <h2 className="font-serif text-2xl text-espresso">O mnie</h2>

          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Zdjęcie nagłówka (hero)</h3>
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
              <input type="range" min="20" max="80" step="5" value={aboutHeroHeight} onChange={(e) => setAboutHeroHeight(e.target.value)} className="w-full accent-clay" />
              <p className="text-[11px] text-charcoal/40">Aktywne gdy zdjęcie jest ustawione. Bez zdjęcia nagłówek ma jasne tło jak w /kontakt.</p>
            </div>
          </div>

          <div className="border-t border-sand pt-6 space-y-4">
            <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Zdjęcie przy opisie (prawa kolumna)</h3>
            <p className="text-xs text-charcoal/40">Jeżeli puste — kolumna zdjęcia znika, tekst zajmuje całą szerokość.</p>
            <ImageUploader
              currentUrl={aboutContentImage}
              onUploaded={(url) => setAboutContentImage(url)}
              label="Zdjęcie przy opisie"
            />
            <FocalPointPicker imageUrl={aboutContentImage} value={aboutContentPos} onChange={setAboutContentPos} />
          </div>

          <div className="border-t border-sand pt-6">
            <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">Treść — historia</label>
            <RichEditor value={aboutStory} onChange={setAboutStory} />
          </div>

          <SaveButton
            onClick={() => save([
              { key: "about_hero_image",           value: aboutImage },
              { key: "about_hero_position",        value: aboutHeroPos },
              { key: "about_hero_overlay_color",   value: aboutOverlayColor },
              { key: "about_hero_overlay_opacity", value: aboutOverlayOpacity },
              { key: "about_hero_height",          value: aboutHeroHeight },
              { key: "about_content_image",        value: aboutContentImage },
              { key: "about_content_position",     value: aboutContentPos },
              { key: "about_story",                value: aboutStory },
            ])}
            label="Zapisz stronę O mnie"
          />
        </div>
      )}


      {section === "warsztaty" && (
        <div className="max-w-2xl space-y-8">
          <h2 className="font-serif text-2xl text-espresso">Warsztaty</h2>

          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Zdjęcie nagłówka (hero)</h3>
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
              <input type="range" min="20" max="80" step="5" value={workshopsHeroHeight} onChange={(e) => setWorkshopsHeroHeight(e.target.value)} className="w-full accent-clay" />
              <p className="text-[11px] text-charcoal/40">Aktywne gdy zdjęcie jest ustawione. Bez zdjęcia nagłówek ma jasne tło jak w /kontakt.</p>
            </div>
          </div>

          <div className="border-t border-sand pt-6 space-y-4">
            <h3 className="text-sm font-medium tracking-widest uppercase text-charcoal/70">Zdjęcie przy opisie (prawa kolumna)</h3>
            <p className="text-xs text-charcoal/40">Jeżeli puste — kolumna zdjęcia znika, tekst zajmuje całą szerokość.</p>
            <ImageUploader
              currentUrl={workshopsContentImage}
              onUploaded={(url) => setWorkshopsContentImage(url)}
              label="Zdjęcie przy opisie"
            />
            <FocalPointPicker imageUrl={workshopsContentImage} value={workshopsContentPos} onChange={setWorkshopsContentPos} />
          </div>

          <div className="border-t border-sand pt-6">
            <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-3">Tekst wprowadzający</label>
            <RichEditor value={workshopsIntro} onChange={setWorkshopsIntro} />
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
              { key: "workshops_content_image",        value: workshopsContentImage },
              { key: "workshops_content_position",     value: workshopsContentPos },
              { key: "workshops_intro",                value: workshopsIntro },
              { key: "workshops_offers",               value: workshopsOffers },
              { key: "workshops_includes",             value: workshopsIncludes },
              { key: "workshops_faq",                  value: workshopsFaq },
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
          <Field label="Koszt wysyłki — Kurier (zł)" value={shippingCost} setter={setShippingCost} type="number" />
          <Field label="Koszt wysyłki — Paczkomat InPost (zł)" value={shippingCostParcel} setter={setShippingCostParcel} type="number" />
          {freeEnabled && (
            <Field label="Darmowa wysyłka od (zł)" value={freeFrom} setter={setFreeFrom} type="number" />
          )}
          <Field label="Czas realizacji (tekst na karcie produktu)" value={shippingTime} setter={setShippingTime} placeholder="np. 2–4 dni robocze" />
          <SaveButton
            onClick={() => save([
              { key: "shipping_cost", value: shippingCost },
              { key: "shipping_cost_parcel_locker", value: shippingCostParcel },
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

      {section === "urlop" && (
        <div className="max-w-md space-y-6">
          <h2 className="font-serif text-2xl text-espresso">Urlop</h2>
          <p className="text-xs text-charcoal/50 leading-relaxed">
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
                <p className="text-[11px] text-charcoal/40 mt-1">
                  Jeśli puste — komunikat nie będzie zawierał daty.
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
                  placeholder="Jestem na urlopie — zamówienia będą realizowane od..."
                  className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
                />
                <p className="text-[11px] text-charcoal/40 mt-1">
                  Jeśli puste — komunikat zostanie wygenerowany automatycznie na podstawie daty.
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
        </div>
      )}

      {section === "zam_indywidualne" && (
        <div className="max-w-md space-y-6">
          <h2 className="font-serif text-2xl text-espresso">Zamówienia indywidualne</h2>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs tracking-widest uppercase text-charcoal/80">Powiadomienia e-mail</span>
              <p className="text-[11px] text-charcoal/40 mt-0.5">
                Gdy włączone — przy każdym nowym zamówieniu indywidualnym
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
