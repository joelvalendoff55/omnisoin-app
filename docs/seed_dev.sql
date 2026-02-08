-- ============================================================================
-- OmniSoin Assist - Dev Seed Data
-- ============================================================================
-- 
-- INSTRUCTIONS:
-- 1. Créer un utilisateur de test via /auth (signup)
-- 2. Récupérer l'UUID de l'utilisateur (voir section CONFIG ci-dessous)
-- 3. Remplacer 'PUT_TEST_USER_UUID_HERE' par l'UUID réel
-- 4. Copier-coller ce script dans SQL Editor (Lovable Cloud > Database > SQL)
-- 5. Exécuter le script
--
-- RÉCUPÉRER L'UUID DE L'UTILISATEUR:
--   SELECT id FROM auth.users WHERE email = 'votre-email@test.com';
--
-- NOTE: Les utilisateurs auth.users ne peuvent pas être créés via SQL.
--
-- ============================================================================

-- ===========================================================================
-- CONFIG - MODIFIER CETTE SECTION
-- ===========================================================================
-- ⚠️ IMPORTANT: Remplacez l'UUID ci-dessous par celui de votre utilisateur de test
-- Pour obtenir l'UUID: SELECT id FROM auth.users WHERE email = 'test@omnisoin.local';

DO $$
DECLARE
  -- ==========================================
  -- 🔧 MODIFIER ICI AVEC VOTRE UUID
  -- ==========================================
  SEED_TEST_USER_UUID uuid := 'PUT_TEST_USER_UUID_HERE';
  
  -- Fixed UUIDs for deterministic tests
  SEED_STRUCTURE_UUID uuid := '11111111-1111-1111-1111-111111111111';
  
BEGIN
  -- Validate that UUID has been configured
  IF SEED_TEST_USER_UUID::text = 'PUT_TEST_USER_UUID_HERE' THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ================================================================';
    RAISE NOTICE '⚠️  SEED_TEST_USER_UUID non configuré!';
    RAISE NOTICE '⚠️  ';
    RAISE NOTICE '⚠️  1. Créez un utilisateur via /auth';
    RAISE NOTICE '⚠️  2. Exécutez: SELECT id FROM auth.users WHERE email = ''votre-email'';';
    RAISE NOTICE '⚠️  3. Remplacez PUT_TEST_USER_UUID_HERE par l''UUID obtenu';
    RAISE NOTICE '⚠️  4. Re-exécutez ce script';
    RAISE NOTICE '⚠️  ================================================================';
    RAISE NOTICE '';
    RAISE EXCEPTION 'SEED_TEST_USER_UUID must be configured before running this script';
  END IF;
  
  -- Verify user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = SEED_TEST_USER_UUID) THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ User with UUID % does not exist in auth.users', SEED_TEST_USER_UUID;
    RAISE NOTICE '   Please verify the UUID or create the user first.';
    RAISE NOTICE '';
    RAISE EXCEPTION 'User not found in auth.users';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ SEED_TEST_USER_UUID validated: %', SEED_TEST_USER_UUID;
  RAISE NOTICE '';
  
  -- Store the UUID for later use in other blocks
  PERFORM set_config('seed.test_user_uuid', SEED_TEST_USER_UUID::text, false);
  PERFORM set_config('seed.structure_uuid', SEED_STRUCTURE_UUID::text, false);
END $$;

-- ===========================================================================
-- STRUCTURE
-- ===========================================================================
DO $$ 
DECLARE
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM structures WHERE id = structure_uuid) THEN
    INSERT INTO structures (id, name, slug, email, phone, address, country, timezone, is_active)
    VALUES (
      structure_uuid,
      'OmniSoin Assist Demo',
      'omnisoin-demo',
      'demo@omnisoin.local',
      '+33600000000',
      '1 rue de la Santé, 75001 Paris',
      'FR',
      'Europe/Paris',
      true
    );
    RAISE NOTICE 'Structure created: OmniSoin Assist Demo';
  ELSE
    RAISE NOTICE 'Structure already exists: OmniSoin Assist Demo';
  END IF;
END $$;

-- ===========================================================================
-- PROFILE - UPSERT for test user
-- ===========================================================================
DO $$ 
DECLARE
  test_user_uuid uuid := current_setting('seed.test_user_uuid')::uuid;
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  -- Upsert profile for test user
  INSERT INTO profiles (user_id, structure_id, first_name, last_name)
  VALUES (
    test_user_uuid,
    structure_uuid,
    'Test',
    'User'
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    structure_id = EXCLUDED.structure_id,
    updated_at = now();
    
  RAISE NOTICE 'Profile upserted for user: %', test_user_uuid;
END $$;

-- ===========================================================================
-- USER ROLE - UPSERT admin role for test user
-- ===========================================================================
DO $$ 
DECLARE
  test_user_uuid uuid := current_setting('seed.test_user_uuid')::uuid;
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  -- Upsert user role
  INSERT INTO user_roles (user_id, structure_id, role, is_active)
  VALUES (
    test_user_uuid,
    structure_uuid,
    'admin',
    true
  )
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    structure_id = EXCLUDED.structure_id,
    is_active = true,
    updated_at = now();
    
  RAISE NOTICE 'User role upserted: admin for user %', test_user_uuid;
END $$;

-- ===========================================================================
-- PATIENTS
-- ===========================================================================

-- Patient 1: Jean Dupont
DO $$ 
DECLARE
  test_user_uuid uuid := current_setting('seed.test_user_uuid')::uuid;
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM patients WHERE id = '22222222-2222-2222-2222-222222222201') THEN
    INSERT INTO patients (
      id, 
      structure_id, 
      user_id,
      first_name, 
      last_name, 
      email, 
      phone, 
      dob, 
      sex,
      note_admin,
      is_archived
    )
    VALUES (
      '22222222-2222-2222-2222-222222222201',
      structure_uuid,
      test_user_uuid,
      'Jean',
      'Dupont',
      'jean.dupont@email.com',
      '+33612345678',
      '1985-03-15',
      'M',
      'Patient régulier, suivi trimestriel',
      false
    );
    RAISE NOTICE 'Patient created: Jean Dupont';
  ELSE
    RAISE NOTICE 'Patient already exists: Jean Dupont';
  END IF;
END $$;

-- Patient 2: Marie Martin
DO $$ 
DECLARE
  test_user_uuid uuid := current_setting('seed.test_user_uuid')::uuid;
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM patients WHERE id = '22222222-2222-2222-2222-222222222202') THEN
    INSERT INTO patients (
      id, 
      structure_id, 
      user_id,
      first_name, 
      last_name, 
      email, 
      phone, 
      dob, 
      sex,
      is_archived
    )
    VALUES (
      '22222222-2222-2222-2222-222222222202',
      structure_uuid,
      test_user_uuid,
      'Marie',
      'Martin',
      'marie.martin@email.com',
      '+33698765432',
      '1990-07-22',
      'F',
      false
    );
    RAISE NOTICE 'Patient created: Marie Martin';
  ELSE
    RAISE NOTICE 'Patient already exists: Marie Martin';
  END IF;
END $$;

-- Patient 3: Pierre Bernard (archived)
DO $$ 
DECLARE
  test_user_uuid uuid := current_setting('seed.test_user_uuid')::uuid;
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM patients WHERE id = '22222222-2222-2222-2222-222222222203') THEN
    INSERT INTO patients (
      id, 
      structure_id, 
      user_id,
      first_name, 
      last_name, 
      phone,
      dob, 
      sex,
      is_archived
    )
    VALUES (
      '22222222-2222-2222-2222-222222222203',
      structure_uuid,
      test_user_uuid,
      'Pierre',
      'Bernard',
      '+33655555555',
      '1978-11-08',
      'M',
      true
    );
    RAISE NOTICE 'Patient created: Pierre Bernard (archived)';
  ELSE
    RAISE NOTICE 'Patient already exists: Pierre Bernard';
  END IF;
END $$;

-- ===========================================================================
-- PATIENT TRANSCRIPTS
-- ===========================================================================

-- Transcript 1: Ready avec texte (pour tests AI summary)
DO $$ 
DECLARE
  test_user_uuid uuid := current_setting('seed.test_user_uuid')::uuid;
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM patient_transcripts WHERE id = '33333333-3333-3333-3333-333333333301') THEN
    INSERT INTO patient_transcripts (
      id,
      structure_id,
      patient_id,
      status,
      source,
      language,
      duration_seconds,
      transcript_text,
      audio_path,
      created_by
    )
    VALUES (
      '33333333-3333-3333-3333-333333333301',
      structure_uuid,
      '22222222-2222-2222-2222-222222222201',
      'ready',
      'upload',
      'fr',
      185,
      'Bonjour docteur. Je viens vous voir car j''ai des maux de tête récurrents depuis environ trois semaines. Ça a commencé progressivement, d''abord une fois par semaine, puis maintenant presque tous les jours. La douleur est localisée sur le côté droit de la tête, parfois accompagnée de nausées. J''ai essayé de prendre du paracétamol mais ça ne fait que diminuer temporairement la douleur. Je travaille beaucoup sur écran, environ 8 heures par jour. Je dors mal aussi ces derniers temps, environ 5 heures par nuit.',
      'audio/seed/consultation-dupont-01.mp3',
      test_user_uuid
    );
    RAISE NOTICE 'Transcript created: ready (Jean Dupont)';
  ELSE
    RAISE NOTICE 'Transcript already exists: ready (Jean Dupont)';
  END IF;
END $$;

-- Transcript 2: Uploaded (en attente de transcription)
DO $$ 
DECLARE
  test_user_uuid uuid := current_setting('seed.test_user_uuid')::uuid;
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM patient_transcripts WHERE id = '33333333-3333-3333-3333-333333333302') THEN
    INSERT INTO patient_transcripts (
      id,
      structure_id,
      patient_id,
      status,
      source,
      duration_seconds,
      audio_path,
      created_by
    )
    VALUES (
      '33333333-3333-3333-3333-333333333302',
      structure_uuid,
      '22222222-2222-2222-2222-222222222202',
      'uploaded',
      'upload',
      120,
      'audio/seed/consultation-martin-01.mp3',
      test_user_uuid
    );
    RAISE NOTICE 'Transcript created: uploaded (Marie Martin)';
  ELSE
    RAISE NOTICE 'Transcript already exists: uploaded (Marie Martin)';
  END IF;
END $$;

-- Transcript 3: Another ready transcript
DO $$ 
DECLARE
  test_user_uuid uuid := current_setting('seed.test_user_uuid')::uuid;
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM patient_transcripts WHERE id = '33333333-3333-3333-3333-333333333303') THEN
    INSERT INTO patient_transcripts (
      id,
      structure_id,
      patient_id,
      status,
      source,
      language,
      duration_seconds,
      transcript_text,
      created_by
    )
    VALUES (
      '33333333-3333-3333-3333-333333333303',
      structure_uuid,
      '22222222-2222-2222-2222-222222222202',
      'ready',
      'whatsapp',
      'fr',
      45,
      'Message vocal reçu: Bonjour docteur, je vous rappelle pour vous confirmer mon rendez-vous de demain à 14h. J''ai bien noté qu''il fallait venir à jeun. À demain.',
      test_user_uuid
    );
    RAISE NOTICE 'Transcript created: ready (Marie Martin - WhatsApp)';
  ELSE
    RAISE NOTICE 'Transcript already exists: ready (Marie Martin - WhatsApp)';
  END IF;
END $$;

-- ===========================================================================
-- TRANSCRIPT SUMMARIES
-- ===========================================================================

-- Summary for transcript 1 (ready)
DO $$ 
DECLARE
  test_user_uuid uuid := current_setting('seed.test_user_uuid')::uuid;
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM transcript_summaries WHERE id = '44444444-4444-4444-4444-444444444401') THEN
    INSERT INTO transcript_summaries (
      id,
      transcript_id,
      patient_id,
      structure_id,
      status,
      summary_text,
      model_used,
      generated_by
    )
    VALUES (
      '44444444-4444-4444-4444-444444444401',
      '33333333-3333-3333-3333-333333333301',
      '22222222-2222-2222-2222-222222222201',
      structure_uuid,
      'ready',
      '## Motif de consultation
Maux de tête récurrents depuis 3 semaines, évolution progressive.

## Symptômes rapportés
- Céphalées quotidiennes (côté droit)
- Nausées associées
- Troubles du sommeil (5h/nuit)
- Travail prolongé sur écran (8h/jour)

## Traitements essayés
- Paracétamol : efficacité temporaire limitée

## Points d''attention
- Rechercher syndrome de tension/migraine
- Évaluer hygiène de sommeil
- Considérer ergonomie poste de travail',
      'gemini-2.5-flash',
      test_user_uuid
    );
    RAISE NOTICE 'Summary created: ready (Jean Dupont)';
  ELSE
    RAISE NOTICE 'Summary already exists: ready (Jean Dupont)';
  END IF;
END $$;

-- ===========================================================================
-- INBOX MESSAGES
-- ===========================================================================

-- Message 1: Non assigné (WhatsApp audio)
DO $$ 
DECLARE
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM inbox_messages WHERE id = '55555555-5555-5555-5555-555555555501') THEN
    INSERT INTO inbox_messages (
      id,
      structure_id,
      channel,
      message_type,
      sender_phone,
      status,
      text_body,
      patient_id
    )
    VALUES (
      '55555555-5555-5555-5555-555555555501',
      structure_uuid,
      'whatsapp',
      'text',
      '+33677889900',
      'received',
      'Bonjour, je souhaiterais prendre un rendez-vous pour une consultation. Merci de me rappeler.',
      NULL
    );
    RAISE NOTICE 'Inbox message created: non assigné';
  ELSE
    RAISE NOTICE 'Inbox message already exists: non assigné';
  END IF;
END $$;

-- Message 2: Assigné à patient (audio)
DO $$ 
DECLARE
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM inbox_messages WHERE id = '55555555-5555-5555-5555-555555555502') THEN
    INSERT INTO inbox_messages (
      id,
      structure_id,
      channel,
      message_type,
      sender_phone,
      status,
      media_url,
      media_mime,
      patient_id
    )
    VALUES (
      '55555555-5555-5555-5555-555555555502',
      structure_uuid,
      'whatsapp',
      'audio',
      '+33612345678',
      'ready',
      'https://example.com/audio/message.ogg',
      'audio/ogg',
      '22222222-2222-2222-2222-222222222201'
    );
    RAISE NOTICE 'Inbox message created: assigné (Jean Dupont)';
  ELSE
    RAISE NOTICE 'Inbox message already exists: assigné (Jean Dupont)';
  END IF;
END $$;

-- Message 3: Web form message
DO $$ 
DECLARE
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM inbox_messages WHERE id = '55555555-5555-5555-5555-555555555503') THEN
    INSERT INTO inbox_messages (
      id,
      structure_id,
      channel,
      message_type,
      status,
      text_body,
      patient_id
    )
    VALUES (
      '55555555-5555-5555-5555-555555555503',
      structure_uuid,
      'web',
      'text',
      'received',
      'Demande de renouvellement d''ordonnance pour traitement chronique.',
      '22222222-2222-2222-2222-222222222202'
    );
    RAISE NOTICE 'Inbox message created: web form (Marie Martin)';
  ELSE
    RAISE NOTICE 'Inbox message already exists: web form (Marie Martin)';
  END IF;
END $$;

-- ===========================================================================
-- ACTIVITY LOGS (10 entrées)
-- ===========================================================================

DO $$ 
DECLARE
  test_user_uuid uuid := current_setting('seed.test_user_uuid')::uuid;
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  -- Log 1: Patient created
  IF NOT EXISTS (SELECT 1 FROM activity_logs WHERE id = '66666666-6666-6666-6666-666666666601') THEN
    INSERT INTO activity_logs (id, structure_id, actor_user_id, action, patient_id, metadata, created_at)
    VALUES (
      '66666666-6666-6666-6666-666666666601',
      structure_uuid,
      test_user_uuid,
      'patient.created',
      '22222222-2222-2222-2222-222222222201',
      '{"patient_name": "Jean Dupont"}'::jsonb,
      NOW() - INTERVAL '7 days'
    );
  END IF;

  -- Log 2: Patient created
  IF NOT EXISTS (SELECT 1 FROM activity_logs WHERE id = '66666666-6666-6666-6666-666666666602') THEN
    INSERT INTO activity_logs (id, structure_id, actor_user_id, action, patient_id, metadata, created_at)
    VALUES (
      '66666666-6666-6666-6666-666666666602',
      structure_uuid,
      test_user_uuid,
      'patient.created',
      '22222222-2222-2222-2222-222222222202',
      '{"patient_name": "Marie Martin"}'::jsonb,
      NOW() - INTERVAL '6 days'
    );
  END IF;

  -- Log 3: Transcript uploaded
  IF NOT EXISTS (SELECT 1 FROM activity_logs WHERE id = '66666666-6666-6666-6666-666666666603') THEN
    INSERT INTO activity_logs (id, structure_id, actor_user_id, action, patient_id, metadata, created_at)
    VALUES (
      '66666666-6666-6666-6666-666666666603',
      structure_uuid,
      test_user_uuid,
      'transcript.uploaded',
      '22222222-2222-2222-2222-222222222201',
      '{"transcript_id": "33333333-3333-3333-3333-333333333301"}'::jsonb,
      NOW() - INTERVAL '5 days'
    );
  END IF;

  -- Log 4: Transcript transcribed
  IF NOT EXISTS (SELECT 1 FROM activity_logs WHERE id = '66666666-6666-6666-6666-666666666604') THEN
    INSERT INTO activity_logs (id, structure_id, actor_user_id, action, patient_id, metadata, created_at)
    VALUES (
      '66666666-6666-6666-6666-666666666604',
      structure_uuid,
      test_user_uuid,
      'transcript.transcribed',
      '22222222-2222-2222-2222-222222222201',
      '{"transcript_id": "33333333-3333-3333-3333-333333333301", "language": "fr"}'::jsonb,
      NOW() - INTERVAL '5 days' + INTERVAL '1 hour'
    );
  END IF;

  -- Log 5: Summary generated
  IF NOT EXISTS (SELECT 1 FROM activity_logs WHERE id = '66666666-6666-6666-6666-666666666605') THEN
    INSERT INTO activity_logs (id, structure_id, actor_user_id, action, patient_id, metadata, created_at)
    VALUES (
      '66666666-6666-6666-6666-666666666605',
      structure_uuid,
      test_user_uuid,
      'summary.generated',
      '22222222-2222-2222-2222-222222222201',
      '{"summary_id": "44444444-4444-4444-4444-444444444401", "model": "gemini-2.5-flash"}'::jsonb,
      NOW() - INTERVAL '4 days'
    );
  END IF;

  -- Log 6: Inbox message received
  IF NOT EXISTS (SELECT 1 FROM activity_logs WHERE id = '66666666-6666-6666-6666-666666666606') THEN
    INSERT INTO activity_logs (id, structure_id, actor_user_id, action, patient_id, metadata, created_at)
    VALUES (
      '66666666-6666-6666-6666-666666666606',
      structure_uuid,
      test_user_uuid,
      'inbox.received',
      NULL,
      '{"channel": "whatsapp", "sender_phone": "+33677889900"}'::jsonb,
      NOW() - INTERVAL '3 days'
    );
  END IF;

  -- Log 7: Inbox message assigned
  IF NOT EXISTS (SELECT 1 FROM activity_logs WHERE id = '66666666-6666-6666-6666-666666666607') THEN
    INSERT INTO activity_logs (id, structure_id, actor_user_id, action, patient_id, metadata, created_at)
    VALUES (
      '66666666-6666-6666-6666-666666666607',
      structure_uuid,
      test_user_uuid,
      'inbox.assigned',
      '22222222-2222-2222-2222-222222222201',
      '{"message_id": "55555555-5555-5555-5555-555555555502"}'::jsonb,
      NOW() - INTERVAL '2 days'
    );
  END IF;

  -- Log 8: Patient updated
  IF NOT EXISTS (SELECT 1 FROM activity_logs WHERE id = '66666666-6666-6666-6666-666666666608') THEN
    INSERT INTO activity_logs (id, structure_id, actor_user_id, action, patient_id, metadata, created_at)
    VALUES (
      '66666666-6666-6666-6666-666666666608',
      structure_uuid,
      test_user_uuid,
      'patient.updated',
      '22222222-2222-2222-2222-222222222201',
      '{"fields_updated": ["phone", "email"]}'::jsonb,
      NOW() - INTERVAL '1 day'
    );
  END IF;

  -- Log 9: Patient archived
  IF NOT EXISTS (SELECT 1 FROM activity_logs WHERE id = '66666666-6666-6666-6666-666666666609') THEN
    INSERT INTO activity_logs (id, structure_id, actor_user_id, action, patient_id, metadata, created_at)
    VALUES (
      '66666666-6666-6666-6666-666666666609',
      structure_uuid,
      test_user_uuid,
      'patient.archived',
      '22222222-2222-2222-2222-222222222203',
      '{"patient_name": "Pierre Bernard"}'::jsonb,
      NOW() - INTERVAL '12 hours'
    );
  END IF;

  -- Log 10: Login
  IF NOT EXISTS (SELECT 1 FROM activity_logs WHERE id = '66666666-6666-6666-6666-666666666610') THEN
    INSERT INTO activity_logs (id, structure_id, actor_user_id, action, patient_id, metadata, created_at)
    VALUES (
      '66666666-6666-6666-6666-666666666610',
      structure_uuid,
      test_user_uuid,
      'user.login',
      NULL,
      '{"ip": "192.168.1.1", "user_agent": "Mozilla/5.0"}'::jsonb,
      NOW() - INTERVAL '1 hour'
    );
  END IF;

  RAISE NOTICE 'Activity logs created/verified';
END $$;

-- ===========================================================================
-- VERIFICATION
-- ===========================================================================
DO $$
DECLARE
  structure_uuid uuid := current_setting('seed.structure_uuid')::uuid;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==== ✅ SEED VERIFICATION ====';
  RAISE NOTICE 'Structures: %', (SELECT COUNT(*) FROM structures WHERE id = structure_uuid);
  RAISE NOTICE 'Profiles (test user): %', (SELECT COUNT(*) FROM profiles WHERE structure_id = structure_uuid);
  RAISE NOTICE 'User Roles (admin): %', (SELECT COUNT(*) FROM user_roles WHERE structure_id = structure_uuid AND role = 'admin');
  RAISE NOTICE 'Patients: %', (SELECT COUNT(*) FROM patients WHERE structure_id = structure_uuid);
  RAISE NOTICE 'Transcripts: %', (SELECT COUNT(*) FROM patient_transcripts WHERE structure_id = structure_uuid);
  RAISE NOTICE 'Transcripts (ready): %', (SELECT COUNT(*) FROM patient_transcripts WHERE structure_id = structure_uuid AND status = 'ready');
  RAISE NOTICE 'Summaries: %', (SELECT COUNT(*) FROM transcript_summaries WHERE structure_id = structure_uuid);
  RAISE NOTICE 'Inbox Messages: %', (SELECT COUNT(*) FROM inbox_messages WHERE structure_id = structure_uuid);
  RAISE NOTICE 'Activity Logs: %', (SELECT COUNT(*) FROM activity_logs WHERE structure_id = structure_uuid);
  RAISE NOTICE '==============================';
  RAISE NOTICE '';
END $$;
