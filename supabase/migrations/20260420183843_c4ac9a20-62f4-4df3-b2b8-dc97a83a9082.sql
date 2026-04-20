ALTER PUBLICATION supabase_realtime ADD TABLE public.educator_profiles;
ALTER TABLE public.educator_profiles REPLICA IDENTITY FULL;