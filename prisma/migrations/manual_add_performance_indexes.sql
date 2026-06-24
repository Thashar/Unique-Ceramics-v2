-- Indeksy wydajnościowe — dodane 2026-06-25
-- Indeks pokrywający sortowanie getShopProducts (featured DESC, createdAt DESC)
CREATE INDEX IF NOT EXISTS "Product_active_featured_createdAt_idx" ON "Product"("active", "featured", "createdAt" DESC);

-- Indeks dla findFirst({ where: { slug, active } }) na stronie produktu
CREATE INDEX IF NOT EXISTS "Product_slug_active_idx" ON "Product"("slug", "active");

-- Indeksy na CustomOrder — panel admina filtruje po statusie i emailu
CREATE INDEX IF NOT EXISTS "CustomOrder_status_idx"        ON "CustomOrder"("status");
CREATE INDEX IF NOT EXISTS "CustomOrder_customerEmail_idx" ON "CustomOrder"("customerEmail");
