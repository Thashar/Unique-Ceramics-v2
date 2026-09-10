import type { NextConfig } from "next";

// Nagłówki bezpieczeństwa dla wszystkich odpowiedzi.
// CSP: 'unsafe-inline' dla skryptów/stylów jest wymagane przez inline runtime
// Next.js i style frameworków; frame-src dla osadzonej mapy Google w stopce.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://geowidget.inpost.pl",
      "style-src 'self' 'unsafe-inline' https://geowidget.inpost.pl",
      "img-src 'self' blob: data: https://*.supabase.co https://geowidget.inpost.pl https://*.inpost.pl",
      "font-src 'self' data: https://geowidget.inpost.pl",
      "connect-src 'self' https://api-shipx-pl.easypack24.net https://geowidget.inpost.pl",
      "frame-src https://www.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

/**
 * Obrazy, które mają zniknąć z Grafiki Google. Googlebot musi je **pobrać**,
 * żeby zobaczyć `X-Robots-Tag: noindex` – dlatego NIE blokujemy ich w robots.txt
 * (disallow uniemożliwiłby odczytanie nagłówka i obraz zostałby w indeksie).
 *
 * Wzorzec obejmuje plik **razem z wariantami rozmiarowymi** (`-w400`, `-w800`…),
 * bo `next/image` serwuje w `srcSet` właśnie je – wpis na samą nazwę zostawiłby
 * warianty indeksowalne. Adres z optymalizatora (`/_next/image?url=…`) już nie
 * istnieje: sklep używa własnego loadera i wskazuje pliki wprost (patrz `images`).
 */
const noIndexImageHeaders = [
  {
    source: "/images/:file(thashar-wordmark[^/]*)",
    headers: [{ key: "X-Robots-Tag", value: "noindex" }],
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // pdfkit i sharp to paczki natywne – nie mogą przechodzić przez bundler
  serverExternalPackages: ["pdfkit", "sharp"],

  // Binarka sharpa (`@img/sharp-linux-x64`) ładuje bibliotekę `libvips-cpp.so`
  // z sąsiedniej paczki (`@img/sharp-libvips-linux-x64`) przez dlopen, a nie
  // przez `require`. Śledzenie plików (NFT) tego nie widzi i wycinało .so
  // z funkcji na produkcji – trasy padały wtedy na starcie z
  // `ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3: cannot open shared object file`
  // (w panelu: „nie udało się wgrać zdjęcia (błąd 500)"). Dokładamy więc obie
  // paczki jawnie do śladu tras, które używają sharpa.
  outputFileTracingIncludes: {
    "/api/admin/upload": ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
    "/api/admin/rotate": ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
    "/api/admin/ai-image": ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
    "/api/admin/ai-text": ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
    "/api/og/[slug]": ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
    "/api/admin/image-variants": ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
  },
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
  compiler: {
    removeConsole: { exclude: ["error", "warn"] },
  },
  images: {
    // ⚠️ **Optymalizator obrazów Vercela jest wyłączony – celowo.**
    // Vercel nalicza jedną transformację za każde wyliczenie wariantu (plik ×
    // szerokość × jakość), także przy odświeżeniu wpisu w cache. Supabase Storage
    // odpowiada nagłówkiem `cache-control: no-cache`, a czas życia wariantu to
    // `max(minimumCacheTTL, cache-control źródła)` – przy domyślnych 4 godzinach
    // te same zdjęcia były przeliczane po kilka razy dziennie. Limit planu Hobby
    // (5 000/miesiąc) pękał w kilka dni, `/_next/image` odpowiadało wtedy `402`
    // (`x-vercel-error: OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`), a zamiast
    // zdjęcia przeglądarka pokazywała tekst `alt`. Tak zniknęły miniatury na
    // karcie produktu (09.09.2026): duże zdjęcie miało już swój wariant w cache,
    // miniatury prosiły o nowy i dostawały błąd.
    //
    // W zamian **generujemy rozmiary sami, raz, przy wgrywaniu zdjęcia** (`sharp`
    // na trasach admina – patrz `lib/image-variants.ts`), a `next/image` wskazuje
    // je własnym loaderem. `srcSet` działa jak dotąd, więc przeglądarka nadal
    // pobiera plik dopasowany do ekranu – znika tylko koszt platformy.
    // **Nie wracaj do wbudowanego optymalizatora** bez rozwiązania sprawy cache;
    // samo podniesienie planu tylko przesuwa próg.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",

    // Muszą się zgadzać z `IMAGE_VARIANT_WIDTHS` – Next buduje `srcSet` z tych
    // list i dla każdej wartości woła loader. Szerokość bez odpowiadającego pliku
    // dostałaby najbliższy większy wariant, czyli zbyt duże zdjęcie.
    // `imageSizes` muszą być mniejsze od najmniejszego `deviceSizes`.
    imageSizes: [400],
    deviceSizes: [800, 1600],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    // Stare ścieżki JPG/PNG → WebP (po konwersji statycznych plików)
    const renamedImages = [
      "hero", "about-photo", "warsztaty-photo",
      "logo",
      "products/filizanka-karmelowa-z-podstawka",
      "products/filizanka-kopernik-niebieskie-wnetrze",
      "products/filizanka-rozowa-serce-widok-gory",
      "products/filizanka-szaro-niebieska-z-podstawka",
      "products/filizanki-espresso-kwiatek-serce-komplet",
      "products/kolekcja-rozne-wyroby",
      "products/kubek-kopernik-niebieskie-wnetrze",
      "products/kubek-rozowy-z-sercem",
      "products/kubek-zielony-z-kwiatkiem",
      "products/kubki-szaro-niebieskie-komplet",
      "products/kubki-zielone-z-kwiatkiem-komplet",
      "products/latarenki-tealight",
      "products/miseczka-niebieskie-wnetrze",
      "products/miska-granatowa",
      "products/podstawki-liscie-komplet",
      "products/swieczniki-motyw-slonca",
      "products/talerze-owalne-z-miseczkami",
      "products/ulotka-marketingowa",
      "products/zestaw-kopernik-komplet",
    ];
    return renamedImages.flatMap((name) => [
      { source: `/images/${name}.jpg`,  destination: `/images/${name}.webp`, permanent: true },
      { source: `/images/${name}.jpeg`, destination: `/images/${name}.webp`, permanent: true },
      { source: `/images/${name}.png`,  destination: `/images/${name}.webp`, permanent: true },
    ]);
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      ...noIndexImageHeaders,
    ];
  },
};

export default nextConfig;
