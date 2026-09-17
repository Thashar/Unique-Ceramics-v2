"use client";

import { useState } from "react";
import { SITE_URL } from "@/lib/seo";
import { localePath } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/use-locale";

type Status = "idle" | "sending" | "success" | "error";

interface Props {
  workshopOptions?: string[];
  /**
   * Slug produktu, o który klient chce zapytać (przycisk „Zapytaj o produkt”
   * przy wyprzedanym towarze). Adres z query czyta `ContactFormParams` –
   * tutaj przychodzi już gotowa wartość, dzięki czemu sam formularz renderuje
   * się także na serwerze, bez granicy Suspense.
   */
  productSlug?: string;
}

export default function ContactForm({ workshopOptions = [], productSlug = "" }: Props) {
  const locale = useLocale();
  const d = useT();
  // Temat ustawiany z automatu, gdy klient przychodzi z karty wyprzedanego produktu
  const PRODUCT_SUBJECT = d.contact.subjectProduct;
  // Slug przepuszczamy przez ten sam wzorzec co adresy produktów – do treści
  // wiadomości trafia wtedy wyłącznie nasz własny link
  const safeSlug = /^[a-z0-9-]{1,120}$/.test(productSlug) ? productSlug : "";
  const productMessage = safeSlug
    ? `${d.contact.productMessage(`${SITE_URL}${localePath(locale, `/sklep/${safeSlug}`)}`)}\n\n`
    : "";

  const [status, setStatus] = useState<Status>("idle");
  const [subject, setSubject] = useState(safeSlug ? PRODUCT_SUBJECT : "");
  const [workshopType, setWorkshopType] = useState("");

  const showWorkshopSelect = subject === d.contact.subjectWorkshops && workshopOptions.length > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      subject,
      message: fd.get("message"),
      ...(showWorkshopSelect && workshopType ? { workshopType } : {}),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setStatus("success");
        (e.target as HTMLFormElement).reset();
        setSubject("");
        setWorkshopType("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
            {d.contact.name}
          </label>
          <input
            name="name"
            type="text"
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors rounded-md"
            placeholder={d.contact.namePlaceholder}
          />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
            {d.contact.phone}
          </label>
          <input
            name="phone"
            type="tel"
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors rounded-md"
            placeholder="+48"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
          E-mail *
        </label>
        <input
          name="email"
          type="email"
          required
          className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors rounded-md"
          placeholder="twoj@email.pl"
        />
      </div>

      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
          {d.contact.subject}
        </label>
        <select
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setWorkshopType("");
          }}
          className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors rounded-md"
        >
          <option value="">{d.contact.chooseSubject}</option>
          <option>{PRODUCT_SUBJECT}</option>
          <option>{d.contact.subjectCustom}</option>
          <option>{d.contact.subjectWorkshops}</option>
          <option>{d.contact.subjectOther}</option>
        </select>
      </div>

      {showWorkshopSelect && (
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
            {d.contact.workshopType}
          </label>
          <select
            value={workshopType}
            onChange={(e) => setWorkshopType(e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors rounded-md"
          >
            <option value="">{d.contact.chooseWorkshop}</option>
            {workshopOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
          {d.contact.message} *
        </label>
        <textarea
          name="message"
          required
          defaultValue={productMessage}
          rows={5}
          className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors resize-none rounded-md"
          placeholder={d.contact.messagePlaceholder}
        />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-xs tracking-widest uppercase py-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed rounded-md"
      >
        {status === "sending" ? d.contact.sending : d.contact.send}
      </button>

      {status === "success" && (
        <p className="text-sm text-center text-clay">
          {d.contact.success}
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-center text-red-700">
          {d.contact.error}
        </p>
      )}
    </form>
  );
}
