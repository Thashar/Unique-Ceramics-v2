import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import ClayRule from "@/components/ui/ClayRule";
import { LOGO_SRC, LOGO_WIDTH, LOGO_HEIGHT } from "@/lib/logo";

/**
 * Wspólna oprawa stron logowania i rejestracji – ta sama konwencja co dymki
 * w nagłówku (`HeaderPopovers`): karta-kafelek z zaokrąglonymi rogami, pas
 * szkliwa u góry (terakota → glina → piasek), `ClayRule` nad tytułem, miękki
 * ciepły cień. Nad kartą logo (czarne przez `brightness-0` – plik jest
 * projektowany pod ciemne tło, w headerze dostaje dodatkowo `invert`), pod nią
 * powrót do sklepu. Bez stanu i bez hooków, więc może być serwerowa.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-[100svh] bg-cream flex items-center justify-center px-6 py-16 overflow-hidden">
      {/* Ciepłe plamy szkliwa w tle – bardzo delikatne, żeby karta miała na czym leżeć */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-terracotta/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 w-[30rem] h-[30rem] rounded-full bg-clay/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2 group">
            <Image
              src={LOGO_SRC}
              alt="Unique Ceramics"
              width={LOGO_WIDTH}
              height={LOGO_HEIGHT}
              sizes="56px"
              className="h-14 w-auto brightness-0 opacity-85 group-hover:opacity-100 transition-opacity"
            />
            <span className="font-serif text-2xl text-espresso group-hover:text-clay transition-colors">
              Unique Ceramics
            </span>
          </Link>
          <p className="text-xs tracking-[0.25em] uppercase text-clay mt-1">Ręcznie tworzone z sercem</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-sand bg-warm-white shadow-[0_22px_48px_-18px_rgba(44,40,37,0.35),0_4px_14px_-6px_rgba(44,40,37,0.18)]">
          <div aria-hidden="true" className="h-1 bg-gradient-to-r from-terracotta via-clay to-sand" />
          <div className="p-8 md:p-10">
            <ClayRule className="mb-5" />
            <h1 className="font-serif text-3xl text-espresso mb-2">{title}</h1>
            <p className="text-sm text-charcoal/80 mb-8">{subtitle}</p>
            {children}
          </div>
        </div>

        <p className="text-center text-xs text-charcoal/80 mt-6">
          <Link href="/" className="hover:text-clay transition-colors">
            ← Wróć do sklepu
          </Link>
        </p>
      </div>
    </div>
  );
}
