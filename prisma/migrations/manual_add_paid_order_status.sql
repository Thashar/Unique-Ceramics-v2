-- Uruchom w Supabase SQL Editor (Project → SQL Editor)
-- Dodaje status PAID (Opłacone) do enuma OrderStatus, między CONFIRMED a IN_PROGRESS.
-- Uwaga: ALTER TYPE ... ADD VALUE nie może działać wewnątrz transakcji —
-- wykonaj to zapytanie jako osobne (nie w bloku BEGIN/COMMIT).
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAID' BEFORE 'IN_PROGRESS';
