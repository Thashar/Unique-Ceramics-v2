"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { User, Lock, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");

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
            <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Imię i nazwisko</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">E-mail</label>
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
            className="inline-flex items-center gap-2 bg-terracotta hover:bg-clay disabled:bg-sand text-warm-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
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
              <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Aktualne hasło</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Nowe hasło <span className="normal-case text-charcoal/40">(min. 8 znaków)</span></label>
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
          <p className="text-sm text-charcoal/60">
            Twoje konto jest połączone z Google. Zarządzaj hasłem w ustawieniach Google.
          </p>
        )}
      </div>
    </div>
  );
}
