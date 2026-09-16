"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import GoogleIcon from "@/components/ui/GoogleIcon";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Tylko ścieżka względna – ta sama reguła co w `middleware.ts`. Logowanie
  // hasłem przekierowuje ręcznie (`redirect: false`), więc adres absolutny albo
  // protokołowo-względny („//evil.tld") wyprowadzałby klienta ze sklepu zaraz po
  // poprawnym zalogowaniu. Middleware sprawdza to wyłącznie dla zalogowanego,
  // czyli nie dla tego, kto właśnie stoi przed formularzem
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl =
    rawCallbackUrl && rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/konto";
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
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 rounded-md border border-sand hover:border-clay bg-warm-white hover:bg-cream text-espresso text-sm py-3.5 transition-colors mb-6 disabled:opacity-50"
      >
        <GoogleIcon />
        Kontynuuj z Google
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
              className="w-full rounded-md bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors pr-12"
              placeholder="Twoje hasło"
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
          {loading ? "Logowanie..." : "Zaloguj się"}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Zaloguj się"
      subtitle={
        <>
          Nie masz konta?{" "}
          <Link href="/rejestracja" className="text-clay hover:text-espresso underline underline-offset-2 transition-colors">
            Zarejestruj się
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-48 animate-pulse bg-sand/30 rounded-md" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
