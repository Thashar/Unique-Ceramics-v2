"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ConsentLevel = "all" | "necessary" | null;

const KEY = "uc-cookie-consent";

const CookieConsentContext = createContext<{
  consent: ConsentLevel;
  hydrated: boolean;
  acceptAll: () => void;
  acceptNecessary: () => void;
}>({
  consent: null,
  hydrated: false,
  acceptAll: () => {},
  acceptNecessary: () => {},
});

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentLevel>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored === "all" || stored === "necessary") setConsent(stored);
    setHydrated(true);
  }, []);

  function acceptAll() {
    localStorage.setItem(KEY, "all");
    setConsent("all");
  }

  function acceptNecessary() {
    localStorage.setItem(KEY, "necessary");
    setConsent("necessary");
  }

  return (
    <CookieConsentContext.Provider value={{ consent, hydrated, acceptAll, acceptNecessary }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  return useContext(CookieConsentContext);
}
