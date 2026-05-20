export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  featured: boolean;
  dimensions?: string;
  material?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export const categories: Category[] = [
  { id: "1", name: "Miski", slug: "miski" },
  { id: "2", name: "Kubki", slug: "kubki" },
  { id: "3", name: "Talerze", slug: "talerze" },
  { id: "4", name: "Wazony", slug: "wazony" },
  { id: "5", name: "Dekoracje", slug: "dekoracje" },
];

export const products: Product[] = [
  {
    id: "1",
    slug: "miska-kredowa-duza",
    name: "Miska kredowa — duża",
    description:
      "Ręcznie toczona miska z glinki szamotowej, pokryta matową glazurą w odcieniu bielonej kredy. Idealna do serwowania sałatek lub jako dekoracja. Każda miska jest niepowtarzalna — drobne ślady palców i nierówności są częścią jej charakteru.",
    price: 189,
    category: "miski",
    images: [
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80",
    ],
    stock: 3,
    featured: true,
    dimensions: "ø 28 cm, wys. 9 cm",
    material: "Glinka szamotowa, glazura matowa",
  },
  {
    id: "2",
    slug: "kubek-terakota",
    name: "Kubek — terakota",
    description:
      "Kubek o pojemności 320 ml, toczony ręcznie z glinki ceramicznej w ciepłym odcieniu terakoty. Grube ścianki doskonale utrzymują ciepło. Bezpieczny do zmywarki.",
    price: 129,
    category: "kubki",
    images: [
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80",
      "https://images.unsplash.com/photo-1577564498638-0d71c39ca23a?w=800&q=80",
    ],
    stock: 7,
    featured: true,
    dimensions: "ø 8 cm, wys. 10 cm, 320 ml",
    material: "Glinka ceramiczna, glazura błyszcząca",
  },
  {
    id: "3",
    slug: "wazon-szyjka-smukla",
    name: "Wazon — smukła szyjka",
    description:
      "Elegancki wazon z cienką szyjką, idealny do pojedynczych gałązek lub suszonych kwiatów. Surowa, matowa powierzchnia z naturalnymi przebarwieniami z wypalania.",
    price: 245,
    category: "wazony",
    images: [
      "https://images.unsplash.com/photo-1612197527762-8cfb03b35c6e?w=800&q=80",
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
    ],
    stock: 2,
    featured: true,
    dimensions: "ø 9 cm, wys. 24 cm",
    material: "Glinka szamotowa, szkliwo naturalne",
  },
  {
    id: "4",
    slug: "talerz-deserowy-kremowy",
    name: "Talerz deserowy — kremowy",
    description:
      "Płaski talerz deserowy z lekko uniesionym rantem. Kremowa glazura z subtelnym efektem masy perłowej. Sprzedawany pojedynczo.",
    price: 115,
    category: "talerze",
    images: [
      "https://images.unsplash.com/photo-1603199506016-b9a594b593c0?w=800&q=80",
    ],
    stock: 5,
    featured: true,
    dimensions: "ø 21 cm",
    material: "Glinka biała, glazura perłowa",
  },
  {
    id: "5",
    slug: "miska-zupa-glina",
    name: "Miska do zupy",
    description:
      "Głęboka miska do zupy lub ramenu. Ciepły odcień czerwonej gliny z przezroczystym szkliwem. Bezpieczna do mikrofalówki.",
    price: 149,
    category: "miski",
    images: [
      "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80",
    ],
    stock: 4,
    featured: false,
    dimensions: "ø 18 cm, wys. 8 cm",
    material: "Glinka czerwona, szkliwo transparentne",
  },
  {
    id: "6",
    slug: "kubek-espresso-ciemny",
    name: "Kubek espresso — ciemny",
    description:
      "Mały kubek na espresso, 80 ml. Ciemna, niemal czarna glazura z miedzianymi refleksami. Idealne do codziennych rytuałów.",
    price: 95,
    category: "kubki",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    ],
    stock: 6,
    featured: false,
    dimensions: "ø 6 cm, wys. 7 cm, 80 ml",
    material: "Glinka szamotowa, glazura metaliczna",
  },
];

export const featuredProducts = products.filter((p) => p.featured);

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 0,
  }).format(price);
}
