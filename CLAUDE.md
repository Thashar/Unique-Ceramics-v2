# CLAUDE.md – Unique Ceramics v2

> **Język pracy:** Zawsze odpowiadaj i pisz komentarze po polsku.

> ⚠️ **OBOWIĄZKOWA aktualizacja tego pliku:** Po **każdej** modyfikacji kodu (dodanie/zmiana strony, API route, komponentu, ustawienia, modelu Prisma, zmiennej .env, zależności, konfiguracji) **musisz** zaktualizować odpowiednią sekcję tego pliku i zacommitować go razem ze zmianami. To nie jest opcjonalne – nieaktualny CLAUDE.md wprowadza w błąd przy kolejnych pracach.

---

## Git Workflow

Po każdej modyfikacji plików:
1. `git add` – stage zmienionych plików
2. **Zaktualizuj CLAUDE.md**, jeśli zmiana czegokolwiek dotyczy (patrz wyżej)
3. `git commit` – zwięzły opis po polsku
4. `git push origin main`

Repo: https://github.com/Thashar/Unique-Ceramics-v2

CI (`.github/workflows/ci.yml`): TypeScript (`tsc --noEmit`) + ESLint + **testy jednostkowe** (`npm test`) + build produkcyjny przy każdym pushu i PR.

pokrywają moduły liczące ceny i logikę koszyka – `product-price.ts`, `quantity-promo.ts`,
`free-shipping.ts`, `discount-code.ts`, `order-summary.ts`, `cart-sync.ts` i `email-change.ts`.
którą płaci klient, więc **każda zmiana w wycenie wymaga testu**. Uruchomienie: `npm test`
(konfiguracja w `vitest.config.mts`, alias `@/` musi zgadzać się z `tsconfig.json`).
`tests/` i `vitest.config.mts` są w `.vercelignore` – nie trafiają do wdrożenia.

**Czego nie commitować:** pliki lokalnych narzędzi Claude Code – `.claude/` i `skills-lock.json` –
są w `.gitignore` (odpięte od repo 27.07.2026). Nie dodawaj ich z powrotem ani przez `git add -f`.
`CLAUDE.md` i `AGENTS.md` **zostają** w repo – to dokumentacja projektu.

`.vercelignore` wyklucza z wdrożenia dokumentację, `.github/`, `scripts/` i pliki narzędzi agentów.
Dodając plik potrzebny w runtime na produkcji, sprawdź, czy nie wpada pod któryś z tych wzorców.

---

## Stos technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Framework | Next.js 16 (App Router, React 19) – **uwaga:** API różni się od Next 15; dokumentacja w `node_modules/next/dist/docs/` |
| Język | TypeScript 5 |
| Style | Tailwind CSS 4 (custom theme) |
| Animacje | Framer Motion 12 |
| Ikony | Lucide React |
| Edytor HTML (admin) | Jodit 3 (paczka npm, import dynamiczny – NIE z CDN) |
| Auth | NextAuth v5 (beta) + @auth/prisma-adapter |
| ORM | Prisma 5 |
| Baza danych | PostgreSQL – Supabase (Transaction Pooler) |
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
GOOGLE_AI_API_KEY="xxxx"                    # generowanie zdjęć produktów przez Gemini (przyciski AI / AI+; tylko serwer)
INPOST_GEOWIDGET_TOKEN="xxxx"               # token widgetu mapy paczkomatów InPost (opcjonalne – bez niego wyświetla pole tekstowe)
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"   # trwały rate limiting (opcjonalne, ale ZALECANE na produkcji)
UPSTASH_REDIS_REST_TOKEN="xxxx"                   # token Upstash REST; bez obu zmiennych limiter degraduje się do in-memory
```

> `DATABASE_URL` używa pgbouncer (Transaction Pooler). `DIRECT_URL` wymagany przez Prisma do migracji. `SUPABASE_SERVICE_ROLE_KEY` nigdy nie może trafić do klienta.

---

## Modele Prisma (`prisma/schema.prisma`)

### NextAuth (standardowe)
- **User** – `id`, `email`, `name`, `image`, `password`, `role` (USER/ADMIN), `tokenVersion` (inkrementacja unieważnia wszystkie aktywne JWT – np. po zmianie hasła)
- **Account**, **Session**, **VerificationToken** – OAuth / JWT
- **EmailChangeRequest** – oczekująca zmiana adresu e-mail: `userId` (**unique** – jedno żądanie na konto, nowe zastępuje poprzednie przez `upsert`, więc starszy link natychmiast przestaje działać), `newEmail`, `tokenHash` (**SHA-256**; surowy token istnieje wyłącznie w wysłanym mailu), `expiresAt`, kaskada po `User`. E-mail jest **loginem**, więc podmiana wymaga hasła **i** potwierdzenia z nowej skrzynki

### Sklep
- **Category** – `id`, `slug` (unique, używany w URL i w `Product.category`), `label` (nazwa wyświetlana), `order` (kolejność filtrów)
- **Product** – `id`, `slug` (unique), `name`, `description`, `price`, `images[]`, `category`, `stock`, `featured`, `active`, `discountPercent` (rabat produktowy w %, 0 = brak; **sumuje się** z rabatem ilościowym, o ile promocja ma zaznaczone „obejmuje produkty z własną przeceną”), `discountStartsAt` / `discountEndsAt` (nullable – okno obowiązywania rabatu w **UTC**; panel ustawia je w **czasie polskim**, `null` = odpowiednio „od razu” i „bezterminowo”)
  - **Rabat obowiązuje w oknie czasu.** O tym, czy przecena działa, decyduje `activeDiscountPercent(product)` z `lib/product-price.ts`, a **nie** samo pole `discountPercent` – poza oknem zwraca 0 i produkt wraca do ceny podstawowej sam, bez wchodzenia w panel. Wszystkie miejsca liczące albo pokazujące cenę (katalog, karta produktu, strona główna, `/api/products`, `/api/checkout`) pytają o rabat tą funkcją; **nie czytaj `product.discountPercent` wprost**
  - **Koszyk trzyma cenę z chwili dodania** (localStorage), więc rabat, który wygasł po włożeniu produktu do koszyka, zniknie dopiero w podsumowaniu zamówienia – kwotę zawsze przelicza `/api/checkout`. To zachowanie sprzed rabatów terminowych (tak samo działała zmiana ceny w panelu); świadoma decyzja, bo dociąganie cen w przeglądarce wracałoby do migotania kwot w koszyku
- **Order** – `id`, `userId` (nullable – `null` = zamówienie bez konta lub konto usunięte), `status`, `total`, `shippingCost`, pola adresowe, `paymentMethod` (`transfer`/`stripe`), `paymentStatus` (`pending`/`PAID`/`expired`), `shippingMethod` (`courier`/`parcel_locker`/`pickup`), `parcelLockerCode` (nullable), `trackingNumber` (nullable), `trackingCarrier` (nullable – `dpd`/`dhl`/`inpost`/`poczta`), `paidAt` (nullable – data i godzina wpłaty)
  - `discountCode` / `discountAmount` (nullable) – ślad po użytym kodzie rabatowym. **Kwota jest już wliczona w ceny pozycji** (`OrderItem.price`), więc w podsumowaniach pokazuj go **dopiskiem pod wierszem „Rabat”, nigdy jako osobne odjęcie** – jako kolejny wiersz odejmowania zaniżał kolumnę dokładnie o swoją wartość (72 − 8 + 18 = 82 przy „Razem” 90). Rozbicie liczy `lib/order-summary.ts`
  - `quantityDiscountPercent` / `quantityDiscountAmount` (nullable) – **rabat ilościowy z chwili zakupu**: procent zdobytego progu i kwota, o jaką obniżył zamówienie. Kwota jest już wliczona w ceny pozycji, więc w podsumowaniach pokazuj ją **dopiskiem pod wierszem „Rabat”, nigdy jako osobne odjęcie**
  - `bundleSurcharge` (nullable) – **LEGACY**: narzut wycofanej promocji „Wielosztuki”. Nowe zamówienia zawsze mają tu `null`; pole zostaje, żeby zamówienia sprzed 24.08.2026 renderowały się tak, jak je złożono. Podsumowanie odtwarzamy z pól zapisanych w zamówieniu, a **nie** z bieżącego stanu promocji
  - **Rozpoznanie przychodu wg daty wpłaty (`paidAt`):** raporty i analityki (sklep) liczą tylko opłacone (`paymentStatus='PAID'`) wg `COALESCE(paidAt, createdAt)` – zamówienie opłacone w nowym miesiącu trafia do tego miesiąca. Przy przejściu statusu na „Opłacone" admin podaje datę/godzinę wpłaty w modalu (`OrderStatusSelect`); webhook Stripe ustawia `paidAt` = chwila opłacenia. Datę można później zmienić w karcie zamówienia (`PaidAtEditor`, z potwierdzeniem `window.confirm`). Walidacja: nie z przyszłości, nie przed złożeniem zamówienia.
- **DiscountCode** – kod rabatowy: `id`, `code` (unique, wielkimi literami), `percent` (**0–90**), `freeShipping`, `active`, `stackable`, `startsAt` / `endsAt` (okno w UTC, panel ustawia je w czasie polskim), `usedCount`, indeks `[active]`.
  - **Kod może dawać rabat procentowy, darmową wysyłkę albo jedno i drugie.** `percent = 0` jest dozwolone **tylko** razem z `freeShipping` – kod musi cokolwiek dawać (pilnuje tego `validateDiscountCode`, a `codeHasEffect` w `lib/discount-code.ts`).
  - ⚠️ O tym, czy kod działa, decyduje **`isCodeActive` (okno + `active`), nie procent** – kod wyłącznie wysyłkowy ma `percent = 0` i nadal jest ważny. Nie wracaj do sprawdzania `percent === 0`.
  - `freeShipping` zeruje wysyłkę **bez względu na próg** promocji „Darmowa wysyłka” – po to się taki kod wydaje. Odbiór osobisty i tak jest bezpłatny.
  - `stackable = true` – kod schodzi dodatkowo z cen po przecenach i rabat ilościowy działa normalnie; `false` – kod działa **sam** (bez przecen produktów i bez rabatu ilościowego), a `priceOrder` liczy oba warianty i zostawia **tańszy dla klienta** (remis = promocje sklepu, kod zostaje niewykorzystany). **Brak tabeli nie wywraca sklepu** – odczyty są w try/catch, kody są wtedy nieaktywne, a panel pokazuje instrukcję migracji
- **QuantityPromo** – **rabat ilościowy** (nagroda za wolumen): `id`, `name`, `active`, `startsAt`/`endsAt` (okno w UTC, panel ustawia je w czasie polskim), `stackable` (łączy się z kodami), `includeDiscountedProducts` (czy produkty z własną przeceną biorą udział), `minItemPrice` (**zabezpieczenie**: pozycja tańsza nie liczy się do progu ani nie dostaje rabatu), `maxDiscount` (limit kwoty rabatu, nullable), `tiers` (JSON: `[{ minPieces, minValue, percent }]`), indeks `[active]`. Zastąpił wycofaną promocję „Wielosztuki”. Wolno mieć kilka wierszy (np. zaplanowaną świąteczną), ale **jednocześnie działa dokładnie jeden** – `findActiveQuantityPromo` bierze ten o najpóźniejszym `startsAt`, a panel ostrzega przy nachodzących oknach
- **FreeShippingPromo** – **promocja „Darmowa wysyłka”**: `id`, `name`, `active`, `startsAt`/`endsAt`, `minOrderValue` (0 = bez progu), `methods` (`courier` / `parcel_locker`), indeks `[active]`. Zastąpiła stałe ustawienia `shipping_free_enabled`/`shipping_free_from`. Przy kilku aktywnych wygrywa **najkorzystniejsza dla klienta**, czyli o najniższym progu. **Odbiór osobisty jest bezpłatny zawsze** – promocji o niego nie pytamy
- **OrderItem** – referencja do Order, `productId`, `name`, `price` (cena zapłacona za sztukę – po wszystkich rabatach), `basePrice` (nullable – cena katalogowa **sprzed** rabatu produktowego; dzięki niej historia zamówienia pokazuje pełny upust i podsumowanie się domyka; `null` w zamówieniach sprzed 24.08.2026), `quantity`
- **CustomOrder** – `id`, `orderNumber` (auto-increment, wyświetlany jako `IND-{n}`), `customerName`, `customerEmail`, `customerPhone`, `street`, `city`, `postcode`, `orderType`, `description`, `deadline`, `budget`, `price` (cena zamówienia admina), `shippingCost` (koszt wysyłki), `paidAmount` (kwota wpłacona), `status`, `adminNotes`
- **Setting** – `key` (unique), `value` – magazyn key-value dla dynamicznych ustawień (także dane użytkowników: adres `user_address_{userId}` i **koszyk `user_cart_{userId}`**)
- **AiImageUsage** – rejestr zużycia AI (zdjęcia i opisy produktów): `id`, `createdAt`, `kind` (`image`/`text` – rozdziela koszty w panelu; stare wpisy bez kolumny to zdjęcia), `variant` (`ai`/`ai_plus`/`product_fill`), `model`, `promptTokens`, `outputTokens`, `costUsd`, `estimated` (true = model nie zwrócił liczników, koszt z szacunku); indeksy `[createdAt]`, `[model]`. Jeden wiersz = jedno udane wywołanie modelu; zapis jest „best effort” (błąd tylko loguje – wynik jest już wtedy zapłacony). Statystyki czyta `/admin/ustawienia?s=ai`
- **Project** – portfolio prac: `id`, `title`, `description`, `images[]`, `order`, `active`, `createdAt`, `updatedAt`; indeks `[active, order]`. Wyświetlane publicznie na `/moje-projekty`, zarządzane w `/admin/projekty`

### Enumy
- `Role`: USER, ADMIN
- `OrderStatus`: PENDING, CONFIRMED, PAID, IN_PROGRESS, SHIPPED, DELIVERED, CANCELLED
  - Przepływ liniowy: status można przesunąć **tylko o 1 krok do przodu** (Nowe → Potwierdzone → **Opłacone** → W realizacji → Wysłane → Dostarczone). CANCELLED (Anulowane) dostępny z **każdego** statusu. Reguła egzekwowana w UI (`OrderStatusSelect`) i serwerowo (`isAllowedTransition` w PATCH route).
  - Ustawienie statusu `PAID` (Opłacone) automatycznie ustawia `paymentStatus = "PAID"` i wysyła e-mail potwierdzający płatność. Status płatności w panelu jest **tylko do odczytu** (badge).
- `CustomOrderStatus`: NEW, IN_REVIEW, PAID, DONE, CANCELLED
  - `PAID` (Opłacone) – wymaga `paidAmount > 0`; status `PAID` i `DONE` są wliczane do analityki i raportów PDF
  - `CustomOrder` posiada `orderNumber` (auto-increment, wyświetlany jako `IND-{n}`), `price` (cena admina), `paidAmount` (kwota wpłacona)

> Kwoty (`price`, `total`, `shippingCost`) są typu `Float` – przy obliczeniach **zawsze zaokrąglaj do groszy** (`Math.round(x * 100) / 100`). Docelowo do migracji na `Decimal`.

### Indeksy bazy danych

`Product` ma indeksy: `[active, featured]`, `[active, category]`, `[active, stock]`, `[active, featured, createdAt DESC]`, `[slug, active]`. `CustomOrder` ma indeksy: `[status]`, `[customerEmail]`. Migracje w `prisma/migrations/`; pliki `manual_*.sql` wymagają ręcznego wykonania na Supabase (DIRECT_URL niedostępny lokalnie) – m.in. `manual_add_performance_indexes.sql`, `manual_add_paid_order_status.sql` (dodaje wartość `PAID` do enuma `OrderStatus`; `ALTER TYPE ... ADD VALUE` musi działać poza transakcją) , `manual_add_order_paidat.sql` (kolumna `paidAt`) , `manual_add_user_tokenversion.sql` (kolumna `tokenVersion` w `User` – rewokacja sesji) `manual_add_ai_image_usage.sql` (tabela `AiImageUsage` – statystyki i koszty AI) oraz `manual_add_product_discount.sql` (kolumna `discountPercent` w `Product` – rabat produktowy; **bez niej zapytania o produkty padają i sklep przestaje się renderować**) oraz `manual_add_product_discount_window.sql` (kolumny `discountStartsAt` i `discountEndsAt` – czas obowiązywania rabatu; ten sam skutek przy braku) oraz `manual_add_ai_usage_kind.sql` (kolumna `kind` – rozdzielenie kosztów zdjęć i tekstu; potrzebna tylko tam, gdzie tabela powstała przed tą zmianą) oraz `manual_add_discount_codes.sql` (tabela `DiscountCode` + kolumny `discountCode`/`discountAmount` w `Order` – kody rabatowe; bez niej sklep działa, ale kody są nieaktywne) oraz `manual_add_order_pricing_trail.sql` (kolumny `OrderItem.basePrice` i `Order.bundleSurcharge` – ślad cenowy zamówienia; **uruchom ją przed wdrożeniem**, bo `/api/checkout` zapisuje oba pola i bez nich składanie zamówień pada) oraz `manual_add_promotions.sql` (tabele `QuantityPromo` i `FreeShippingPromo` + kolumny `Order.quantityDiscount*`; **uruchom ją przed wdrożeniem** – `/api/checkout` zapisuje te kolumny. Migracja przenosi też dotychczasowy próg darmowej wysyłki na bezterminową promocję i kasuje wycofane klucze `shipping_free_*` oraz `bundled_shipping_enabled`). oraz `manual_add_discount_code_free_shipping.sql` (kolumna `DiscountCode.freeShipping` – kody na darmową wysyłkę; default `false`, więc istniejące kody działają jak dotąd). oraz `manual_add_email_change.sql` (tabela `EmailChangeRequest` – zmiana adresu e-mail; bez niej sklep działa, ale zmiana adresu zwraca błąd).

---

## Ustawienia dynamiczne (`lib/settings.ts`)

Funkcje: `getSetting(key)`, `getSettings(keys[])` – zwracają wartość z DB lub DEFAULT (z retry; przy niedostępnej bazie zwracają defaulty – dzięki temu build działa bez DB).

| Klucz | Opis |
|-------|------|
| `regulamin` | HTML treści regulaminu. Sprzedawcą jest **Alicja Ulbrich**, sklep **nie jest podatnikiem VAT** (ceny bez VAT, na życzenie rachunek zamiast faktury). Punkty I.5 i I.6 opisują **zdjęcia przygotowane z pomocą AI**: model zmienia wyłącznie tło, scenerię, oświetlenie i kadr, a rekwizyty ze zdjęcia nie wchodzą w skład zamówienia. Zmieniając te zasady w kodzie, pamiętaj, że **na produkcji obowiązuje wersja z bazy** (klucz `regulamin`) – wartość domyślna z `lib/settings.ts` wchodzi tylko wtedy, gdy wiersza nie ma |
| `polityka_prywatnosci` | HTML polityki prywatności |
| `home_hero_image` / `home_hero_position` | Zdjęcie + pozycja hero na stronie głównej |
| `home_hero_eyebrow`, `home_hero_title`, `home_hero_text`, `home_hero_cta_primary`, `home_hero_cta_secondary`, `home_hero_scroll` | **Teksty sekcji hero** – napis nad nagłówkiem, nagłówek, opis, etykiety obu przycisków i napis przy strzałce na dole |
| `home_about_eyebrow`, `home_about_title`, `home_about_text`, `home_about_cta` | **Teksty sekcji „O mnie”** na stronie głównej (`AboutTeaser`) |
| `home_workshops_eyebrow`, `home_workshops_title`, `home_workshops_text`, `home_workshops_cta` | **Teksty sekcji „Warsztaty”** na stronie głównej (`WorkshopsTeaser`) |
| | Wszystkie trzy zestawy działają tak samo: edycja w /admin/ustawienia (zakładka „Strona główna”), Enter łamie wiersz (`whitespace-pre-line`), pusta linia w opisie robi odstęp między akapitami, a **puste ustawienie ukrywa dany element** – można zostawić samo zdjęcie. Adresy przycisków są stałe (`/sklep`, `/o-mnie`, `/warsztaty`); domyślne treści siedzą w `lib/home-sections.ts` |
| `home_about_image` / `home_about_position` | Zdjęcie + pozycja sekcji „O mnie" na stronie głównej |
| `home_workshops_image` / `home_workshops_position` | Zdjęcie + pozycja sekcji warsztatów na stronie głównej |
| `about_hero_image` | Ścieżka do zdjęcia hero na /o-mnie |
| `about_hero_overlay_color` | Kolor maski na hero /o-mnie (hex, default: #2C2825) |
| `about_hero_overlay_opacity` | Przezroczystość maski /o-mnie (0–100, default: 50) |
| `about_story` | HTML treści strony o mnie |
| `about_content_gallery` | JSON – galeria zdjęć w prawej kolumnie /o-mnie: `[{ url, position }]` (patrz `lib/gallery.ts`). Pusta tablica = kolumna znika, tekst na pełną szerokość |
| `about_content_image` / `about_content_position` | **Zgodność wstecz** – pojedyncze zdjęcie przy opisie /o-mnie. Czytane tylko gdy `about_content_gallery` jest puste; zapis w panelu synchronizuje je z pierwszym zdjęciem galerii |
| `workshops_content_gallery` | JSON – galeria zdjęć przy wprowadzeniu na /warsztaty (ten sam format co wyżej) |
| `workshops_content_image` / `workshops_content_position` | **Zgodność wstecz** – jak `about_content_*`, dla /warsztaty |
| `shop_*` (`shop_subtitle`, `shop_hero_image`, `shop_hero_position`, `shop_hero_overlay_color`, `shop_hero_overlay_opacity`, `shop_hero_height`) | **Nieużywane / przestarzałe** – zakładka „Sklep" w ustawieniach została usunięta, a publiczna strona /sklep nie czyta tych kluczy. Pozostają tylko jako defaulty w `lib/settings.ts`; do ewentualnego usunięcia |
| `workshops_hero_image` | Ścieżka do zdjęcia hero na /warsztaty |
| `workshops_hero_overlay_color` | Kolor maski na hero /warsztaty (hex, default: #2C2825) |
| `workshops_hero_overlay_opacity` | Przezroczystość maski /warsztaty (0–100, default: 60) |
| `workshops_intro` | HTML wprowadzenia do warsztatów |
| `workshops_offers` | JSON – tablica kart ofert warsztatów (`WorkshopOffer[]`): id, iconName, title, description, duration, maxPeople, priceLabel, level, active |
| `workshops_includes` | JSON – tablica elementów „Co zawiera warsztat?" (`WorkshopInclude[]`): id, iconName, label |
| `workshops_includes_gallery` | JSON – galeria zdjęć obok listy „Co zawiera warsztat?" (format jak `about_content_gallery`). Pusta = lista zwęża się i zostaje na środku |
| `workshops_faq` | JSON – tablica pytań i odpowiedzi FAQ (`WorkshopFaq[]`): id, question, answer |
| `contact_phone` | Numer telefonu (default: +48 668 443 706) |
| `contact_email` | E-mail (default: kontakt@uniqueceramics.pl) |
| `contact_instagram` | Handle Instagram (default: @unique.ceramics) |
| `contact_whatsapp` | Numer WhatsApp (opcjonalny; pusty = ukryty). Link `wa.me/{cyfry}` w stopce i na /kontakt |
| `contact_facebook` | URL profilu Facebook (opcjonalny; pusty = ukryty w stopce) |
| `contact_youtube` | URL kanału YouTube (opcjonalny; pusty = ukryty w stopce) |
| `contact_hours` | Godziny otwarcia (default: dwa wiersze – Wt–Czw 17:00–19:00 / So 15:00–17:00). Pole w panelu jest **wieloliniowe** – Enter łamie wiersz, a stopka i /kontakt renderują go przez `whitespace-pre-line`. Pokazywane pod adresem w kolumnie „Gdzie mnie znajdziesz"; parsowane przez `lib/opening-hours.ts` do `openingHoursSpecification` w JSON-LD |
| `contact_address_street` | Ulica i numer pracowni (default: ul. Familijna 23) |
| `contact_address_city` | Kod pocztowy i miejscowość (default: 44-164 Kleszczów (k. Gliwic)) |
| `contact_address_region` | Województwo, opcjonalne (default: woj. śląskie) |
| `category_intro_{slug}` | Opis kategorii **dla wyszukiwarki** (np. `category_intro_kubki`) – trafia do `<meta description>` i `CollectionPage`, **nie na stronę**. Pusty = opis układany z nazwy kategorii przez `lib/category-seo.ts`. Edycja w /admin/kategorie |
| `shipping_cost` | Koszt wysyłki kurierem w zł (default: 18) |
| `shipping_cost_parcel_locker` | Koszt wysyłki paczkomatem InPost w zł (default: 18) |
| `shipping_time` | Czas realizacji wyświetlany na karcie produktu (default: „2–4 dni robocze") |
| `payment_bank_account_name` | Nazwa odbiorcy przelewu |
| `payment_bank_account_number` | Numer konta bankowego |
| `payment_bank_name` | Nazwa banku |
| `payment_bank_transfer_title` | Prefiks tytułu przelewu (default: Zamówienie) |
| `payment_blik_enabled` | "true"/"false" – czy BLIK na telefon jest widoczny w zamówieniu i mailu; toggle w /admin/ustawienia zakładka „Przelew / BLIK" |
| `payment_blik_phone` | Numer do przelewu BLIK na telefon |
| `payment_stripe_enabled` | "true"/"false" – płatność kartą przez Stripe |
| `vacation_enabled` | "true"/"false" – tryb urlopu; gdy aktywny pojawia się kolorowy baner `VacationBanner` (h-5) nad headerem (`top-5`), spacer w `HeaderWrapper` ma `h-[100px]`; gdy wyłączony – brak banera, header na `top-0`, spacer `h-20`. Strony nie używają `pt-[...]` – offset zapewnia spacer. Filtry kategorii `/sklep` używają `sticky top-[100px]` (urlop) lub `sticky top-20` (bez urlopu) |
| `vacation_end_date` | Data powrotu z urlopu (YYYY-MM-DD) – używana w automatycznym komunikacie |
| `vacation_message` | Własny komunikat urlopowy; jeśli pusty – generowany z daty |
| `custom_order_notify_email_enabled` | "true"/"false" – czy wysyłać e-mail do właściciela przy nowym zamówieniu indywidualnym (default: true) |
| `ai_image_model` | Model Google AI dla przycisku **AI** (zdjęcie na jednolitym tle); default: `gemini-3.1-flash-image` |
| `ai_image_model_plus` | Model Google AI dla przycisku **AI+** (zdjęcie w wystylizowanej scenie); default: `gemini-3-pro-image`. Oba wybierane z listy w /admin/ustawienia zakładka „AI (zdjęcia i opisy)"; wartość spoza allowlisty `AI_IMAGE_MODELS` jest ignorowana i wraca do defaultu |
| `ai_text_model` | Model Google AI dla przycisku **Uzupełnij przy użyciu AI** (nazwa, slug, kategoria, opis ze zdjęcia); default: `gemini-3.5-flash-lite`, allowlista `AI_TEXT_MODELS` |
| `ai_usd_pln_rate` | Kurs USD→PLN do przeliczania kosztów AI w panelu (Google rozlicza w USD); default: 4.00 |
| `ai_prompt_presets` | JSON – własne presety promptów (`AiPromptPreset[]`: id, name, scene). Preset opisuje **tylko scenę** (tło, rekwizyty, światło); reguły produktu dokleja `buildImagePrompt`. Limity: 30 presetów, nazwa 80 zn., scena 4000 zn. Wpis o identyfikatorze wbudowanego presetu jest odrzucany przy parsowaniu |
| `ai_prompt_preset_ai` / `ai_prompt_preset_ai_plus` | Identyfikator presetu użytego przez przycisk **AI** / **AI+**; defaulty `builtin_plain` / `builtin_styled` (wbudowane „Domyślny AI" i „Domyślny AI+" – nie da się ich usunąć ani nadpisać). Nieznane id (np. po usunięciu presetu) wraca do wbudowanego |
| `dzn_min_wage` | Minimalne wynagrodzenie (zł) – podstawa limitu działalności nierejestrowanej (225%/kwartał); edytowalne w /admin/analityki (default: 4806) |
| `tax_high_{rok}_{miesiac}` | "true"/"false" – podwyższona stawka PIT 32% dla danego miesiąca (np. `tax_high_2026_5`); zaznaczane checkboxem w /admin/analityki, czytane przy generowaniu raportu PDF. Brak/„false" = stawka 12% |

---

## Struktura `app/` – strony i API

### Strony publiczne
| Route | Cache | Opis |
|-------|-------|------|
| `/` | ISR 3600 s | Strona główna (scroll-snap, hero, wybrane prace, stopka z IG) + ukryta sekcja SEO „Obszar obsługi" (`sr-only` – indeksowalna, niewidoczna wizualnie; uzupełnia `areaServed` w JSON-LD) |
| `/sklep` | dynamic + dane z cache 60 s | Pełny katalog. Pasek kategorii (`CategoryBar`) prowadzi na **strony kategorii**, a stary filtr `?kategoria=…` dostaje **trwałe przekierowanie** (`permanentRedirect`, 308) na nowy adres – nieznana wartość wraca na `/sklep`. Produkty ładuje wspólne `loadCatalog()` z `app/sklep/catalog.ts`. Nad siatką stoi **widoczny nagłówek** w tym samym układzie co na stronach kategorii: `ClayRule` i `h1` „Sklep”, bez akapitu wstępu (wcześniej `h1` był `sr-only`). `ProductGridSkeleton` jest **nieużywany** – siatka renderuje się razem ze stroną, bez `<Suspense>` |
| `/sklep/kategoria/[slug]` | ISR 60 s (pre-generated) | **Strona kategorii** – własny adres, tytuł, opis, canonical, widoczny `h1` z nazwą kategorii oraz `CollectionPage` + `ItemList` (do 30 pozycji) + okruszki. `generateStaticParams` pre-generuje wszystkie kategorie, nieznany slug → `notFound()`. **Opis kategorii nie jest drukowany na stronie** (decyzja właściciela 28.08.2026) – idzie wyłącznie do `<meta description>` i do `CollectionPage`, czyli tam, skąd bierze go wyszukiwarka. Treść: własna z panelu (`category_intro_{slug}`, przycinana przez `metaDescription`), a gdy pusta – układana z nazwy przez `lib/category-seo.ts`. **Nie dodawaj jej z powrotem jako ukrytego akapitu** – tekst niewidoczny dla użytkownika, a podany robotowi, to cloaking, za który Google karze ręcznie. To **jedyne** indeksowalne adresy kategorii; nie wracaj do `?kategoria=` |
| `/sklep/[slug]` | ISR 60 s (pre-generated) | Szczegóły produktu (**server component**, JSON-LD Product, pełne Open Graph + Twitter card – zdjęcie z `/api/og/[slug]`; `openGraph` ze strony **zastępuje** ten z layoutu, więc `siteName`/`locale`/`type` są powtórzone); `generateStaticParams` pre-generuje wszystkie aktywne produkty. Galeria: `ProductGallery` (client) – przycisk z lupką w rogu kadru otwiera `ImageLightbox` (podgląd z powiększeniem). Nad galerią są **okruszki** `Sklep / {Kategoria} / {Produkt}` (nazwa produktu dopiero od `sm:` – na telefonie łamałaby wiersz), a etykieta kategorii nad tytułem jest **linkiem do strony kategorii**: klient ma drogę do podobnych rzeczy, a kategoria dostaje link z każdej karty produktu. Ten sam poziom kategorii jest w `BreadcrumbSchema`; usunięta kategoria (`category === null`) po prostu wypada z obu miejsc, zamiast prowadzić donikąd. Opis renderowany z `whitespace-pre-line`. Przy rabacie z terminem pod ceną stoi zielony dopisek „Promocyjna cena obowiązuje do {data}” (`Clock`, czas polski). Blok wysyłki pokazuje **„Wysyłka od {najtańsza stawka}”** – klient nie wybrał jeszcze metody, więc podajemy najniższą z kuriera i paczkomatu; słowo „od” znika, gdy obie kosztują tyle samo (byłoby mylące). Pod nim `QuantityPromoNotes` z trwającymi promocjami. Informacja „Można myć w zmywarce" (`DishwasherIcon` 18 px, `text-sm`) stoi **tuż pod opisem** – celowo większa niż blok pod przyciskiem koszyka (ikony 14 px, `text-xs`) |
| `/koszyk` | ISR 300 s | Koszyk **nigdy nie pokazuje kwoty dostawy i nie dolicza jej do sumy** – koszt zależy od metody wybieranej na `/zamowienie`. Kwoty liczy `priceOrder` (ta sama funkcja co checkout), więc rabat ilościowy jest widoczny od razu, razem z zachętą „Dodaj jeszcze N szt., by zyskać −X%” i „Dodaj jeszcze X zł do darmowej wysyłki”. Strona serwerowa pobiera stawki i **aktywne promocje** i podaje je propsem do `CartView` (`"use client"`). **Nie pobieraj ich fetchem w przeglądarce** – wtedy po wejściu widać przez moment ceny policzone starą stawką Strona renderuje `Header` (`HeaderWrapper`) i `Footer` jak reszta sklepu, a treść siedzi w `<main className="flex-1">` – **nie dawaj `pt-[...]` ani `min-h-[100svh]`**, offset zapewnia spacer z `HeaderWrapper`, a wysokość `flex-1` na `body.flex-col`. |
| `/zamowienie` | force-dynamic | Formularz zamówienia (server) → `CheckoutForm` (client). Tu klient wpisuje **kod rabatowy** (pole w podsumowaniu; `/api/discount-code` zwraca procent i zasadę łączenia, kwoty liczy `priceOrder`). Kod niełączony, który wypada gorzej niż promocje sklepu, nie jest stosowany – formularz mówi o tym wprost. **Dostępne bez logowania** – patrz „Zamówienie bez konta (checkout gościa)" Header, stopka i `<main className="flex-1">` jak w koszyku. Pod przyciskiem złożenia zamówienia stoi „← Wróć do koszyka” – bez niego nie dało się wyjść z formularza inaczej niż menu. |
| `/zamowienie/potwierdzenie` | force-dynamic | Potwierdzenie – zależnie od stanu zamówienia: dane do przelewu, informacja o płatności kartą, „oczekuje na płatność" z przyciskiem ponowienia (`StripeResumeButton`) albo informacja o anulowaniu. Dla zamówienia gościa dokłada blok „Zamówienie bez konta" i zamienia CTA „Moje zamówienia" na „Załóż konto" |
| `/zamowienie-indywidualne` | static (client) | Zamówienie na miarę |
| `/logowanie`, `/rejestracja` | static (client) | Auth. **Zalogowanego middleware odsyła do `/konto`** (albo pod `callbackUrl`, jeśli jest ścieżką względną) – obie strony są klienckie, więc sprawdzenie w komponencie mignęłoby formularzem |
| `/zmiana-emaila` | force-dynamic | Potwierdzenie zmiany adresu e-mail. **Celowo poza `/konto`** – tamta sekcja wymaga sesji, a link z maila klient bardzo często otwiera na innym urządzeniu; autoryzacją jest token z adresu, nie sesja |
| `/warsztaty` | ISR 300 s | Wprowadzenie (galeria po prawej), oferty, „Co zawiera warsztat?" jako **lista + galeria** (`workshops_includes_gallery`; nagłówek jest **w lewej kolumnie** siatki, a nad siatką zostaje sam `ClayRule` – dzięki temu górna krawędź galerii wypada równo z nagłówkiem, nie z pierwszym podpunktem; bez zdjęć lista zwęża się do `max-w-xl` i zostaje wyśrodkowana) oraz FAQ w **dwóch kolumnach** (`md:grid-cols-2`) zakończone kafelkiem z odesłaniem do `/kontakt`. Mapa ikon jest w `app/warsztaty/icons.ts` – zwykły moduł, bo korzysta z niej i strona serwerowa, i kliencki `WorkshopIncludes` |
| `/o-mnie`, `/kontakt`, `/regulamin`, `/polityka-prywatnosci` | ISR 300 s | Strony treściowe (treść z ustawień; zapis w adminie robi `revalidatePath`); `/kontakt` zawiera ukrytą sekcję SEO „Obszar obsługi" (`sr-only` – lista miast Śląska, indeksowalna, niewidoczna wizualnie). `/o-mnie` ma w tytule **imię i nazwisko właścicielki** (`O mnie – Alicja Ulbrich`) i dane strukturalne `Person` (`#person`, `worksFor` → `#business`) – wiążą nazwisko z marką w wynikach wyszukiwania. **Regulamin i polityka są indeksowalne** (są w sitemapie, więc sygnały muszą się zgadzać) – nie wracaj do `noIndex` bez wyrzucenia ich z `app/sitemap.ts` |
| `/moje-projekty` | ISR | Publiczne portfolio prac (model `Project`, dane z `getProjects()`) |

### Strony chronione – konto klienta (`/konto`) – wymaga sesji (middleware + layout)
| Route | Opis |
|-------|------|
| `/konto` | Dashboard klienta |
| `/konto/profil` | Edycja imienia i hasła; eksport danych (RODO) i usunięcie konta (strefa niebezpieczna) |
| `/konto/adres` | Adres dostawy (auto-uzupełnia checkout) |
| `/konto/zamowienia` | Historia zamówień |
| `/konto/zamowienia/[id]` | Szczegóły zamówienia (weryfikacja własności) + wznowienie płatności Stripe |

### Panel admina (`/admin`) – rola ADMIN weryfikowana w DB (`lib/admin-auth.ts`)
| Route | Opis |
|-------|------|
| `/admin` | Dashboard ze statystykami |
| `/admin/produkty`, `/admin/produkty/nowy`, `/admin/produkty/[id]` | Zarządzanie produktami. Lista obsługuje filtry (`q`, `kat`, `status`) i **sortowanie** (`sort` – patrz `lib/product-sort.ts`); przy nazwie stoi znaczek rabatu (`−20%`) w kolorze stanu – zielony = działa, bursztynowy = zaplanowany, szary = zakończony, a podpowiedź pod kursorem podaje daty. `/admin/produkty/nowy?kopia={id}` otwiera formularz wypełniony danymi wskazanego produktu (**duplikowanie**) – kopia powstaje dopiero po zapisaniu, nieistniejące `kopia` daje `notFound()` |
| `/admin/zamowienia`, `/admin/zamowienia/[id]` | Zamówienia sklepowe |
| `/admin/zamowienia-indywidualne`, `/admin/zamowienia-indywidualne/[id]` | Zamówienia indywidualne |
| `/admin/ustawienia` | Ustawienia sklepu (strona główna, o mnie, warsztaty, regulamin, polityka, kontakt, wysyłka, urlop, zam. indywidualne, AI (zdjęcia i opisy), promocje, płatności) |
| `/admin/kategorie` | Zarządzanie kategoriami produktów (CRUD + kolejność) oraz **opisy kategorii dla wyszukiwarki** (`CategoryIntros` – zapis przez `/api/admin/settings` do `category_intro_{slug}`; puste pole = opis układany z nazwy, widoczny jako podpowiedź; licznik ostrzega powyżej 160 znaków, bo tyle pokazuje Google) |
| `/admin/kody-rabatowe`, `/admin/kody-rabatowe/nowy`, `/admin/kody-rabatowe/[id]` | Kody rabatowe (CRUD; w menu panelu pozycja siedzi w rozwijanych **Ustawieniach**, pod „Promocje"). Lista pokazuje stan (Działa / Zaplanowany / Zakończony / Wyłączony), procent, sposób łączenia, okno czasu i licznik użyć; bez tabeli w bazie – instrukcja migracji zamiast listy |
| `/admin/promocje`, `/admin/promocje/ilosciowe/{nowy,[id]}`, `/admin/promocje/wysylka/{nowy,[id]}` | **Promocje**: rabat ilościowy i darmowa wysyłka (CRUD; w menu panelu pozycja siedzi w rozwijanych **Ustawieniach**). Lista pokazuje stan (Działa / Zaplanowana / Zakończona / Wyłączona), progi, zasady łączenia i okno czasu, a także **ostrzega, gdy kilka promocji obowiązuje jednocześnie** (wygrywa jedna – patrz `lib/promos.ts`). Bez tabel w bazie – instrukcja migracji zamiast listy |
| `/admin/projekty`, `/admin/projekty/nowy`, `/admin/projekty/[id]` | Portfolio prac (CRUD projektów; chronione layoutem admina + `requireAdmin`) |
| `/admin/analityki` | Panel analityczny – przychód miesięczny (wykres + tabela z podatkiem PIT i checkboxem stawki 32% + pobranie raportu PDF), bestsellery, metody wysyłki, płatności, statusy zamówień, podsumowanie roczne, działalność nierejestrowana (limit kwartalny – przychód należny z wysyłką) |

### API Routes
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/products` | Lista produktów (query: `kategoria`, `exclude`) |
| GET | `/api/products/[slug]` | Szczegóły produktu (tylko `active: true`) |
| GET | `/api/public/contacts` | Dane kontaktowe (phone, email, instagram, facebook, youtube, whatsapp, hours, addressStreet/City/Region) |
| GET | `/api/public/shipping` | Stawki wysyłki i trwająca promocja: `{ courier, parcelLocker, cheapest, freeShipping }` (`freeShipping: null` = brak promocji) |
| POST | `/api/register` | Rejestracja (rate limit, hasło 8–128 znaków) |
| POST | `/api/checkout` | Zamówienie: walidacja, kwoty serwerowo przez `priceOrder` z `lib/discount-code.ts` (cena pozycji = `discountedPrice(product.price, activeDiscountPercent(product))`, do tego **rabat ilościowy**, kod rabatowy i promocja „Darmowa wysyłka” – wszystkie promocje i ich terminy rozstrzyga **serwer**, w chwili składania zamówienia, bez `holdMs`; nieważny kod po prostu nie wchodzi), **transakcja stock+order**, e-mail / sesja Stripe. Zapisuje ślad cenowy: `OrderItem.basePrice`, `Order.quantityDiscountPercent`/`quantityDiscountAmount`. **Kontrola dostępności** działa dwustopniowo: sprawdzenie przed wyceną i warunek `stock >= quantity` w transakcji (wyścig równoległych zakupów). Obie ścieżki zwracają **409 z `{ outOfStock: true, productIds }`** – dzięki temu koszyk po stronie klienta sam usuwa sprzedaną pozycję i nazywa ją w dymku, zamiast pokazać suchy błąd nad formularzem. |
**Guard rozjazdu ceny:** koszyk trzyma cenę z chwili dodania produktu, a przeceny mają okno czasu – jeśli `total` z żądania różni się od serwerowego o ≥ 1 grosz, trasa zwraca **409** z `{ priceChanged: true, total, items }` i **nie tworzy zamówienia**; `CheckoutForm` wyrównuje wtedy koszyk i prosi o ponowne potwierdzenie. Wcześniej różnica przechodziła bez słowa i przy karcie klient trafiał na Stripe z inną kwotą, niż widział.
**Płatność kartą** jest sprawdzana (`payment_stripe_enabled` + `STRIPE_SECRET_KEY`) **przed** utworzeniem zamówienia – wyłączenie jej w panelu było wcześniej tylko kosmetyką UI. Utworzenie sesji Stripe jest w `try/catch`: przy błędzie `releaseOrder()` anuluje zamówienie i **oddaje stan magazynowy** (bez sesji nie przyjdzie `checkout.session.expired`, więc nikt inny by tego nie posprzątał). Działa z sesją i bez niej (`userId` = `null` dla gościa); gość musi przesłać `acceptTerms: true`, a przy wysyłce (kurier/paczkomat) wymagany jest telefon. E-mail potwierdzający idzie do klienta przy **obu** metodach płatności (`buildOrderEmail`) |
| POST | `/api/cart/prices` | Aktualne ceny produktów z koszyka (publiczne, rate limit 60/min na IP; maks. 60 pozycji) → `{ products: [{ id, name, price, basePrice, stock }] }`. `price` liczone tak samo jak w checkoucie (`discountedPrice` + `activeDiscountPercent`, **bez `holdMs`**), produkt nieaktywny dostaje `stock: 0`. Używa go `useCartPriceSync()` |
| GET/POST | `/api/admin/promocje/ilosciowe` · PUT/DELETE `/api/admin/promocje/ilosciowe/[id]` | Rabat ilościowy (ADMIN; `validateQuantityPromo`; mutacje → `revalidateProductPages()`, bo zachęty stoją w katalogu i na kartach produktów) |
| GET/POST | `/api/admin/promocje/wysylka` · PUT/DELETE `/api/admin/promocje/wysylka/[id]` | Promocja „Darmowa wysyłka” (ADMIN; `validateFreeShippingPromo`; mutacje → `revalidateProductPages()`) |
| POST | `/api/discount-code` | Weryfikacja kodu wpisanego w zamówieniu (publiczne, rate limit 20/min na IP) → `{ code, percent, freeShipping, stackable }`. Nieznany, wyłączony i wygasły kod dostaje ten sam komunikat 404. **Kwoty i tak liczy jeszcze raz `/api/checkout`** |
| GET/POST | `/api/admin/discount-codes` | Lista (`{ available, codes }`) / dodanie kodu (ADMIN; `validateDiscountCode`, kolizja kodu = 409) |
| PUT/DELETE | `/api/admin/discount-codes/[id]` | Edycja / usunięcie kodu (ADMIN) |
| POST | `/api/contact` | Formularz kontaktowy → e-mail Resend (rate limit) |
| POST | `/api/custom-order` | Zamówienie indywidualne (rate limit) |
| POST | `/api/stripe/resume` | Wznowienie nieopłaconej płatności Stripe (blokada CANCELLED, rate limit 10/min na IP). Zamówienie z konta – tylko właściciel; zamówienie gościa (`userId = null`) – bez sesji, identyfikator zamówienia pełni rolę tokenu |
| POST | `/api/stripe/webhook` | Webhook Stripe: `completed`→PAID (gdy `payment_status=paid`), `expired`→anulacja + zwrot stocku |
| POST | `/api/account/update-name` | Zmiana imienia (maks. 100 znaków) |
| PATCH | `/api/account/change-password` | Zmiana hasła (rate limit 5/15 min, 8–128 znaków; bumpuje `tokenVersion` → wylogowuje wszystkie sesje, także bieżącą) |
| POST | `/api/account/email-change` | Żądanie zmiany adresu (wymaga sesji): re-auth **aktualnym hasłem**, walidacja adresu, sprawdzenie że jest wolny, zapis żądania z hashem tokenu (ważność 1 h), e-mail z linkiem na **nowy** adres i ostrzeżenie na **stary**. Konta Google odrzucane (brak hasła – nie ma czym potwierdzić tożsamości). Rate limit 3/h na konto. Gdy wysyłka potwierdzenia zawiedzie, żądanie jest **kasowane** – inaczej klient zostałby z oczekującą zmianą bez maila |
| POST | `/api/account/email-change/confirm` | Potwierdzenie zmiany. **Nie wymaga sesji** – autoryzacją jest token. Sprawdza hash, termin i **ponownie** czy adres jest wolny (ktoś mógł go zająć w międzyczasie), po czym w jednej transakcji zmienia `User.email`, bumpuje `tokenVersion` (wylogowanie wszędzie – e-mail jest loginem) i kasuje żądanie. Rate limit 20/h na IP |
| GET/PUT | `/api/account/address` | Pobierz/zapisz adres dostawy (Setting: `user_address_{userId}`) |
| GET/PUT | `/api/account/cart` | Koszyk przypisany do konta (Setting: `user_cart_{userId}`). GET bez sesji zwraca pustą listę (nie błąd – koszyk gościa ma zostać nietknięty), PUT wymaga sesji. Zapis jest **znormalizowany i przycięty do 60 pozycji**; ceny i stany z niego **nigdy nie są prawdą** – wyrównuje je `/api/cart/prices`, a kwotę liczy `/api/checkout` z bazy |
| GET | `/api/account/export` | Eksport danych konta jako JSON (RODO art. 15/20 – profil, adres, zamówienia; rate limit) |
| DELETE | `/api/account/delete` | Usunięcie konta (RODO art. 17; re-auth hasłem dla kont Credentials; zamówienia odłączane `userId→null`, adres + sesje + OAuth kasowane; rate limit) |
| GET/POST | `/api/admin/categories` | Lista/dodaj kategorie (ADMIN; mutacje → `revalidateCategories()`) |
| PUT/DELETE | `/api/admin/categories/[id]` | Edytuj/usuń kategorię (ADMIN; usuwanie blokowane gdy istnieją produkty w kategorii) |
| GET/POST | `/api/admin/products` | Lista/dodaj produkty (ADMIN; mutacje → `revalidateProductPages()`) |
| PUT/DELETE | `/api/admin/products/[id]` | Edytuj/usuń produkt (ADMIN; walidacja `validateProduct`; mutacje → rewalidacja) |
| GET/POST | `/api/admin/portfolio` | Lista/dodaj projekty portfolio (ADMIN; `validateProjectInput`; mutacje → `revalidatePortfolioPages()`) |
| PUT/DELETE | `/api/admin/portfolio/[id]` | Edytuj/usuń projekt portfolio (ADMIN; `validateProjectInput`) |
| PATCH | `/api/admin/orders/[id]` | Zmień status zamówienia / dane listu przewozowego / datę wpłaty (ADMIN; walidacja przejścia: 1 krok do przodu lub anulowanie; status `PAID` auto-ustawia `paymentStatus=PAID`+`paidAt` z modalu+e-mail; osobne `{ paidAt }` edytuje datę wpłaty – walidacja: nie z przyszłości, nie przed złożeniem; dane listu: `trackingCarrier` z allowlisty (dpd/dhl/inpost/poczta), `trackingNumber` tylko `[A-Za-z0-9-]` ≤64 zn.) |
| PATCH | `/api/admin/custom-orders/[id]` | Status/notatki/cena/kwotaWpłacona/daneKlienta zamówienia indywidualnego (ADMIN; PAID wymaga paidAmount > 0) |
| POST | `/api/admin/upload` | Upload zdjęcia do Supabase Storage (ADMIN, magic bytes, maks. 10 MB; konwersja do WebP przez `sharp`, wysyłka jako `Blob` = multipart + kontrola rozmiaru zapisanego pliku). Cała trasa jest w `try/catch` i **zawsze** odpowiada JSON-em z polem `error` – bez tego wyjątek (brak `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, błąd Prismy w `requireAdmin`, wyjątek klienta Storage) dawał 500 z HTML-em, a panel pokazywał samo „nie udało się wgrać zdjęcia (błąd 500)”. Brak kluczy Supabase jest wykrywany osobno i nazwany po imieniu; kontrola rozmiaru przez `storage.info()` jest **nieblokująca** – błąd odczytu metadanych tylko loguje ostrzeżenie, bo plik jest już zapisany |
| POST | `/api/admin/rotate` | Obrót zdjęcia o 90/180/270° (ADMIN; `{ url, angle }`). Źródło musi być **własne** – ścieżka z `public/` albo obiekt z naszego Storage (blokada SSRF); `sharp().rotate()` → WebP zapisany pod **nową nazwą** (to samo zdjęcie bywa użyte gdzie indziej, a nadpisanie utknęłoby w cache CDN). Zwraca nowy `url`. Używane przez `GalleryEditor` |
| POST | `/api/admin/ai-image` | Generuje wersję zdjęcia produktu przez Google AI (ADMIN; `{ url, variant: "ai" \| "ai_plus" }`). Źródło musi być **własne** (`resolveOwnImageSource` – ta sama blokada SSRF co przy obrocie); zdjęcie idzie do modelu jako JPEG ≤1536 px, wynik zapisywany jako **nowy** plik WebP w Storage. Model brany z ustawień (`ai_image_model` / `ai_image_model_plus`), rate limit 20/10 min, `maxDuration = 60`. Po udanym wywołaniu zapisuje zużycie (`recordAiUsage` → `AiImageUsage`), a plik dostaje sufiks `-ai.webp`. Zwraca `{ url, model }` |
| POST | `/api/admin/ai-text` | Uzupełnia dane produktu ze zdjęcia głównego (ADMIN; `{ url }` → `{ name, slug, category, description, model }`). Ta sama blokada SSRF i rate limit 30/10 min, `maxDuration = 60`. Do modelu idzie JPEG ≤1024 px + prompt z **listą kategorii sklepu**; odpowiedź musi być JSON-em (parser znosi bloki ```), slug jest normalizowany do `[a-z0-9-]`, a kategoria przyjmowana **tylko** gdy pasuje do istniejącej. Pauzy (`—`, `―`) w nazwie i opisie są zamieniane na półpauzę `–` – prompt o to prosi, ale model bywa głuchy, a długi myślnik łamie typografię sklepu. Zużycie zapisywane z `kind: "text"` |
| POST | `/api/admin/ai-prompt` | Układa **preset promptu** z opisu po polsku (ADMIN; `{ description }` → `{ scene, model }`). Model tekstowy z ustawień, rate limit 30/10 min, `maxDuration = 60`, zużycie zapisywane z `kind: "text"` i wariantem `prompt_build`. Model dostaje polecenie opisania **wyłącznie sceny** – reguły produktu są doklejane osobno przy generowaniu zdjęcia, więc prompt ich nie powtarza. Odpowiedź jest czyszczona z bloków kodu i cudzysłowów |
| PATCH/POST | `/api/admin/settings` | Zapis ustawień (ADMIN; sanityzacja HTML + `revalidatePath("/", "layout")`) |
| GET | `/api/admin/settings/[key]` | Pojedyncze ustawienie (ADMIN) |
| GET | `/api/admin/reports/[year]/[month]` | Generuje i pobiera raport PDF za dany miesiąc (ADMIN; pdfkit; czcionka Lato z Google Fonts CDN z cachem; fallback Helvetica). Tylko opłacone zamówienia rozpoznane wg daty wpłaty (`paidAt`/`createdAt`). Liczy podatek PIT od przychodu z produktów (bez wysyłki – koszt uzyskania przychodu); stawka 12% lub 32% wg ustawienia `tax_high_{rok}_{miesiac}` |
| GET | `/api/og/[slug]` | Zdjęcie do podglądu linku produktu (publiczne): bierze `images[0]` aktywnego produktu i oddaje **JPEG 1200×630** (`fit: contain` na tle `cream`). Powód: zdjęcia trzymamy w WebP, którego **WhatsApp nie renderuje** w podglądach linków. Wskazywane z `generateMetadata` w `/sklep/[slug]` razem z `width`/`height`/`type` – bez nich część komunikatorów pokazuje mały kafelek. Cache: `s-maxage=86400` |
| GET | `/api/ping` | Health check (wymaga `Authorization: Bearer CRON_SECRET`; cron Vercel 8:00) |

---

## Biblioteki pomocnicze (`lib/`)

- **db.ts** – singleton PrismaClient (`connection_limit=1` pod serverless) + `withDbRetry(fn, attempts = 3)` – ponawia zapytanie z narastającą przerwą (300/600 ms), gdy baza odrzuci połączenie. Pooler Supabase dzieli `pool_size` (domyślnie **15**) między produkcję, cron, panel i build; przy budowaniu potrafi paść `FATAL: (EMAXCONNSESSION) max clients reached in session mode`, a wtedy strony ISR zapisują się z danymi zastępczymi (pusty katalog, domyślne kategorie) zamiast z prawdziwą treścią. Helper **tylko ponawia** – to wywołujący decyduje, czy po nieudanych próbach oddać fallback (`getCategories`, `getProjects`, `getSettings`, sitemap, `generateStaticParams`), czy pozwolić błędowi przerwać build (`getShopProducts`, `getFeaturedProducts` – lepiej zatrzymać wdrożenie niż opublikować pusty sklep na czas cache'u). Nowe zapytania czytane przy renderze stron ISR opakowuj tym helperem. `buildUrl()` dodatkowo **ostrzega w logach**, gdy `DATABASE_URL` wskazuje pooler na porcie **5432** (tryb *session*)

> ⚠️ **Tryb poolera ma znaczenie.** W trybie *session* każdy klient trzyma własne połączenie do Postgresa, więc `pool_size` (15) wyczerpuje się już przy kilkunastu instancjach serverless naraz i **wszystko** – panel admina, build, cron – dostaje `FATAL: (EMAXCONNSESSION) max clients reached in session mode`. Objaw w panelu: „This page couldn't load" z `prisma.user.findUnique()` w logach (to `requireAdmin`). Rozwiązanie jest poza kodem: `DATABASE_URL` na produkcji musi wskazywać **transaction pooler – port 6543 z `?pgbouncer=true`** (jak w lokalnym `.env`), a tryb puli w panelu Supabase ma być ustawiony na *Transaction*. Ponowienia (`withDbRetry`) tylko łagodzą skutki, nie usuwają przyczyny
- **settings.ts** – `getSchemaSettings()` (unstable_cache 3600 s, tag `settings`) – kontakt **plus `home_hero_image`** dla danych strukturalnych w layoucie; `settingNumber(value, fallback)` – liczba z ustawienia, w której **zero jest poprawną wartością**; wzorzec `Number(v) || fallback` traktował je jak brak, więc nie dało się ustawić `shipping_cost = 0` (darmowa wysyłka) ani `shipping_free_from = 0` (próg od pierwszej złotówki) – cicho wracały odpowiednio 18 i 300. Używaj go wszędzie tam, gdzie ustawienie jest kwotą. Dalej: `getSetting`/`getSettings` z defaultami i retry (bez cache – nie wołaj w layoucie!) + `getContactSettings()` (unstable_cache 3600 s, tag `settings`) dla danych kontaktowych czytanych przy każdym renderze; zapis w `/api/admin/settings` robi `revalidateTag("settings", "max")`
- **public-contacts.ts** – `"use client"`, store modułowy (`useSyncExternalStore`) z danymi z `/api/public/contacts`; hook `useContacts()`. Dzięki niemu endpoint jest odpytywany **raz na stronę**, a nie osobno przez każdy komponent stopki. Telefon/e-mail/Instagram wracają do defaultów gdy puste; reszta (social, adres, godziny) zostaje pusta – wyczyszczone w panelu = ukryte w stopce
- **opening-hours.ts** – `normalizeHours(text)` (zamienia `<br>` i CRLF na zwykłe nowe wiersze – HTML **nie jest** renderowany) oraz `parseOpeningHours(text)`: zamienia tekst z `contact_hours` (np. „Wt–Czw 17:00–19:00, So 15:00–17:00") na `openingHoursSpecification` schema.org; obsługuje polskie skróty dni, zakresy przez niedzielę i format `9.00`. Fragmentu, którego nie rozumie, **nie zwraca** – lepiej pominąć godziny w JSON-LD niż podać błędne. `parseCityLine(line)` rozbija „44-164 Kleszczów (k. Gliwic)" na kod pocztowy i miejscowość
- **products.ts** – `getShopProducts()` (unstable_cache 60 s, tag `products`; jedno zapytanie do DB, podział inStock/soldOut w JS) + `getFeaturedProducts()` (unstable_cache 3600 s, tag `products`) + `revalidateProductPages()`
- **category-seo.ts** – adresy i teksty stron kategorii (moduł neutralny, bez bazy): `categoryPath(slug)` (`/sklep/kategoria/{slug}`), `categoryIntroKey(slug)` (klucz ustawienia z własnym opisem), `categoryTitle` i `categoryDescription` (opis **tylko dla wyszukiwarki**, mieści się w ~160 znakach). **Nazwa kategorii zawsze otwiera zdanie, w mianowniku** – wersje wciągające ją w środek zdania („znajdziesz {nazwa}…”) łamały się na „Inne” czy „Zestawy kawowe”, a kategorie dodaje właściciel. Teksty generowane są tylko wypełniaczem: własny opis z panelu jest dla wyszukiwarki wart więcej niż szablon powtórzony na każdej kategorii
- **categories.ts** – `getCategories()` (unstable_cache, tag `categories`; fallback do DEFAULT_CATEGORIES gdy DB pusta/niedostępna) + `revalidateCategories()`; re-eksportuje `categoryLabel` z **category-defaults.ts** (neutralny moduł bez Prismy – komponenty klienckie importują helper **stamtąd**, nie z `categories.ts`)
- **category-defaults.ts** – `DEFAULT_CATEGORIES`, typ `Category` i `categoryLabel(slug, categories)`: `Product.category` trzyma **slug** (`swieczniki`, `miski-i-naczynia`), więc pokazywanie go wprost gubiło polskie znaki i myślniki – do wyświetlenia zawsze mapuj slug na `label` kategorii. Nieznany slug (kategoria usunięta) wraca jako slug ze spacjami
- **admin-badges.ts** – `getNewOrderCounts()`: ile zamówień czeka na zajęcie się nimi (status „Nowe”: `Order.PENDING` i `CustomOrder.NEW`) – do czerwonych znaczków w menu panelu. Liczymy **tylko pierwszy status** każdego przepływu, bo znaczek odpowiada na pytanie „czy przyszło coś nowego”, a nie „ile jest w toku”. Zapytania **sekwencyjnie** (pula Supabase), całość w `try/catch` – licznik przy pozycji menu nie może wywrócić panelu, więc przy błędzie bazy wracają zera
- **admin-auth.ts** – `requireAdmin()`: sesja + **aktualna rola z DB** (zapytanie w `withDbRetry` – przy wyczerpanym poolerze cały panel oddawał 500; po nieudanych ponowieniach błąd leci dalej, bo roli nie da się potwierdzić, a cichy redirect wyglądałby na wylogowanie) (nie z JWT – odebranie uprawnień działa natychmiast). **UWAGA: zwraca `null` przy braku uprawnień, NIE rzuca wyjątku** – zawsze sprawdzaj wartość: `if (!await requireAdmin()) return 403`. Nigdy `try/catch` wokół niego (catch nigdy się nie wykona)
- **rate-limit.ts** – **async** `isRateLimited(key, limit, windowMs)` + `getClientIp`. Domyślnie trwały magazyn Upstash Redis (REST, okno stałe) – poprawny na serverless; gdy brak `UPSTASH_*` lub Redis niedostępny → fallback in-memory (per-instancja). **Wszyscy wywołujący muszą `await`.**
- **bundled-shipping.ts** – ⚠️ **LEGACY, nie używaj w nowym kodzie.** Wycofana promocja „Wielosztuki” (narzut wysyłki w cenie katalogowej oddawany jako pozorny rabat – suma zamówienia wychodziła identycznie jak bez promocji). Czyta go już **tylko** `lib/order-summary.ts`, gdy `Order.bundleSurcharge != null`, żeby archiwalne zamówienia renderowały się tak, jak je złożono
  - **Ceną odniesienia („przed rabatem”) jest cena sprzed rabatu produktowego** – pozycja podaje ją polem `basePrice` (koszyk zapisuje je przy dodaniu produktu). Dzięki temu przekreślona kwota zgadza się z tą z karty produktu, a pokazany upust obejmuje **oba** rabaty naraz (100 zł −1% przy narzucie 25 zł i 2 szt.: 250 → 223, czyli −11%, a nie −10%). Bez `basePrice` – pozycje odtwarzane z zamówienia, bo `OrderItem` trzyma tylko kwoty do zapłaty – odniesieniem zostaje cena pozycji, czyli sam rabat za wielosztuki; suma „Razem” jest w obu wariantach ta sama
  - `discountPercent` liczymy **osobno dla każdej pozycji** (przez `shownDiscountPercent`, z dwóch kwot pokazanych obok siebie) – produkty mogą mieć różne rabaty własne, więc jedna wspólna wartość kłamałaby na kartach. Neutralny moduł bez bazy: używa go katalog, koszyk, checkout i `/api/checkout`. **Nie zmienia kwot zapisywanych w zamówieniu** – `OrderItem.price` to nadal cena bazowa, a `Order.shippingCost` koszt wysyłki
- **discount-code.ts** – kody rabatowe i **wycena całego zamówienia** (moduł neutralny, bez bazy): `normalizeCode`, `isValidCodeFormat`, `activeCodePercent`, `codeState` oraz **`priceOrder({ items, quantityPromo, code, shipping })`** – jedyne wejście do wyceny, wspólne dla `CheckoutForm`, `CartView` i `/api/checkout`, dzięki czemu klient widzi dokładnie tę kwotę, którą policzy serwer.
  - **Kolejność:** cena bazowa → przecena produktowa (jest już w `item.price`) → rabat ilościowy → kod → wysyłka (`shippingFor`: odbiór osobisty → 0, dalej **kod z `freeShipping`** (bezwarunkowo), dalej promocja „Darmowa wysyłka”, dalej stawka metody). Darmową wysyłkę z kodu dostaje **tylko wariant, w którym kod realnie wszedł**
  - Zwraca wariant (`promo`/`code`), ceny jednostkowe do zapisania w zamówieniu, rozbicie dla klienta (`display`), `productDiscount`, `quantityPercent`, `quantityDiscount`, `quantityNextTier`, `codeDiscount`, `promoDiscount`, `shippingCost`, `shippingFree` i `total`.
  - **Łączenie jest konfigurowalne po obu stronach** (kod i promocja mają własne `stackable`). Gdy którakolwiek strona odmawia, liczone są warianty i wygrywa **tańszy dla klienta**; remis zostawia promocje sklepu, żeby nie zużywać kodu bez korzyści.
  - `codeDiscount` liczymy jako **resztę** upustu (`discountTotal − productDiscount − quantityDiscount`), więc rozbicie zawsze sumuje się do kwoty zapłaconej, niezależnie od zaokrągleń pojedynczych pozycji
- **discount-codes.ts** – dostęp do bazy dla kodów (serwer): `listDiscountCodes` (`available: false` = brak tabeli), `getDiscountCode`, `findActiveCode` (weryfikacja przy zamówieniu), `countCodeUsage()` / `countCodeUsageFor(code)` i `validateDiscountCode` (walidacja danych z panelu). **Każdy odczyt jest w try/catch** – migracja jest ręczna, a brak tabeli nie może wywrócić sklepu.
- **quantity-promo.ts** – **rabat ilościowy** (moduł neutralny, bez bazy): `applyQuantityDiscount(items, promo)`, `activeQuantityPromo`, `normalizeTiers`, `lowestTier`, `quantityPromoTeaser`, `nextTierHintText`, `validateQuantityPromo`, `MAX_TIERS` (10).
  - **Algorytm:** wyznacz pozycje kwalifikujące się (cena ≥ `minItemPrice`, a przy `includeDiscountedProducts = false` bez własnej przeceny) → policz sztuki i wartość **tylko z nich** → wybierz próg o **najwyższym procencie**, którego oba warunki (`minPieces` i `minValue`) są spełnione → nalicz rabat **proporcjonalnie tylko na te pozycje** → przytnij do `maxDiscount`.
  - **Cztery zabezpieczenia przed nadużyciami** (każde ma test w `tests/quantity-promo.test.ts`): `minItemPrice` unieważnia dokładanie taniochy do progu; `minValue` na progu blokuje odblokowanie rabatu samą liczbą sztuk; rabat **procentowy i proporcjonalny** (nie „najdroższa sztuka gratis”) sprawia, że nie ma pozycji, którą opłaca się zatrzymać przy zwrocie reszty; `maxDiscount` ogranicza ekspozycję kwotową. **Nie osłabiaj żadnego z nich bez ustaleń.**
  - `discountTotal` liczymy z **już zaokrąglonych** cen jednostkowych, więc nie powstaje reszta do doklejania. `maxDiscount` jest respektowany z dokładnością do zaokrągleń pojedynczych pozycji.
  - Walidacja panelu wymaga, by **każdy kolejny próg dawał wyższy rabat** – inaczej klient traciłby na dołożeniu sztuki – i by próg zaczynał się od 2 sztuk.
- **free-shipping.ts** – **promocja „Darmowa wysyłka”** (moduł neutralny, bez bazy): `activeFreeShipping`, `isShippingFree(promo, method, itemsTotal)`, `freeShippingMissing` (ile brakuje do progu – zachęta w koszyku), `normalizeMethods`, `validateFreeShippingPromo`, `SHIPPING_METHOD_NAMES`/`SHIPPING_METHOD_LABEL`. Próg liczony jest od kwoty **po wszystkich rabatach**, żeby nie dało się odblokować darmowej wysyłki kwotą, której klient realnie nie płaci.
- **promos.ts** – dostęp do bazy dla obu promocji (serwer): `listQuantityPromos`, `getQuantityPromo`, `findActiveQuantityPromo({ now?, holdMs? })`, `listFreeShippingPromos`, `getFreeShippingPromo`, `findActiveFreeShipping`, `toQuantityConfig`, `toFreeShippingConfig`. **Każdy odczyt jest w try/catch** – migracja jest ręczna, a brak tabel nie może wywrócić sklepu (promocje po prostu nie obowiązują, panel pokazuje instrukcję migracji)
  - **Użycia kodu liczymy z zamówień** (`Order.discountCode`, bez anulowanych), a nie z kolumny `usedCount`. Licznik był podbijany przy tworzeniu zamówienia, więc rósł także przy porzuconych płatnościach kartą i nigdy nie malał; kolumna została w bazie, ale panel jej nie czyta. **Kody nie mają limitu użyć** – to świadomy brak funkcji, nie błąd
- **order-summary.ts** – rozbicie kwot **złożonego** zamówienia, wspólne dla strony potwierdzenia, historii zamówień klienta i karty zamówienia w panelu. `orderSummary({ items, shippingCost, total, shippingMethod, bundleSurcharge, discountCode, discountAmount, quantityDiscountPercent, quantityDiscountAmount })` zwraca pozycje, `catalogTotal`, `discountTotal`, `discountPercent`, `codeAmount`/`codeLabel`, `quantityAmount`/`quantityPercent`, `shippingShown` i `shippingLabel` (`pickup`/`bundled`/`free`/`paid`). **Gwarantuje, że kolumna się domyka**: `catalogTotal − discountTotal + shippingShown = total` – rabat jest z tej równości *wyliczany*, a nie sumowany z osobnych źródeł. Rabat ilościowy i kod są **częścią** `discountTotal` i pokazujemy je dopiskami; osobne wiersze odejmowania zaniżały sumę o ich wartość. Czyta wyłącznie dane zapisane w zamówieniu – dzięki temu przestawienie promocji w panelu nie zmienia wyglądu starych zamówień. Pokryte testami w `tests/pricing.test.ts`
- **product-price.ts** – rabat produktowy (`Product.discountPercent` + okno `discountStartsAt`/`discountEndsAt`): `MAX_DISCOUNT_PERCENT` (90), `normalizeDiscountPercent`, `discountedPrice(price, percent)`, `shownDiscountPercent(before, after)`, `activeDiscountPercent(product, { now?, holdMs? })`, `discountState(product)` oraz stałe `DISCOUNT_HOLD_CATALOG_MS` (60 s) i `DISCOUNT_HOLD_HOME_MS` (3600 s).
  - **`isWithinWindow(startsAt, endsAt, { now?, holdMs? })`** – wspólna obsługa okna czasu dla przecen, kodów i obu promocji; `null` z którejkolwiek strony = brak ograniczenia.
  - **`windowState(startsAt, endsAt, now?)`** – `scheduled`/`active`/`expired` do opisów w panelu. Bieżący czas bierze **wewnątrz funkcji**, bo reguła `react-hooks/purity` zabrania wołać `Date.now()` w renderze komponentu.
  - `holdMs` to okno cache strony: rabat kończący się **w trakcie** życia zapisanego HTML-a pokazujemy jako już nieaktywny, żeby nigdy nie reklamować ceny niższej niż ta, którą policzy `/api/checkout` (klient najwyżej zapłaci mniej, niż widział – nigdy więcej). **Ochrona kończy się na kliknięciu „Dodaj do koszyka”** – dalej pilnuje jej `useCartPriceSync()`. Moduł neutralny, bez bazy
- **warsaw-time.ts** – czas polski (`Europe/Warsaw`) w polach dat: `warsawLocalToDate("YYYY-MM-DDTHH:mm")` (wartość z `datetime-local` czytana **jako czas polski** → moment w UTC; offset liczony dwukrotnie, więc dni zmiany czasu też trafiają dobrze), `dateToWarsawLocal(date)` (z powrotem do pola formularza), `warsawNowLocal()`, `formatWarsaw(date, { short })` („24.08.2026, 18:00” / „24.08, 18:00”) i `toDate(value)`. Moduł neutralny (same funkcje na `Intl`) – używa go walidacja serwerowa, formularz produktu i strony sklepu. **Nie licz stref ręcznie ani przez `getTimezoneOffset()`** – serwer stoi w UTC, a właściciel myśli w czasie polskim.
- **product-sort.ts** – sortowanie listy produktów w panelu: `PRODUCT_SORTS` (opcje selecta), `resolveProductSort` (wartość spoza listy → domyślna), `productOrderBy` (kolejność dla zapytania; dla nazwy zwraca `null`) i `sortByName` – nazwy układa `Intl.Collator("pl")` w JS, bo kolejność w Postgresie zależy od collation bazy i myli polskie znaki. Moduł neutralny – używa go strona serwerowa i kliencki `ProductsSearch`
- **product-duplicate.ts** – przygotowanie kopii produktu: `duplicateName` (dopisek „(kopia)" w limicie 200 znaków), `duplicateSlugBase` i `nextFreeSlug` (`kubek-kopia`, `kubek-kopia-2`…). Bez dostępu do bazy – zajęte slugi podaje strona `/admin/produkty/nowy`, dzięki czemu zapis kopii nie kończy się błędem „Slug już istnieje"
- **home-sections.ts** – teksty **wszystkich trzech pełnoekranowych sekcji strony głównej**: `HOME_HERO_DEFAULT`, `HOME_ABOUT_DEFAULT`, `HOME_WORKSHOPS_DEFAULT` (domyślne treści – zarazem podpowiedzi w polach panelu), odpowiadające im `HOME_*_KEYS` oraz `HOME_TEXT_SETTING_KEYS` (komplet kluczy do jednego `getSettings`). Neutralny moduł bez bazy – korzysta z niego `lib/settings.ts` (defaulty), strona główna, klienckie `Hero`/`AboutTeaser`/`WorkshopsTeaser` i `SettingsForm`. Zmieniając domyślny tekst, zmieniaj go **tutaj**, nie w komponencie
- **product-validation.ts** – `validateProduct(body)`: walidacja/normalizacja danych produktu (name, slug `[a-z0-9-]`, price 0–1e6, stock int ≥0, images: tablica stringów ≤30, booleany, rabat 0–90% i jego okno `discountStartsAt`/`discountEndsAt` – ISO albo `null`; koniec musi być **później** niż początek, a rabat 0 czyści obie daty). Data w przeszłości jest dozwolona (rabat po prostu nie działa) – inaczej nie dałoby się zapisać produktu z zakończoną przeceną. Używana w POST i PUT `/api/admin/products`; eksportuje `PRODUCT_MAX_IMAGES` (30) – ten sam limit stosuje `ProductForm` po stronie klienta
- **gallery.ts** – format galerii zdjęć przy opisie (/o-mnie, /warsztaty): typ `GalleryImage` (`{ url, position }`), `parseGallery(json, legacyUrl?, legacyPosition?)` (bezpieczny parse, limit 30 zdjęć, fallback na stary klucz `*_content_image`, akceptuje też gołe stringi) i `galleryHead(json)` (pierwsze zdjęcie – do synchronizacji starych kluczy). Neutralny moduł – używany na serwerze i w komponentach klienckich
- **portfolio-validation.ts** – `validateProjectInput(body)`: walidacja projektu portfolio (title ≤200, description ≤20000, images ≤30, order int, active). Używana w POST/PUT `/api/admin/portfolio`
- **portfolio.ts** – `getProjects()` (unstable_cache, tag `projects`; fallback `[]` gdy DB niedostępna) + `revalidatePortfolioPages()`
- **upload-error.ts** – `uploadErrorMessage(status, serverError?, fileName?)`: wspólny komunikat błędu uploadu (obsługuje 413 z platformy, gdzie odpowiedź nie jest JSON-em). Używany w `ImageUploader`, `ProductForm`, `ProjectForm`
- **ai.ts** (dawniej `ai-image.ts`) – neutralny moduł konfiguracji AI (używany na serwerze i w komponentach klienckich): allowlista modeli `AI_IMAGE_MODELS`, klucze ustawień `AI_MODEL_SETTING_KEY`, domyślne modele `AI_MODEL_DEFAULT`, `resolveAiModel(variant, fromSettings)` (spoza listy → default) oraz **treść promptów** `AI_PROMPTS` (wariant `ai` – jednolite matowe tło; `ai_plus` – scena z lnem, eukaliptusem i kamieniami). Oba zawierają cztery wspólne stałe: `ORIENTATION_RULE` – wynik ma być zawsze **poziomy w proporcjach 4:3 (1440×1080)**, jak kadr galerii na karcie produktu; proporcje są w prompcie podane wprost (4:3 i 1440×1080) razem z zakazem kwadratu, pionu i 16:9, bo samo „ok. 4:3, poziomo” wariant **AI+** odczytywał jako kwadrat. Pionowe albo kwadratowe zdjęcie źródłowe ma zostać przekomponowane przez dołożenie tła po bokach, nie przez obcięcie ani rozciągnięcie produktu; sam `AI_PLUS_PROMPT` powtarza format 4:3 na początku i na końcu (scena z rekwizytami musi wypełnić dodatkową szerokość); `SET_RULE` – wygenerowane zdjęcie ma pokazać **wszystkie** sztuki ceramiki widoczne na oryginale i nie dokładać wymyślonych elementów zestawu (zakaz dotyczy ceramiki, nie rekwizytów sceny w „AI+”); `COLOR_RULE`: kolory szkliwa mają być **odwzorowane 1:1** (odcień, nasycenie, jasność, przejścia, nakrapiania), bez ocieplania, podbijania nasycenia i przebarwień od tła – oraz `SIZE_RULE`: produkt ma zachować **tę samą skalę i proporcje** co na zdjęciu źródłowym (model lubił powiększać go na pustym tle albo pomniejszać w scenie z rekwizytami, co myli klienta co do realnego rozmiaru); zmieniać wolno tylko tło, kadr i światło. Prompty zmieniaj tutaj – panel pokazuje je w zakładce „AI (zdjęcia i opisy)". Tło wariantu `ai` opisuje osobna stała `BACKGROUND_RULE`: **`#E2D8CC` / RGB (226, 216, 204)** – kolor ze zdjęcia wzorcowego wskazanego przez właściciela (20.08.2026), **nie** `sand` #E8DFD0 z palety sklepu; nie „poprawiaj" go na wartość z palety ani nie przyciemniaj. Sam hex modelowi nie wystarcza (schodzi w ciemniejszy, cieplejszy tan z winietą), więc reguła podaje też RGB, listę zakazanych odcieni (tan, camel, khaki, ochre, taupe, brąz), zakaz gradientu i winiety oraz zasadę „w razie wątpliwości jaśniej". Zmieniając odcień, popraw hex **i** RGB naraz. Część tekstowa: `AI_TEXT_MODELS`, `AI_TEXT_MODEL_SETTING_KEY`, `AI_TEXT_MODEL_DEFAULT`, `resolveAiTextModel`, `AI_TEXT_VARIANT` (`product_fill`), `AI_TEXT_LIMITS` i `buildProductFillPrompt(categories)` – prompt dostaje listę kategorii sklepu, bo model ma wybrać istniejącą; zaczyna się od polecenia rozpoznania **motywu/wizerunku, napisu, znaku i detali formy** na ceramice, bo to one mają trafić do nazwy i opisu (bez ogólników w rodzaju „z motywem"). Dodatkowo: **cennik** `AI_MODEL_PRICING` (stawki Google AI za 1 mln tokenów + `tokensPerImage` + `kind`; obejmuje modele obrazowe i tekstowe, stan 07.2026 – aktualizuj przy zmianie cennika), `aiModelKind(model)`, `aiCostUsd(model, promptTokens, outputTokens)`, `aiCostPerImageUsd(model)` oraz `AI_IMAGE_SUFFIX` / `isAiGeneratedImage(url)` – po sufiksie `-ai.webp` w nazwie pliku panel poznaje zdjęcia z AI i **nie pokazuje pod nimi przycisków AI** (powtórne przetworzenie gubi wygląd produktu). Sufiks nadaje trasa `/api/admin/ai-image`; nazwy z uploadu i obrotu go nie mają
- **ai.ts – prompty i presety** – prompt obrazowy składa się z dwóch części: **sceny** (tło, rekwizyty, światło – `AI_SCENE_PLAIN`, `AI_SCENE_STYLED` albo scena z własnego presetu) i **stałych reguł produktu** `AI_PRODUCT_RULES` (`ORIENTATION_RULE` + `COLOR_RULE` + `SET_RULE` + `SIZE_RULE` + `REALISM_RULE` – wynik ma wyglądać jak prawdziwe zdjęcie z aparatu, nie render, ilustracja ani „plastikowa” grafika). Skleja je `buildImagePrompt(scene)` – dzięki temu żaden preset nie może pominąć kadru 4:3, wierności koloru, kompletu sztuk ani skali produktu. **Nowe reguły dotyczące samego przedmiotu dopisuj do `AI_PRODUCT_RULES`, nie do scen.** Presety: `AI_BUILTIN_PRESETS` (wbudowane „Domyślny AI" i „Domyślny AI+" – nieusuwalne i **tylko do odczytu**; własny preset powstaje przyciskiem „Generuj nowy prompt"), `parseAiPresets` (bezpieczny odczyt JSON-a z ustawień; odrzuca wpisy bez pól, duplikaty id i podszywanie się pod id wbudowanych), `allAiPresets`, `resolveAiPreset(variant, id, custom)` (nieznane id → wbudowany domyślny) oraz `buildScenePrompt(description)` – polecenie dla modelu tekstowego układającego nową scenę z opisu po polsku
- **ai-usage.ts** – `recordAiUsage(...)` (zapis jednego wywołania: `kind`, wariant, model, tokeny; błąd tylko loguje) i `getAiUsageStats()` (agregaty: bieżący/poprzedni miesiąc i łącznie – każdy z **rozbiciem na zdjęcia i teksty** – oraz per model, per wariant, liczba wpisów szacowanych, data ostatniego użycia). Przy niedostępnej tabeli/bazie zwraca `available: false`, a panel pokazuje instrukcję migracji zamiast zer
- **google-ai.ts** – klient Gemini (tylko serwer, bez SDK): `generateProductImage({ model, prompt, image })` i `generateProductText({ model, prompt, image? })` (zdjęcie opcjonalne – układanie promptu ze słownego opisu idzie bez niego) – obie idą przez wspólne `callGemini`, różnią się tylko odczytem odpowiedzi (obraz vs tekst) i zwracają liczniki tokenów. Główna droga to Interactions API (`POST /v1beta/interactions`, nagłówek `x-goog-api-key`); przy odpowiedzi 400/404 powtarza żądanie przez starsze `models/{model}:generateContent`, bo nie wszystkie modele są wystawione pod oboma endpointami. Timeout 55 s (poniżej `maxDuration` trasy). **Liczniki tokenów** czyta `readUsage`: sprawdza pełne listy aliasów po obu stronach (`input_tokens`/`promptTokenCount`/`prompt_token_count`…), dolicza tokeny „myślenia” do wyjścia (tak są rozliczane), sumuje zużycie rozbite na kroki i wylicza brakującą stronę z sumy. Gdy nie rozpozna nic, loguje kształt obiektu `usage` – wtedy dopisz alias, a nie zostawiaj wpisu jako szacowanego. Klucz z `GOOGLE_AI_API_KEY`, sprawdzany przez `hasGoogleAiKey()`
- **image-source.ts** – `resolveOwnImageSource(url, origin)` + `fetchOwnImage(source)`: wspólna blokada SSRF i limit 15 MB dla tras admina pobierających zdjęcie po URL-u (`/api/admin/rotate`, `/api/admin/ai-image`, `/api/admin/ai-text`). Dopuszcza tylko ścieżki z `public/` i obiekty z naszego Supabase Storage
- **seo.ts** – `pageMetadata({ title, description, path, ogTitle?, image?, noIndex? })`: komplet metadanych strony (opis, canonical, Open Graph, karta Twitter) + stałe `SITE_URL`, `SITE_NAME`, `OG_IMAGE`. **Używaj go zamiast ręcznego bloku `openGraph`** – w Next.js `openGraph`/`twitter` ze strony zastępuje ten z layoutu w całości, więc `siteName`/`locale`/`type` trzeba powtarzać przy każdej stronie. Domyślny obrazek to `/images/OpenGraph.jpg` – **JPEG, nie WebP**, bo WhatsApp nie renderuje WebP w podglądach linków (ten sam powód co przy `/api/og/[slug]`). Dodatkowo `absoluteUrl(url)` (ścieżka względna → pełny adres; dane strukturalne i podglądy linków wymagają absolutnych, a starsze zdjęcia produktów siedzą w `public/` jako `/images/...`) i `metaDescription(text, max = 160)` (przycięcie opisu na granicy słowa – opis produktu z panelu bywa kilkusetznakowy)
- **sanitize-html.ts** – `sanitizeRichHtml()` z allowlistą tagów/atrybutów. Strony renderujące tę treść (`/regulamin`, `/polityka-prywatnosci`, `/o-mnie`, `/moje-projekty`) stylują ją klasami `[&_tag]` – **pamiętaj o `[&_ol]`**: przez jego brak listy numerowane w regulaminie renderowały się bez numerów i bez wcięcia (Tailwind zeruje `list-style`)
- **visitor-country.ts** – `isForeignVisitor()`: czyta nagłówek `x-vercel-ip-country` (dokłada go Vercel). **Wyłącznie podpowiedź, nigdy podstawa decyzji** – VPN, wakacje albo Polak mieszkający za granicą dają fałszywy odczyt w obie strony, a poza Vercelem nagłówka w ogóle nie ma. Wolno na tej podstawie **zaproponować** (drugie zdanie po angielsku o wysyłce zagranicznej), nigdy ustalać ceny, blokować zamówienia ani ukrywać metod dostawy; o kraju dostawy rozstrzyga adres z zamówienia. Odczyt nagłówków wyklucza cache, więc wołaj tylko ze stron dynamicznych
- **address-validation.ts** – wspólna walidacja adresu (klient + serwer). **Wymusza polski format**: kod pocztowy `XX-XXX`, miasto z polskich liter, telefon 9 cyfr z opcjonalnym `+48`. Zagraniczny adres nie przejdzie – to świadome ograniczenie (patrz `ForeignShippingNote`); `Order.country` istnieje w bazie z domyślnym `"PL"`, ale `/api/checkout` wpisuje tam `"PL"` na sztywno. Obsługa stref wysyłki wymagałaby pola „Kraj” w formularzu i walidacji zależnej od kraju
- **cart-sync.ts** – czysta logika koszyka (bez Reacta i bez bazy), pokryta testami w `tests/cart-sync.test.ts`:
- **email-change.ts** – zmiana adresu e-mail, czyste funkcje (bez bazy i poczty): `normalizeEmail`, `isValidEmail`, `checkNewEmail(input, currentEmail)`, `createToken()` (32 bajty z `node:crypto`), `hashToken` (SHA-256), `tokenMatches` (porównanie odporne na pomiar czasu), `isExpired`, `expiryFrom`, `EMAIL_CHANGE_TTL_MS` (1 h). W bazie leży **wyłącznie hash** tokenu – wyciek bazy nie daje gotowych linków do przejęcia kont. Pokryte testami w `tests/email-change.test.ts`
  - `syncCartWithServer(items, updates)` – wyrównuje koszyk do stanu z serwera i zwraca **co dokładnie się stało**: `soldOut` (nazwy pozycji, które wypadły), `reduced` (przycięte ilości), `priceChanged`. Wyprzedany produkt **znika z koszyka i zostaje nazwany w komunikacie** – po cichu zmieniona suma byłaby dla klienta niezrozumiała.
  - `mergeCarts(local, saved)` – scalanie po zalogowaniu. Ilości to **większa z dwóch, nie suma**: ten sam koszyk bywa zapisany po obu stronach, a sumowanie podwajałoby go przy każdym kolejnym logowaniu. Dane pozycji biorą się z koszyka lokalnego (jest świeższy), ilość jest przycinana do znanego stanu.
  - `soldOutMessage` / `reducedMessage` – treści komunikatów.
- **cart.tsx** – koszyk jako **store modułowy** (`useSyncExternalStore` + localStorage); hook `useCart()`, bez providera. `CartItem.price` to cena **po** rabacie produktowym (tę kwotę liczy `/api/checkout`), a opcjonalne `CartItem.basePrice` – cena podstawowa sprzed rabatu, wyłącznie do pokazania upustu w koszyku. Starsze wpisy w localStorage nie mają `basePrice` i po prostu pokazują mniejszy rabat.
  - **`useCartPriceSync()`** – wyrównuje koszyk do stanu z serwera (`POST /api/cart/prices`) raz po wejściu na `/koszyk` i `/zamowienie`. Zwraca `{ priceChanged, availabilityChanged }`. Bez tego klient oglądał cenę zamrożoną w chwili dodania produktu, a po wygaśnięciu przeceny płacił inną kwotę, niż widział. Ochrona `holdMs` z `product-price.ts` kończy się na kliknięciu „Dodaj do koszyka” – **to jest jej przedłużenie**. Błąd sieci celowo przechodzi bez śladu (kwoty i tak weryfikuje `/api/checkout`)
  - ⚠️ **`availabilityChanged` na `/zamowienie` cofa klienta do `/koszyk`.** Zmiana zawartości koszyka (wyprzedany produkt, przycięta ilość) musi zostać zobaczona i potwierdzona świadomie – zostawienie klienta na formularzu kończyło się tym, że klikał jeszcze raz i składał zamówienie **bez brakującego produktu**, nie zauważywszy braku. To samo dzieje się po odpowiedzi 409 `outOfStock` z `/api/checkout`. Komunikat niesie dymek ze store'u, więc przeżywa nawigację
  - **`useCartAccountSync(status, userId)`** – trzyma koszyk w zgodzie z kontem: po **zalogowaniu** scala koszyk z urządzenia z zapisanym na koncie i odsyła wynik na serwer, przy każdej zmianie zapisuje (debounce 600 ms), a po **wylogowaniu** czyści koszyk na urządzeniu. Wylogowanie rozpoznajemy po **przejściu** `authenticated → unauthenticated` – sam stan `unauthenticated` nie wystarcza, bo gość nigdy nie był zalogowany, a jego koszyk musi przetrwać (sklep dopuszcza zakupy bez konta). Wołane z `Providers` (wymaga bycia wewnątrz `SessionProvider`)
  - **`refreshCartFromServer(ids)`** – ręczne wyrównanie koszyka; używa go `CheckoutForm` po odpowiedzi 409 `outOfStock`
  - **Powiadomienia**: `pushCartNotice`, `useCartNotices`, `dismissCartNotice` – osobny store modułowy. Koszyk bywa zmieniany **za plecami klienta** (ktoś inny kupił ostatnią sztukę, wygasła przecena), więc taka zmiana musi zostać nazwana niezależnie od tego, na której stronie klient jest. Wyświetla je `CartToasts` z layoutu; ten sam tekst nie powiela się przy kilku synchronizacjach
  - `syncPrices(updates)` z `useCart()` robi to samo ręcznie – używa jej `CheckoutForm` po odpowiedzi 409
- **cookie-consent.tsx** – zgoda na cookies jako store modułowy; hook `useCookieConsent()`, bez providera

## Komponenty (`components/`)

### `components/layout/`
- **Header.tsx** – responsywna nawigacja, ikona koszyka, menu mobilne. Napis „Unique Ceramics / Ręcznie tworzone z sercem” obok logo jest **czystą bielą (`text-white`) w obu stanach headera, bez przezroczystości i bez zmiany koloru na hoverze** – ma się zgadzać z logo (`brightness-0 invert`). Wcześniej nad jasnymi sekcjami szedł `text-cream`, co obok białego logo czytało się jako kawowy odcień, a `/70` na podtytule dawało wrażenie szarej obwódki; **nie przywracaj tam `text-cream`**; gdy `menuOpen` header zawsze przyjmuje `bg-espresso` (niezależnie od sekcji hero).
  - **Przezroczystość na stronie głównej:** header jest przezroczysty, gdy w viewporcie widać (≥30% wysokości) sekcję oznaczoną `data-header-theme="transparent"`. Oznaczone są wszystkie ciemne sekcje `/` – Hero, „O mnie", Warsztaty i sekcja stopki; jedyną jasną sekcją jest „Wybrane prace" i tylko nad nią header jest `bg-espresso`.
  - **Auto-chowanie na mobile (podstrony):** poniżej `lg` przewijanie w dół chowa header (`translateY(-100%)`), w górę wyłania; próg 8 px wygasza drgania, chowanie dopiero poniżej 120 px scrolla, otwarte menu mobilne blokuje chowanie. Strona główna jest wyłączona (ma scroll-snap i zanikanie w stopce).
  - **`--header-offset`** – zmienna CSS ustawiana przez Header na `<html>`: pozycja, w której mają się przyklejać elementy pod headerem (baner urlopowy + header, albo sam baner gdy header schowany). Używa jej pasek kategorii w `/sklep`, dzięki czemu przy schowanym headerze podjeżdża pod górę i zostaje jedynym stałym elementem. Nowe elementy `sticky` pod headerem podpinaj pod tę zmienną, nie pod sztywne `top-20`.
  - **Motyw: obserwator budzi pomiar, pomiar liczy się z żywych rect-ów.** Dwie wersje wcześniej były po jednej stronie i każda miała dziurę. Sam pomiar przy `scroll`/`resize` był migawką, więc jedna nietrafiona zostawała **na stałe** (nic go już nie ponawiało, gdy układ zmieniał się bez przewijania). Same wartości z `entry` obserwatora są z kolei migawką z chwili, w której przeglądarka policzyła przecięcie – bywa starsza niż bieżąca pozycja strony (programowy powrót na górę, przywracanie pozycji po odświeżeniu), a stan składał się z osobnych wpisów per sekcja. Teraz `IntersectionObserver` (progi `IO_THRESHOLDS` zagęszczone wokół `VISIBLE_RATIO` = 0,3) razem ze `scroll`/`resize`/`orientationchange`/`pageshow`/`load` tylko **wyzwala** `schedule()`, a ten w jednej klatce liczy `getBoundingClientRect()` **wszystkich** ciemnych sekcji naraz i dopiero z tego ustawia stan. Objaw sprzed poprawki: ciemny header nad widocznym hero (28.08.2026). **Nie wracaj do trzymania stanu w wartościach z `entry`** ani do samego pomiaru przy zdarzeniach – potrzebne są obie strony. Pomiar, w którym **żadna** sekcja nie ma wysokości, celowo **nie zmienia stanu** (zostaje przezroczysty, z którego strona główna startuje), a brak sekcji w DOM tylko ponawia próbę obserwacji (~1,5 s).
  - **Logo przewija płynnie tylko wtedy, gdy już jesteśmy na `/`.** Przy wejściu z innej strony `scrollTo({ behavior: "smooth" })` trwał dłużej niż nawigacja i biegł dalej w nowym dokumencie, walcząc z ustawieniem pozycji na zero przez `HomeScrollSnap` – strona lądowała w losowym miejscu, a header zostawał ciemny. **Nie animuj przewijania razem z nawigacją.**
- **FooterContent.tsx** – **jedno źródło prawdy dla treści stopki** (synchroniczny): grid [IG panel | nawigacja | kontakt | mapa] + belka praw autorskich z wordmarkiem. Używany przez `Footer` i `FooterWithInstagram`, które różnią się już tylko ramką – nie duplikuj tu układu
- **Footer.tsx** – synchroniczny (ważne!), cienka ramka wokół `FooterContent`; wszystkie strony poza główną. Wariant `compact` został usunięty (nieużywany)
- **FooterWithInstagram.tsx** – ta sama treść w sekcji scroll-snap o pełnej wysokości (strona główna)
- **FooterInstagramPanel.tsx** – `"use client"`, animowany panel Instagram; `instagram` jest opcjonalny – bez propsa handle dociągany jest z `/api/public/contacts` (dzięki temu stopka podstron zostaje synchroniczna). Pod przyciskiem Instagrama stoi **przycisk Facebooka w tej samej konwencji** (ta sama ramka, wersaliki i `tracking-widest`): gdy `contact_facebook` jest wypełnione – link do profilu ze strzałką na hoverze, a dopóki jest puste – ta sama ramka przygaszona (`border-sand/20`, `text-sand/60`), nieklikalna, z dopiskiem „wkrótce” (profil dopiero powstanie, a link donikąd byłby gorszy niż zapowiedź). Wpisanie adresu w panelu zamienia go w link samo
- **FooterContactsClient.tsx** – `"use client"`, kolumna „Kontakt": telefon, e-mail, Instagram, Facebook/YouTube/WhatsApp (widoczne tylko gdy wypełnione). Dane bierze z `useContacts()`
- **FooterAddressClient.tsx** – `"use client"`, adres pracowni i godziny otwarcia w kolumnie **„Gdzie mnie znajdziesz"** (nad mapą), bez osobnych nagłówków; puste dane = brak bloku
- **FooterMap.tsx** – `"use client"`, mapa Google w iframe – ładowana dopiero po zgodzie cookies
- **CookieBanner.tsx** – `"use client"`, baner zgody na cookies; na mobile: skrócony tekst, mniejsze pady i czcionka, układ poziomy (wiersz)
- **ThasharWordmark.tsx** + **ThasharWordmark.module.css** – wordmark „Created by THASHAR.DEV" w belce praw autorskich obu stopek (link do https://thashar.dev). Serwerowy (animacja czysto CSS-owa, bez JS): błysk na hoverze to diagonalna smuga przycięta CSS-ową maską do kształtu liter (`mask: url(/images/thashar-wordmark.webp)`) + `drop-shadow`. Kolory dopasowane do palety: filtr `saturate(.58) hue-rotate(218.5deg) brightness(1.21)` zamienia tealowy `.DEV` (#4F9EA5 w pliku) na terracottę #C4A883, białe litery zostają białe; wartości filtra są dostrojone pod konkretny odcień teala w pliku – po podmianie grafiki trzeba je przeliczyć, żeby kolor `.DEV` w stopce się nie ruszył; smuga = rdzeń cream + otoczka terracotta. Szerokość przez prop `width` (zmienna `--thb-width`, default 77 px); `FooterContent` podaje `clamp(56px,16vw,90px)`, więc na desktopie wordmark ma pełne 90 px, a na wąskich ekranach schodzi do 56 px. **Układ belki:** na mobile wordmark idzie do własnego wiersza (`basis-full`), na desktopie jest przyklejony do prawej krawędzi stopki (`lg:absolute lg:right-0`), żeby nie zbijać wyśrodkowania praw autorskich. Belka jest `flex-wrap` z mniejszym tekstem na mobile – bez tego treść nie mieściła się na ekranach ≤390 px i rozpychała stronę w poziomie. Respektuje `prefers-reduced-motion`. Źródło grafiki: `public/images/thashar-wordmark.webp` (1024×290)
- **Providers.tsx** – `SessionProvider` + `CookieBanner` + **`CartToasts`** (dymki koszyka muszą być widoczne z każdej strony) + `CartAccountSync` (wywołuje `useCartAccountSync`; osobny komponent, bo `useSession` musi być **wewnątrz** `SessionProvider`). Koszyk i zgoda na cookies to store'y modułowe – same w sobie providerów nie potrzebują

### `components/home/`
- **Hero.tsx**, **AboutTeaser.tsx**, **WorkshopsTeaser.tsx** – trzy pełnoekranowe sekcje o tym samym układzie (napis nad nagłówkiem, nagłówek, opis, przycisk). **Cały tekst przychodzi propsami z ustawień** (`home_hero_*` / `home_about_*` / `home_workshops_*` – patrz `lib/home-sections.ts`); pusty props **ukrywa** element, a nowe wiersze w nagłówku i opisie łamią tekst przez `whitespace-pre-line`. Hero ma dodatkowo drugi przycisk i napis przy strzałce na dole. Domyślne wartości propsów są tylko awaryjne – treść ustawia panel
- **FeaturedProducts.tsx**
- **HomeScrollSnap.tsx** – `"use client"`, scroll-snap sekcji strony głównej; sekcje materializowane raz przy mount (brak DOM query w handlerach zdarzeń). Sekcja z `data-snap-free` (stopka) jest **poniżej breakpointu lg przewijana swobodnie** niezależnie od wysokości – przyciąganie działa tylko na jej krawędziach, więc zjazd w głąb stopki nie odbija do jej początku; `resize` nie wyrywa użytkownika ze swobodnej sekcji
- **ProductCarousel.tsx** – `"use client"`, mobilna karuzela wybranych prac; przewijanie **stronami po 2 karty** (nie po jednej) – swipe i kropki zmieniają stronę, kropek jest `ceil(liczba/2)`. Przy nieparzystej liczbie produktów ostatnia strona równa się do prawej krawędzi (pokazuje pełne 2 karty). Wyrównuje przesunięcie po `resize`/`orientationchange`
- **InstagramCta.tsx** – przyjmuje prop `instagram` (nieużywany na stronie głównej od scalenia ze stopką)

### `app/sklep/` (server components)
- **ProductGrid.tsx** – `"use client"`, siatka produktów; przyjmuje `products` jako prop (data fetchowana w page.tsx). Przełącznik layoutu (standardowy: 2/3/4 kolumny, kompaktowy: 3/4/5 kolumn) z ikonami `LayoutGrid`/`Grid3X3` oraz wybór liczby produktów na stronę (30/50/100, domyślnie 30; przełącznik pojawia się dopiero gdy produktów jest więcej niż 30, pod siatką rysuje się numeracja stron). Obie preferencje w localStorage (`sklep-layout`, `sklep-na-stronie`) czytane przez `useSyncExternalStore` – **nie `setState` w efekcie**. Bez zapisanej preferencji layout wybiera media query: na telefonie (`max-width: 767px`) startuje **kompaktowy**, czyli 3 produkty w wierszu. Numer strony jest klamrowany przy renderze (`Math.min`), a nie korygowany efektem. Obok przełącznika layoutu stoi `AiImageBadge` (`align="right"` – dymek wyrasta w lewo, bo znaczek jest przy prawej krawędzi); widoczny, gdy **którykolwiek** produkt z listy ma zdjęcie z modelu – na samych kafelkach znaczka nadal nie ma
- **`app/warsztaty/WorkshopIncludes.tsx`** – `"use client"`, lista „Co zawiera warsztat?" sprzężona z pokazem zdjęć: przy zmianie zdjęcia podświetla się odpowiadająca pozycja (waga tekstu + tło ikony, `transition-colors duration-500`). Numer zawija się modulo liczby pozycji, więc przy innej liczbie zdjęć niż punktów podświetlenie się cyklicznie powtarza – najlepiej mieć tyle zdjęć, ile pozycji. Pod galerią stoi `AiImageBadge` z własnym opisem („Zdjęcia w tej sekcji zostały wygenerowane przy wsparciu AI.”) – zdjęcia warsztatów powstały z modelu, więc znaczek jest **bezwarunkowy**, nie zależy od sufiksu `-ai.webp`
- **`app/sklep/[slug]/ProductGallery.tsx`** – `"use client"`, galeria na karcie produktu. Kadr **4/3** (`aspect-[4/3]`) z `object-contain` na tle `cream` – na karcie produktu ma być widoczne **całe zdjęcie**, nie wycinek. Kadr był przejściowo zmieniony na 16/9 pod zdjęcia Full HD i **wrócił do 4/3 decyzją właściciela (20.08.2026)** – nie zmieniaj go z powrotem bez ustaleń. Materiał w innych proporcjach (np. Full HD 16:9 albo pionowy) dostaje pasy tła zamiast obcięcia. Miniatury też są `object-contain`, żeby zgadzały się z kadrem. Taśma wszystkich zdjęć (`translate3d` po indeksie) – **bez klonów i bez auto-przewijania**, więc nie ma pułapek z `transitionend` jak w `components/ui/ImageGallery`. Sterowanie: przesunięcie palcem (`touchAction: "pan-y"`, kierunek gestu ustalany raz – pionowy scroll strony ma pierwszeństwo; próg `max(40 px, 15 % szerokości)`, na krańcach opór zamiast zapętlenia), strzałki `ChevronLeft/Right` widoczne od `md:` (na krańcach znikają przez `disabled:opacity-0`) i strzałki klawiatury po sfokusowaniu kadru. **Podgląd (`ImageLightbox`) otwiera wyłącznie przycisk z ikoną `Expand` w prawym górnym rogu kadru** – kliknięcie w samo zdjęcie go **nie** otwiera (decyzja właściciela 28.08.2026), żeby nie kolidowało z przesuwaniem taśmy. **Lupa przesuwana po kadrze została usunięta (28.08.2026, decyzja właściciela)** – zastąpił ją lightbox; nie wracaj do niej bez ustaleń. Kadr blokuje natywne menu przeglądarki (`onContextMenu` + `WebkitTouchCallout: none` + `select-none`) – bez tego przytrzymanie na Androidzie otwiera „Otwórz grafikę w nowej karcie…” i przerywa gest. W prawym dolnym rogu kadru jest licznik „n / N” (tylko na dotyku – na desktopie widać miniatury). Miniatury pod spodem w tym samym kadrze 4/3 co duże zdjęcie: na telefonie w rzędzie mieszczą się dokładnie **trzy** (szerokość liczona z odstępu `gap-3`, więc odstępy zostają równe), od `md` wracają do stałych `w-28` (`overflow-x-auto` – przy 30 zdjęciach rząd nie może rozpychać strony). Systemowy scrollbar jest schowany (`.no-scrollbar` z `globals.css`), a pod miniaturami stoi **własny wskaźnik przewijania**: zapala się od razu przy ruchu taśmy i gaśnie ~0,7 s po jego ustaniu (przesunięcie i szerokość bez animacji – jadą z palcem; animowana jest sama przezroczystość). Ten sam mechanizm działa na dotyku i na myszy, bo wisi na zdarzeniu `scroll`, a pod nimi – dla zdjęcia z AI – `AiImageBadge`
- **`app/sklep/[slug]/ImageLightbox.tsx`** – `"use client"`, **podgląd zdjęcia w osobnym oknie** (lightbox) otwierany przyciskiem `Expand` w galerii produktu. Renderowany **portalem do `body`** (`position: fixed` liczy się względem przodka z `transform`/`filter` – ten sam powód co przy `CartToasts`), z blokadą przewijania strony pod spodem. Powiększenie **1–4×** działa tak samo na myszy i na dotyku: kółko myszy (listener dopięty ręcznie z `passive: false`, bo React podpina `wheel` pasywnie), szczypanie dwoma palcami, przyciski +/− z podglądem procentu, podwójne kliknięcie albo stuknięcie (`QUICK_ZOOM` 2,5×) oraz klawisze `+`/`−`. Zoom trzyma pod kursorem (albo pod środkiem szczypania) ten sam punkt zdjęcia; przy powiększeniu zdjęcie przesuwa się przeciąganiem, a `clampView` nie pozwala wyprowadzić go poza obszar. Bez powiększenia poziomy gest, strzałki i klawisze ←/→ zmieniają zdjęcie (zmiana **zeruje** widok), a stuknięcie w tło i Escape zamykają podgląd. Powiększenie i przesunięcie siedzą w **jednym stanie** (`View`) aktualizowanym funkcyjnie – inaczej szczypanie czytałoby nieaktualną skalę. Gesty obsługujemy sami (`touchAction: "none"`) przez zdarzenia **pointer**, więc jedna ścieżka kodu obsługuje palec i kursor. Źródłem jest **oryginalny plik**, nie wariant `next/image` – tylko on ma dość pikseli na 4× (do czasu wczytania widać `Loader2`)
- **ProductGridSkeleton.tsx** – placeholder `animate-pulse` dla `<Suspense fallback>` w `/sklep`
- **`app/sklep/CustomOrderTile.tsx`** – zaproszenie do zamówień indywidualnych na końcu siatki produktów. **Zajmuje cały wiersz (`col-span-full`), a nie jedno pole siatki** – dwie wcześniejsze wersje udawały kartę produktu i obie wyszły źle: w katalogu na telefonie kafelki mają około 110 px szerokości, więc tekst łamał się co dwa słowa, a wśród zdjęć sam blok tekstu odstawał od reszty. Zamiast akapitu są **trzy hasła z ikonami** (własny projekt, sztuka lub komplet, wysyłka za granicę), na tle `espresso` jak stopka. Układ zmienia się raz, na **`md` (768 px)**: niżej kolumna z przyciskiem na pełną szerokość, wyżej rząd ikona–tekst–przycisk; świadomie nie na `sm`, bo przy 640–767 px rząd robił się ciasny. Stoi na końcu **każdej strony** katalogu i każdej kategorii (także przy stronicowaniu), a przy pustej kategorii pokazuje się pod komunikatem „Brak produktów”. **Zastąpił pływający przycisk `FloatingOrderButton`** (usunięty 28.08.2026 – zasłaniał produkty i dało się go schować na stałe); nie przywracaj go

### `components/ui/`
- **ProductCard.tsx** – karta produktu (next/image + framer-motion); kategorię wyświetla z propa `categoryLabel` (bez niego pokazałaby slug bez polskich znaków) – etykietę podaje `ProductGrid` i karuzele strony głównej; **bez** oznaczenia AI na samym kafelku – na kafelkach listy go nie pokazujemy (decyzja właściciela 22.08.2026); dla całej listy stoi jeden znaczek w pasku narzędzi `ProductGrid`, poza tym w galerii na karcie produktu; przyjmuje opcjonalny prop `compact?: boolean` – zmniejsza czcionkę tytułu (`text-lg`→`text-sm`), cenę, kategorię, marginesy i badge'y w widoku kompaktowym
- **AiImageBadge.tsx** – `"use client"`, oznaczenie „✦ AI ⓘ” **pod galerią na karcie produktu** (gdy `isAiGeneratedImage` rozpozna **którekolwiek** zdjęcie produktu – podpis nie miga przy przełączaniu zdjęć) – poza kadrem, między miniaturami a kategorią produktu na wąskim ekranie. Jest **dyskretnym podpisem bez własnego tła** – ikony `text-clay`, tekst `text-charcoal/80`, wersaliki z `tracking-wider`, czyli ta sama konwencja co drobne informacje pod przyciskiem koszyka (oba kolory powyżej progu AA na jasnym tle). Dymek wyrasta w prawo (`left-0`), bo znaczek stoi przy lewej krawędzi kolumny. Propsy: `align` (`left` domyślnie, `right` przy prawej krawędzi – pasek narzędzi `/sklep`) i `notice` (własna treść dymka; domyślnie `AI_IMAGE_NOTICE` o zdjęciach produktów – z tego korzysta sekcja „Co zawiera warsztat?”). Rozmiary `size`: `lg` (galeria produktu, pasek narzędzi katalogu, sekcja „Wybrane prace” na stronie głównej – po lewej od odnośnika „Cały sklep”, sekcja warsztatów), `md` i `sm` zostają do ewentualnych mniejszych kadrów. Treść mówi o **zdjęciach w liczbie mnogiej**, bo znaczek opisuje całą galerię, listę albo sekcję, a nie pojedynczy kadr – ikony skalowane klasami, nie propem `size` lucide'a, żeby dało się je zmieniać responsywnie. Dymek z treścią `AI_IMAGE_NOTICE` pokazuje się po najechaniu kursorem i po kliknięciu na dotyku, zamyka go klik poza znaczkiem lub Escape. **Treść musi zgadzać się z regulaminem** (punkty I.5 i I.6): model zmienia wyłącznie tło, scenerię, oświetlenie i kadr, sam produkt zostaje nienaruszony, a rekwizyty ze zdjęcia nie wchodzą w skład zamówienia. Zmieniając jedno, popraw drugie. Idzie **portalem do `body`** z `position: fixed` i `z-[60]` – w katalogu znaczek leży pod przyklejonym paskiem kategorii (`z-30`) i headerem (`z-50`), a te są w osobnych warstwach, więc żaden `z-index` wewnątrz listy nie wyniósłby go nad nie. Pozycję liczy `measure()` od prostokąta znaczka (przeliczana przy przewijaniu i zmianie rozmiaru okna): dymek trzyma się krawędzi okna, a przy górnej rozwija się w dół zamiast w górę. Całość jest przyciskiem, a `onClick`/`onPointerDown` zatrzymują zdarzenie – znaczek bywa w kadrze z gestami albo wewnątrz linku, więc bez tego kliknięcie robiłoby coś innego niż pokazanie wyjaśnienia
- **ProductPriceTag.tsx** – cena produktu: **zwykła cena po ewentualnej przecenie**. Przeceniony produkt pokazuje cenę przekreśloną, cenę po rabacie i procent z `shownDiscountPercent` **we wszystkich rozmiarach** – na karcie produktu (`size="lg"`) pełną czcionką, w katalogu (`sm`/`md`) mniejszą. W katalogu pod ceną stoją zielone dopiski o trwających promocjach: `quantityTeaser` („Kup 3 szt. i zyskaj −10%”) i `freeShippingNote`. Na karcie produktu (`size="lg"`) zostaje **sama cena** – tam te informacje pokazuje `QuantityPromoNotes`. Rabatu ilościowego **nie wliczamy do pokazanej ceny** – zależy od zawartości koszyka, więc kwoty pojawiają się dopiero w koszyku
- **QuantityPromoNotes.tsx** – `"use client"`, zielone wiersze w bloku pod przyciskiem koszyka na karcie produktu: „Darmowa wysyłka” (`Truck`, z progiem jeśli ustawiony) i zachęta do rabatu ilościowego (`BadgePercent`). Przy **pustym** koszyku pokazuje najniższy próg promocji, przy **niepustym** liczy przez `priceOrder`, ile realnie brakuje do kolejnego progu („Dodaj jeszcze 2 sztuki, by zyskać −10%”). Bez żadnej promocji nie renderuje nic
- **InstagramIcon.tsx** – SVG ikona Instagram
- **DishwasherIcon.tsx** – SVG ikona „można myć w zmywarce": **obudowa zmywarki z panelem sterowania i kroplą wody w komorze**. Lucide **nie ma zmywarki** (sprawdzone – najbliższe to `Bubbles`, `Droplets`, `Utensils`, `SoapDispenserDroplet`), więc rysunek jest własny i trzyma się konwencji lucide (viewBox 24, `currentColor`, kreska 1,5, zaokrąglone końce), żeby stał równo obok `Truck` i `Clock`. Na karcie produktu w rozmiarze 18 px pod opisem (blok wysyłki obok używa 14 px), w `text-clay` jak sąsiednie ikony. Propsy: `size` (default 20), `strokeWidth`, `className`. **Wersje z talerzami i kroplami (24.08.2026) zostały wycofane decyzją właściciela** – nie wracaj do nich bez ustaleń
- **CartToasts.tsx** – `"use client"`, dymki z komunikatami koszyka (wyprzedany produkt, zmniejszona ilość). Renderowane z layoutu przez `Providers`, **portalem do `body`** – `position: fixed` liczy się względem najbliższego przodka z `transform`/`filter`, więc wewnątrz animowanych sekcji dymek lądowałby w losowym miejscu (ten sam powód co przy `Toast` w panelu). Znikają same po 9 s, można je zamknąć. Stan „już w przeglądarce” czytamy przez `useSyncExternalStore`, nie `setState` w efekcie
- **ImageGallery.tsx** – `"use client"`, pokaz zdjęć przy opisie (/o-mnie, /warsztaty). Przy jednym zdjęciu renderuje zwykły `next/image` (bez sterowania), przy wielu – zapętloną karuzelę przewijaną w lewo co 5 s. Taśma ma **klony skrajnych slajdów** po obu stronach, więc zapętlenie nie „przewija się wstecz"; skok z klonu na realne zdjęcie wyłącza `transition` i przywraca je dopiero po dwóch `requestAnimationFrame` (inaczej powrót byłby animowany przez całą taśmę). **Korekty indeksu nie wieszaj na samym `transitionend`** – to zdarzenie potrafi nie przyjść (przerwana animacja, karta w tle) i taśma jedzie wtedy w puste kadry; commit robi funkcja `finish()` wywoływana zarówno przez `transitionend`, jak i przez zegar awaryjny (`TRANSITION_MS + 60`), a `safeIndex` klamruje pozycję do zakresu taśmy jako ostatnia linia obrony. Sterowanie: kliknięcie/tap = następne, swipe palcem z podglądem przesunięcia (`touchAction: "pan-y"`, kierunek gestu ustalany raz – pionowy scroll strony ma pierwszeństwo; próg to `max(40 px, 15 % szerokości)`), strzałki na hoverze (`md:`), kropki, strzałki klawiatury. Auto-przewijanie pauzuje przy hoverze, dotyku, focusie, poza viewportem (`IntersectionObserver`) i przy `prefers-reduced-motion` (czytane przez `useSyncExternalStore`, nie `setState` w efekcie). Opcjonalny `onIndexChange(i)` daje znać, które zdjęcie jest na wierzchu – wołany z `applyIndex`, czyli w chwili **startu** przejścia (nie z efektu), żeby rodzic mógł animować równolegle z taśmą; korzysta z tego `WorkshopIncludes`. Proporcje i szerokość podaje strona przez `className` – obie strony używają **kadru poziomego** `aspect-[4/3] rounded-sm w-full max-w-xl mx-auto` (limit szerokości pilnuje, żeby galeria nie rozpychała kolumny; zmieniając go, popraw też `sizes`)

### `components/seo/`
- **LocalBusinessSchema.tsx** – async server component z danymi strukturalnymi JSON-LD (LocalBusiness + WebSite), renderowany w `app/layout.tsx`. Adres, telefon, e-mail, `sameAs` i `openingHoursSpecification` pochodzą z `getContactSettings()`, więc nie rozjeżdżają się z treścią stopki i /kontakt. **Nie wstawiaj JSON-LD z powrotem do `app/layout.tsx`** – layout ma zostać synchroniczny. Zawiera też `founder` wskazujący na `Person` z `/o-mnie#person`
- **BreadcrumbSchema.tsx** – okruszki (BreadcrumbList) jako synchroniczny komponent: przyjmuje kolejne poziomy po stronie głównej (`[{ name, path }]`), „Stronę główną” dokłada sam. Wstawiony na `/sklep`, `/sklep/[slug]`, `/o-mnie`, `/warsztaty`, `/kontakt`, `/moje-projekty` i `/zamowienie-indywidualne` – nową stronę publiczną dopisuj tym komponentem, nie ręcznym JSON-LD

### `components/ui/` – ozdobniki
- **ClayRule.tsx** – ozdobnik otwierający blok treści: mozaika kafelków szkliwa (2×5, 10 px, terracotta/clay/sand z różnym kryciem) osadzona w cienkiej kresce. Synchroniczny, bezstanowy, `aria-hidden`. Dwa warianty: `align="left"` (domyślny – otwiera blok tekstu) i `align="center"` (mozaika pośrodku, do sekcji z wyśrodkowanym nagłówkiem; **ogranicz szerokość przez `className`**, np. `max-w-[220px] mx-auto`, inaczej kreski ciągną się przez całą sekcję). Rozstawiony na wszystkich stronach treściowych, żeby nie odstawały od `/warsztaty`: wprowadzenie i sekcje „Co zawiera warsztat?"/FAQ (`/warsztaty`), blok treści i „Jak pracuję" (`/o-mnie`), obie kolumny `/kontakt`, lista `/moje-projekty`, treść `/regulamin` i `/polityka-prywatnosci`, nagłówek `/koszyk` (oba stany – z produktami i pusty) oraz nagłówek `/zamowienie`. Pominięty w `/sklep` (nagłówek jest `sr-only`, pasek kategorii pełni rolę separatora)

### `components/checkout/`
- **ForeignShippingNote.tsx** – informacja o wysyłce poza Polskę: stawki, paczkomaty i progi darmowej wysyłki są policzone dla Polski, więc zamówienia zagraniczne przyjmujemy **przez wycenę indywidualną** (link do `/zamowienie-indywidualne`). Bez tego klient z zagranicy dochodził do wyboru dostawy, nie znajdował swojego kraju i wychodził. Prop `prominent` włącza wariant **dwujęzyczny** (PL + EN) – pokazujemy go, gdy adres IP wskazuje zagranicę. Komponent jest czysto prezentacyjny (bez `use client` i bez API serwera), więc działa i na serwerze, i w komponentach klienckich. Renderują go `CheckoutForm` (wariant zależny od IP – strona jest `force-dynamic`) i `CartView` (zawsze wariant krótki, bo `/koszyk` jest cachowany)
- **InPostWidget.tsx** – `"use client"`, widget wyboru paczkomatu InPost; gdy `INPOST_GEOWIDGET_TOKEN` ustawiony: mapa CDN geowidget.inpost.pl; bez tokenu: wyszukiwarka przez publiczne API `api-shipx-pl.easypack24.net`. Obsługiwane parametry API (zweryfikowane): `city=<Nazwa>` (wymaga dokładnej kapitalizacji – `capitalizeCity` normalizuje automatycznie, w tym polskie znaki i myślniki, np. „bielsko-biała" → „Bielsko-Biała"), `post_code=<XX-XXX>` (pełny kod pocztowy), `/points/<KOD>` (bezpośrednio po kodzie paczkomatu). Parametry `zip_code`, `name`, `street` są przez API ignorowane. Cache akumuluje wyniki ze wszystkich zapytań – po wyszukaniu miasta filtrowanie po dowolnym podciągu (fragment kodu, ulicy, adresu, kodu pocztowego) działa natychmiast bez kolejnych requestów. Puste odpowiedzi API nie nadpisują wyników z cache. Zwraca wybrany kod przez `onChange`. Podpowiedź nad polem mówi wprost, że zapytanie to **samo miasto albo sam kod pocztowy** (bez ulicy) – każde inne wraca puste, a klient nie ma jak tego zgadnąć.

### `components/admin/`
- **AdminNav.tsx** – sidebar + mobilny drawer. Przy pozycjach **Zamówienia** i **Zam. indywidualne** stoi **czerwony znaczek z liczbą nowych zamówień** (`Order.PENDING`, `CustomOrder.NEW`) – liczy je `getNewOrderCounts()` z `lib/admin-badges.ts`, wołane w `app/admin/layout.tsx` i podawane propsem. Typ liczników jest **powtórzony w komponencie zamiast importu**, bo moduł liczący ciągnie Prismę, a nawigacja jest kliencka. Liczniki odświeżają się przy każdym wejściu na stronę panelu (layout i tak jest dynamiczny, bo sprawdza sesję). Przy pozycji z licznikiem znika kropka aktywnej pozycji, żeby nie dublować znaczków. Lista `settingsItems` obsługuje dwa rodzaje pozycji: zakładki ustawień (`id` → `/admin/ustawienia?s={id}`) i pozycje z własnym adresem (`href`) – tak wchodzą **Kody rabatowe** pod „Promocje", bo mają osobne strony CRUD; taka pozycja świeci się od ścieżki, a nie od `?s=`, i trzyma listę ustawień rozwiniętą. Pozycja „Ustawienia" to **przycisk rozwijający listę sekcji**, a nie link – kliknięcie nie przenosi na żadną zakładkę (stan `settingsManualOpen`: `null` = otwarte, gdy jesteśmy na którejś z zakładek ustawień). **Nie zamyka** też drawera na telefonie (zamknięcie chowałoby dopiero co rozwiniętą listę) – panel zamykają dopiero pozycje z listy; podlista renderuje się bezpośrednio pod pozycją, bez dodatkowego odstępu
- **BfcacheGuard.tsx** – `"use client"`, wykrywa przywrócenie strony z bfcache (`pageshow` + `event.persisted`) i wywołuje `router.refresh()` by middleware sprawdził sesję (używany w `app/admin/layout.tsx`)
- **ProductForm.tsx** – formularz produktu; pole **Rabat (%)** (0–`MAX_DISCOUNT_PERCENT`) z podglądem przeceny pod spodem, a przy rabacie > 0 blok **„Czas obowiązywania (czas polski)”**: „Start rabatu” (`datetime-local`, puste = od zapisania), „Czas trwania” (24 h / 2 / 3 / 7 / 14 / 30 dni / do wskazanej daty – wypełnia pole końca, licząc od startu albo od teraz) i „Do kiedy” (`datetime-local`, puste = bezterminowo). Pod polami zdanie o stanie rabatu (obowiązuje / włączy się / zakończył się) z datami w czasie polskim. Godziny idą do bazy jako **UTC** (`warsawLocalToDate` przy wysyłce), a wracają do pól przez `dateToWarsawLocal`; koniec wcześniejszy od startu blokuje zapis po obu stronach; prop `product` = edycja (PUT + przycisk usuwania), prop `initial` (`ProductDraft`, dane bez `id`) = wypełnione pola nowego produktu przy duplikowaniu – zapis idzie wtedy przez POST; zdjęcia wgrywa bezpośrednio przez `/api/admin/upload` (bez `ImageUploader`). Każdy kafelek ma **stale widoczne** przyciski: przesuń w lewo/prawo (zmiana kolejności – pierwsze zdjęcie jest główne, oznaczone plakietką „Główne") i usuń z potwierdzeniem `window.confirm`. Sterowanie jest pod miniaturą, a nie jako overlay na hoverze – na dotyku hover nie istnieje. Limit `PRODUCT_MAX_IMAGES` (30) egzekwowany przy uploadzie; po jego osiągnięciu kafelek „Dodaj" znika. Pod kafelkiem są też przyciski **AI** i **AI+** – po potwierdzeniu `window.confirm` wysyłają zdjęcie do `/api/admin/ai-image` i **dokładają wynik na koniec listy** (oryginał zostaje). W trakcie generowania wszystkie przyciski AI są zablokowane, a pod galerią widać komunikat o postępie; zapis do bazy następuje dopiero przy zapisaniu produktu. Kafelki układa siatka **3 kolumny na telefonie** (4 od `sm`, 5 od `md`) – bez stałej szerokości, żeby na wąskim ekranie mieściły się trzy w rzędzie. Mają kadr **4/3** z `object-contain` (jak galeria na karcie produktu – w edycji ma być widoczne całe zdjęcie), a stopka kafelka stałą wysokość, żeby kafelki z przyciskami i te z plakietką stały równo. Pod zdjęciami **wygenerowanymi przez AI** (`isAiGeneratedImage`) zamiast przycisków jest plakietka „Wygenerowane" – takich zdjęć nie puszczamy przez model po raz drugi. Pod polem opisu jest przycisk **„Uzupełnij przy użyciu AI"** – po potwierdzeniu wysyła **zdjęcie główne** (`images[0]`) do `/api/admin/ai-text` i nadpisuje nazwę, slug, kategorię i opis (puste pola z odpowiedzi zostawiają dotychczasową wartość). Bez zdjęć przycisk jest nieaktywny
- **DiscountCodeForm.tsx** – `"use client"`, formularz kodu rabatowego: kod, procent, blok „Czas obowiązywania (czas polski)" (start / czas trwania / do kiedy – ten sam wzorzec co w `ProductForm`), przełączniki „Łączy się z innymi rabatami" i „Kod aktywny"; POST albo PUT na `/api/admin/discount-codes`, usuwanie z potwierdzeniem
- **PromoWindowFields.tsx** – `"use client"`, wspólny selektor **okna obowiązywania** promocji (start, gotowe czasy trwania, koniec) plus `emptyWindow`/`windowFrom`/`parseWindow`. Daty wpisuje się w **czasie polskim**, na UTC przelicza je `parseWindow` dopiero przy zapisie. Używają go `QuantityPromoForm` i `FreeShippingPromoForm` (kody rabatowe mają własną, starszą kopię tego układu)
- **QuantityPromoForm.tsx** – `"use client"`, formularz rabatu ilościowego: progi (dodawanie/usuwanie), zabezpieczenia (`minItemPrice`, `maxDiscount`), przełączniki łączenia i **podgląd na żywo** „Co dostanie klient” – liczony **tą samą funkcją** (`applyQuantityDiscount`), której użyje sklep, więc właściciel nie musi zgadywać z progów
- **FreeShippingPromoForm.tsx** – `"use client"`, formularz darmowej wysyłki: nazwa, próg wartości koszyka (0 = bez progu), metody (kurier / paczkomat) i okno czasu
- **ImageUploader.tsx** – upload na Supabase Storage przez `/api/admin/upload`; pokazuje komunikat błędu (`uploadErrorMessage`) zamiast cicho ignorować niepowodzenie oraz informuje, gdy podgląd zapisanego zdjęcia się nie wczytuje
- **FocalPointPicker.tsx** – wybór punktu kadrowania zdjęć (`object-position`)
- **GalleryEditor.tsx** – `"use client"`, edytor galerii zdjęć przy opisie (zakładki „O mnie" i „Warsztaty" w /admin/ustawienia): wgrywanie wielu plików naraz przez `/api/admin/upload`, kadrowanie każdego zdjęcia (`FocalPointPicker`, proporcje 4/3 – ten sam kadr poziomy co na stronie), **obrót w lewo/prawo** przez `/api/admin/rotate` (trwały – podmienia URL na nowy plik; `rotatePosition` przelicza przy tym punkt kadrowania, bo obrót zamienia osie), zmiana kolejności strzałkami, usuwanie z potwierdzeniem, limit `GALLERY_MAX_IMAGES` (30). Zwraca JSON przez `onChange` (wzorzec jak `WorkshopsOffersEditor`)
- **RichEditor.tsx** – edytor HTML oparty o **Jodit z npm** (dynamiczny `import("jodit")` w useEffect – biblioteka tylko przeglądarkowa, nie może wykonać się przy SSR)
- **CategoryIntros.tsx** – `"use client"`, opisy stron kategorii pod listą w `/admin/kategorie`: pole na kategorię (limit 800 znaków), podpowiedź = tekst generowany z nazwy, zapis wszystkich naraz przez `/api/admin/settings` (klucze `category_intro_{slug}`, więc **bez zmian w bazie**; zapis odświeża strony przez `revalidatePath`)
- **CategoriesManager.tsx** – `"use client"`, CRUD kategorii: lista z edycją inline, zmiana kolejności strzałkami, dodawanie, usuwanie (blokada przy produktach); seed domyślnych gdy DB pusta
- **SettingsForm.tsx** – formularz ustawień (taby: Strona główna / O mnie / Warsztaty / Regulamin / Polityka / Kontakt / Wysyłka / Urlop / Zam. indywidualne / AI (zdjęcia i opisy) / Promocje / Płatności). Nowa zakładka wymaga wpisu w trzech miejscach: `settingsItems` w `AdminNav`, `VALID_SECTIONS` + lista kluczy w `app/admin/ustawienia/page.tsx` i sekcja `{section === "..."}` tutaj. Zakładka „AI (zdjęcia i opisy)" zaczyna się od `AiPromptPresets` (presety promptów), a dalej ma trzy selecty modeli – dwa obrazowe (`AI_IMAGE_MODELS`, w etykiecie opcji koszt za zdjęcie) i jeden tekstowy (`AI_TEXT_MODELS`, w etykiecie stawka za 1 mln tokenów) – z podglądem promptów, pole kursu USD→PLN, instrukcja dla `GOOGLE_AI_API_KEY` oraz **statystyki zużycia i kosztów** (`aiUsage` – prop liczony w `page.tsx` tylko dla tej zakładki, przez `getAiUsageStats()`); zawiera `OverlayControl` – podgląd maski na żywo dla zdjęć hero (kolor + przezroczystość). Zakładka „Strona główna” obejmuje **zdjęcia i teksty wszystkich trzech sekcji** (hero, „O mnie”, „Warsztaty”): puste pole ukrywa element, a podpowiedzi biorą się z domyślnych treści w `lib/home-sections.ts`. Pola sekcji „O mnie” i „Warsztaty” renderuje wspólny `SectionTextFields`; hero ma własny zestaw, bo ma dwa przyciski i napis przy strzałce. Suwaki „Wysokość nagłówka z obrazem" (O mnie, Warsztaty) mają zakres **30–80 vh**; strony dodatkowo klamrują wartość `Math.max(30, …)`. Zakładka Kontakt obejmuje też adres pracowni (`contact_address_*`) i godziny otwarcia (`contact_hours`). Komunikaty „Zapisano"/„Błąd zapisu" renderuje `Toast` – **przez portal do `body`** (`createPortal`), bo `position: fixed` liczy się względem najbliższego przodka z `transform`/`filter`/`will-change`; wewnątrz formularza komunikat lądował przez to na górze dokumentu zamiast ekranu. `SaveButton` sam trzyma stan zapisu – `await`-uje przekazany `onClick`, pokazuje kręcące się kółko (`Loader2`) i blokuje przycisk na czas żądania, więc kliknięcie nigdy nie wygląda na zignorowane. Zdjęcia przy opisie (O mnie, Warsztaty) obsługuje `GalleryEditor` – stan trzymany jest jako JSON znormalizowany przez `parseGallery`, a zapis dopisuje też stare klucze `*_content_image`/`*_content_position` z pierwszego zdjęcia
- **WorkshopsOffersEditor.tsx** – `"use client"`, edytor ofert warsztatów: karty z akordeonem (tytuł, opis, czas, cena, ikona, widoczność), lista „Co zawiera?" i FAQ; każda sekcja obsługuje dodawanie, usuwanie i zmianę kolejności; zwraca dane jako JSON string przez `onChange`. **Pola tekstowe w wierszach flex/grid muszą mieć `min-w-0`** – input ma własną szerokość minimalną i bez tego rozpycha panel poza `max-w-2xl`, poszerzając całą stronę (siatki pól są dodatkowo `grid-cols-1 sm:grid-cols-*`)
- **AiPromptPresets.tsx** – `"use client"`, presety promptów na górze zakładki „AI": wybór presetu (wbudowane „Domyślny AI"/„Domyślny AI+" plus własne), **podgląd promptu tylko do odczytu** (edycja dopiero po kliknięciu „Edytuj prompt", dostępna wyłącznie dla własnych presetów – domyślnych nie da się edytować ani usunąć), „Generuj nowy prompt" (opis sceny po polsku → `/api/admin/ai-prompt`), „Ustaw dla AI" i „Ustaw dla AI+" osobno – **jeden preset może obsługiwać tylko jeden przycisk** (przypisanie do drugiego jest zablokowane, a zastany stan „ten sam preset w obu" pokazuje ostrzeżenie) – oraz usuwanie własnych presetów z potwierdzeniem (wbudowanych usunąć się nie da; usunięcie presetu przypisanego do przycisku cofa przypisanie do wbudowanego). Zmiany zwraca przez `onChange` – zapisuje je wspólny przycisk „Zapisz ustawienia AI" (wzorzec jak `WorkshopsOffersEditor`). Pod podglądem jest `<details>` ze stałą częścią promptu (`AI_PRODUCT_RULES`), żeby było widać, czego preset nie zmienia
- **OrderStatusSelect.tsx** – dropdown statusu zamówienia: pozwala przejść tylko o 1 krok do przodu (pozostałe opcje wyłączone) lub anulować z każdego statusu; przyjmuje `shippingMethod` i `hasTracking` – blokuje zmianę na SHIPPED/DELIVERED gdy brak danych listu (kurier/paczkomat). Przejście na „Opłacone" otwiera **modal z datą i godziną wpłaty** (`datetime-local`, domyślnie teraz) → PATCH `{ status:"PAID", paidAt }`. Status płatności w stronie zamówienia to badge tylko do odczytu (zmienia się sam przy statusie „Opłacone")
- **OrdersTabs.tsx** – zakładki listy zamówień (z „Opłacone")
- **ProductsSearch.tsx** – filtry listy produktów: szukanie po nazwie, kategoria, status i **sortowanie** (opcje z `PRODUCT_SORTS`: najnowsze/najstarsze, nazwa A–Z/Z–A, cena rosnąco/malejąco). Każdy wybór odkłada się w query stringu, więc adres listy da się zapisać w zakładkach
- **ProductRowActions.tsx** – `"use client"`, menu „Opcje" (kebab) przy produkcie na liście: **Edytuj** i **Duplikuj** (link do `/admin/produkty/nowy?kopia={id}`). Zamyka się kliknięciem poza menu i Escape; duplikowanie nie wymaga potwierdzenia, bo samo otwarcie formularza niczego nie zmienia w sklepie. Nazwa produktu na liście jest linkiem do edycji
- **CustomOrderActions.tsx** – formularz zamówień indywidualnych (temat maila do klienta zawiera numer: „Odpowiedź na zamówienie indywidualne IND-{n}”): edycja danych klienta (przycisk odblokowania), pola ceny i kwoty wpłaconej, dropdown statusu (PAID wymaga paidAmount), notatki; każda zmiana statusu wymaga potwierdzenia `window.confirm`
- **TrackingForm.tsx** – `"use client"`, formularz listu przewozowego: wybór dostawcy (DPD/DHL/InPost/Poczta Polska) + pole numeru; PATCH `/api/admin/orders/[id]` z `{ trackingNumber, trackingCarrier }`; pokazuje link śledzenia po wypełnieniu (edycja tylko przy statusie W realizacji)
- **PaidAtEditor.tsx** – `"use client"`, edycja daty/godziny wpłaty (`paidAt`) w karcie opłaconego zamówienia: pole `datetime-local` + zapis z potwierdzeniem `window.confirm`; PATCH `/api/admin/orders/[id]` z `{ paidAt }`. Zmiana wpływa na miesiąc rozliczenia i raport PDF
- **DznSection.tsx** – `"use client"`, sekcja działalności nierejestrowanej: edytowalne minimalne wynagrodzenie (zapis `dzn_min_wage`), paski limitu kwartalnego (225% min. wynagrodzenia) z ostrzeżeniami 75%/90%
- **MonthlyReportsTable.tsx** – `"use client"`, tabela 12 miesięcy w /admin/analityki: przychód, wysyłka, podstawa opodatkowania (przychód − wysyłka), checkbox podwyższonej stawki PIT 32% (zapis `tax_high_{rok}_{miesiac}` przez PATCH `/api/admin/settings`), wyliczony podatek (12%/32%), link do raportu PDF; w stopce suma podatku do odprowadzenia za bieżący rok

### `components/account/`
- **AccountNav.tsx** – nawigacja konta (Profil / Adres dostawy / Zamówienia)
- **OrderStatusBadge.tsx** – kolorowy badge statusu
- **StripeResumeButton.tsx** – `"use client"`, wznowienie płatności Stripe

### `components/contact/`
- **ContactForm.tsx** – `"use client"`, formularz → `/api/contact`

---

## Kolory Tailwind (`app/globals.css`)

```
cream:       #F5F0E8   tło sekcji, karty
warm-white:  #FAF8F5   tło strony
sand:        #E8DFD0   obramowania, separatory (NIE tekst na jasnym tle)
terracotta:  #C4A882   akcenty, tło ozdobne (NIE tekst na jasnym tle)
clay:        #755F44   tekst pomocniczy, tło przycisków, hover
espresso:    #2C2825   tło stopki, nagłówki ciemne
charcoal:    #4A3F38   tekst główny
mist:        #F0EBE3   tło alternatywne
```

Fonty: `font-serif` → Playfair Display, `font-sans` → Inter (oba przez `next/font`).

### Kontrast tekstu – WCAG 2.1 AA (OBOWIĄZKOWE)

Każdy tekst musi mieć **≥ 4,5:1** wobec swojego tła (duży tekst ≥ 24 px lub ≥ 18,66 px bold: ≥ 3:1),
ikony i elementy sterujące **≥ 3:1**. Stany `disabled` są z tego wymogu wyłączone.
Cała strona i panel admina zostały pod tym kątem przejrzane 27.07.2026 – nie cofaj tych decyzji.

**Dozwolone poziomy tekstu na jasnym tle** (cream / warm-white / white / mist / sand):

| Poziom | Klasa | Kontrast na cream |
|--------|-------|-------------------|
| główny | `text-espresso` | 12,88:1 |
| główny alternatywny | `text-charcoal` | 8,99:1 |
| pomocniczy / etykiety / podpowiedzi | `text-charcoal/80` | 5,21:1 |
| akcent (linki, eyebrow, ikony) | `text-clay` | 5,32:1 |

- **Nie używaj `text-charcoal/70` ani niższych** – `/70` to 4,02:1, `/50` to 2,52:1, `/40` to 2,04:1.
  Poniżej progu AA nie da się zbudować kolejnych poziomów hierarchii – różnicuj **rozmiarem,
  wersalikami, `tracking` i grubością**, nie przezroczystością.
- `text-terracotta` i `text-sand` **tylko na ciemnym tle** (espresso: 6,45:1 i 11,06:1).
  Na jasnym mają ~2:1 i 1,2:1. Wyjątek: duże, czysto dekoracyjne ikony placeholderów (`text-sand`).

**Jasny tekst na ciemnym tle** (espresso): `text-cream` / `text-warm-white` / `text-white` do `/60`
(5,63:1), `text-sand` do `/60` (4,98:1). Niżej – nie.

**Tła kolorowe:**
- `bg-clay` + `text-warm-white`/`text-cream` = OK (5,70:1 / 4,75:1).
- `bg-terracotta` **wymaga ciemnego tekstu** – `text-espresso` (6,45:1). Jasny tekst daje 2,1:1.
  Dlatego przyciski `bg-clay hover:bg-terracotta` mają dopisane **`hover:text-espresso`** – nie usuwaj tego.
- Badge'y statusów (Tailwind): używaj odcieni **700/800** na tłach **50/100**.
  `text-green-600`, `text-amber-600`, `text-red-500`, `text-red-400`, `text-*-500` mają < 4,5:1 na białym – nie używaj ich do tekstu.
- Nie przyciemniaj tekstu klasą `opacity-*` na kontenerze (mnoży się z alfą koloru).
  Stan „nieaktywny” pokazuj tłem/obramowaniem (wzorzec: `bg-mist` + `border-sand/40` w `WorkshopsOffersEditor`).

Kolory maili HTML (`app/api/checkout`, `app/api/admin/orders/[id]`) też podlegają tej regule –
przygaszony brąz to `#6b5748` (6,0:1 na cream), nie `#9a7a6a` / `#9a8a80` / `#8b7355`.

### Typografia – myślniki

W treściach interfejsu, komentarzach i dokumentacji używaj **półpauzy `–`** (krótki myślnik).
**Nie używaj pauzy `—`** (długi myślnik, em dash) ani `&mdash;`.

---

## Autoryzacja

- **auth.ts** – NextAuth v5 beta, strategia JWT; providery: Google OAuth + Credentials (bcryptjs); rate limit logowania (5/min na konto + 30/min globalnie); `callbacks` dołączają `id`/`role`/`hasPassword` do tokena i sesji. Callback `jwt` przy każdym żądaniu weryfikuje `tokenVersion` i istnienie konta w DB – zwrócenie `null` unieważnia sesję (rewokacja po zmianie hasła **i po zmianie adresu e-mail**, wylogowanie z usuniętego konta); odświeża też rolę. Błąd DB = fail-open (nie wylogowuje).
  - **`session.user.hasPassword`** – czy konto ma własne hasło (`false` = logowanie wyłącznie przez Google). Do tokena trafia **sam fakt**, nigdy hasło. Zastąpiło kruchą heurystykę „ma avatar = konto Google” z `/konto/profil`; decyduje też, czy wolno zmienić adres e-mail
- **middleware.ts** – ⚠️ **nie zmieniaj nazwy na `proxy.ts`**, mimo że Next 16 ostrzega o przestarzałej konwencji. Próba (20.08.2026) wywaliła produkcję: `proxy` działa wyłącznie w runtime `nodejs`, a `auth(...)` z NextAuth sięga przez adapter do Prismy – zalogowany użytkownik dostawał 500 na `/admin/*` i `/konto/*` (wylogowany widział poprawny redirect, więc lokalnie i w buildzie wyglądało to na działające). Przejście na `proxy` wymaga najpierw rozdzielenia konfiguracji NextAuth (osobny `auth.config.ts` bez adaptera Prismy dla warstwy sprawdzającej sesję). Wymaga sesji na `/konto` i `/admin` (redirect na `/logowanie?callbackUrl=...`) oraz na `/api/admin/*` (zwraca `401 JSON` – druga warstwa obok `requireAdmin` w handlerach). **`/zamowienie` jest celowo poza ochroną** – zamówienie można złożyć bez konta; nie dopisuj go z powrotem Dodatkowo **odsyła zalogowanego z `/logowanie` i `/rejestracja` do `/konto`** (albo pod `callbackUrl`, jeśli jest ścieżką względną – ochrona przed otwartym przekierowaniem). To sprawdzenie siedzi w middleware, a nie na stronach, bo obie są klienckie i formularz mignąłby przed przekierowaniem.
- **Admin:** rola sprawdzana przez `requireAdmin()` z `lib/admin-auth.ts` – **zawsze z bazy**, nie z JWT. Używaj go w każdej nowej trasie/stronie admina.

## SEO – zasady

- **Nie ustawiaj `alternates.canonical` w `app/layout.tsx`.** Metadane dziedziczą się w dół,
  więc canonical z layoutu wyciekał na każdą podstronę bez własnego – `/koszyk`, `/logowanie`
  i `/rejestracja` ogłaszały się kopią strony głównej. Canonical strony głównej siedzi
  w `app/page.tsx`, podstrony biorą go z `pageMetadata()`, a strony bez indeksowania mają
  wpisany wprost obok `robots`. **Nowa strona = własny canonical.**
- **Tytułu nie kończ marką** – dokłada ją szablon z layoutu (`%s | Unique Ceramics`). Wpisany
  drugi raz w `generateMetadata` dawał „… – Unique Ceramics | Unique Ceramics”.
- `googleBot` w layoucie ma **`max-image-preview: large`** (plus `max-snippet`/`max-video-preview`
  bez limitu). To jedyne ustawienie, którym wpływamy na to, czy Google **może** pokazać duże
  zdjęcie przy wyniku; **którego** zdjęcia użyje, i tak decyduje sam.
- **Głównym obrazem strony jest zdjęcie hero** (`home_hero_image` z panelu). Idzie w trzy
  miejsca naraz: `primaryImageOfPage` w schemacie `WebPage` (`app/page.tsx`), `image` firmy
  w `LocalBusinessSchema` i sitemapę obrazków (`app/sitemap.ts`, pole `images`). Podmiana
  zdjęcia w panelu przenosi je we wszystkie trzy – nie wpisuj adresu na sztywno.
  Layout czyta je przez **`getSchemaSettings()`** (cache z tagiem `settings`) – nie wołaj
  tam gołego `getSettings`, bo layout renderuje się przy każdym żądaniu.
- **`og:image` zostaje statycznym `/images/OpenGraph.jpg`** – hero jest w WebP, którego
  WhatsApp nie renderuje w podglądach linków. Google Images WebP obsługuje, więc do danych
  strukturalnych i sitemapy hero nadaje się bez zmian.
- **Dane strukturalne muszą zgadzać się z treścią strony.** Kwoty i daty biorą się z tych samych
  źródeł co widok: cena z `activeDiscountPercent`, wysyłka z ustawień, godziny i adres
  z `getContactSettings()`. Adresy zdjęć przepuszczaj przez `absoluteUrl` – względne Google odrzuca.
- Karta produktu ma komplet pól, których wymaga raport „Merchant listings”: `priceValidUntil`
  (koniec przeceny albo rok do przodu), `itemCondition` i `hasMerchantReturnPolicy` (14 dni,
  odesłanie pocztą, koszt po stronie kupującego – zgodnie z regulaminem). Zmieniając regulamin,
  popraw też ten fragment.
- Ceny warsztatów w JSON-LD idą jako `priceSpecification.minPrice` (etykieta z panelu mówi
  „od tylu zł”), a etykieta bez liczby („wycena indywidualna”) **nie dostaje oferty** – lepiej
  brak danych niż zmyślona cena. FAQ z panelu jedzie jako `FAQPage`.
- Sitemapa i `robots` muszą być spójne z metadanymi strony: jeśli coś jest w `app/sitemap.ts`,
  nie może mieć `noIndex`.
- **Każda kategoria ma własny adres** (`/sklep/kategoria/kubki`) z własnym tytułem, opisem,
  canonicalem, widocznym `h1` i tekstem wstępu. Stary filtr `?kategoria=` jest przekierowany
  na stałe (308). Dodając link do kategorii, używaj `categoryPath()` – nie buduj adresu ręcznie
  i nie wracaj do parametru, bo canonicalizował się do `/sklep` i żadna kategoria nie mogła
  trafić do wyników wyszukiwania pod swoją nazwą.
- Sitemapa zawiera strony kategorii, a `WebSite` **nie deklaruje już `SearchAction`** – sklep
  nie ma wyszukiwarki, a deklaracja wskazywała na wycofany filtr.

---

## Bezpieczeństwo – zasady

- **Nagłówki** (`next.config.ts`): CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, HSTS, Permissions-Policy. Nowe zewnętrzne źródła (skrypty, iframy, obrazy) wymagają aktualizacji CSP. `optimizePackageImports` dla framer-motion i lucide-react; `compiler.removeConsole` usuwa `console.log` z bundle klienta (zachowane `error`/`warn`).
- **Nie ładuj skryptów z CDN** – zależności tylko przez npm (CSP je zablokuje).
- **Kwoty i stany magazynowe** liczone wyłącznie po stronie serwera; checkout dekrementuje stock w transakcji z utworzeniem zamówienia.
- **Nigdy nie pokazuj `e.message` użytkownikowi** – szczegóły błędów tylko do `console.error`, na stronie komunikat ogólny.
- **HTML z ustawień** sanityzowany przy zapisie i renderze (`sanitizeRichHtml`).
- **Endpointy publiczne przyjmujące dane** mają rate limit (`lib/rate-limit.ts`) i walidację długości pól.
- Webhook Stripe: zawsze `constructEvent` z `STRIPE_WEBHOOK_SECRET`.
- **Autoryzacja admina**: `requireAdmin()` **zwraca `null`** (nie rzuca) – używaj `if (!await requireAdmin()) return 403`. Wzorzec `try { await requireAdmin() } catch {}` jest błędny (catch nigdy nie zadziała → trasa odsłonięta). Dodatkowo middleware blokuje `/api/admin/*` bez sesji.
- **Walidacja wejścia mutacji**: trasy admina zapisujące dane (produkty, portfolio) walidują wejście (`validateProduct`/`validateProjectInput`) – nie ufaj typom/zakresom z body nawet od admina.
- **Trasy pobierające zdjęcie po URL-u** (`/api/admin/rotate`, `/api/admin/ai-image`, `/api/admin/ai-text`) muszą przepuszczać źródło przez `resolveOwnImageSource` – inaczej admin (lub ktoś, kto podszył się pod jego sesję) zmusi serwer do pobrania dowolnego adresu (SSRF). `GOOGLE_AI_API_KEY` jest czytany wyłącznie w `lib/google-ai.ts` po stronie serwera i nigdy nie trafia do klienta; wywołania modelu mają rate limit, bo każde kosztuje.
- **Rate limiting** na produkcji wymaga `UPSTASH_*` (trwały, międzyinstancyjny); bez nich limiter jest tylko per-instancja i łatwy do obejścia na serverless.
- **Zmiana adresu e-mail** to zmiana loginu, więc ma podwójny dowód: **aktualne hasło** (chroni przed przejętą sesją) **i** kliknięcie linku z **nowej** skrzynki. Do tego: token tylko jako hash w bazie, ważność 1 h, jedno żądanie na konto, powiadomienie **starego** adresu przy żądaniu i po zmianie, bump `tokenVersion` na koniec. Potwierdzenie jest **POST-em za przyciskiem, nie linkiem GET** – skanery poczty same otwierają adresy z wiadomości i zużyłyby token, zanim klient kliknie. **Nie zamieniaj tego na GET.**

---

## Kluczowe zasady techniczne

### Next.js – server vs client
- **Nigdy nie importuj async funkcji serwera w komponentach `"use client"`** – powoduje React error #482
- `"use client"` = cały moduł (i jego importy) idzie do bundle klienta
- Komponenty klienckie też renderują się raz na serwerze (SSR) – biblioteki tylko przeglądarkowe (np. Jodit) ładuj dynamicznym `import()` w `useEffect`
- `Footer.tsx` musi być w pełni synchroniczny

### Jakość zdjęć – dwa etapy kompresji

Każde zdjęcie z panelu przechodzi **dwa** przekodowania: `sharp` przy uploadzie
(WebP **q100**, maks. 1920 px – plik w Storage ma być wierną kopią oryginału) i optymalizator
`next/image` przy serwowaniu. W Next 16 `images.qualities` domyślnie dopuszcza tylko `[75]`,
więc drugi etap ściągał zdjęcia do q75 – na gładkich powierzchniach ceramiki dawało to
widoczne pasmowanie. W panelu tego nie widać, bo `FocalPointPicker` używa `unoptimized`
i pokazuje plik źródłowy.

**O jakości na stronie decyduje wyłącznie drugi etap.** Zmierzone na `hero.webp`
(wariant 640 px, średnie odchylenie od oryginału – niżej znaczy wierniej):

| `quality` w `next/image` | waga wariantu | odchylenie |
|---|---|---|
| 75 (domyślne) | 29 kB | 3,66 |
| 85 | 51 kB | 2,79 |
| 90 (galeria) | 71 kB | 2,31 |

Jakość pliku w Storage **nie przekłada się na to, co widzi odwiedzający** – upload q82 i q90
przy tym samym `quality` renderu wychodzą identycznie (2,79 vs 2,80). Mimo to upload
i `/api/admin/rotate` kodują w **q100** (decyzja właściciela: plik źródłowy ma być wierny),
kosztem rozmiaru w Storage: dla `hero.webp` q82 → 216 kB, q90 → 266 kB, q100 → 415 kB
(bezstratny byłby 1702 kB). **Chcąc realnie poprawić wygląd na stronie, zmieniaj `quality`
przy renderze, nie przy uploadzie.**

`ImageGallery` renderuje z `quality={90}` (stała `IMAGE_QUALITY`). Pozostałe miejsca
(karty produktów, hero, portfolio) nadal używają domyślnego q75 – jeśli kiedyś mają
wyglądać tak samo, dopisz im `quality`, pamiętając o ~2,4× większym transferze.

### Ścieżki do zdjęć – pułapka z redirectami

`next.config.ts` przekierowuje stare `/images/*.jpg|png` na `.webp` (po konwersji plików).
**Redirect nie naprawia zapisanych ścieżek – psuje optymalizację obrazów.** Żądanie
`/_next/image?url=/images/hero.jpg` dostaje `308` zamiast obrazu, przeglądarka idzie za
przekierowaniem na surowy plik i pobiera go w pełnej rozdzielczości, omijając optymalizator
(zmierzone: 227 KB zamiast 33 KB dla wariantu w=640) – do tego bez długiego cache, bo pliki
z `public/` dostają `max-age=0, must-revalidate`.

Dlatego **w bazie (ustawienia, `Product.images`, `Project.images`) zapisuj zawsze realnie
istniejącą ścieżkę** – dziś `.webp`. Lista przekierowań w `next.config.ts` jest tylko siatką
bezpieczeństwa dla starych linków z zewnątrz, nie sposobem na trzymanie nieaktualnych ścieżek.
Ścieżki naprawiono jednorazowo 27.07.2026 (3 ustawienia + 18 zdjęć produktów).

Objaw uboczny: dopóki hero się ładuje, sekcja pokazuje zapasowe tło `bg-espresso`, co wygląda
jak ciemny header na stronie głównej.

### Cache i rewalidacja
- Strony sesyjne (`/konto`, `/zamowienie`, `/admin`) = `force-dynamic`; strony treściowe = ISR (`revalidate`); dane katalogu = `unstable_cache` z tagiem `products`
- Trasy z parametrem (`[slug]`) wymagają `generateStaticParams` (może zwracać `[]`), żeby ISR działało – bez tego są w pełni dynamiczne
- Po mutacji produktów w adminie wywołuj `revalidateProductPages()`; po zapisie ustawień `revalidatePath("/", "layout")`
- Funkcje pobierające dane przy ISR **muszą mieć fallback** na wypadek braku DB podczas builda (wzorzec: try/catch + defaulty jak w `lib/settings.ts`)
- W `generateMetadata` i stronie używaj wspólnej funkcji opakowanej w `React.cache()` – deduplikacja zapytań
- W Next 16 `revalidateTag` przyjmuje drugi argument – używaj `revalidateTag(tag, "max")`

### Koszyk i zgoda cookies (client state)
- Store'y modułowe czytane przez `useSyncExternalStore` – **nie** dodawaj setState w `useEffect` do hydratacji localStorage (reguła `react-hooks/set-state-in-effect`). Tym samym wzorcem czytamy „czy jesteśmy już w przeglądarce” w `CartToasts`
- **Koszyk a konto:** koszyk gościa żyje w localStorage i **musi przetrwać** (sklep dopuszcza zakupy bez konta). Po zalogowaniu scala się z koszykiem konta, po wylogowaniu jest czyszczony – szczegóły przy `useCartAccountSync` w `lib/cart.tsx`

### sharp na produkcji – śledzenie plików (NFT)

Binarka sharpa (`@img/sharp-linux-x64`) ładuje `libvips-cpp.so` z **sąsiedniej**
paczki (`@img/sharp-libvips-linux-x64`) przez `dlopen`, a nie przez `require`.
Śledzenie plików Next/Vercel (NFT) widzi tylko `require`, więc wycinało .so z paczki
funkcji – trasy używające sharpa padały na produkcji **przy ładowaniu modułu**
(`ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3: cannot open shared object file`),
czyli **zanim** wykona się jakikolwiek `try/catch` w handlerze. W panelu wyglądało to
na „nie udało się wgrać zdjęcia (błąd 500)".

Dlatego `next.config.ts` ma `outputFileTracingIncludes` z `node_modules/sharp/**/*`
i `node_modules/@img/**/*` dla wszystkich tras z sharpem: `/api/admin/upload`,
`/api/admin/rotate`, `/api/admin/ai-image`, `/api/admin/ai-text`, `/api/og/[slug]`.
**Dodając nową trasę korzystającą z sharpa, dopisz ją do tej listy** – inaczej zadziała
lokalnie i wywali się dopiero na produkcji.

### Upload plików binarnych (Supabase Storage)
- **Nigdy nie przekazuj `Buffer`a bezpośrednio do `supabase.storage.upload()`** – trafia wtedy jako surowe ciało żądania i w środowisku serverless bajty potrafią przejść przez konwersję na tekst UTF-8 (każdy bajt spoza ASCII → `EF BF BD`), przez co plik w Storage jest uszkodzony i optymalizator obrazów Next zwraca `INVALID_IMAGE_OPTIMIZE_REQUEST`. Wysyłaj `new Blob([new Uint8Array(buf)], { type })` – supabase-js użyje wtedy multipart/form-data
- Po uploadzie route porównuje rozmiar zapisanego obiektu (`storage.info()`) z rozmiarem wysłanego bufora; przy rozbieżności kasuje plik i zwraca błąd
- Paczki natywne (`sharp`, `pdfkit`) muszą być w `serverExternalPackages` w `next.config.ts`

### Adresy dostawy użytkownika
- Tabela `Setting`, klucz `user_address_{userId}`, JSON; GET/PUT `/api/account/address`; auto-uzupełniają checkout

### Email (Resend)
- Po zamówieniu przelewowym: e-mail do klienta z danymi do przelewu + powiadomienie do właściciela
- Nadawca z `RESEND_FROM_EMAIL` lub fallback `onboarding@resend.dev`; błąd wysyłki nie blokuje zamówienia

### Metody płatności
- Przelew bankowy (+ opcjonalnie BLIK na telefon): zawsze dostępny
- Stripe (karta): tylko gdy `payment_stripe_enabled === "true"` **i** ustawiony `STRIPE_SECRET_KEY`; przepływ: checkout → sesja Stripe → webhook `completed` ustawia PAID; `expired` anuluje zamówienie i zwraca stock
- Porzucona płatność kartą wraca na `/zamowienie/potwierdzenie?id=…&platnosc=anulowana` (nie na pusty koszyk) – stamtąd można ją ponowić przez `/api/stripe/resume`

### Zamówienie bez konta (checkout gościa)

Konto **nie jest** wymagane do zakupu. Gość i zalogowany klient idą tą samą ścieżką
(`/koszyk` → `/zamowienie` → `/api/checkout` → `/zamowienie/potwierdzenie`), różnice:

| | Gość | Zalogowany |
|---|---|---|
| `Order.userId` | `null` | id użytkownika |
| Adres | wpisywany w formularzu (tylko przy kurierze) | podpowiadany z `user_address_{userId}`; **brak kompletnego adresu blokuje zamówienie** – ale **tylko przy kurierze** |
| Regulamin | checkbox przy zamówieniu (`acceptTerms`, walidowany też serwerowo) | zaakceptowany przy rejestracji |
| Dostęp do zamówienia po złożeniu | link `/zamowienie/potwierdzenie?id={orderId}` (id = token, wysyłany e-mailem) | `/konto/zamowienia/{id}` |

- **Telefon jest wymagany** przy wysyłce kurierem i do paczkomatu (kurier dzwoni, InPost wysyła SMS);
  przy odbiorze osobistym pozostaje opcjonalny. Walidacja po obu stronach (`CheckoutForm`, `/api/checkout`).
- **Adres dostawy zbieramy tylko przy kurierze.** Paczkomat idzie na kod maszyny, a odbiór osobisty odbywa się
  w pracowni, więc pola adresowe **znikają z formularza** i nie są walidowane – ani u gościa, ani u zalogowanego
  (brama „uzupełnij adres w koncie" dotyczy wyłącznie kuriera). Bez adresu sprawdzamy same dane kontaktowe
  (`validateContact` z `lib/address-validation.ts`); `validateAddress` = `validateContact` + ulica/kod/miasto.
  W zamówieniu paczkomatu w polu `street` zapisujemy `Paczkomat {kod}` (serwerowo, z `parcelLockerCode`),
  a `city`/`postcode` zostają puste – karty zamówienia i tak pokazują dla paczkomatu sam kod.
- **Każdy klient dostaje e-mail potwierdzający** (`buildOrderEmail`) – przy przelewie z danymi do wpłaty,
  przy karcie z informacją o płatności Stripe. E-mail zawiera przycisk „Podgląd zamówienia" (dla gościa
  to jedyny dostęp do zamówienia, więc wysyłka jest `await`-owana, nie fire-and-forget).
- Zamówienia gości **wchodzą do wszystkich zestawień** – lista i karta zamówienia w adminie (karta oznacza
  je jako „Zamówienie bez konta (gość)"), dashboard, `/admin/analityki`, raporty PDF i limit działalności
  nierejestrowanej liczą po `Order` bez filtra na `userId`. E-maile o zmianie statusu idą na `Order.email`.
- Zamówienia gościa **nie są** automatycznie podpinane pod konto o tym samym adresie e-mail – rejestracja
  nie weryfikuje e-maila, więc takie podpięcie odsłaniałoby cudze zamówienia.

### Tabela Setting – autokonfiguracja
- Przy operacjach na `Setting` poza Prismą używaj `$executeRaw`/`$queryRaw` z tagged template (parametryzacja!)

---

## Właściciel / Dane firmy

- Forma pierwszoosobowa: "O mnie", "moja ceramika", "tworzę"
- Telefon: +48 668 443 706
- E-mail: kontakt@uniqueceramics.pl
- Instagram: @unique.ceramics
- Adres pracowni: Familijna 23, 44-164 Kleszczów (k. Gliwic)
- Wysyłka: 18 zł, darmowa od 300 zł
