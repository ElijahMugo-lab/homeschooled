-- Trigger to auto-assign admin role to the designated admin email on signup
CREATE OR REPLACE FUNCTION public.handle_admin_email_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(NEW.email) = 'eliquitel@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_admin_role ON auth.users;
CREATE TRIGGER on_auth_user_created_admin_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_email_role();

-- Back-fill: ensure the designated admin email has the admin role right now
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'eliquitel@gmail.com'
ON CONFLICT DO NOTHING;
