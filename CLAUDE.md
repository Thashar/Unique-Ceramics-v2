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
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"   # trwały rate limiting (opcjonalne, ale ZALECANE na produkcji)
UPSTASH_REDIS_REST_TOKEN="xxxx"                   # token Upstash REST; bez obu zmiennych limiter degraduje się do in-memory
```

> `DATABASE_URL` używa pgbouncer (Transaction Pooler). `DIRECT_URL` wymagany przez Prisma do migracji. `SUPABASE_SERVICE_ROLE_KEY` nigdy nie może trafić do klienta.

---

## Modele Prisma (`prisma/schema.prisma`)

### NextAuth (standardowe)
- **User** — `id`, `email`, `name`, `image`, `password`, `role` (USER/ADMIN), `tokenVersion` (inkrementacja unieważnia wszystkie aktywne JWT — np. po zmianie hasła)
- **Account**, **Session**, **VerificationToken** — OAuth / JWT

### Sklep
- **Category** — `id`, `slug` (unique, używany w URL i w `Product.category`), `label` (nazwa wyświetlana), `order` (kolejność filtrów)
- **Product** — `id`, `slug` (unique), `name`, `description`, `price`, `images[]`, `category`, `stock`, `featured`, `active`
- **Order** — `id`, `userId` (nullable), `status`, `total`, `shippingCost`, pola adresowe, `paymentMethod` (`transfer`/`stripe`), `paymentStatus` (`pending`/`PAID`/`expired`), `shippingMethod` (`courier`/`parcel_locker`/`pickup`), `parcelLockerCode` (nullable), `trackingNumber` (nullable), `trackingCarrier` (nullable — `dpd`/`dhl`/`inpost`/`poczta`), `paidAt` (nullable — data i godzina wpłaty)
  - **Rozpoznanie przychodu wg daty wpłaty (`paidAt`):** raporty i analityki (sklep) liczą tylko opłacone (`paymentStatus='PAID'`) wg `COALESCE(paidAt, createdAt)` — zamówienie opłacone w nowym miesiącu trafia do tego miesiąca. Przy przejściu statusu na „Opłacone" admin podaje datę/godzinę wpłaty w modalu (`OrderStatusSelect`); webhook Stripe ustawia `paidAt` = chwila opłacenia. Datę można później zmienić w karcie zamówienia (`PaidAtEditor`, z potwierdzeniem `window.confirm`). Walidacja: nie z przyszłości, nie przed złożeniem zamówienia.
- **OrderItem** — referencja do Order, `productId`, `name`, `price`, `quantity`
- **CustomOrder** — `id`, `orderNumber` (auto-increment, wyświetlany jako `IND-{n}`), `customerName`, `customerEmail`, `customerPhone`, `street`, `city`, `postcode`, `orderType`, `description`, `deadline`, `budget`, `price` (cena zamówienia admina), `shippingCost` (koszt wysyłki), `paidAmount` (kwota wpłacona), `status`, `adminNotes`
- **Setting** — `key` (unique), `value` — magazyn key-value dla dynamicznych ustawień (także adresy użytkowników: `user_address_{userId}`)
- **Project** — portfolio prac: `id`, `title`, `description`, `images[]`, `order`, `active`, `createdAt`, `updatedAt`; indeks `[active, order]`. Wyświetlane publicznie na `/moje-projekty`, zarządzane w `/admin/projekty`

### Enumy
- `Role`: USER, ADMIN
- `OrderStatus`: PENDING, CONFIRMED, PAID, IN_PROGRESS, SHIPPED, DELIVERED, CANCELLED
  - Przepływ liniowy: status można przesunąć **tylko o 1 krok do przodu** (Nowe → Potwierdzone → **Opłacone** → W realizacji → Wysłane → Dostarczone). CANCELLED (Anulowane) dostępny z **każdego** statusu. Reguła egzekwowana w UI (`OrderStatusSelect`) i serwerowo (`isAllowedTransition` w PATCH route).
  - Ustawienie statusu `PAID` (Opłacone) automatycznie ustawia `paymentStatus = "PAID"` i wysyła e-mail potwierdzający płatność. Status płatności w panelu jest **tylko do odczytu** (badge).
- `CustomOrderStatus`: NEW, IN_REVIEW, PAID, DONE, CANCELLED
  - `PAID` (Opłacone) — wymaga `paidAmount > 0`; status `PAID` i `DONE` są wliczane do analityki i raportów PDF
  - `CustomOrder` posiada `orderNumber` (auto-increment, wyświetlany jako `IND-{n}`), `price` (cena admina), `paidAmount` (kwota wpłacona)

> Kwoty (`price`, `total`, `shippingCost`) są typu `Float` — przy obliczeniach **zawsze zaokrąglaj do groszy** (`Math.round(x * 100) / 100`). Docelowo do migracji na `Decimal`.

### Indeksy bazy danych

`Product` ma indeksy: `[active, featured]`, `[active, category]`, `[active, stock]`, `[active, featured, createdAt DESC]`, `[slug, active]`. `CustomOrder` ma indeksy: `[status]`, `[customerEmail]`. Migracje w `prisma/migrations/`; pliki `manual_*.sql` wymagają ręcznego wykonania na Supabase (DIRECT_URL niedostępny lokalnie) — m.in. `manual_add_performance_indexes.sql`, `manual_add_paid_order_status.sql` (dodaje wartość `PAID` do enuma `OrderStatus`; `ALTER TYPE ... ADD VALUE` musi działać poza transakcją) , `manual_add_order_paidat.sql` (kolumna `paidAt`) oraz `manual_add_user_tokenversion.sql` (kolumna `tokenVersion` w `User` — rewokacja sesji).

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
| `shop_*` (`shop_subtitle`, `shop_hero_image`, `shop_hero_position`, `shop_hero_overlay_color`, `shop_hero_overlay_opacity`, `shop_hero_height`) | **Nieużywane / przestarzałe** — zakładka „Sklep" w ustawieniach została usunięta, a publiczna strona /sklep nie czyta tych kluczy. Pozostają tylko jako defaulty w `lib/settings.ts`; do ewentualnego usunięcia |
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
| `contact_whatsapp` | Numer WhatsApp (opcjonalny; pusty = ukryty). Link `wa.me/{cyfry}` w stopce i na /kontakt |
| `contact_facebook` | URL profilu Facebook (opcjonalny; pusty = ukryty w stopce) |
| `contact_youtube` | URL kanału YouTube (opcjonalny; pusty = ukryty w stopce) |
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
| `payment_blik_enabled` | "true"/"false" — czy BLIK na telefon jest widoczny w zamówieniu i mailu; toggle w /admin/ustawienia zakładka „Przelew / BLIK" |
| `payment_blik_phone` | Numer do przelewu BLIK na telefon |
| `payment_stripe_enabled` | "true"/"false" — płatność kartą przez Stripe |
| `vacation_enabled` | "true"/"false" — tryb urlopu; gdy aktywny pojawia się kolorowy baner `VacationBanner` (h-5) nad headerem (`top-5`), spacer w `HeaderWrapper` ma `h-[100px]`; gdy wyłączony — brak banera, header na `top-0`, spacer `h-20`. Strony nie używają `pt-[...]` — offset zapewnia spacer. Filtry kategorii `/sklep` używają `sticky top-[100px]` (urlop) lub `sticky top-20` (bez urlopu) |
| `vacation_end_date` | Data powrotu z urlopu (YYYY-MM-DD) — używana w automatycznym komunikacie |
| `vacation_message` | Własny komunikat urlopowy; jeśli pusty — generowany z daty |
| `custom_order_notify_email_enabled` | "true"/"false" — czy wysyłać e-mail do właściciela przy nowym zamówieniu indywidualnym (default: true) |
| `dzn_min_wage` | Minimalne wynagrodzenie (zł) — podstawa limitu działalności nierejestrowanej (225%/kwartał); edytowalne w /admin/analityki (default: 4806) |
| `tax_high_{rok}_{miesiac}` | "true"/"false" — podwyższona stawka PIT 32% dla danego miesiąca (np. `tax_high_2026_5`); zaznaczane checkboxem w /admin/analityki, czytane przy generowaniu raportu PDF. Brak/„false" = stawka 12% |

---

## Struktura `app/` — strony i API

### Strony publiczne
| Route | Cache | Opis |
|-------|-------|------|
| `/` | ISR 3600 s | Strona główna (scroll-snap, hero, wybrane prace, stopka z IG) + ukryta sekcja SEO „Obszar obsługi" (`sr-only` — indeksowalna, niewidoczna wizualnie; uzupełnia `areaServed` w JSON-LD) |
| `/sklep` | dynamic + dane z cache 60 s | Katalog produktów (searchParams `kategoria`); kategorie renderują się natychmiast, siatka produktów streamuje przez `<Suspense>` z `ProductGrid` + `ProductGridSkeleton` |
| `/sklep/[slug]` | ISR 60 s (pre-generated) | Szczegóły produktu (**server component**, JSON-LD Product); `generateStaticParams` pre-generuje wszystkie aktywne produkty przy budowaniu |
| `/koszyk` | static (client) | Koszyk |
| `/zamowienie` | force-dynamic | Formularz zamówienia (server) → `CheckoutForm` (client) |
| `/zamowienie/potwierdzenie` | force-dynamic | Potwierdzenie + dane do przelewu |
| `/zamowienie-indywidualne` | static (client) | Zamówienie na miarę |
| `/logowanie`, `/rejestracja` | static (client) | Auth |
| `/o-mnie`, `/warsztaty`, `/kontakt`, `/regulamin`, `/polityka-prywatnosci` | ISR 300 s | Strony treściowe (treść z ustawień; zapis w adminie robi `revalidatePath`); `/kontakt` zawiera ukrytą sekcję SEO „Obszar obsługi" (`sr-only` — lista miast Śląska, indeksowalna, niewidoczna wizualnie) |
| `/moje-projekty` | ISR | Publiczne portfolio prac (model `Project`, dane z `getProjects()`) |

### Strony chronione — konto klienta (`/konto`) — wymaga sesji (middleware + layout)
| Route | Opis |
|-------|------|
| `/konto` | Dashboard klienta |
| `/konto/profil` | Edycja imienia i hasła; eksport danych (RODO) i usunięcie konta (strefa niebezpieczna) |
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
| `/admin/ustawienia` | Ustawienia sklepu (strona główna, o mnie, warsztaty, regulamin, polityka, kontakt, wysyłka, płatności) |
| `/admin/kategorie` | Zarządzanie kategoriami produktów (CRUD + kolejność) |
| `/admin/projekty`, `/admin/projekty/nowy`, `/admin/projekty/[id]` | Portfolio prac (CRUD projektów; chronione layoutem admina + `requireAdmin`) |
| `/admin/analityki` | Panel analityczny — przychód miesięczny (wykres + tabela z podatkiem PIT i checkboxem stawki 32% + pobranie raportu PDF), bestsellery, metody wysyłki, płatności, statusy zamówień, podsumowanie roczne, działalność nierejestrowana (limit kwartalny — przychód należny z wysyłką) |

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
| PATCH | `/api/account/change-password` | Zmiana hasła (rate limit 5/15 min, 8–128 znaków; bumpuje `tokenVersion` → wylogowuje wszystkie sesje, także bieżącą) |
| GET/PUT | `/api/account/address` | Pobierz/zapisz adres dostawy (Setting: `user_address_{userId}`) |
| GET | `/api/account/export` | Eksport danych konta jako JSON (RODO art. 15/20 — profil, adres, zamówienia; rate limit) |
| DELETE | `/api/account/delete` | Usunięcie konta (RODO art. 17; re-auth hasłem dla kont Credentials; zamówienia odłączane `userId→null`, adres + sesje + OAuth kasowane; rate limit) |
| GET/POST | `/api/admin/categories` | Lista/dodaj kategorie (ADMIN; mutacje → `revalidateCategories()`) |
| PUT/DELETE | `/api/admin/categories/[id]` | Edytuj/usuń kategorię (ADMIN; usuwanie blokowane gdy istnieją produkty w kategorii) |
| GET/POST | `/api/admin/products` | Lista/dodaj produkty (ADMIN; mutacje → `revalidateProductPages()`) |
| PUT/DELETE | `/api/admin/products/[id]` | Edytuj/usuń produkt (ADMIN; walidacja `validateProduct`; mutacje → rewalidacja) |
| GET/POST | `/api/admin/portfolio` | Lista/dodaj projekty portfolio (ADMIN; `validateProjectInput`; mutacje → `revalidatePortfolioPages()`) |
| PUT/DELETE | `/api/admin/portfolio/[id]` | Edytuj/usuń projekt portfolio (ADMIN; `validateProjectInput`) |
| PATCH | `/api/admin/orders/[id]` | Zmień status zamówienia / dane listu przewozowego / datę wpłaty (ADMIN; walidacja przejścia: 1 krok do przodu lub anulowanie; status `PAID` auto-ustawia `paymentStatus=PAID`+`paidAt` z modalu+e-mail; osobne `{ paidAt }` edytuje datę wpłaty — walidacja: nie z przyszłości, nie przed złożeniem; dane listu: `trackingCarrier` z allowlisty (dpd/dhl/inpost/poczta), `trackingNumber` tylko `[A-Za-z0-9-]` ≤64 zn.) |
| PATCH | `/api/admin/custom-orders/[id]` | Status/notatki/cena/kwotaWpłacona/daneKlienta zamówienia indywidualnego (ADMIN; PAID wymaga paidAmount > 0) |
| POST | `/api/admin/upload` | Upload zdjęcia do Supabase Storage (ADMIN, magic bytes, maks. 10 MB) |
| PATCH/POST | `/api/admin/settings` | Zapis ustawień (ADMIN; sanityzacja HTML + `revalidatePath("/", "layout")`) |
| GET | `/api/admin/settings/[key]` | Pojedyncze ustawienie (ADMIN) |
| GET | `/api/admin/reports/[year]/[month]` | Generuje i pobiera raport PDF za dany miesiąc (ADMIN; pdfkit; czcionka Lato z Google Fonts CDN z cachem; fallback Helvetica). Tylko opłacone zamówienia rozpoznane wg daty wpłaty (`paidAt`/`createdAt`). Liczy podatek PIT od przychodu z produktów (bez wysyłki — koszt uzyskania przychodu); stawka 12% lub 32% wg ustawienia `tax_high_{rok}_{miesiac}` |
| GET | `/api/ping` | Health check (wymaga `Authorization: Bearer CRON_SECRET`; cron Vercel 8:00) |

---

## Biblioteki pomocnicze (`lib/`)

- **db.ts** — singleton PrismaClient (`connection_limit=1` pod serverless)
- **settings.ts** — `getSetting`/`getSettings` z defaultami i retry
- **products.ts** — `getShopProducts()` (unstable_cache 60 s, tag `products`; jedno zapytanie do DB, podział inStock/soldOut w JS) + `getFeaturedProducts()` (unstable_cache 3600 s, tag `products`) + `revalidateProductPages()`
- **categories.ts** — `getCategories()` (unstable_cache, tag `categories`; fallback do DEFAULT_CATEGORIES gdy DB pusta/niedostępna) + `revalidateCategories()`
- **admin-auth.ts** — `requireAdmin()`: sesja + **aktualna rola z DB** (nie z JWT — odebranie uprawnień działa natychmiast). **UWAGA: zwraca `null` przy braku uprawnień, NIE rzuca wyjątku** — zawsze sprawdzaj wartość: `if (!await requireAdmin()) return 403`. Nigdy `try/catch` wokół niego (catch nigdy się nie wykona)
- **rate-limit.ts** — **async** `isRateLimited(key, limit, windowMs)` + `getClientIp`. Domyślnie trwały magazyn Upstash Redis (REST, okno stałe) — poprawny na serverless; gdy brak `UPSTASH_*` lub Redis niedostępny → fallback in-memory (per-instancja). **Wszyscy wywołujący muszą `await`.**
- **product-validation.ts** — `validateProduct(body)`: walidacja/normalizacja danych produktu (name, slug `[a-z0-9-]`, price 0–1e6, stock int ≥0, images: tablica stringów ≤30, booleany). Używana w POST i PUT `/api/admin/products`
- **portfolio-validation.ts** — `validateProjectInput(body)`: walidacja projektu portfolio (title ≤200, description ≤20000, images ≤30, order int, active). Używana w POST/PUT `/api/admin/portfolio`
- **portfolio.ts** — `getProjects()` (unstable_cache, tag `projects`; fallback `[]` gdy DB niedostępna) + `revalidatePortfolioPages()`
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
- **HomeScrollSnap.tsx** — `"use client"`, scroll-snap sekcji strony głównej; sekcje materializowane raz przy mount (brak DOM query w handlerach zdarzeń)
- **ProductCarousel.tsx** — `"use client"`, mobilna karuzela wybranych prac
- **InstagramCta.tsx** — przyjmuje prop `instagram` (nieużywany na stronie głównej od scalenia ze stopką)

### `app/sklep/` (server components)
- **ProductGrid.tsx** — siatka produktów (async server component); woła `getShopProducts()`, filtruje po kategorii, obsługuje błąd DB i empty state
- **ProductGridSkeleton.tsx** — placeholder `animate-pulse` dla `<Suspense fallback>` w `/sklep`

### `components/ui/`
- **ProductCard.tsx** — karta produktu (next/image + framer-motion)
- **InstagramIcon.tsx** — SVG ikona Instagram

### `components/checkout/`
- **InPostWidget.tsx** — `"use client"`, widget wyboru paczkomatu InPost; gdy `INPOST_GEOWIDGET_TOKEN` ustawiony: mapa CDN geowidget.inpost.pl; bez tokenu: wyszukiwarka przez publiczne API `api-shipx-pl.easypack24.net`. Obsługiwane parametry API (zweryfikowane): `city=<Nazwa>` (wymaga dokładnej kapitalizacji — `capitalizeCity` normalizuje automatycznie, w tym polskie znaki i myślniki, np. „bielsko-biała" → „Bielsko-Biała"), `post_code=<XX-XXX>` (pełny kod pocztowy), `/points/<KOD>` (bezpośrednio po kodzie paczkomatu). Parametry `zip_code`, `name`, `street` są przez API ignorowane. Cache akumuluje wyniki ze wszystkich zapytań — po wyszukaniu miasta filtrowanie po dowolnym podciągu (fragment kodu, ulicy, adresu, kodu pocztowego) działa natychmiast bez kolejnych requestów. Puste odpowiedzi API nie nadpisują wyników z cache. Zwraca wybrany kod przez `onChange`.

### `components/admin/`
- **AdminNav.tsx** — sidebar + mobilny drawer
- **BfcacheGuard.tsx** — `"use client"`, wykrywa przywrócenie strony z bfcache (`pageshow` + `event.persisted`) i wywołuje `router.refresh()` by middleware sprawdził sesję (używany w `app/admin/layout.tsx`)
- **ProductForm.tsx** — formularz produktu (z ImageUploader)
- **ImageUploader.tsx** — upload na Supabase Storage przez `/api/admin/upload`
- **FocalPointPicker.tsx** — wybór punktu kadrowania zdjęć (`object-position`)
- **RichEditor.tsx** — edytor HTML oparty o **Jodit z npm** (dynamiczny `import("jodit")` w useEffect — biblioteka tylko przeglądarkowa, nie może wykonać się przy SSR)
- **CategoriesManager.tsx** — `"use client"`, CRUD kategorii: lista z edycją inline, zmiana kolejności strzałkami, dodawanie, usuwanie (blokada przy produktach); seed domyślnych gdy DB pusta
- **SettingsForm.tsx** — formularz ustawień (taby: Strona główna / O mnie / Warsztaty / Regulamin / Polityka / Kontakt / Wysyłka / Płatności); zawiera `OverlayControl` — podgląd maski na żywo dla zdjęć hero (kolor + przezroczystość)
- **WorkshopsOffersEditor.tsx** — `"use client"`, edytor ofert warsztatów: karty z akordeonem (tytuł, opis, czas, cena, ikona, widoczność), lista „Co zawiera?" i FAQ; każda sekcja obsługuje dodawanie, usuwanie i zmianę kolejności; zwraca dane jako JSON string przez `onChange`
- **OrderStatusSelect.tsx** — dropdown statusu zamówienia: pozwala przejść tylko o 1 krok do przodu (pozostałe opcje wyłączone) lub anulować z każdego statusu; przyjmuje `shippingMethod` i `hasTracking` — blokuje zmianę na SHIPPED/DELIVERED gdy brak danych listu (kurier/paczkomat). Przejście na „Opłacone" otwiera **modal z datą i godziną wpłaty** (`datetime-local`, domyślnie teraz) → PATCH `{ status:"PAID", paidAt }`. Status płatności w stronie zamówienia to badge tylko do odczytu (zmienia się sam przy statusie „Opłacone")
- **OrdersTabs.tsx** — zakładki listy zamówień (z „Opłacone")
- **ProductsSearch.tsx** — wyszukiwarka w liście produktów
- **CustomOrderActions.tsx** — formularz zamówień indywidualnych: edycja danych klienta (przycisk odblokowania), pola ceny i kwoty wpłaconej, dropdown statusu (PAID wymaga paidAmount), notatki; każda zmiana statusu wymaga potwierdzenia `window.confirm`
- **TrackingForm.tsx** — `"use client"`, formularz listu przewozowego: wybór dostawcy (DPD/DHL/InPost/Poczta Polska) + pole numeru; PATCH `/api/admin/orders/[id]` z `{ trackingNumber, trackingCarrier }`; pokazuje link śledzenia po wypełnieniu (edycja tylko przy statusie W realizacji)
- **PaidAtEditor.tsx** — `"use client"`, edycja daty/godziny wpłaty (`paidAt`) w karcie opłaconego zamówienia: pole `datetime-local` + zapis z potwierdzeniem `window.confirm`; PATCH `/api/admin/orders/[id]` z `{ paidAt }`. Zmiana wpływa na miesiąc rozliczenia i raport PDF
- **DznSection.tsx** — `"use client"`, sekcja działalności nierejestrowanej: edytowalne minimalne wynagrodzenie (zapis `dzn_min_wage`), paski limitu kwartalnego (225% min. wynagrodzenia) z ostrzeżeniami 75%/90%
- **MonthlyReportsTable.tsx** — `"use client"`, tabela 12 miesięcy w /admin/analityki: przychód, wysyłka, podstawa opodatkowania (przychód − wysyłka), checkbox podwyższonej stawki PIT 32% (zapis `tax_high_{rok}_{miesiac}` przez PATCH `/api/admin/settings`), wyliczony podatek (12%/32%), link do raportu PDF; w stopce suma podatku do odprowadzenia za bieżący rok

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

- **auth.ts** — NextAuth v5 beta, strategia JWT; providery: Google OAuth + Credentials (bcryptjs); rate limit logowania (5/min na konto + 30/min globalnie); `callbacks` dołączają `id`/`role` do tokena/sesji. Callback `jwt` przy każdym żądaniu weryfikuje `tokenVersion` i istnienie konta w DB — zwrócenie `null` unieważnia sesję (rewokacja po zmianie hasła, wylogowanie z usuniętego konta); odświeża też rolę. Błąd DB = fail-open (nie wylogowuje)
- **middleware.ts** — wymaga sesji na `/konto`, `/zamowienie`, `/admin` (redirect na `/logowanie?callbackUrl=...`) oraz na `/api/admin/*` (zwraca `401 JSON` — druga warstwa obok `requireAdmin` w handlerach)
- **Admin:** rola sprawdzana przez `requireAdmin()` z `lib/admin-auth.ts` — **zawsze z bazy**, nie z JWT. Używaj go w każdej nowej trasie/stronie admina.

## Bezpieczeństwo — zasady

- **Nagłówki** (`next.config.ts`): CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, HSTS, Permissions-Policy. Nowe zewnętrzne źródła (skrypty, iframy, obrazy) wymagają aktualizacji CSP. `optimizePackageImports` dla framer-motion i lucide-react; `compiler.removeConsole` usuwa `console.log` z bundle klienta (zachowane `error`/`warn`).
- **Nie ładuj skryptów z CDN** — zależności tylko przez npm (CSP je zablokuje).
- **Kwoty i stany magazynowe** liczone wyłącznie po stronie serwera; checkout dekrementuje stock w transakcji z utworzeniem zamówienia.
- **Nigdy nie pokazuj `e.message` użytkownikowi** — szczegóły błędów tylko do `console.error`, na stronie komunikat ogólny.
- **HTML z ustawień** sanityzowany przy zapisie i renderze (`sanitizeRichHtml`).
- **Endpointy publiczne przyjmujące dane** mają rate limit (`lib/rate-limit.ts`) i walidację długości pól.
- Webhook Stripe: zawsze `constructEvent` z `STRIPE_WEBHOOK_SECRET`.
- **Autoryzacja admina**: `requireAdmin()` **zwraca `null`** (nie rzuca) — używaj `if (!await requireAdmin()) return 403`. Wzorzec `try { await requireAdmin() } catch {}` jest błędny (catch nigdy nie zadziała → trasa odsłonięta). Dodatkowo middleware blokuje `/api/admin/*` bez sesji.
- **Walidacja wejścia mutacji**: trasy admina zapisujące dane (produkty, portfolio) walidują wejście (`validateProduct`/`validateProjectInput`) — nie ufaj typom/zakresom z body nawet od admina.
- **Rate limiting** na produkcji wymaga `UPSTASH_*` (trwały, międzyinstancyjny); bez nich limiter jest tylko per-instancja i łatwy do obejścia na serverless.

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
