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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pdfkit"],
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
  compiler: {
    removeConsole: { exclude: ["error", "warn"] },
  },
  images: {
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
    ];
  },
};

export default nextConfig;
