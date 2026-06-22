-- Uruchom w Supabase SQL Editor (Project → SQL Editor)
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "shippingMethod"   TEXT NOT NULL DEFAULT 'courier',
  ADD COLUMN IF NOT EXISTS "parcelLockerCode" TEXT,
  ADD COLUMN IF NOT EXISTS "trackingNumber"   TEXT,
  ADD COLUMN IF NOT EXISTS "trackingCarrier"  TEXT;
