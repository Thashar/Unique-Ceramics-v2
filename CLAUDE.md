# CLAUDE.md — Unique Ceramics v2

> **Język pracy:** Zawsze odpowiadaj i pisz komentarze po polsku.

> ⚠️ **OBOWIĄZKOWA aktualizacja tego pliku:** Po **każdej** modyfikacji kodu (dodanie/zmiana strony, API route, komponentu, ustawienia, modelu Prisma, zmiennej .env, zależności, konfiguracji) **musisz** zaktualizować odpowiednią sekcję tego pliku i zacommitować go razem ze zmianami. To nie jest opcjonalne — nieaktualny CLAUDE.md wprowadza w błąd przy kolejnych pracach.

---

## Git Workflow

Po każdej modyfikacji plików:
1. `git add` — stage zmienionych plików
2. **Zaktualizuj CLAUDE.md**, jeśli zmiana czegokolwiek dotyczy (patrz wyżej)
3. `git commit` — zwięzły opis po polsku
4. `git push origin main`

Repo: https://github.com/Thashar/Unique-Ceramics-v2

CI (`.github/workflows/ci.yml`): TypeScript (`tsc --noEmit`) + ESLint + build produkcyjny przy każdym pushu i PR.

---

## Stos technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Framework | Next.js 16 (App Router, React 19) — **uwaga:** API różni się od Next 15; dokumentacja w `node_modules/next/dist/docs/` |
| Język | TypeScript 5 |
| Style | Tailwind CSS 4 (custom theme) |
| Animacje | Framer Motion 12 |
| Ikony | Lucide React |
| Edytor HTML (admin) | Jodit 3 (paczka npm, import dynamiczny — NIE z CDN) |
| Auth | NextAuth v5 (beta) + @auth/prisma-adapter |
| ORM | Prisma 5 |
| Baza danych | PostgreSQL — Supabase (Transaction Pooler) |
| Storage | Supabase Storage (zdjęcia produktów) |
| Email | Resend (`RESEND_API_KEY`) |
| Płatności online | Stripe (Checkout + webhook) |
| Hasła | bcryptjs (koszt 12) |

---

## Zmienne środowiskowe (.env.local)

```env
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...supabase.co:5432/postgres"
AUTH_SECRET="min-32-znaki"
AUTH_URL="https://domena.vercel.app"
AUTH_GOOGLE_ID="xxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxx"
RESEND_API_KEY="re_xxxx"
RESEND_FROM_EMAIL="Unique Ceramics <kontakt@uniqueceramics.pl>"
SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="xxxx"            # upload zdjęć (tylko serwer!)
STRIPE_SECRET_KEY="sk_live_xxxx"            # płatności kartą
STRIPE_WEBHOOK_SECRET="whsec_xxxx"          # weryfikacja webhooków Stripe
CRON_SECRET="min-32-znaki"                  # autoryzacja /api/ping (cron Vercel)
INPOST_GEOWIDGET_TOKEN="xxxx"               # token widgetu mapy paczkomatów InPost (opcjonalne — bez niego wyświetla pole tekstowe)
```

> `DATABASE_URL` używa pgbouncer (Transaction Pooler). `DIRECT_URL` wymagany przez Prisma do migracji. `SUPABASE_SERVICE_ROLE_KEY` nigdy nie może trafić do klienta.

---

## Modele Prisma (`prisma/schema.prisma`)

### NextAuth (standardowe)
- **User** — `id`, `email`, `name`, `image`, `password`, `role` (USER/ADMIN)
- **Account**, **Session**, **VerificationToken** — OAuth / JWT

### Sklep
- **Category** — `id`, `slug` (unique, używany w URL i w `Product.category`), `label` (nazwa wyświetlana), `order` (kolejność filtrów)
- **Product** — `id`, `slug` (unique), `name`, `description`, `price`, `images[]`, `category`, `stock`, `featured`, `active`
- **Order** — `id`, `userId` (nullable), `status`, `total`, `shippingCost`, pola adresowe, `paymentMethod` (`transfer`/`stripe`), `paymentStatus` (`pending`/`PAID`/`expired`), `shippingMethod` (`courier`/`parcel_locker`/`pickup`), `parcelLockerCode` (nullable), `trackingNumber` (nullable), `trackingCarrier` (nullable — `dpd`/`dhl`/`inpost`/`poczta`)
- **OrderItem** — referencja do Order, `productId`, `name`, `price`, `quantity`
- **CustomOrder** — `id`, `orderNumber` (auto-increment, wyświetlany jako `IND-{n}`), `customerName`, `customerEmail`, `customerPhone`, `street`, `city`, `postcode`, `orderType`, `description`, `deadline`, `budget`, `price` (cena zamówienia admina), `shippingCost` (koszt wysyłki), `paidAmount` (kwota wpłacona), `status`, `adminNotes`
- **Setting** — `key` (unique), `value` — magazyn key-value dla dynamicznych ustawień (także adresy użytkowników: `user_address_{userId}`)

### Enumy
- `Role`: USER, ADMIN
- `OrderStatus`: PENDING, CONFIRMED, IN_PROGRESS, SHIPPED, DELIVERED, CANCELLED
- `CustomOrderStatus`: NEW, IN_REVIEW, PAID, DONE, CANCELLED
  - `PAID` (Opłacone) — wymaga `paidAmount > 0`; status `PAID` i `DONE` są wliczane do analityki i raportów PDF
  - `CustomOrder` posiada `orderNumber` (auto-increment, wyświetlany jako `IND-{n}`), `price` (cena admina), `paidAmount` (kwota wpłacona)

> Kwoty (`price`, `total`, `shippingCost`) są typu `Float` — przy obliczeniach **zawsze zaokrąglaj do groszy** (`Math.round(x * 100) / 100`). Docelowo do migracji na `Decimal`.

---

## Ustawienia dynamiczne (`lib/settings.ts`)

Funkcje: `getSetting(key)`, `getSettings(keys[])` — zwracają wartość z DB lub DEFAULT (z retry; przy niedostępnej bazie zwracają defaulty — dzięki temu build działa bez DB).

| Klucz | Opis |
|-------|------|
| `regulamin` | HTML treści regulaminu |
| `polityka_prywatnosci` | HTML polityki prywatności |
| `home_hero_image` / `home_hero_position` | Zdjęcie + pozycja hero na stronie głównej |
| `home_about_image` / `home_about_position` | Zdjęcie + pozycja sekcji „O mnie" na stronie głównej |
| `home_workshops_image` / `home_workshops_position` | Zdjęcie + pozycja sekcji warsztatów na stronie głównej |
| `about_hero_image` | Ścieżka do zdjęcia hero na /o-mnie |
| `about_hero_overlay_color` | Kolor maski na hero /o-mnie (hex, default: #2C2825) |
| `about_hero_overlay_opacity` | Przezroczystość maski /o-mnie (0–100, default: 50) |
| `about_story` | HTML treści strony o mnie |
| `shop_hero_image` | Ścieżka do zdjęcia hero na /sklep (opcjonalne) |
| `shop_hero_position` | Punkt kadrowania hero na /sklep |
| `shop_hero_overlay_color` | Kolor maski na hero /sklep (hex, default: #2C2825) |
| `shop_hero_overlay_opacity` | Przezroczystość maski /sklep (0–100, default: 50) |
| `workshops_hero_image` | Ścieżka do zdjęcia hero na /warsztaty |
| `workshops_hero_overlay_color` | Kolor maski na hero /warsztaty (hex, default: #2C2825) |
| `workshops_hero_overlay_opacity` | Przezroczystość maski /warsztaty (0–100, default: 60) |
| `workshops_intro` | HTML wprowadzenia do warsztatów |
| `workshops_offers` | JSON — tablica kart ofert warsztatów (`WorkshopOffer[]`): id, iconName, title, description, duration, maxPeople, priceLabel, level, active |
| `workshops_includes` | JSON — tablica elementów „Co zawiera warsztat?" (`WorkshopInclude[]`): id, iconName, label |
| `workshops_faq` | JSON — tablica pytań i odpowiedzi FAQ (`WorkshopFaq[]`): id, question, answer |
| `contact_phone` | Numer telefonu (default: +48 668 443 706) |
| `contact_email` | E-mail (default: kontakt@uniqueceramics.pl) |
| `contact_instagram` | Handle Instagram (default: @unique.ceramics) |
| `contact_hours` | Godziny otwarcia (default: Pon–Pt 9:00–17:00) |
| `shipping_cost` | Koszt wysyłki kurierem w zł (default: 18) |
| `shipping_cost_parcel_locker` | Koszt wysyłki paczkomatem InPost w zł (default: 18) |
| `shipping_free_enabled` | "true"/"false" — czy jest darmowa wysyłka |
| `shipping_free_from` | Kwota progu darmowej wysyłki (default: 300) |
| `shipping_time` | Czas realizacji wyświetlany na karcie produktu (default: „2–4 dni robocze") |
| `payment_bank_account_name` | Nazwa odbiorcy przelewu |
| `payment_bank_account_number` | Numer konta bankowego |
| `payment_bank_name` | Nazwa banku |
| `payment_bank_transfer_title` | Prefiks tytułu przelewu (default: Zamówienie) |
| `payment_blik_enabled` | "true"/"false" |
| `payment_blik_phone` | Numer do przelewu BLIK na telefon |
| `payment_stripe_enabled` | "true"/"false" — płatność kartą przez Stripe |
| `vacation_enabled` | "true"/"false" — tryb urlopu; gdy aktywny pojawia się baner w /sklep i wzmianka w mailach |
| `vacation_end_date` | Data powrotu z urlopu (YYYY-MM-DD) — używana w automatycznym komunikacie |
| `vacation_message` | Własny komunikat urlopowy; jeśli pusty — generowany z daty |
| `custom_order_notify_email_enabled` | "true"/"false" — czy wysyłać e-mail do właściciela przy nowym zamówieniu indywidualnym (default: true) |

---

## Struktura `app/` — strony i API

### Strony publiczne
| Route | Cache | Opis |
|-------|-------|------|
| `/` | ISR 3600 s | Strona główna (scroll-snap, hero, wybrane prace, stopka z IG) |
| `/sklep` | dynamic + dane z cache 60 s | Katalog produktów (searchParams `kategoria`) |
| `/sklep/[slug]` | ISR 60 s (on-demand) | Szczegóły produktu (**server component**, JSON-LD Product) |
| `/koszyk` | static (client) | Koszyk |
| `/zamowienie` | force-dynamic | Formularz zamówienia (server) → `CheckoutForm` (client) |
| `/zamowienie/potwierdzenie` | force-dynamic | Potwierdzenie + dane do przelewu |
| `/zamowienie-indywidualne` | static (client) | Zamówienie na miarę |
| `/logowanie`, `/rejestracja` | static (client) | Auth |
| `/o-mnie`, `/warsztaty`, `/kontakt`, `/regulamin`, `/polityka-prywatnosci` | ISR 300 s | Strony treściowe (treść z ustawień; zapis w adminie robi `revalidatePath`) |

### Strony chronione — konto klienta (`/konto`) — wymaga sesji (middleware + layout)
| Route | Opis |
|-------|------|
| `/konto` | Dashboard klienta |
| `/konto/profil` | Edycja imienia i hasła |
| `/konto/adres` | Adres dostawy (auto-uzupełnia checkout) |
| `/konto/zamowienia` | Historia zamówień |
| `/konto/zamowienia/[id]` | Szczegóły zamówienia (weryfikacja własności) + wznowienie płatności Stripe |

### Panel admina (`/admin`) — rola ADMIN weryfikowana w DB (`lib/admin-auth.ts`)
| Route | Opis |
|-------|------|
| `/admin` | Dashboard ze statystykami |
| `/admin/produkty`, `/admin/produkty/nowy`, `/admin/produkty/[id]` | Zarządzanie produktami |
| `/admin/zamowienia`, `/admin/zamowienia/[id]` | Zamówienia sklepowe |
| `/admin/zamowienia-indywidualne`, `/admin/zamowienia-indywidualne/[id]` | Zamówienia indywidualne |
| `/admin/ustawienia` | Ustawienia sklepu (strona główna, o mnie, **sklep**, warsztaty, regulamin, polityka, kontakt, wysyłka, płatności) |
| `/admin/kategorie` | Zarządzanie kategoriami produktów (CRUD + kolejność) |
| `/admin/analityki` | Panel analityczny — przychód miesięczny (wykres + tabela), bestsellery, metody wysyłki, płatności, statusy zamówień, podsumowanie roczne |

### API Routes
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/products` | Lista produktów (query: `kategoria`, `exclude`) |
| GET | `/api/products/[slug]` | Szczegóły produktu (tylko `active: true`) |
| GET | `/api/public/contacts` | Dane kontaktowe (phone, email, instagram) |
| GET | `/api/public/shipping` | Ustawienia wysyłki (cost, freeEnabled, freeFrom) |
| POST | `/api/register` | Rejestracja (rate limit, hasło 8–128 znaków) |
| POST | `/api/checkout` | Zamówienie: walidacja, kwoty serwerowo, **transakcja stock+order**, e-mail / sesja Stripe |
| POST | `/api/contact` | Formularz kontaktowy → e-mail Resend (rate limit) |
| POST | `/api/custom-order` | Zamówienie indywidualne (rate limit) |
| POST | `/api/stripe/resume` | Wznowienie nieopłaconej płatności Stripe (własność + blokada CANCELLED) |
| POST | `/api/stripe/webhook` | Webhook Stripe: `completed`→PAID (gdy `payment_status=paid`), `expired`→anulacja + zwrot stocku |
| POST | `/api/account/update-name` | Zmiana imienia (maks. 100 znaków) |
| PATCH | `/api/account/change-password` | Zmiana hasła (rate limit 5/15 min, 8–128 znaków) |
| GET/PUT | `/api/account/address` | Pobierz/zapisz adres dostawy (Setting: `user_address_{userId}`) |
| GET/POST | `/api/admin/categories` | Lista/dodaj kategorie (ADMIN; mutacje → `revalidateCategories()`) |
| PUT/DELETE | `/api/admin/categories/[id]` | Edytuj/usuń kategorię (ADMIN; usuwanie blokowane gdy istnieją produkty w kategorii) |
| GET/POST | `/api/admin/products` | Lista/dodaj produkty (ADMIN; mutacje → `revalidateProductPages()`) |
| PUT/DELETE | `/api/admin/products/[id]` | Edytuj/usuń produkt (ADMIN; mutacje → rewalidacja) |
| PATCH | `/api/admin/orders/[id]` | Zmień status zamówienia (ADMIN, walidacja enuma) |
| PATCH | `/api/admin/custom-orders/[id]` | Status/notatki/cena/kwotaWpłacona/daneKlienta zamówienia indywidualnego (ADMIN; PAID wymaga paidAmount > 0) |
| POST | `/api/admin/upload` | Upload zdjęcia do Supabase Storage (ADMIN, magic bytes, maks. 10 MB) |
| PATCH/POST | `/api/admin/settings` | Zapis ustawień (ADMIN; sanityzacja HTML + `revalidatePath("/", "layout")`) |
| GET | `/api/admin/settings/[key]` | Pojedyncze ustawienie (ADMIN) |
| GET | `/api/admin/reports/[year]/[month]` | Generuje i pobiera raport PDF za dany miesiąc (ADMIN; pdfkit; czcionka Lato z Google Fonts CDN z cachem; fallback Helvetica) |
| GET | `/api/ping` | Health check (wymaga `Authorization: Bearer CRON_SECRET`; cron Vercel 8:00) |

---

## Biblioteki pomocnicze (`lib/`)

- **db.ts** — singleton PrismaClient (`connection_limit=1` pod serverless)
- **settings.ts** — `getSetting`/`getSettings` z defaultami i retry
- **products.ts** — `getShopProducts()` (unstable_cache 60 s, tag `products`) + `revalidateProductPages()`
- **categories.ts** — `getCategories()` (unstable_cache, tag `categories`; fallback do DEFAULT_CATEGORIES gdy DB pusta/niedostępna) + `revalidateCategories()`
- **admin-auth.ts** — `requireAdmin()`: sesja + **aktualna rola z DB** (nie z JWT — odebranie uprawnień działa natychmiast)
- **rate-limit.ts** — in-memory limiter (`isRateLimited`, `getClientIp`); per-instancja na serverless
- **sanitize-html.ts** — `sanitizeRichHtml()` z allowlistą tagów/atrybutów
- **address-validation.ts** — wspólna walidacja adresu (klient + serwer)
- **cart.tsx** — koszyk jako **store modułowy** (`useSyncExternalStore` + localStorage); hook `useCart()`, bez providera
- **cookie-consent.tsx** — zgoda na cookies jako store modułowy; hook `useCookieConsent()`, bez providera

## Komponenty (`components/`)

### `components/layout/`
- **Header.tsx** — responsywna nawigacja, ikona koszyka, menu mobilne
- **Footer.tsx** — synchroniczny (ważne!), importuje `FooterContactsClient`; używany na wszystkich stronach poza stroną główną
- **FooterWithInstagram.tsx** — scalona stopka + Instagram CTA (strona główna); grid: [IG panel | nawigacja | kontakt | mapa]
- **FooterInstagramPanel.tsx** — `"use client"`, animowany panel Instagram
- **FooterContactsClient.tsx** — `"use client"`, pobiera kontakty z `/api/public/contacts` po mount
- **FooterMap.tsx** — `"use client"`, mapa Google w iframe — ładowana dopiero po zgodzie cookies
- **CookieBanner.tsx** — `"use client"`, baner zgody na cookies
- **Providers.tsx** — opakowuje tylko `SessionProvider` + renderuje `CookieBanner` (koszyk/zgoda nie potrzebują providerów)

### `components/home/`
- **Hero.tsx**, **FeaturedProducts.tsx**, **AboutTeaser.tsx**, **WorkshopsTeaser.tsx**
- **HomeScrollSnap.tsx** — `"use client"`, scroll-snap sekcji strony głównej
- **ProductCarousel.tsx** — `"use client"`, mobilna karuzela wybranych prac
- **InstagramCta.tsx** — przyjmuje prop `instagram` (nieużywany na stronie głównej od scalenia ze stopką)

### `components/ui/`
- **ProductCard.tsx** — karta produktu (next/image + framer-motion)
- **InstagramIcon.tsx** — SVG ikona Instagram

### `components/checkout/`
- **InPostWidget.tsx** — `"use client"`, widget wyboru paczkomatu InPost; gdy `INPOST_GEOWIDGET_TOKEN` ustawiony: mapa CDN geowidget.inpost.pl; bez tokenu: wyszukiwarka przez publiczne API `api-shipx-pl.easypack24.net` — obsługuje wyszukiwanie po nazwie miasta (`city`), kodzie pocztowym XX-XXX lub fragmencie cyfr (`zip_code`) i kodzie paczkomatu (indywidualny endpoint `/points/{code}`). Cache akumuluje wyniki ze wszystkich zapytań — po wyszukaniu miasta filtrowanie po dowolnym podciągu (fragment kodu, ulicy, kodu pocztowego) działa bez kolejnych requestów. Puste odpowiedzi API nie nadpisują wyników z cache. Zwraca wybrany kod przez `onChange`.

### `components/admin/`
- **AdminNav.tsx** — sidebar + mobilny drawer
- **BfcacheGuard.tsx** — `"use client"`, wykrywa przywrócenie strony z bfcache (`pageshow` + `event.persisted`) i wywołuje `router.refresh()` by middleware sprawdził sesję (używany w `app/admin/layout.tsx`)
- **ProductForm.tsx** — formularz produktu (z ImageUploader)
- **ImageUploader.tsx** — upload na Supabase Storage przez `/api/admin/upload`
- **FocalPointPicker.tsx** — wybór punktu kadrowania zdjęć (`object-position`)
- **RichEditor.tsx** — edytor HTML oparty o **Jodit z npm** (dynamiczny `import("jodit")` w useEffect — biblioteka tylko przeglądarkowa, nie może wykonać się przy SSR)
- **CategoriesManager.tsx** — `"use client"`, CRUD kategorii: lista z edycją inline, zmiana kolejności strzałkami, dodawanie, usuwanie (blokada przy produktach); seed domyślnych gdy DB pusta
- **SettingsForm.tsx** — formularz ustawień (taby: Strona główna / O mnie / Sklep / Warsztaty / Regulamin / Polityka / Kontakt / Wysyłka / Płatności); zawiera `OverlayControl` — podgląd maski na żywo dla zdjęć hero (kolor + przezroczystość)
- **WorkshopsOffersEditor.tsx** — `"use client"`, edytor ofert warsztatów: karty z akordeonem (tytuł, opis, czas, cena, ikona, widoczność), lista „Co zawiera?" i FAQ; każda sekcja obsługuje dodawanie, usuwanie i zmianę kolejności; zwraca dane jako JSON string przez `onChange`
- **OrderStatusSelect.tsx** — dropdown statusu zamówienia; przyjmuje `shippingMethod` i `hasTracking` — blokuje zmianę na SHIPPED/DELIVERED gdy brak danych listu (kurier/paczkomat)
- **OrdersTabs.tsx** — zakładki listy zamówień
- **ProductsSearch.tsx** — wyszukiwarka w liście produktów
- **CustomOrderActions.tsx** — formularz zamówień indywidualnych: edycja danych klienta (przycisk odblokowania), pola ceny i kwoty wpłaconej, dropdown statusu (PAID wymaga paidAmount), notatki; każda zmiana statusu wymaga potwierdzenia `window.confirm`
- **PaymentStatusToggle.tsx** — `"use client"`, dropdown ręcznej zmiany statusu płatności zamówienia (PENDING/PAID) — PATCH `/api/admin/orders/[id]` z `{ paymentStatus }`
- **TrackingForm.tsx** — `"use client"`, formularz listu przewozowego: wybór dostawcy (DPD/DHL/InPost/Poczta Polska) + pole numeru; PATCH `/api/admin/orders/[id]` z `{ trackingNumber, trackingCarrier }`; pokazuje link śledzenia po wypełnieniu

### `components/account/`
- **AccountNav.tsx** — nawigacja konta (Profil / Adres dostawy / Zamówienia)
- **OrderStatusBadge.tsx** — kolorowy badge statusu
- **StripeResumeButton.tsx** — `"use client"`, wznowienie płatności Stripe

### `components/contact/`
- **ContactForm.tsx** — `"use client"`, formularz → `/api/contact`

---

## Kolory Tailwind (`app/globals.css`)

```
cream:       #F5F0E8   tło sekcji, karty
warm-white:  #FAF8F5   tło strony
sand:        #E8DFD0   obramowania, separatory
terracotta:  #C4A882   akcenty, przyciski główne
clay:        #8B7355   hover przycisków
espresso:    #2C2825   tło stopki, nagłówki ciemne
charcoal:    #4A3F38   tekst główny
mist:        #F0EBE3   tło alternatywne
```

Fonty: `font-serif` → Playfair Display, `font-sans` → Inter (oba przez `next/font`).

---

## Autoryzacja

- **auth.ts** — NextAuth v5 beta, strategia JWT; providery: Google OAuth + Credentials (bcryptjs); rate limit logowania (5/min na konto + 30/min globalnie); `callbacks` dołączają `id` i `role` do tokena/sesji
- **middleware.ts** — wymaga sesji na `/konto`, `/zamowienie`, `/admin` (redirect na `/logowanie?callbackUrl=...`)
- **Admin:** rola sprawdzana przez `requireAdmin()` z `lib/admin-auth.ts` — **zawsze z bazy**, nie z JWT. Używaj go w każdej nowej trasie/stronie admina.

## Bezpieczeństwo — zasady

- **Nagłówki** (`next.config.ts`): CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, HSTS, Permissions-Policy. Nowe zewnętrzne źródła (skrypty, iframy, obrazy) wymagają aktualizacji CSP.
- **Nie ładuj skryptów z CDN** — zależności tylko przez npm (CSP je zablokuje).
- **Kwoty i stany magazynowe** liczone wyłącznie po stronie serwera; checkout dekrementuje stock w transakcji z utworzeniem zamówienia.
- **Nigdy nie pokazuj `e.message` użytkownikowi** — szczegóły błędów tylko do `console.error`, na stronie komunikat ogólny.
- **HTML z ustawień** sanityzowany przy zapisie i renderze (`sanitizeRichHtml`).
- **Endpointy publiczne przyjmujące dane** mają rate limit (`lib/rate-limit.ts`) i walidację długości pól.
- Webhook Stripe: zawsze `constructEvent` z `STRIPE_WEBHOOK_SECRET`.

---

## Kluczowe zasady techniczne

### Next.js — server vs client
- **Nigdy nie importuj async funkcji serwera w komponentach `"use client"`** — powoduje React error #482
- `"use client"` = cały moduł (i jego importy) idzie do bundle klienta
- Komponenty klienckie też renderują się raz na serwerze (SSR) — biblioteki tylko przeglądarkowe (np. Jodit) ładuj dynamicznym `import()` w `useEffect`
- `Footer.tsx` musi być w pełni synchroniczny

### Cache i rewalidacja
- Strony sesyjne (`/konto`, `/zamowienie`, `/admin`) = `force-dynamic`; strony treściowe = ISR (`revalidate`); dane katalogu = `unstable_cache` z tagiem `products`
- Trasy z parametrem (`[slug]`) wymagają `generateStaticParams` (może zwracać `[]`), żeby ISR działało — bez tego są w pełni dynamiczne
- Po mutacji produktów w adminie wywołuj `revalidateProductPages()`; po zapisie ustawień `revalidatePath("/", "layout")`
- Funkcje pobierające dane przy ISR **muszą mieć fallback** na wypadek braku DB podczas builda (wzorzec: try/catch + defaulty jak w `lib/settings.ts`)
- W `generateMetadata` i stronie używaj wspólnej funkcji opakowanej w `React.cache()` — deduplikacja zapytań
- W Next 16 `revalidateTag` przyjmuje drugi argument — używaj `revalidateTag(tag, "max")`

### Koszyk i zgoda cookies (client state)
- Store'y modułowe czytane przez `useSyncExternalStore` — **nie** dodawaj setState w `useEffect` do hydratacji localStorage (reguła `react-hooks/set-state-in-effect`)

### Adresy dostawy użytkownika
- Tabela `Setting`, klucz `user_address_{userId}`, JSON; GET/PUT `/api/account/address`; auto-uzupełniają checkout

### Email (Resend)
- Po zamówieniu przelewowym: e-mail do klienta z danymi do przelewu + powiadomienie do właściciela
- Nadawca z `RESEND_FROM_EMAIL` lub fallback `onboarding@resend.dev`; błąd wysyłki nie blokuje zamówienia

### Metody płatności
- Przelew bankowy (+ opcjonalnie BLIK na telefon): zawsze dostępny
- Stripe (karta): tylko gdy `payment_stripe_enabled === "true"` **i** ustawiony `STRIPE_SECRET_KEY`; przepływ: checkout → sesja Stripe → webhook `completed` ustawia PAID; `expired` anuluje zamówienie i zwraca stock

### Tabela Setting — autokonfiguracja
- Przy operacjach na `Setting` poza Prismą używaj `$executeRaw`/`$queryRaw` z tagged template (parametryzacja!)

---

## Właściciel / Dane firmy

- Forma pierwszoosobowa: "O mnie", "moja ceramika", "tworzę"
- Telefon: +48 668 443 706
- E-mail: kontakt@uniqueceramics.pl
- Instagram: @unique.ceramics
- Adres pracowni: Familijna 23, 44-164 Kleszczów (k. Gliwic)
- Wysyłka: 18 zł, darmowa od 300 zł
