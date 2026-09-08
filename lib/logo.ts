// Logo sklepu – jedno źródło wymiarów dla wszystkich miejsc, w których się pojawia.
//
// Plik ma **441×481 px, czyli nie jest kwadratem**. Wszystkie użycia deklarowały
// wcześniej kwadrat (40×40, 32×32, 28×28, 24×24), a rozmiar na ekranie ustala CSS
// (`h-9 w-auto`), więc przeglądarka rezerwowała kwadratowe miejsce i po wczytaniu
// obrazka zwężała je o ~8–9%, przesuwając napis obok (CLS – Chrome zgłaszał to
// jako „Lazy-loaded images should have explicit dimensions”).
//
// `width`/`height` w `next/image` przy szerokości sterowanej CSS-em służą wyłącznie
// do **proporcji**, więc podajemy tu prawdziwe wymiary pliku. Ponieważ są duże,
// każde użycie musi podać `sizes` z docelowym rozmiarem na ekranie – inaczej Next
// zbuduje `srcset` wokół 441 px i pobierze grafikę wielokrotnie większą, niż widać.
//
// **Podmieniając plik logo, zaktualizuj te liczby.**
export const LOGO_SRC = "/images/logo.webp";
export const LOGO_WIDTH = 441;
export const LOGO_HEIGHT = 481;
