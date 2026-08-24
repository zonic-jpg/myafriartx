-- UPDATE policy for rooms bucket: owner-scoped
CREATE POLICY "rooms_owner_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'rooms' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'rooms' AND auth.uid()::text = (storage.foldername(name))[1]);

-- UPDATE policy for renders bucket: owner-scoped
CREATE POLICY "renders_owner_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'renders' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'renders' AND auth.uid()::text = (storage.foldername(name))[1]);