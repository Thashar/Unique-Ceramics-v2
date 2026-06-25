-- Uruchom w Supabase SQL Editor (Project → SQL Editor)
-- Dodaje wersję tokenu sesji do użytkownika. Inkrementacja tej wartości
-- unieważnia wszystkie aktywne JWT danego użytkownika — wykorzystywane przy
-- zmianie hasła (rewokacja sesji) oraz wykrywane w callbacku jwt (auth.ts).
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
