-- Fix handle_new_user: set search_path and read starting_bankroll from metadata

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username    TEXT;
  final_username   TEXT;
  counter          INTEGER := 0;
  init_bankroll    NUMERIC(12,2);
BEGIN
  -- Generate base username from email or metadata
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  -- Sanitize: lowercase, remove special chars, max 20 chars
  base_username := LOWER(REGEXP_REPLACE(base_username, '[^a-z0-9_]', '', 'g'));
  base_username := LEFT(base_username, 20);
  IF LENGTH(base_username) < 3 THEN
    base_username := 'user';
  END IF;

  -- Ensure unique username
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;

  -- Parse starting_bankroll from metadata (default 0)
  init_bankroll := COALESCE(
    (NEW.raw_user_meta_data->>'starting_bankroll')::NUMERIC,
    0
  );

  INSERT INTO public.profiles (id, username, display_name, avatar_url, starting_bankroll, current_bankroll, peak_bankroll)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', final_username),
    NEW.raw_user_meta_data->>'avatar_url',
    init_bankroll,
    init_bankroll,
    init_bankroll
  );

  -- Create default user settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
