-- Rozdzielenie kosztów AI na zdjęcia i teksty (przycisk „Uzupełnij przy użyciu AI”).
-- Wykonaj ręcznie w Supabase → SQL Editor.
--
-- Uruchom, jeśli tabela "AiImageUsage" powstała wcześniej z manual_add_ai_image_usage.sql
-- bez kolumny "kind". Przy świeżej instalacji wystarczy tamten plik – kolumna jest już w nim.
-- Istniejące wpisy to generowania zdjęć, więc domyślna wartość 'image' jest dla nich poprawna.

ALTER TABLE "AiImageUsage"
    ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'image';
