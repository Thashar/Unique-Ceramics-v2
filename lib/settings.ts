import { db } from "@/lib/db";

const REGULAMIN_DEFAULT = `<h2>I. Postanowienia ogólne</h2>
<ol>
<li>Sklep internetowy dostępny pod adresem <strong>uniqueceramics.pl</strong> prowadzony jest przez osobę fizyczną działającą pod marką <strong>Unique Ceramics</strong>.</li>
<li>Kontakt ze sprzedawcą: e-mail <a href="mailto:kontakt@uniqueceramics.pl">kontakt@uniqueceramics.pl</a>, telefon <a href="tel:+48668443706">+48 668 443 706</a>.</li>
<li>Wszystkie produkty oferowane w sklepie są wykonywane ręcznie. Każdy egzemplarz jest niepowtarzalny i może nieznacznie różnić się od zdjęcia prezentowanego w sklepie — jest to naturalna cecha ceramiki rzemieślniczej, a nie wada towaru.</li>
<li>Pęknięcia szkliwa (crackle) są naturalnym efektem wypalania ceramiki i nie stanowią wady fizycznej produktu.</li>
<li>Klientem może być wyłącznie osoba pełnoletnia, posiadająca pełną zdolność do czynności prawnych.</li>
<li>Ceny podane w sklepie są cenami brutto (zawierają podatek VAT) i nie obejmują kosztów dostawy.</li>
<li>Do korzystania ze sklepu niezbędne jest urządzenie z dostępem do internetu oraz przeglądarka internetowa.</li>
</ol>
<h2>II. Zamówienia</h2>
<ol>
<li>Zamówienia można składać poprzez formularz na stronie lub drogą e-mailową pod adresem kontakt@uniqueceramics.pl.</li>
<li>Po złożeniu zamówienia Klient otrzymuje e-mail z potwierdzeniem przyjęcia zamówienia do realizacji.</li>
<li>Umowa sprzedaży zostaje zawarta z chwilą potwierdzenia zamówienia przez sprzedawcę.</li>
<li>Realizacja zamówienia na produkty dostępne od ręki rozpoczyna się po zaksięgowaniu płatności — zazwyczaj w ciągu 3–5 dni roboczych.</li>
<li>Zamówienia indywidualne (na specjalne zamówienie) mogą wymagać czasu realizacji do 4 tygodni — termin ustalany jest indywidualnie.</li>
<li>Sprzedawca zastrzega sobie prawo do odmowy realizacji zamówienia w uzasadnionych przypadkach, informując Klienta e-mailem.</li>
</ol>
<h2>III. Płatność i dostawa</h2>
<ol>
<li>Dostępna forma płatności: <strong>przelew bankowy</strong>. Dane do przelewu przesyłane są e-mailem po złożeniu zamówienia. Płatność powinna zostać zrealizowana w ciągu 7 dni od daty złożenia zamówienia.</li>
<li>Wysyłka realizowana jest za pośrednictwem wybranego przewoźnika (kurier lub Poczta Polska).</li>
<li>Koszt dostawy wynosi <strong>18 zł</strong>. Przy zamówieniach o wartości 300 zł i powyżej dostawa jest <strong>bezpłatna</strong>.</li>
<li>Czas dostawy po wysłaniu przesyłki wynosi zazwyczaj 1–3 dni robocze na terenie Polski.</li>
<li>Sprzedawca nie ponosi odpowiedzialności za opóźnienia wynikające z działania przewoźnika.</li>
<li>Do każdego zamówienia dołączany jest paragon lub faktura (na życzenie).</li>
</ol>
<h2>IV. Reklamacje</h2>
<ol>
<li>Sprzedawca odpowiada wobec Klienta będącego konsumentem z tytułu rękojmi za wady fizyczne i prawne zakupionego towaru.</li>
<li>Reklamację należy zgłosić e-mailem na adres <a href="mailto:kontakt@uniqueceramics.pl">kontakt@uniqueceramics.pl</a>, opisując wadę i dołączając zdjęcia.</li>
<li>Sprzedawca rozpatruje reklamację w terminie 14 dni kalendarzowych od jej otrzymania.</li>
<li>W przypadku uwzględnienia reklamacji Klient może żądać naprawy towaru, wymiany na nowy, obniżenia ceny albo odstąpienia od umowy.</li>
<li>Różnice w wyglądzie wynikające z ręcznego wykonania, naturalnych właściwości szkliwa (np. crackle) oraz nierówności faktury nie stanowią wady towaru.</li>
<li>Klient będący konsumentem ma prawo skorzystać z pozasądowych sposobów rozpatrywania reklamacji, w tym zwrócić się do Powiatowego Rzecznika Konsumentów lub skorzystać z platformy ODR: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a>.</li>
</ol>
<h2>V. Prawo odstąpienia od umowy</h2>
<ol>
<li>Konsument ma prawo odstąpić od umowy zawartej na odległość bez podania przyczyny w terminie <strong>14 dni</strong> od dnia otrzymania towaru.</li>
<li>Aby skorzystać z prawa odstąpienia, należy poinformować sprzedawcę e-mailem na adres <a href="mailto:kontakt@uniqueceramics.pl">kontakt@uniqueceramics.pl</a> przed upływem terminu.</li>
<li>Po otrzymaniu oświadczenia o odstąpieniu sprzedawca niezwłocznie potwierdzi jego przyjęcie.</li>
<li>Konsument zobowiązany jest odesłać towar w terminie 14 dni od dnia odstąpienia. Bezpośrednie koszty zwrotu towaru ponosi Konsument.</li>
<li>Zwrot płatności nastąpi niezwłocznie, nie później niż w terminie 14 dni od dnia otrzymania zwrotu towaru, przelewem na wskazany rachunek bankowy.</li>
<li>Prawo odstąpienia nie przysługuje w odniesieniu do produktów wykonanych na specjalne zamówienie Klienta (zamówienia indywidualne).</li>
<li>Prawo odstąpienia od umowy nie przysługuje podmiotom nabywającym towar w związku z prowadzoną działalnością gospodarczą.</li>
</ol>
<h2>VI. Ochrona danych osobowych i pliki cookie</h2>
<ol>
<li>Administratorem danych osobowych Klientów jest właściciel sklepu Unique Ceramics. Dane przetwarzane są wyłącznie w celu realizacji zamówień i kontaktu z Klientem.</li>
<li>Podanie danych osobowych jest dobrowolne, lecz niezbędne do realizacji zamówienia.</li>
<li>Klientowi przysługuje prawo dostępu do swoich danych, ich poprawiania oraz usunięcia. W tym celu należy napisać na adres <a href="mailto:kontakt@uniqueceramics.pl">kontakt@uniqueceramics.pl</a>.</li>
<li>Dane nie są udostępniane osobom trzecim, z wyjątkiem przewoźnika w zakresie niezbędnym do realizacji dostawy.</li>
<li>Strona wykorzystuje pliki cookie niezbędne do prawidłowego działania koszyka oraz pliki analityczne. Korzystanie ze strony bez zmiany ustawień przeglądarki oznacza zgodę na stosowanie plików cookie.</li>
</ol>
<h2>VII. Postanowienia końcowe</h2>
<ol>
<li>Sprzedawca zastrzega sobie prawo do zmiany Regulaminu. Zmiany nie dotyczą zamówień złożonych przed datą zmiany.</li>
<li>W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego, w szczególności Kodeksu Cywilnego oraz Ustawy o prawach konsumenta.</li>
<li>Ewentualne spory rozstrzygane są przez właściwy sąd powszechny. Konsument może skorzystać z pozasądowych sposobów rozstrzygania sporów.</li>
</ol>`;

const POLITYKA_DEFAULT = `<p>Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych osobowych Użytkowników korzystających ze sklepu internetowego Unique Ceramics dostępnego pod adresem <strong>uniqueceramics.pl</strong>.</p>
<h2>I. Administrator danych osobowych</h2>
<p>Administratorem danych osobowych jest właściciel marki <strong>Unique Ceramics</strong>.</p>
<p>Kontakt z Administratorem:</p>
<ul>
<li>E-mail: <a href="mailto:kontakt@uniqueceramics.pl">kontakt@uniqueceramics.pl</a></li>
<li>Telefon: <a href="tel:+48668443706">+48 668 443 706</a></li>
</ul>
<h2>II. Jakie dane zbieramy</h2>
<p>W trakcie korzystania ze sklepu mogą być zbierane następujące dane osobowe:</p>
<ul>
<li>Imię i nazwisko</li>
<li>Adres e-mail</li>
<li>Numer telefonu</li>
<li>Adres dostawy (ulica, numer domu/mieszkania, kod pocztowy, miasto)</li>
<li>Dane do faktury (jeśli jest wymagana)</li>
</ul>
<h2>III. Cel i podstawa prawna przetwarzania danych</h2>
<p>Dane osobowe przetwarzane są w następujących celach:</p>
<ul>
<li><strong>Realizacja zamówienia</strong> — podstawa prawna: art. 6 ust. 1 lit. b RODO (wykonanie umowy)</li>
<li><strong>Kontakt z Klientem</strong> w sprawie zamówienia — podstawa prawna: art. 6 ust. 1 lit. b RODO</li>
<li><strong>Wystawienie dokumentu sprzedaży</strong> (paragon, faktura) — podstawa prawna: art. 6 ust. 1 lit. c RODO (obowiązek prawny)</li>
<li><strong>Rozpatrzenie reklamacji lub zwrotu</strong> — podstawa prawna: art. 6 ust. 1 lit. c RODO</li>
</ul>
<h2>IV. Udostępnianie danych</h2>
<p>Dane osobowe mogą być przekazywane:</p>
<ul>
<li><strong>Firmie kurierskiej / Poczcie Polskiej</strong> — w zakresie niezbędnym do realizacji dostawy (imię, nazwisko, adres, numer telefonu)</li>
<li><strong>Dostawcy platformy sklepowej</strong> — w ramach niezbędnej obsługi technicznej systemu</li>
</ul>
<p>Dane nie są przekazywane do państw trzecich ani organizacji międzynarodowych.</p>
<h2>V. Okres przechowywania danych</h2>
<p>Dane osobowe przechowywane są przez okres:</p>
<ul>
<li>Niezbędny do realizacji zamówienia oraz obsługi ewentualnych reklamacji (do 2 lat od zakupu)</li>
<li>Wymagany przepisami prawa podatkowego (do 5 lat od końca roku, w którym wystawiono dokument sprzedaży)</li>
</ul>
<h2>VI. Prawa Użytkownika</h2>
<p>Każdy Użytkownik ma prawo do:</p>
<ul>
<li><strong>Dostępu</strong> do swoich danych osobowych</li>
<li><strong>Sprostowania</strong> nieprawidłowych danych</li>
<li><strong>Usunięcia</strong> danych („prawo do bycia zapomnianym")</li>
<li><strong>Ograniczenia</strong> przetwarzania danych</li>
<li><strong>Przenoszenia</strong> danych</li>
<li><strong>Sprzeciwu</strong> wobec przetwarzania danych</li>
<li>Wniesienia skargi do <strong>Prezesa Urzędu Ochrony Danych Osobowych</strong> (ul. Stawki 2, 00-193 Warszawa)</li>
</ul>
<p>W celu realizacji powyższych praw należy skontaktować się e-mailem: <a href="mailto:kontakt@uniqueceramics.pl">kontakt@uniqueceramics.pl</a>.</p>
<h2>VII. Pliki cookie</h2>
<p>Strona wykorzystuje pliki cookie (ciasteczka) w następujących celach:</p>
<ul>
<li><strong>Niezbędne</strong> — zapewnienie prawidłowego działania koszyka i sesji użytkownika</li>
<li><strong>Analityczne</strong> — analiza ruchu na stronie w celu jej ulepszania</li>
</ul>
<p>Korzystanie ze strony bez zmiany ustawień przeglądarki oznacza zgodę na stosowanie plików cookie. Ustawienia plików cookie można zmienić w dowolnym momencie w ustawieniach przeglądarki.</p>
<h2>VIII. Zmiany Polityki Prywatności</h2>
<p>Administrator zastrzega sobie prawo do zmiany niniejszej Polityki Prywatności. Wszelkie zmiany będą publikowane na tej stronie. Data ostatniej aktualizacji: <strong>1 maja 2025 r.</strong></p>`;

const ABOUT_STORY_DEFAULT = `<p>Od 20 lat zajmuję się ceramiką w obszarze przemysłu, dlatego moje doświadczenie przeniosłam na ceramikę artystyczną, którą zajmuję się od około roku. Tworzenie unikatowych prac stało się dla mnie prawdziwą pasją i sposobem na wyrażanie kreatywności.</p>
<p>W tym czasie stworzyłam własną, kameralną pracownię, w której powstają ręcznie wykonywane przedmioty użytkowe i dekoracyjne. Swoją inspirację czerpię przede wszystkim z prostych form oraz rzemiosła artystycznego.</p>
<p>Każdą pracę wykonuję samodzielnie, dbając o detale, estetykę i niepowtarzalny charakter wyrobów. Ceramika daje mi ogromną satysfakcję oraz pozwala odnaleźć wewnętrzny spokój i chwilę wyciszenia w tym jakże zabieganym świecie.</p>
<p>Daje mi to też motywację do ciągłego rozwijania swoich umiejętności oraz poszukiwania nowych pomysłów i technik.</p>`;

const WORKSHOPS_INTRO_DEFAULT = `<p>Organizuję warsztaty ceramiczne dla grup i indywidualnych uczestników. Idealne na urodziny, wieczory panieńskie, imprezy firmowe czy po prostu wyjątkowy wieczór z przyjaciółmi. Nie potrzebujesz żadnego doświadczenia — wszystkiego nauczę Cię od podstaw.</p>
<p>W trakcie warsztatów uformujecie własne wyroby z gliny, które po wypaleniu możecie odebrać lub wysłać pocztą. Każdy uczestnik wychodzi z wyjątkowym, własnoręcznie wykonanym dziełem.</p>`;

const WORKSHOPS_OFFERS_DEFAULT = JSON.stringify([
  { id: 1, iconName: "Cake",      title: "Warsztaty urodzinowe",  description: "Wyjątkowe urodziny w towarzystwie gliny! Idealne dla grup od 4 osób. W trakcie warsztatu uformujecie własne wyroby z gliny, które po wypaleniu możecie odebrać lub wysłać pocztą.", duration: "3–4 godziny", maxPeople: "od 4 osób",           priceLabel: "od 80 zł / os.",      level: "Każdy poziom",    active: true },
  { id: 2, iconName: "Gem",       title: "Wieczory panieńskie",   description: "Niezapomniane wieczory panieńskie z ceramiką. Możliwość degustacji wina. Każda uczestniczka wychodzi z własnoręcznie wykonanym, unikatowym dziełem.",                                         duration: "3–4 godziny", maxPeople: "od 4 osób",           priceLabel: "od 100 zł / os.",     level: "Każdy poziom",    active: true },
  { id: 3, iconName: "Building2", title: "Team Building",         description: "Integracja przez ceramikę dla firm i grup zawodowych. Doskonała alternatywa dla standardowych eventów — kreatywna, angażująca i pełna niespodzianek.",                                         duration: "Do ustalenia", maxPeople: "wycena indywidualna", priceLabel: "wycena indywidualna", level: "Każdy poziom",    active: true },
  { id: 4, iconName: "Leaf",      title: "Warsztaty otwarte",     description: "Regularne warsztaty dla osób indywidualnych. Poznasz podstawy pracy z gliną — toczenie na kole lub hand-building. Nie potrzebujesz żadnego doświadczenia.",                                   duration: "3 godziny",    maxPeople: "małe grupy",          priceLabel: "od 90 zł / os.",      level: "Każdy poziom",    active: true },
  { id: 5, iconName: "Users",     title: "Dla dzieci i rodzin",   description: "Warsztaty dla dzieci od 8 lat i całych rodzin. Bezpieczne materiały, przystępna forma, mnóstwo frajdy i niepowtarzalne wspomnienia.",                                                           duration: "2–3 godziny",  maxPeople: "rodziny i grupy",     priceLabel: "od 60 zł / os.",      level: "Dzieci od 8 lat", active: true },
  { id: 6, iconName: "Gift",      title: "Vouchery prezentowe",   description: "Podaruj komuś wyjątkowe doświadczenie! Vouchery na dowolny rodzaj warsztatów. Idealne na urodziny, imieniny, Dzień Matki lub po prostu z okazji.",                                             duration: "według wybranego warsztatu", maxPeople: "dla 1 osoby lub pary", priceLabel: "od 80 zł",  level: "Każdy poziom",    active: true },
]);

const WORKSHOPS_INCLUDES_DEFAULT = JSON.stringify([
  { id: 1, iconName: "Package",       label: "Materiały (glina, narzędzia)" },
  { id: 2, iconName: "GraduationCap", label: "Prowadzenie przez ceramiczkę" },
  { id: 3, iconName: "Flame",         label: "Wypalanie Twoich prac" },
  { id: 4, iconName: "CheckCircle",   label: "Gotowe wyroby do odbioru" },
  { id: 5, iconName: "Camera",        label: "Pamiątkowe zdjęcia" },
  { id: 6, iconName: "Coffee",        label: "Napoje podczas warsztatów" },
]);

const WORKSHOPS_FAQ_DEFAULT = JSON.stringify([
  { id: 1, question: "Co muszę zabrać?",                     answer: "Nic — wszystkie materiały są zapewnione. Warto mieć na sobie ubranie, które może się zabrudzić (glina to glina)." },
  { id: 2, question: "Czy otrzymam swoje prace?",            answer: "Tak! Przedmioty po wysuszeniu i wypaleniu możesz odebrać osobiście lub wyślę je pocztą." },
  { id: 3, question: "Kiedy dostanę gotowe prace?",          answer: "Wypalanie trwa ok. 2–3 tygodni od warsztatów. Poinformuję Cię, gdy prace będą gotowe." },
  { id: 4, question: "Czy mogę kupić voucher na warsztaty?", answer: "Tak, zapraszam do kontaktu — wystawiam vouchery podarunkowe od 80 zł." },
  { id: 5, question: "Jak zarezerwować miejsce?",            answer: "Napisz do mnie przez formularz kontaktowy lub zadzwoń." },
]);

const DEFAULTS: Record<string, string> = {
  regulamin: REGULAMIN_DEFAULT,
  polityka_prywatnosci: POLITYKA_DEFAULT,
  home_hero_image: "",
  home_hero_position: "50% 50%",
  home_about_image: "",
  home_about_position: "50% 50%",
  home_workshops_image: "",
  home_workshops_position: "50% 50%",
  shop_hero_image: "",
  shop_hero_position: "50% 50%",
  shop_hero_overlay_color: "#2C2825",
  shop_hero_overlay_opacity: "50",
  shop_hero_height: "50",
  about_hero_image: "",
  about_hero_position: "50% 50%",
  about_hero_overlay_color: "#2C2825",
  about_hero_overlay_opacity: "50",
  about_hero_height: "50",
  about_content_image: "",
  about_content_position: "50% 50%",
  about_story: ABOUT_STORY_DEFAULT,
  workshops_hero_image: "",
  workshops_hero_position: "50% 50%",
  workshops_hero_overlay_color: "#2C2825",
  workshops_hero_overlay_opacity: "60",
  workshops_hero_height: "50",
  workshops_content_image: "",
  workshops_content_position: "50% 50%",
  workshops_intro: WORKSHOPS_INTRO_DEFAULT,
  workshops_offers: WORKSHOPS_OFFERS_DEFAULT,
  workshops_includes: WORKSHOPS_INCLUDES_DEFAULT,
  workshops_faq: WORKSHOPS_FAQ_DEFAULT,
  contact_phone: "+48 668 443 706",
  contact_email: "kontakt@uniqueceramics.pl",
  contact_instagram: "@unique.ceramics",
  contact_facebook: "",
  contact_youtube: "",
  contact_whatsapp: "",
  contact_hours: "Pon–Pt 9:00–17:00",
  shipping_cost: "18",
  shipping_free_enabled: "true",
  shipping_free_from: "300",
  shipping_time: "2–4 dni robocze",
  // Płatności — przelew tradycyjny
  payment_bank_account_name: "",
  payment_bank_account_number: "",
  payment_bank_name: "",
  payment_bank_transfer_title: "Zamówienie",
  // BLIK
  payment_blik_enabled: "false",
  payment_blik_phone: "",
  // Stripe
  payment_stripe_enabled: "false",
  // Urlop
  vacation_enabled: "false",
  vacation_end_date: "",
  vacation_message: "",
};

async function querySettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await db.setting.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string> = {};
  for (const key of keys) {
    map[key] = rows.find((r) => r.key === key)?.value ?? DEFAULTS[key] ?? "";
  }
  return map;
}

export async function getSetting(key: string): Promise<string> {
  for (let i = 0; i < 2; i++) {
    try {
      const row = await db.setting.findUnique({ where: { key } });
      return row?.value ?? DEFAULTS[key] ?? "";
    } catch {
      if (i === 0) await new Promise((r) => setTimeout(r, 300));
    }
  }
  return DEFAULTS[key] ?? "";
}

export async function getSettings(
  keys: string[]
): Promise<Record<string, string>> {
  for (let i = 0; i < 2; i++) {
    try {
      return await querySettings(keys);
    } catch {
      if (i === 0) await new Promise((r) => setTimeout(r, 300));
    }
  }
  const map: Record<string, string> = {};
  for (const key of keys) map[key] = DEFAULTS[key] ?? "";
  return map;
}
