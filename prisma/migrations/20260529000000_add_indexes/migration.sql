-- Indeksy złożone na Product — najczęstsze filtry w sklepie
CREATE INDEX "Product_active_featured_idx" ON "Product"("active", "featured");
CREATE INDEX "Product_active_category_idx" ON "Product"("active", "category");
CREATE INDEX "Product_active_stock_idx"    ON "Product"("active", "stock");

-- Indeksy na Order — panel admina i historia zamówień klienta
CREATE INDEX "Order_userId_idx"    ON "Order"("userId");
CREATE INDEX "Order_status_idx"    ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt" DESC);
