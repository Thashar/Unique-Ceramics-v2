"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { User, Lock, Mail, CheckCircle, Download, Trash2, ShieldAlert } from "lucide-react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");

  // Czy konto ma własne hasło. Bierzemy to z sesji (`auth.ts` czyta to z bazy),
  // a nie z obecności avatara – ta heurystyka myliła się przy kontach z hasłem,
  // które miały ustawione zdjęcie
  const hasPassword = session?.user?.hasPassword !== false;
  const isOAuth = !hasPassword;
  // E-mail konta Google pochodzi stamtąd i nie ma czym potwierdzić tożsamości
  const canChangeEmail = hasPassword;

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (
      !window.confirm(
        "Czy na pewno chcesz trwale usunąć konto? Tej operacji nie można cofnąć. Zamówienia pozostaną w systemie (wymóg księgowy), ale zostaną odłączone od konta."
      )
    ) {
      return;
    }
    setDeleting(true);
    setDeleteMsg("");
    const res = await fetch("/api/account/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: deletePassword }),
    });
    if (res.ok) {
      await signOut({ callbackUrl: "/" });
      return;
    }
    const data = await res.json().catch(() => ({}));
    setDeleteMsg(data.error ?? "Nie udało się usunąć konta.");
    setDeleting(false);
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    const res = await fetch("/api/account/update-name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      await update({ name });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    }
    setSavingName(false);
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmail(true);
    setEmailMsg("");
    setEmailSent(false);
    const res = await fetch("/api/account/email-change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, currentPassword: emailPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setEmailSent(true);
      setEmailMsg(
        `Wysłaliśmy link potwierdzający na ${data.newEmail ?? newEmail}. Adres zmieni się po kliknięciu w niego.`
      );
      setNewEmail("");
      setEmailPassword("");
    } else {
      setEmailMsg(data.error ?? "Nie udało się rozpocząć zmiany adresu.");
    }
    setSavingEmail(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMsg("");
    const res = await fetch("/api/account/change-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setPasswordMsg(data.error ?? "Hasło zostało zmienione.");
    if (res.ok) {
      setCurrentPassword("");
      setNewPassword("");
    }
    setSavingPassword(false);
  }

  return (
    <div className="space-y-8 max-w-xl">
      <h2 className="font-serif text-2xl text-espresso">Dane i hasło</h2>

      {/* Dane osobowe */}
      <div className="bg-cream p-8">
        <h3 className="text-xs tracking-widest uppercase text-clay mb-6 flex items-center gap-2">
          <User size={14} strokeWidth={1.5} />
          Dane osobowe
        </h3>
        <form onSubmit={handleSaveName} className="space-y-5">
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Imię i nazwisko</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">E-mail</label>
            <input
              type="email"
              value={session?.user?.email ?? ""}
              disabled
              className="w-full bg-sand/50 border border-sand px-4 py-3 text-charcoal/80 text-sm cursor-not-allowed"
            />
            <p className="text-xs text-charcoal/80 mt-1.5">
              {canChangeEmail
                ? "Adres zmienisz niżej – potwierdzenie przyjdzie na nową skrzynkę."
                : "Adres pochodzi z konta Google i zmienia się go po stronie Google."}
            </p>
          </div>
          <button
            type="submit"
            disabled={savingName}
            className="inline-flex items-center gap-2 bg-clay hover:bg-terracotta hover:text-espresso disabled:bg-sand text-warm-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            {nameSaved ? <><CheckCircle size={14} /> Zapisano</> : savingName ? "Zapisywanie..." : "Zapisz zmiany"}
          </button>
        </form>
      </div>

      {/* Zmiana adresu e-mail – tylko konta z własnym hasłem.
          E-mail jest loginem, więc zmiana wymaga hasła **i** potwierdzenia
          z nowej skrzynki; sam formularz nic jeszcze nie zmienia. */}
      {canChangeEmail && (
        <div className="bg-cream p-8">
          <h3 className="text-xs tracking-widest uppercase text-clay mb-6 flex items-center gap-2">
            <Mail size={14} strokeWidth={1.5} />
            Zmiana adresu e-mail
          </h3>
          <form onSubmit={handleChangeEmail} className="space-y-5">
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                Nowy adres e-mail
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                Aktualne hasło
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
              />
            </div>
            <p className="text-xs text-charcoal/80 leading-relaxed">
              Na nowy adres wyślemy link potwierdzający, ważny godzinę. Dopiero po
              kliknięciu w niego adres się zmieni – i będziesz nim logować się do sklepu.
              O prośbie powiadomimy też obecny adres.
            </p>
            {emailMsg && (
              <p
                className={`text-sm px-4 py-3 ${
                  emailSent
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {emailMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={savingEmail}
              className="inline-flex items-center gap-2 bg-clay hover:bg-terracotta hover:text-espresso disabled:bg-sand text-warm-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
            >
              {savingEmail ? "Wysyłanie..." : "Wyślij link potwierdzający"}
            </button>
          </form>
        </div>
      )}

      {/* Zmiana hasła */}
      <div className="bg-cream p-8">
        <h3 className="text-xs tracking-widest uppercase text-clay mb-6 flex items-center gap-2">
          <Lock size={14} strokeWidth={1.5} />
          Zmiana hasła
        </h3>

        {!session?.user?.image ? (
          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Aktualne hasło</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Nowe hasło <span className="normal-case text-charcoal/80">(min. 8 znaków)</span></label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
              />
            </div>
            {passwordMsg && (
              <p className={`text-sm ${passwordMsg.includes("zmienione") ? "text-green-700" : "text-red-700"}`}>
                {passwordMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 bg-espresso hover:bg-charcoal text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
            >
              {savingPassword ? "Zmienianie..." : "Zmień hasło"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-charcoal/80">
            Twoje konto jest połączone z Google. Zarządzaj hasłem w ustawieniach Google.
          </p>
        )}
      </div>

      {/* Twoje dane – eksport (RODO) */}
      <div className="bg-cream p-8">
        <h3 className="text-xs tracking-widest uppercase text-clay mb-4 flex items-center gap-2">
          <Download size={14} strokeWidth={1.5} />
          Twoje dane
        </h3>
        <p className="text-sm text-charcoal/80 mb-5 leading-relaxed">
          Pobierz kopię wszystkich danych powiązanych z Twoim kontem (profil, zapisany adres, historia zamówień) w formacie JSON.
        </p>
        <a
          href="/api/account/export"
          className="inline-flex items-center gap-2 border border-sand hover:border-clay text-espresso text-xs tracking-widest uppercase px-6 py-3 transition-colors"
        >
          <Download size={14} strokeWidth={1.5} />
          Pobierz moje dane
        </a>
      </div>

      {/* Strefa niebezpieczna – usunięcie konta (RODO art. 17) */}
      <div className="border border-red-200 bg-red-50/50 p-8">
        <h3 className="text-xs tracking-widest uppercase text-red-700 mb-4 flex items-center gap-2">
          <ShieldAlert size={14} strokeWidth={1.5} />
          Strefa niebezpieczna
        </h3>
        <p className="text-sm text-charcoal/80 mb-5 leading-relaxed">
          Trwałe usunięcie konta jest nieodwracalne. Złożone zamówienia pozostaną w systemie ze względu na obowiązki księgowe, ale zostaną odłączone od Twojego konta.
        </p>
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          {!isOAuth && (
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                Potwierdź hasłem
              </label>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-red-400 outline-none px-4 py-3 text-espresso text-sm transition-colors"
              />
            </div>
          )}
          {deleteMsg && <p className="text-sm text-red-700">{deleteMsg}</p>}
          <button
            type="submit"
            disabled={deleting}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            <Trash2 size={14} strokeWidth={1.5} />
            {deleting ? "Usuwanie..." : "Usuń moje konto"}
          </button>
        </form>
      </div>
    </div>
  );
}
