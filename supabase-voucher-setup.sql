-- =====================================================
-- Voucher System - Additional SQL
-- Run in Supabase SQL Editor AFTER the main setup SQL
-- =====================================================

-- 1. Voucher Settings Table
CREATE TABLE IF NOT EXISTS voucher_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  distributor_name TEXT NOT NULL DEFAULT 'محمد عبد الملك',
  brand_name TEXT NOT NULL DEFAULT 'توزيع الذهب والمجوهرات',
  activity_description TEXT DEFAULT 'توزيع الذهب والمجوهرات',
  logo_url TEXT,
  primary_phone TEXT,
  secondary_phone TEXT,
  whatsapp_number TEXT,
  address TEXT,
  footer_note TEXT,
  default_paper_size TEXT NOT NULL DEFAULT 'A4',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE voucher_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voucher_settings_owner_only"
  ON voucher_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_voucher_settings_user ON voucher_settings(user_id);

-- Auto-update updated_at
CREATE TRIGGER voucher_settings_updated_at
  BEFORE UPDATE ON voucher_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Voucher PDFs Metadata Table (tracks archived PDFs)
CREATE TABLE IF NOT EXISTS voucher_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  voucher_number TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  identity_snapshot JSONB NOT NULL, -- snapshot of distributor identity at time of issue
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, transaction_id)
);

ALTER TABLE voucher_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voucher_pdfs_owner_only"
  ON voucher_pdfs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_voucher_pdfs_user ON voucher_pdfs(user_id);
CREATE INDEX IF NOT EXISTS idx_voucher_pdfs_transaction ON voucher_pdfs(transaction_id);

-- =====================================================
-- Supabase Storage Buckets (run separately in dashboard
-- or via this SQL if using storage schema)
-- =====================================================
-- NOTE: Create these buckets manually in Supabase Dashboard > Storage:
-- 1. "brand-assets"  (private, 2MB limit, allow: image/*)
-- 2. "voucher-pdfs"  (private, 10MB limit, allow: application/pdf)
--
-- Then add Storage Policies for each bucket:
-- brand-assets:
--   INSERT: (storage.foldername(name))[1] = auth.uid()::text
--   SELECT: (storage.foldername(name))[1] = auth.uid()::text
--   DELETE: (storage.foldername(name))[1] = auth.uid()::text
--   UPDATE: (storage.foldername(name))[1] = auth.uid()::text
--
-- voucher-pdfs:
--   Same as brand-assets
