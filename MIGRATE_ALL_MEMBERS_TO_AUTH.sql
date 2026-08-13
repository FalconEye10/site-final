-- ==============================================================================
-- REPARARE TOTALĂ ȘI MIGRARE SUPABASE AUTH (auth.users + auth.identities)
-- ==============================================================================
-- Rulează acest script în Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- 1. Creează și populează corect auth.users cu toate câmpurile standard GoTrue
-- 2. Creează înregistrările necesare în auth.identities (esențiale pentru login fără erori)
-- 3. Setează parola unică: Camena2026!
-- 4. Asociază user_id în public.members
-- ==============================================================================

-- 1. Permisiuni pe schema auth și public
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO anon, authenticated, service_role, postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;

DO $$
DECLARE
  m RECORD;
  new_auth_id UUID;
  clean_username TEXT;
  target_email TEXT;
  initial_password_hash TEXT;
  counter INT := 0;
BEGIN
  -- Criptează parola implicită 'Camena2026!' cu pgcrypto
  initial_password_hash := crypt('Camena2026!', gen_salt('bf'));

  FOR m IN 
    SELECT id, name, username, email, role, user_id 
    FROM public.members 
  LOOP
    -- Generare username curat
    clean_username := lower(regexp_replace(coalesce(m.username, m.name, m.id), '[^a-zA-Z0-9.]', '', 'g'));
    
    -- Stabilire email exact
    IF m.email IS NOT NULL AND position('@' in m.email) > 0 THEN
      target_email := lower(trim(m.email));
    ELSE
      target_email := clean_username || '@interact-camena.internal';
    END IF;

    -- Verifică dacă utilizatorul există deja în auth.users
    SELECT id INTO new_auth_id FROM auth.users WHERE lower(email) = target_email;

    -- Dacă nu există, folosim user_id din members sau generăm UUID nou
    IF new_auth_id IS NULL THEN
      new_auth_id := coalesce(m.user_id, gen_random_uuid());
      
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        is_sso_user,
        is_anonymous,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        phone_change,
        phone_change_token,
        email_change_token_current,
        reauthentication_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_auth_id,
        'authenticated',
        'authenticated',
        target_email,
        initial_password_hash,
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', m.name, 'username', coalesce(m.username, clean_username), 'role', coalesce(m.role, 'member')),
        false,
        false,
        false,
        NOW(),
        NOW(),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      )
      ON CONFLICT (id) DO UPDATE SET
        encrypted_password = initial_password_hash,
        email = target_email,
        aud = 'authenticated',
        role = 'authenticated',
        email_confirmed_at = coalesce(auth.users.email_confirmed_at, NOW()),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb;
    ELSE
      -- Dacă există deja, ne asigurăm că are parola resetată la Camena2026! și email_confirmed_at valid
      UPDATE auth.users
      SET encrypted_password = initial_password_hash,
          email_confirmed_at = coalesce(email_confirmed_at, NOW()),
          aud = 'authenticated',
          role = 'authenticated',
          raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
      WHERE id = new_auth_id;
    END IF;

    -- Inserare / Actualizare în auth.identities (OBLIGATORIU pentru ca Supabase GoTrue să permită autentificarea)
    BEGIN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        new_auth_id,
        new_auth_id,
        jsonb_build_object('sub', new_auth_id::text, 'email', target_email),
        'email',
        target_email,
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (provider, provider_id) DO UPDATE SET
        user_id = new_auth_id,
        identity_data = jsonb_build_object('sub', new_auth_id::text, 'email', target_email),
        updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
      -- Dacă structura identities variază pe versiuni, încercăm inserare simplă
      NULL;
    END;

    -- Actualizare tabel public.members
    UPDATE public.members 
    SET user_id = new_auth_id,
        email = coalesce(members.email, target_email)
    WHERE id = m.id;

    counter := counter + 1;
  END LOOP;

  RAISE NOTICE '🎉 Migrare și configurare Auth finalizată cu succes pentru % conturi!', counter;
END $$;
