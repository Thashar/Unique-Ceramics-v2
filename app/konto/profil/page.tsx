"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { User, Lock, CheckCircle, Download, Trash2, ShieldAlert } from "lucide-react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");

  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");

  // Konto połączone z Google ma ustawiony obraz i nie ma hasła
  const isOAuth = Boolean(session?.user?.image);

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
              className="w-full bg-sand/50 border border-sand px-4 py-3 text-charcoal/50 text-sm cursor-not-allowed"
            />
            <p className="text-xs text-charcoal/40 mt-1.5">Adres e-mail nie może być zmieniony.</p>
          </div>
          <button
            type="submit"
            disabled={savingName}
            className="inline-flex items-center gap-2 bg-clay hover:bg-terracotta disabled:bg-sand text-warm-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            {nameSaved ? <><CheckCircle size={14} /> Zapisano</> : savingName ? "Zapisywanie..." : "Zapisz zmiany"}
          </button>
        </form>
      </div>

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
              <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Nowe hasło <span className="normal-case text-charcoal/40">(min. 8 znaków)</span></label>
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
              <p className={`text-sm ${passwordMsg.includes("zmienione") ? "text-green-700" : "text-red-600"}`}>
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

      {/* Twoje dane — eksport (RODO) */}
      <div className="bg-cream p-8">
        <h3 className="text-xs tracking-widest uppercase text-clay mb-4 flex items-center gap-2">
          <Download size={14} strokeWidth={1.5} />
          Twoje dane
        </h3>
        <p className="text-sm text-charcoal/70 mb-5 leading-relaxed">
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

      {/* Strefa niebezpieczna — usunięcie konta (RODO art. 17) */}
      <div className="border border-red-200 bg-red-50/50 p-8">
        <h3 className="text-xs tracking-widest uppercase text-red-700 mb-4 flex items-center gap-2">
          <ShieldAlert size={14} strokeWidth={1.5} />
          Strefa niebezpieczna
        </h3>
        <p className="text-sm text-charcoal/70 mb-5 leading-relaxed">
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
          {deleteMsg && <p className="text-sm text-red-600">{deleteMsg}</p>}
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
