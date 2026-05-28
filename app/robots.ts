import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/konto/", "/logowanie", "/rejestracja"],
    },
    sitemap: "https://uniqueceramics.pl/sitemap.xml",
  };
}
