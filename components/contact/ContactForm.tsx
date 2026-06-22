"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "success" | "error";

interface Props {
  workshopOptions?: string[];
}

export default function ContactForm({ workshopOptions = [] }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [subject, setSubject] = useState("");
  const [workshopType, setWorkshopType] = useState("");

  const showWorkshopSelect = subject === "Warsztaty" && workshopOptions.length > 0;

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
            Imię
          </label>
          <input
            name="name"
            type="text"
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
            placeholder="Twoje imię"
          />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
            Telefon
          </label>
          <input
            name="phone"
            type="tel"
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
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
          className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
          placeholder="twoj@email.pl"
        />
      </div>

      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
          Temat
        </label>
        <select
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setWorkshopType("");
          }}
          className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
        >
          <option value="">Wybierz temat</option>
          <option>Zamówienie ze sklepu</option>
          <option>Zamówienie indywidualne</option>
          <option>Warsztaty</option>
          <option>Inne</option>
        </select>
      </div>

      {showWorkshopSelect && (
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
            Rodzaj warsztatu
          </label>
          <select
            value={workshopType}
            onChange={(e) => setWorkshopType(e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
          >
            <option value="">Wybierz rodzaj warsztatu</option>
            {workshopOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
          Wiadomość *
        </label>
        <textarea
          name="message"
          required
          rows={5}
          className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors resize-none"
          placeholder="Jak mogę pomóc?"
        />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full bg-clay hover:bg-terracotta text-warm-white text-xs tracking-widest uppercase py-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "sending" ? "Wysyłanie…" : "Wyślij wiadomość"}
      </button>

      {status === "success" && (
        <p className="text-sm text-center text-clay">
          Wiadomość wysłana — odpiszę w ciągu 1–2 dni roboczych.
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-center text-red-500">
          Coś poszło nie tak. Spróbuj ponownie lub napisz bezpośrednio na e-mail.
        </p>
      )}
    </form>
  );
}
