-- سياسات Storage - الصق هذا في SQL Editor واضغط Run
-- =====================================================

-- تحديث الـ Buckets (لو ما اتعرفوا من الـ UI)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('brand-assets', 'brand-assets', false, 2097152, ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml']),
  ('voucher-pdfs', 'voucher-pdfs', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- سياسات brand-assets
CREATE POLICY "brand_assets_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "brand_assets_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "brand_assets_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "brand_assets_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- سياسات voucher-pdfs
CREATE POLICY "voucher_pdfs_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'voucher-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "voucher_pdfs_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voucher-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "voucher_pdfs_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'voucher-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "voucher_pdfs_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'voucher-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
