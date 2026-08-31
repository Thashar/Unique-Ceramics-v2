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
 * Wzorzec pokrywa dwa adresy tego samego pliku: bezpośredni z `public/`
 * i wariant z optymalizatora (`/_next/image?url=...`).
 */
const NOINDEX_IMAGE_PATTERN = "thashar-wordmark";

const noIndexImageHeaders = [
  {
    source: "/images/thashar-wordmark.webp",
    headers: [{ key: "X-Robots-Tag", value: "noindex" }],
  },
  {
    // `has` na parametrze `url` – sam `source: "/_next/image"` objąłby
    // wszystkie zdjęcia produktów, które mają być indeksowane
    source: "/_next/image",
    has: [
      {
        type: "query" as const,
        key: "url",
        value: `.*${NOINDEX_IMAGE_PATTERN}.*`,
      },
    ],
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
  },
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
  compiler: {
    removeConsole: { exclude: ["error", "warn"] },
  },
  images: {
    // Next 16 domyślnie dopuszcza tylko `qualities: [75]`. Zdjęcia z panelu są już raz
    // skompresowane (WebP q82 przy uploadzie), więc drugie przejście przy q75 widać na
    // gładkich powierzchniach ceramiki. To **jakość optymalizatora decyduje o wyniku** –
    // podnoszenie jakości pliku w Storage nic nie zmienia (zmierzone). Zdjęcia treściowe
    // renderujemy więc z `quality={90}`; wartość musi być na tej liście, inaczej Next
    // cicho sprowadzi ją do najbliższej dozwolonej.
    qualities: [75, 90],
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
