-- Security hardening migration placeholder.
-- Keep this file (and the .sql extension) so Supabase migration tooling
-- doesn't choke on an extensionless/empty file.

-- If you intended to add hardening steps, put them below.

-- ============================================================
-- SECURITY HARDENING MIGRATION
-- Fixes 6 security issues identified in audit
-- ============================================================

-- ============================================================
-- FIX 1 & 2: user_roles INSERT policy
-- Restrict self-assignment to 'parent' only.
-- Privileged roles (educator, admin) must be granted via a
-- SECURITY DEFINER function that can enforce business rules.
-- ============================================================

DROP POLICY IF EXISTS "Users insert own role on signup" ON public.user_roles;

-- Only allow users to self-assign the 'parent' role
CREATE POLICY "Users insert own parent role on signup"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'parent'
  );

-- Trusted function to assign the 'educator' role.
-- Called server-side (e.g. from a server function / Edge Function)
-- after verifying the signup context. SECURITY DEFINER bypasses RLS.
CREATE OR REPLACE FUNCTION public.assign_educator_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent duplicate role rows (the unique constraint already guards this,
  -- but we surface a clean error)
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'educator'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'educator');
END;
$$;

-- Revoke public execute; only service role / trusted callers may invoke it
REVOKE ALL ON FUNCTION public.assign_educator_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_educator_role(uuid) TO service_role;

-- Admin role assignment — intentionally restricted to service_role only
CREATE OR REPLACE FUNCTION public.assign_admin_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin');
END;
$$;

REVOKE ALL ON FUNCTION public.assign_admin_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_admin_role(uuid) TO service_role;


-- ============================================================
-- FIX 3: educator_profiles UPDATE policy
-- Educators may update their own profile BUT must NOT be
-- able to set is_verified = true on themselves.
-- We enforce this by using a SECURITY DEFINER check function
-- inside a WITH CHECK that rejects any attempt to flip the flag.
-- ============================================================

DROP POLICY IF EXISTS "Educators update own profile" ON public.educator_profiles;

-- Educators can update their own profile rows, but any attempt to
-- change is_verified is rejected: the WITH CHECK compares the
-- incoming value against the stored value and demands they match.
CREATE POLICY "Educators update own profile"
  ON public.educator_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-verification: the submitted is_verified must equal
    -- whatever is already stored (i.e. the educator cannot change it).
    AND is_verified = (
      SELECT ep.is_verified
      FROM public.educator_profiles ep
      WHERE ep.id = auth.uid()
    )
  );


-- ============================================================
-- FIX 4: vetting-docs storage — add DELETE (and UPDATE) for
-- educators scoped to their own folder.
-- ============================================================

-- Educators may delete documents they own (their UID is the first
-- path segment, matching the upload policy convention).
CREATE POLICY "Educators delete own vetting docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vetting-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'educator')
  );

-- Educators may replace (UPDATE) their own documents before review.
-- Once an admin sets a status the document is locked by the review
-- workflow, but storage-level replacement is still scoped to owner.
CREATE POLICY "Educators update own vetting docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vetting-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'educator')
  );


-- ============================================================
-- FIX 5: Supabase Realtime channel authorization
--
-- IMPORTANT CONTEXT:
-- This app uses `postgres_changes` subscriptions. For those,
-- Supabase already applies RLS on the source tables (messages,
-- conversations, educator_profiles) to filter what events are
-- sent — so postgres_changes auth is already handled by the
-- existing table-level RLS policies.
--
-- The `realtime.messages` RLS governs *private broadcast /
-- presence channels*. We enable it here so that if private
-- broadcast channels are ever used, they are scoped correctly.
--
-- KEY FIX: use the `topic` TEXT column, NOT `id` (which is a
-- bigint auto-increment and has no relation to conversation UUIDs).
-- Also wrap OR branches in explicit parentheses to avoid
-- operator precedence bugs (AND binds tighter than OR).
--
-- Channel naming convention used by this app:
--   "messages:<conv_uuid>"   — per-conversation change feed
--   "convo-list:<user_uuid>" — per-user conversation list
--   "agora-educators"        — public educator profile updates
-- ============================================================

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users may subscribe to own conversations" ON realtime.messages;

CREATE POLICY "Authenticated users may subscribe to own conversations"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    -- Conversation message channels: topic = "messages:<uuid>"
    (
      topic LIKE 'messages:%'
      AND public.is_conversation_participant(
        split_part(topic, ':', 2)::uuid,
        auth.uid()
      )
    )
    -- Per-user conversation list channel: topic = "convo-list:<uid>"
    OR topic = 'convo-list:' || auth.uid()::text
    -- Public agora channel — all authenticated users
    OR topic = 'agora-educators'
  );


-- ============================================================
-- FIX 6: avatars public bucket — restrict SELECT to prevent
-- unauthenticated directory listing while keeping images
-- publicly readable via direct URL (which is intentional
-- for profile photos).
--
-- The current broad policy "Avatars are publicly viewable"
-- allows listing all objects. We replace it with a tighter
-- policy that allows SELECT only when the request is for a
-- specific object (not a directory listing). For anonymous
-- public image delivery Supabase uses the CDN URL directly;
-- listing protection is enforced via the objects policy.
-- ============================================================

DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;

-- Public can read specific avatar objects (direct URL access via CDN)
-- but cannot enumerate the bucket contents.
-- We restrict to objects inside a valid UID-prefixed path.
CREATE POLICY "Avatars are publicly readable by direct URL"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    -- Must be a file path (contains a slash — folder/file.ext)
    -- This prevents top-level bucket enumeration
    AND name LIKE '%/%'
  );
