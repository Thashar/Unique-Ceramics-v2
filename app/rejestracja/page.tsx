"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import GoogleIcon from "@/components/ui/GoogleIcon";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Błąd rejestracji.");
      setLoading(false);
      return;
    }

    // Auto-login po rejestracji
    await signIn("credentials", { email, password, callbackUrl: "/konto" });
  }

  async function handleGoogle() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/konto" });
  }

  return (
    <AuthShell
      title="Utwórz konto"
      subtitle={
        <>
          Masz już konto?{" "}
          <Link href="/logowanie" className="text-clay hover:text-espresso underline underline-offset-2 transition-colors">
            Zaloguj się
          </Link>
        </>
      }
    >

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-md border border-sand hover:border-clay bg-warm-white hover:bg-cream text-espresso text-sm py-3.5 transition-colors mb-6 disabled:opacity-50"
          >
            <GoogleIcon />
            Zarejestruj się przez Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-sand" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest text-charcoal/80">
              <span className="bg-warm-white px-3">lub e-mailem</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                Imię i nazwisko *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
                placeholder="Twoje imię"
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                E-mail *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
                placeholder="twoj@email.pl"
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                Hasło * <span className="normal-case text-charcoal/80">(min. 8 znaków)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors pr-12"
                  placeholder="Min. 8 znaków"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal/80 hover:text-clay transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-clay hover:bg-terracotta hover:text-espresso disabled:bg-sand disabled:text-charcoal/40 text-warm-white text-xs tracking-widest uppercase py-4 transition-colors"
            >
              {loading ? "Tworzenie konta..." : "Utwórz konto"}
            </button>

            <p className="text-xs text-charcoal/80 text-center leading-relaxed">
              Zakładając konto, akceptujesz{" "}
              <Link href="/regulamin" className="underline hover:text-clay transition-colors">regulamin</Link>.
            </p>
          </form>
    </AuthShell>
  );
}
