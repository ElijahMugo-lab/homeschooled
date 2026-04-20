-- Sessions table: one per "completed engagement" inside a conversation
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL,
  educator_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_conversation ON public.sessions(conversation_id);
CREATE INDEX idx_sessions_parent ON public.sessions(parent_id);
CREATE INDEX idx_sessions_educator ON public.sessions(educator_id);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view sessions"
  ON public.sessions FOR SELECT TO authenticated
  USING (auth.uid() = parent_id OR auth.uid() = educator_id);

CREATE POLICY "Educators mark sessions complete"
  ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = educator_id
    AND public.has_role(auth.uid(), 'educator')
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );

-- Ratings: ratee is always the OTHER party
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL,
  ratee_id uuid NOT NULL,
  ratee_role text NOT NULL CHECK (ratee_role IN ('parent','educator')),
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  note text CHECK (note IS NULL OR length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, rater_id)
);

CREATE INDEX idx_ratings_ratee ON public.ratings(ratee_id);
CREATE INDEX idx_ratings_session ON public.ratings(session_id);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- INSERT: rater must be a participant of the session, and the ratee must be the OTHER party
CREATE POLICY "Participants submit ratings"
  ON public.ratings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = rater_id
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          (s.parent_id = auth.uid() AND s.educator_id = ratee_id AND ratee_role = 'educator')
          OR
          (s.educator_id = auth.uid() AND s.parent_id = ratee_id AND ratee_role = 'parent')
        )
    )
  );

-- SELECT: never reveal individual ratings. Only admins can read raw rows.
CREATE POLICY "Admins view all ratings"
  ON public.ratings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Parent aggregate (private)
CREATE TABLE public.parent_ratings (
  parent_id uuid PRIMARY KEY,
  rating_avg numeric NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_ratings ENABLE ROW LEVEL SECURITY;

-- Parent can see their own aggregate
CREATE POLICY "Parents view own aggregate"
  ON public.parent_ratings FOR SELECT TO authenticated
  USING (auth.uid() = parent_id);

-- Educators can see the aggregate for parents they've messaged with
CREATE POLICY "Educators view aggregate of contacted parents"
  ON public.parent_ratings FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'educator')
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.educator_id = auth.uid() AND c.parent_id = parent_ratings.parent_id
    )
  );

CREATE POLICY "Admins view all parent aggregates"
  ON public.parent_ratings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Recompute aggregates after a rating is inserted
CREATE OR REPLACE FUNCTION public.recompute_rating_aggregate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_avg numeric;
  new_count integer;
BEGIN
  IF NEW.ratee_role = 'educator' THEN
    SELECT COALESCE(AVG(stars), 0)::numeric(3,2), COUNT(*)
      INTO new_avg, new_count
    FROM public.ratings
    WHERE ratee_id = NEW.ratee_id AND ratee_role = 'educator';

    UPDATE public.educator_profiles
      SET rating_avg = new_avg, rating_count = new_count, updated_at = now()
      WHERE id = NEW.ratee_id;
  ELSIF NEW.ratee_role = 'parent' THEN
    SELECT COALESCE(AVG(stars), 0)::numeric(3,2), COUNT(*)
      INTO new_avg, new_count
    FROM public.ratings
    WHERE ratee_id = NEW.ratee_id AND ratee_role = 'parent';

    INSERT INTO public.parent_ratings (parent_id, rating_avg, rating_count, updated_at)
      VALUES (NEW.ratee_id, new_avg, new_count, now())
    ON CONFLICT (parent_id) DO UPDATE
      SET rating_avg = EXCLUDED.rating_avg,
          rating_count = EXCLUDED.rating_count,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recompute_rating
AFTER INSERT ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.recompute_rating_aggregate();

-- Helper: has the current user already rated this session?
CREATE OR REPLACE FUNCTION public.has_user_rated_session(_session_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ratings WHERE session_id = _session_id AND rater_id = _user_id
  )
$$;