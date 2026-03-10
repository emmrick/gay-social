-- Store service role key in vault for pg_net internal calls
-- We retrieve it from the Supabase config (it's the same key used by edge functions)
DO $$
DECLARE
  _key TEXT;
BEGIN
  -- The service role key is available via the supabase_admin role's current_setting
  -- For Lovable Cloud projects, we use the project's known service role key
  SELECT current_setting('app.settings.service_role_key', true) INTO _key;
  
  -- If not available via settings, we'll need to add it manually
  IF _key IS NULL OR _key = '' THEN
    -- Create a placeholder that will be updated
    PERFORM vault.create_secret('placeholder_needs_update', 'supabase_service_role_key', 'Service role key for internal edge function calls');
  ELSE
    PERFORM vault.create_secret(_key, 'supabase_service_role_key', 'Service role key for internal edge function calls');
  END IF;
END $$;