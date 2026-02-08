/**
 * E2E Seed Script
 * 
 * Seeds the database with test data for E2E tests using Supabase REST API.
 * Requires SUPABASE_SERVICE_ROLE_KEY for elevated access.
 * 
 * Usage:
 *   npm run e2e:seed
 * 
 * Environment variables:
 *   - VITE_SUPABASE_URL or SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Service role key (NOT anon key)
 *   - TEST_USER_EMAIL: Email of the test user (must exist in auth.users)
 *   - E2E_STRUCTURE_ID: Optional, defaults to fixed UUID
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const STRUCTURE_ID = process.env.E2E_STRUCTURE_ID || '11111111-1111-1111-1111-111111111111';

// Fixed UUIDs for deterministic testing
const PATIENT_IDS = {
  patient1: '22222222-2222-2222-2222-222222222222',
  patient2: '33333333-3333-3333-3333-333333333333',
  patient3: '44444444-4444-4444-4444-444444444444',
};

const TRANSCRIPT_IDS = {
  ready: '55555555-5555-5555-5555-555555555555',
  uploaded: '77777777-7777-7777-7777-777777777777',
};

const SUMMARY_ID = '88888888-8888-8888-8888-888888888888';

const INBOX_IDS = {
  unassigned: '99999999-9999-9999-9999-999999999999',
  assigned1: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  assigned2: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
};

// Fixed UUIDs for activity logs
const ACTIVITY_IDS = [
  'cccccccc-cccc-4ccc-8ccc-000000000001',
  'cccccccc-cccc-4ccc-8ccc-000000000002',
  'cccccccc-cccc-4ccc-8ccc-000000000003',
  'cccccccc-cccc-4ccc-8ccc-000000000004',
  'cccccccc-cccc-4ccc-8ccc-000000000005',
  'cccccccc-cccc-4ccc-8ccc-000000000006',
  'cccccccc-cccc-4ccc-8ccc-000000000007',
  'cccccccc-cccc-4ccc-8ccc-000000000008',
  'cccccccc-cccc-4ccc-8ccc-000000000009',
  'cccccccc-cccc-4ccc-8ccc-000000000010',
];

// Validate required env vars
if (!SUPABASE_URL) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_URL');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('   This script requires the service role key for admin access.');
  process.exit(1);
}

if (!TEST_USER_EMAIL) {
  console.error('❌ Missing TEST_USER_EMAIL');
  process.exit(1);
}

/**
 * Make a request to Supabase REST API with service role auth
 */
async function sbFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase REST error ${res.status} ${res.statusText}: ${text}`);
  }

  return res;
}

/**
 * Get test user ID by email using admin API
 */
async function getTestUserIdByEmail(): Promise<string> {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Auth admin lookup failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const users = Array.isArray(data?.users) ? data.users : data;
  const user = users.find((u: any) => u.email === TEST_USER_EMAIL);

  if (!user?.id) {
    throw new Error(`
╔══════════════════════════════════════════════════════════════════╗
║  ❌ TEST USER NOT FOUND                                           ║
╠══════════════════════════════════════════════════════════════════╣
║  No auth user found for email: ${TEST_USER_EMAIL}
║                                                                  ║
║  Please create the user first by signing up via /auth            ║
╚══════════════════════════════════════════════════════════════════╝
`);
  }

  return user.id;
}

/**
 * Upsert structure
 */
async function upsertStructure(): Promise<void> {
  console.log('   → Upserting structure...');
  await sbFetch('/rest/v1/structures?on_conflict=id', {
    method: 'POST',
    body: JSON.stringify([
      {
        id: STRUCTURE_ID,
        name: 'OmniSoin Assist Demo',
        slug: 'omnisoin-demo',
        email: 'demo@omnisoin.local',
        phone: '+33600000000',
        address: '1 rue de la Santé, 75001 Paris',
        country: 'FR',
        timezone: 'Europe/Paris',
        is_active: true,
      },
    ]),
  });
}

/**
 * Upsert profile for test user
 */
async function upsertProfile(userId: string): Promise<void> {
  console.log('   → Upserting profile...');
  await sbFetch('/rest/v1/profiles?on_conflict=user_id', {
    method: 'POST',
    body: JSON.stringify([
      {
        user_id: userId,
        structure_id: STRUCTURE_ID,
        first_name: 'Test',
        last_name: 'Praticien',
        phone: '+33612345678',
        specialty: 'Médecine Générale',
      },
    ]),
  });
}

/**
 * Upsert admin role for test user
 */
async function upsertAdminRole(userId: string): Promise<void> {
  console.log('   → Upserting admin role...');
  
  // First, check if role exists
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&role=eq.admin`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  );
  
  const existing = await checkRes.json();
  
  if (existing && existing.length > 0) {
    // Update existing
    await sbFetch(`/rest/v1/user_roles?user_id=eq.${userId}&role=eq.admin`, {
      method: 'PATCH',
      body: JSON.stringify({
        structure_id: STRUCTURE_ID,
        is_active: true,
      }),
    });
  } else {
    // Insert new
    await sbFetch('/rest/v1/user_roles', {
      method: 'POST',
      body: JSON.stringify([
        {
          user_id: userId,
          structure_id: STRUCTURE_ID,
          role: 'admin',
          is_active: true,
        },
      ]),
    });
  }
}

/**
 * Upsert patients
 */
async function upsertPatients(userId: string): Promise<void> {
  console.log('   → Upserting patients...');
  await sbFetch('/rest/v1/patients?on_conflict=id', {
    method: 'POST',
    body: JSON.stringify([
      {
        id: PATIENT_IDS.patient1,
        user_id: userId,
        structure_id: STRUCTURE_ID,
        primary_practitioner_user_id: userId,
        first_name: 'Jean',
        last_name: 'Dupont',
        email: 'jean.dupont@test.local',
        phone: '+33612345001',
        dob: '1985-03-15',
        sex: 'M',
        is_archived: false,
      },
      {
        id: PATIENT_IDS.patient2,
        user_id: userId,
        structure_id: STRUCTURE_ID,
        primary_practitioner_user_id: userId,
        first_name: 'Marie',
        last_name: 'Martin',
        email: 'marie.martin@test.local',
        phone: '+33612345002',
        dob: '1990-07-22',
        sex: 'F',
        is_archived: false,
      },
      {
        id: PATIENT_IDS.patient3,
        user_id: userId,
        structure_id: STRUCTURE_ID,
        primary_practitioner_user_id: userId,
        first_name: 'Pierre',
        last_name: 'Bernard',
        email: 'pierre.bernard@test.local',
        phone: '+33612345003',
        dob: '1978-11-30',
        sex: 'M',
        is_archived: true, // Archived patient for testing filters
      },
    ]),
  });
}

/**
 * Upsert transcripts
 */
async function upsertTranscripts(userId: string): Promise<void> {
  console.log('   → Upserting transcripts...');
  await sbFetch('/rest/v1/patient_transcripts?on_conflict=id', {
    method: 'POST',
    body: JSON.stringify([
      {
        id: TRANSCRIPT_IDS.ready,
        patient_id: PATIENT_IDS.patient1,
        structure_id: STRUCTURE_ID,
        created_by: userId,
        status: 'ready',
        source: 'upload',
        language: 'fr',
        transcript_text: 'Bonjour docteur. Je viens vous voir car j\'ai des douleurs au niveau du dos depuis une semaine. La douleur est localisée dans le bas du dos et irradie parfois vers la jambe gauche. J\'ai du mal à dormir à cause de ça.',
        duration_seconds: 120,
      },
      {
        id: TRANSCRIPT_IDS.uploaded,
        patient_id: PATIENT_IDS.patient2,
        structure_id: STRUCTURE_ID,
        created_by: userId,
        status: 'uploaded',
        source: 'upload',
        language: null,
        transcript_text: null,
        duration_seconds: null,
      },
    ]),
  });
}

/**
 * Upsert summary for ready transcript
 */
async function upsertSummary(userId: string): Promise<void> {
  console.log('   → Upserting summary...');
  await sbFetch('/rest/v1/transcript_summaries?on_conflict=id', {
    method: 'POST',
    body: JSON.stringify([
      {
        id: SUMMARY_ID,
        transcript_id: TRANSCRIPT_IDS.ready,
        patient_id: PATIENT_IDS.patient1,
        structure_id: STRUCTURE_ID,
        generated_by: userId,
        status: 'ready',
        model_used: 'gpt-4',
        summary_text: `## Motif de consultation
Douleurs lombaires évoluant depuis une semaine.

## Anamnèse
- Douleur localisée dans le bas du dos
- Irradiation vers la jambe gauche
- Troubles du sommeil associés

## Examen clinique
À compléter lors de la consultation.

## Conclusion
Lombalgie avec possible composante radiculaire à explorer.`,
      },
    ]),
  });
}

/**
 * Upsert inbox messages
 */
async function upsertInboxMessages(): Promise<void> {
  console.log('   → Upserting inbox messages...');
  await sbFetch('/rest/v1/inbox_messages?on_conflict=id', {
    method: 'POST',
    body: JSON.stringify([
      {
        id: INBOX_IDS.unassigned,
        structure_id: STRUCTURE_ID,
        patient_id: null, // Unassigned
        channel: 'whatsapp',
        message_type: 'audio',
        status: 'received',
        sender_phone: '+33698765432',
        text_body: null,
        media_url: 'https://example.com/audio1.ogg',
        media_mime: 'audio/ogg',
      },
      {
        id: INBOX_IDS.assigned1,
        structure_id: STRUCTURE_ID,
        patient_id: PATIENT_IDS.patient1,
        channel: 'whatsapp',
        message_type: 'text',
        status: 'ready',
        sender_phone: '+33612345001',
        text_body: 'Bonjour, je souhaite prendre rendez-vous pour un suivi.',
        media_url: null,
        media_mime: null,
      },
      {
        id: INBOX_IDS.assigned2,
        structure_id: STRUCTURE_ID,
        patient_id: PATIENT_IDS.patient2,
        channel: 'web',
        message_type: 'text',
        status: 'received',
        sender_phone: null,
        text_body: 'Question concernant mon ordonnance.',
        media_url: null,
        media_mime: null,
      },
    ]),
  });
}

/**
 * Upsert activity logs
 */
async function upsertActivityLogs(userId: string): Promise<void> {
  console.log('   → Upserting activity logs...');
  
  const logs = [
    { action: 'patient.created', patient_id: PATIENT_IDS.patient1 },
    { action: 'patient.created', patient_id: PATIENT_IDS.patient2 },
    { action: 'patient.created', patient_id: PATIENT_IDS.patient3 },
    { action: 'transcript.uploaded', patient_id: PATIENT_IDS.patient1 },
    { action: 'transcript.ready', patient_id: PATIENT_IDS.patient1 },
    { action: 'summary.generated', patient_id: PATIENT_IDS.patient1 },
    { action: 'patient.archived', patient_id: PATIENT_IDS.patient3 },
    { action: 'inbox.received', patient_id: null },
    { action: 'inbox.assigned', patient_id: PATIENT_IDS.patient1 },
    { action: 'inbox.assigned', patient_id: PATIENT_IDS.patient2 },
  ];

  // Use fixed valid UUIDs for activity logs
  const logsWithIds = logs.map((log, index) => ({
    id: ACTIVITY_IDS[index],
    structure_id: STRUCTURE_ID,
    actor_user_id: userId,
    action: log.action,
    patient_id: log.patient_id,
    metadata: {},
  }));

  await sbFetch('/rest/v1/activity_logs?on_conflict=id', {
    method: 'POST',
    body: JSON.stringify(logsWithIds),
  });
}

/**
 * Main seed function
 */
async function main(): Promise<void> {
  console.log('\n🌱 E2E Seed Script Starting...');
  console.log(`   Supabase URL: ${SUPABASE_URL}`);
  console.log(`   Test User Email: ${TEST_USER_EMAIL}`);
  console.log(`   Structure ID: ${STRUCTURE_ID}`);

  try {
    // Step 1: Get test user ID
    console.log('\n📧 Looking up test user...');
    const userId = await getTestUserIdByEmail();
    console.log(`   ✅ Found user: ${userId}`);

    // Step 2: Seed base data
    console.log('\n📦 Seeding base data...');
    await upsertStructure();
    await upsertProfile(userId);
    await upsertAdminRole(userId);

    // Step 3: Seed patients
    console.log('\n👥 Seeding patients...');
    await upsertPatients(userId);

    // Step 4: Seed transcripts and summaries
    console.log('\n📝 Seeding transcripts and summaries...');
    await upsertTranscripts(userId);
    await upsertSummary(userId);

    // Step 5: Seed inbox messages
    console.log('\n📬 Seeding inbox messages...');
    await upsertInboxMessages();

    // Step 6: Seed activity logs
    console.log('\n📊 Seeding activity logs...');
    await upsertActivityLogs(userId);

    console.log('\n✅ E2E Seed completed successfully!\n');
    console.log('   Created/Updated:');
    console.log('   - 1 structure (OmniSoin Assist Demo)');
    console.log('   - 1 profile + admin role for test user');
    console.log('   - 3 patients (1 archived)');
    console.log('   - 2 transcripts (ready, uploaded)');
    console.log('   - 1 summary (ready)');
    console.log('   - 3 inbox messages (1 unassigned, 2 assigned)');
    console.log('   - 10 activity logs');
    console.log('');

  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run the seed
main();
