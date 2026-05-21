# CLAUDE.md — Unique Ceramics v2

> **Język pracy:** Zawsze odpowiadaj i pisz komentarze po polsku.

> **Aktualizacja tego pliku:** Po każdej modyfikacji kodu (dodanie strony, API route, komponentu, ustawienia, modelu Prisma, zmiennej .env) zaktualizuj odpowiednią sekcję w tym pliku i zacommituj razem ze zmianami.

---

## Git Workflow

Po każdej modyfikacji plików:
1. `git add` — stage zmienionych plików
2. `git commit` — zwięzły opis po polsku
3. `git push origin main`

Repo: https://github.com/Thashar/Unique-Ceramics-v2

---

## Stos technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Framework | Next.js 15 (App Router, React 19) |
| Język | TypeScript 5 |
| Style | Tailwind CSS 4 (custom theme) |
| Animacje | Framer Motion 12 |
| Ikony | Lucide React |
| Auth | NextAuth v5 (beta.31) + @auth/prisma-adapter |
| ORM | Prisma 5 |
| Baza danych | PostgreSQL — Supabase (Transaction Pooler) |
| Storage | Supabase Storage (zdjęcia produktów) |
| Email | Resend (`RESEND_API_KEY`) |
| Hasła | bcryptjs |

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
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxxx"
```

> `DATABASE_URL` używa pgbouncer (Transaction Pooler). `DIRECT_URL` wymagany przez Prisma do migracji.

---

## Modele Prisma (`prisma/schema.prisma`)

### NextAuth (standardowe)
- **User** — `id`, `email`, `name`, `image`, `password`, `role` (USER/ADMIN)
- **Account**, **Session**, **VerificationToken** — OAuth / JWT

### Sklep
- **Product** — `id`, `slug` (unique), `name`, `description`, `price`, `images[]`, `category`, `stock`, `featured`, `active`
- **Order** — `id`, `userId` (nullable), `status`, `total`, `shippingCost`, pola adresowe, `paymentMethod`, `paymentStatus`
- **OrderItem** — referencja do Order, `productId`, `name`, `price`, `quantity`
- **CustomOrder** — `id`, `customerName`, `customerEmail`, `customerPhone`, `orderType`, `description`, `deadline`, `budget`, `status`, `adminNotes`
- **Setting** — `key` (unique), `value` — magazyn key-value dla dynamicznych ustawień

### Enumy
- `Role`: USER, ADMIN
- `OrderStatus`: PENDING, CONFIRMED, IN_PROGRESS, SHIPPED, DELIVERED, CANCELLED
- `CustomOrderStatus`: NEW, IN_REVIEW, DONE, CANCELLED

---

## Ustawienia dynamiczne (`lib/settings.ts`)

Funkcje: `getSetting(key)`, `getSettings(keys[])` — zwracają wartość z DB lub DEFAULT.

| Klucz | Opis |
|-------|------|
| `regulamin` | HTML treści regulaminu |
| `polityka_prywatnosci` | HTML polityki prywatności |
| `about_hero_image` | Ścieżka do zdjęcia hero na /o-mnie |
| `about_story` | HTML treści strony o mnie |
| `workshops_hero_image` | Ścieżka do zdjęcia hero na /warsztaty |
| `workshops_intro` | HTML wprowadzenia do warsztatów |
| `contact_phone` | Numer telefonu (default: +48 668 443 706) |
| `contact_email` | E-mail (default: kontakt@uniqueceramics.pl) |
| `contact_instagram` | Handle Instagram (default: @unique.ceramics) |
| `shipping_cost` | Koszt wysyłki w zł (default: 18) |
| `shipping_free_enabled` | "true"/"false" — czy jest darmowa wysyłka |
| `shipping_free_from` | Kwota progu darmowej wysyłki (default: 300) |
| `payment_bank_account_name` | Nazwa odbiorcy przelewu |
| `payment_bank_account_number` | Numer konta bankowego |
| `payment_bank_name` | Nazwa banku |
| `payment_bank_transfer_title` | Prefiks tytułu przelewu (default: Zamówienie) |
| `payment_blik_enabled` | "true"/"false" |
| `payment_blik_phone` | Numer do BLIK |
| `payment_przelewy24_enabled` | "true"/"false" |
| `payment_przelewy24_merchant_id` | Merchant ID |
| `payment_przelewy24_pos_id` | POS ID |
| `payment_przelewy24_api_key` | API Key |
| `payment_przelewy24_crc` | CRC |
| `payment_payu_enabled` | "true"/"false" |
| `payment_payu_pos_id` | POS ID |
| `payment_payu_md5` | MD5 key |
| `payment_payu_oauth_client_id` | OAuth Client ID |
| `payment_payu_oauth_client_secret` | OAuth Client Secret |
| `payment_payu_sandbox` | "true"/"false" |

---

## Struktura `app/` — strony i API

### Strony publiczne
| Route | Plik | Opis |
|-------|------|------|
| `/` | `app/page.tsx` | Strona główna |
| `/sklep` | `app/sklep/page.tsx` | Katalog produktów |
| `/sklep/[slug]` | `app/sklep/[slug]/page.tsx` | Szczegóły produktu (**"use client"**) |
| `/koszyk` | `app/koszyk/page.tsx` | Koszyk |
| `/zamowienie` | `app/zamowienie/page.tsx` | Formularz zamówienia (server) → `CheckoutForm` (client) |
| `/zamowienie/potwierdzenie` | `app/zamowienie/potwierdzenie/page.tsx` | Potwierdzenie + dane do przelewu |
| `/zamowienie-indywidualne` | `app/zamowienie-indywidualne/page.tsx` | Zamówienie na miarę |
| `/logowanie` | `app/logowanie/page.tsx` | Strona logowania |
| `/rejestracja` | `app/rejestracja/page.tsx` | Rejestracja |
| `/o-mnie` | `app/o-mnie/page.tsx` | O twórczyni |
| `/warsztaty` | `app/warsztaty/page.tsx` | Warsztaty ceramiczne |
| `/kontakt` | `app/kontakt/page.tsx` | Kontakt |
| `/regulamin` | `app/regulamin/page.tsx` | Regulamin |
| `/polityka-prywatnosci` | `app/polityka-prywatnosci/page.tsx` | Polityka prywatności |

### Strony chronione — konto klienta (`/konto`)
| Route | Opis |
|-------|------|
| `/konto` | Dashboard klienta |
| `/konto/profil` | Edycja imienia i hasła |
| `/konto/adres` | Adres dostawy (auto-uzupełnia checkout) |
| `/konto/zamowienia` | Historia zamówień |
| `/konto/zamowienia/[id]` | Szczegóły zamówienia |

### Panel admina (`/admin`) — wymaga roli ADMIN
| Route | Opis |
|-------|------|
| `/admin` | Dashboard ze statystykami |
| `/admin/produkty` | Lista produktów |
| `/admin/produkty/nowy` | Dodaj produkt |
| `/admin/produkty/[id]` | Edytuj produkt |
| `/admin/zamowienia` | Lista zamówień |
| `/admin/zamowienia/[id]` | Szczegóły zamówienia |
| `/admin/zamowienia-indywidualne` | Lista zamówień indywidualnych |
| `/admin/zamowienia-indywidualne/[id]` | Szczegóły zamówienia indywidualnego |
| `/admin/ustawienia` | Ustawienia sklepu (kontakt, wysyłka, płatności, treści) |

### API Routes
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/products` | Lista produktów (query: `kategoria`, `exclude`) |
| GET | `/api/products/[slug]` | Szczegóły produktu |
| GET | `/api/public/contacts` | Dane kontaktowe (phone, email, instagram) |
| POST | `/api/register` | Rejestracja użytkownika |
| POST | `/api/checkout` | Utwórz zamówienie + wyślij email (Resend) |
| POST | `/api/custom-order` | Zamówienie indywidualne |
| POST | `/api/account/update-name` | Zmiana imienia |
| POST | `/api/account/change-password` | Zmiana hasła |
| GET/PUT | `/api/account/address` | Pobierz/zapisz adres dostawy (Setting: `user_address_{userId}`) |
| GET/POST | `/api/admin/products` | Lista/dodaj produkty (ADMIN) |
| PATCH/DELETE | `/api/admin/products/[id]` | Edytuj/usuń produkt (ADMIN) |
| PATCH | `/api/admin/orders/[id]` | Zmień status zamówienia (ADMIN) |
| POST | `/api/admin/upload` | Upload zdjęcia do Supabase Storage (ADMIN) |
| PATCH/DELETE | `/api/admin/custom-orders/[id]` | Zarządzaj zamówieniem indywidualnym (ADMIN) |
| GET/PATCH | `/api/admin/settings` | Ustawienia sklepu (ADMIN) |
| GET/PATCH | `/api/admin/settings/[key]` | Pojedyncze ustawienie (ADMIN) |
| GET | `/api/ping` | Health check |

---

## Komponenty (`components/`)

### `components/layout/`
- **Header.tsx** — responsywna nawigacja, ikona koszyka, menu mobilne
- **Footer.tsx** — synchroniczny (ważne!), importuje `FooterContactsClient`
- **FooterContactsClient.tsx** — `"use client"`, pobiera kontakty z `/api/public/contacts` po mount; renderuje defaults przed hydratacją
- **Providers.tsx** — opakowuje `SessionProvider` (NextAuth) + `CartProvider`

### `components/home/`
- **Hero.tsx**, **FeaturedProducts.tsx**, **AboutTeaser.tsx**, **WorkshopsTeaser.tsx**
- **InstagramCta.tsx** — przyjmuje prop `instagram` (string), generuje link do profilu

### `components/ui/`
- **ProductCard.tsx** — karta produktu
- **InstagramIcon.tsx** — SVG ikona Instagram

### `components/admin/`
- **AdminNav.tsx** — sidebar + mobilny drawer
- **ProductForm.tsx** — formularz dodawania/edycji produktu (z ImageUploader)
- **ImageUploader.tsx** — upload na Supabase Storage przez `/api/admin/upload`
- **RichEditor.tsx** — prosty edytor HTML dla długich treści
- **SettingsForm.tsx** — formularz ustawień (taby: O mnie / Warsztaty / Regulamin / Polityka / Kontakt / Wysyłka / Płatności)
- **OrderStatusSelect.tsx** — dropdown do zmiany statusu zamówienia
- **CustomOrderActions.tsx** — przyciski akcji dla zamówień indywidualnych

### `components/account/`
- **AccountNav.tsx** — nawigacja boczna konta (Profil / Adres dostawy / Zamówienia)
- **OrderStatusBadge.tsx** — kolorowy badge statusu

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

Fonty:
- `font-serif` → Playfair Display (nagłówki)
- `font-sans` → Inter (tekst ciągły)

---

## Autoryzacja (`auth.ts`)

- NextAuth v5 beta, strategia JWT
- Providery: Google OAuth + Credentials (email + bcryptjs)
- `callbacks.jwt` — dołącza `id` i `role` do tokena
- `callbacks.session` — dołącza `id` i `role` do `session.user`
- Strony: `/logowanie` (signIn), `/logowanie?error=...` (error)
- Sprawdzanie roli admina: `session.user.role === "ADMIN"`

---

## Kluczowe zasady techniczne

### Next.js — server vs client
- **Nigdy nie importuj async funkcji serwera w komponentach `"use client"`** — powoduje React error #482
- `"use client"` = cały moduł (i jego importy) idzie do bundle klienta
- Jeśli strona jest `"use client"` i potrzebuje danych z DB → stwórz oddzielny server component lub API endpoint
- `Footer.tsx` musi być w pełni synchroniczny — `app/sklep/[slug]/page.tsx` jest `"use client"` i go importuje
- Strony z zapytaniami do DB muszą mieć `export const dynamic = "force-dynamic"`

### Adresy dostawy użytkownika
- Przechowywane w tabeli `Setting` jako JSON: `key = user_address_{userId}`
- Pobierane przez `GET /api/account/address`, zapisywane przez `PUT /api/account/address`
- Automatycznie uzupełniają formularz checkout (`app/zamowienie/page.tsx` pobiera i przekazuje jako prop)

### Email (Resend)
- Wysyłany po złożeniu zamówienia przelewem bankowym
- Wymaga `RESEND_API_KEY` w env
- Nadawca z `RESEND_FROM_EMAIL` lub fallback `onboarding@resend.dev`
- Błąd wysyłki nie blokuje zamówienia (try/catch)

### Metody płatności
- Przelew bankowy: zawsze dostępny
- BLIK, Przelewy24, PayU: tylko jeśli `payment_*_enabled === "true"` w ustawieniach
- Integracje API dla Przelewy24/PayU: skonfigurowane w UI admina, implementacja API jeszcze do zrobienia

### Tabela Setting — autokonfiguracja
- Przy operacjach na `Setting` używaj `$executeRaw` z `CREATE TABLE IF NOT EXISTS` jako zabezpieczenie
- Tabela może nie istnieć na świeżej bazie przed pierwszą migracją

---

## Właściciel / Dane firmy

- Forma pierwszoosobowa: "O mnie", "moja ceramika", "tworzę"
- Telefon: +48 668 443 706
- E-mail: kontakt@uniqueceramics.pl
- Instagram: @unique.ceramics
- Wysyłka: 18 zł, darmowa od 300 zł
