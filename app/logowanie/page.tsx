"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/konto";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    urlError === "CredentialsSignin" ? "Nieprawidłowy e-mail lub hasło." : ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Nieprawidłowy e-mail lub hasło.");
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  async function handleGoogle() {
    setLoading(true);
    await signIn("google", { callbackUrl });
  }

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 border border-sand hover:border-clay bg-warm-white hover:bg-cream text-espresso text-sm py-3.5 transition-colors mb-6 disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Kontynuuj z Google
      </button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-sand" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-widest text-charcoal/40">
          <span className="bg-warm-white px-3">lub e-mailem</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
            E-mail *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
            placeholder="twoj@email.pl"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs tracking-widest uppercase text-charcoal/80">
              Hasło *
            </label>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors pr-12"
              placeholder="Twoje hasło"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-clay transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-clay hover:bg-terracotta disabled:bg-sand disabled:text-charcoal/40 text-warm-white text-xs tracking-widest uppercase py-4 transition-colors"
        >
          {loading ? "Logowanie..." : "Zaloguj się"}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[100svh] bg-cream flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="font-serif text-2xl text-espresso hover:text-clay transition-colors">
            Unique Ceramics
          </Link>
          <p className="text-xs tracking-[0.25em] uppercase text-clay mt-1">Ręcznie tworzone z sercem</p>
        </div>

        <div className="bg-warm-white p-8 md:p-10">
          <h1 className="font-serif text-3xl text-espresso mb-2">Zaloguj się</h1>
          <p className="text-sm text-charcoal/80 mb-8">
            Nie masz konta?{" "}
            <Link href="/rejestracja" className="text-clay hover:text-espresso underline underline-offset-2 transition-colors">
              Zarejestruj się
            </Link>
          </p>

          <Suspense fallback={<div className="h-48 animate-pulse bg-sand/30" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-charcoal/40 mt-6">
          <Link href="/" className="hover:text-clay transition-colors">
            ← Wróć do sklepu
          </Link>
        </p>
      </div>
    </div>
  );
}
