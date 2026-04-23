
-- 1. Restrict user_roles self-insert to 'parent' only
DROP POLICY IF EXISTS "Users insert own role on signup" ON public.user_roles;
CREATE POLICY "Users self-assign parent role only"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'parent'::public.app_role);

-- 2. SECURITY DEFINER helper for educator role assignment (called from server fn)
CREATE OR REPLACE FUNCTION public.assign_educator_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'educator'::public.app_role)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 3. Admin DELETE on vetting_documents
CREATE POLICY "Admins delete vetting docs"
  ON public.vetting_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. Educator DELETE/UPDATE own vetting documents
CREATE POLICY "Educators delete own vetting docs"
  ON public.vetting_documents FOR DELETE TO authenticated
  USING (auth.uid() = educator_id);

CREATE POLICY "Educators update own vetting docs"
  ON public.vetting_documents FOR UPDATE TO authenticated
  USING (auth.uid() = educator_id AND status = 'pending'::public.vetting_status)
  WITH CHECK (auth.uid() = educator_id);

-- 5. Storage policies for vetting-docs bucket
DROP POLICY IF EXISTS "Educators upload own vetting docs" ON storage.objects;
CREATE POLICY "Educators upload own vetting docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vetting-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'educator'::public.app_role)
  );

DROP POLICY IF EXISTS "Educators read own vetting docs" ON storage.objects;
CREATE POLICY "Educators read own vetting docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'vetting-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'educator'::public.app_role)
  );

CREATE POLICY "Educators delete own vetting storage objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'vetting-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'educator'::public.app_role)
  );

CREATE POLICY "Admins read vetting storage objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'vetting-docs'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins delete vetting storage objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'vetting-docs'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 6. Restrict allowed MIME types and size on vetting-docs bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf'],
    file_size_limit = 10 * 1024 * 1024
WHERE id = 'vetting-docs';
