"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { CheckCircle, Mail, ShieldAlert } from "lucide-react";

/**
 * Potwierdzenie zmiany adresu e-mail.
 *
 * Zmiana następuje dopiero po **kliknięciu przycisku**, nie po samym wejściu na
 * stronę: skanery antywirusowe i podglądy linków w skrzynkach same otwierają
 * adresy z wiadomości i zużyłyby token, zanim klient zdąży cokolwiek zrobić.
 */
export default function EmailChangeConfirm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  async function confirm() {
    setState("working");
    setError("");
    try {
      const res = await fetch("/api/account/email-change/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Nie udało się potwierdzić zmiany.");
        setState("idle");
        return;
      }
      setEmail(data.email ?? "");
      setState("done");
      // Sesja jest już unieważniona po stronie serwera (bump tokenVersion) –
      // czyścimy ją lokalnie, żeby nagłówek nie pokazywał nieaktualnego konta.
      // `redirect: false`, bo klient ma zostać na komunikacie.
      void signOut({ redirect: false });
    } catch {
      setError("Brak połączenia. Spróbuj ponownie.");
      setState("idle");
    }
  }

  if (!token) {
    return (
      <div className="bg-cream p-8 space-y-3">
        <p className="flex items-center gap-2 text-espresso">
          <ShieldAlert size={16} strokeWidth={1.5} className="text-clay shrink-0" />
          Brak tokenu w adresie
        </p>
        <p className="text-sm text-charcoal/80 leading-relaxed">
          Otwórz link dokładnie tak, jak przyszedł w wiadomości. Jeśli został skrócony
          albo ucięty, poproś o zmianę adresu jeszcze raz w panelu konta.
        </p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="bg-cream p-8 space-y-4">
        <p className="flex items-center gap-2 text-espresso">
          <CheckCircle size={16} strokeWidth={1.5} className="text-green-700 shrink-0" />
          Adres został zmieniony
        </p>
        <p className="text-sm text-charcoal/80 leading-relaxed">
          Od teraz logujesz się adresem <strong className="text-espresso">{email}</strong>.
          Ze względów bezpieczeństwa wylogowaliśmy wszystkie urządzenia.
        </p>
        <Link
          href="/logowanie"
          className="inline-flex items-center gap-2 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
        >
          Zaloguj się nowym adresem
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-cream p-8 space-y-4">
      <p className="flex items-center gap-2 text-espresso">
        <Mail size={16} strokeWidth={1.5} className="text-clay shrink-0" />
        Potwierdź nowy adres
      </p>
      <p className="text-sm text-charcoal/80 leading-relaxed">
        Po potwierdzeniu adres konta zmieni się na ten, na który przyszła wiadomość.
        Będziesz nim logować się do sklepu, a wszystkie urządzenia zostaną wylogowane.
      </p>
      {error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</p>
      )}
      <button
        type="button"
        onClick={confirm}
        disabled={state === "working"}
        className="inline-flex items-center gap-2 bg-clay hover:bg-terracotta hover:text-espresso disabled:bg-sand disabled:text-charcoal/40 text-warm-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
      >
        {state === "working" ? "Potwierdzanie..." : "Potwierdź zmianę"}
      </button>
    </div>
  );
}
