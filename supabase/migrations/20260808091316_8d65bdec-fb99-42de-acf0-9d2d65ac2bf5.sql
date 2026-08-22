CREATE POLICY "store_read_all" ON storage.objects FOR SELECT USING (bucket_id = 'store');
CREATE POLICY "store_admin_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'store' AND public.is_super_admin());
CREATE POLICY "store_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'store' AND public.is_super_admin()) WITH CHECK (bucket_id = 'store' AND public.is_super_admin());
CREATE POLICY "store_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'store' AND public.is_super_admin());