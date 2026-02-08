/**
 * Teams E2E Seed Script
 * 
 * Extends the base seed with teams-specific test data:
 * - Default teams (Assistantes, Médecins, Coordination, PDSA)
 * - Team memberships
 * - Notification recipients configuration
 * 
 * Can be run standalone or imported into main seed.
 * 
 * Usage:
 *   npx tsx tests/e2e/seed/seed-teams.ts
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const STRUCTURE_ID = process.env.E2E_STRUCTURE_ID || '11111111-1111-1111-1111-111111111111';

// Fixed UUIDs for teams
const TEAM_IDS = {
  assistantes: 'dddddddd-dddd-4ddd-8ddd-000000000001',
  medecins: 'dddddddd-dddd-4ddd-8ddd-000000000002',
  coordination: 'dddddddd-dddd-4ddd-8ddd-000000000003',
  pdsa: 'dddddddd-dddd-4ddd-8ddd-000000000004',
};

// Fixed UUIDs for team memberships
const MEMBERSHIP_IDS = {
  member1: 'eeeeeeee-eeee-4eee-8eee-000000000001',
  member2: 'eeeeeeee-eeee-4eee-8eee-000000000002',
};

// Fixed UUIDs for notification recipients
const RECIPIENT_IDS = {
  new_appointment: 'ffffffff-ffff-4fff-8fff-000000000001',
  cancel_appointment: 'ffffffff-ffff-4fff-8fff-000000000002',
  no_show_1: 'ffffffff-ffff-4fff-8fff-000000000003',
  no_show_2: 'ffffffff-ffff-4fff-8fff-000000000004',
  daily_summary: 'ffffffff-ffff-4fff-8fff-000000000005',
};

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
    throw new Error(`Test user not found: ${TEST_USER_EMAIL}`);
  }

  return user.id;
}

/**
 * Upsert default teams
 */
async function upsertTeams(): Promise<void> {
  console.log('   → Upserting teams...');
  
  await sbFetch('/rest/v1/teams?on_conflict=id', {
    method: 'POST',
    body: JSON.stringify([
      {
        id: TEAM_IDS.assistantes,
        structure_id: STRUCTURE_ID,
        name: 'Assistantes',
        description: 'Équipe administrative et accueil',
        color: '#ec4899',
        is_active: true,
      },
      {
        id: TEAM_IDS.medecins,
        structure_id: STRUCTURE_ID,
        name: 'Médecins',
        description: 'Praticiens médicaux',
        color: '#3b82f6',
        is_active: true,
      },
      {
        id: TEAM_IDS.coordination,
        structure_id: STRUCTURE_ID,
        name: 'Coordination',
        description: 'Équipe de coordination et gestion',
        color: '#10b981',
        is_active: true,
      },
      {
        id: TEAM_IDS.pdsa,
        structure_id: STRUCTURE_ID,
        name: 'PDSA',
        description: 'Permanence des soins ambulatoires',
        color: '#f59e0b',
        is_active: true,
      },
    ]),
  });
}

/**
 * Upsert team memberships
 */
async function upsertTeamMemberships(userId: string): Promise<void> {
  console.log('   → Upserting team memberships...');
  
  await sbFetch('/rest/v1/team_memberships?on_conflict=id', {
    method: 'POST',
    body: JSON.stringify([
      {
        id: MEMBERSHIP_IDS.member1,
        team_id: TEAM_IDS.medecins,
        user_id: userId,
        role_in_team: 'member',
      },
      {
        id: MEMBERSHIP_IDS.member2,
        team_id: TEAM_IDS.coordination,
        user_id: userId,
        role_in_team: 'lead',
      },
    ]),
  });
}

/**
 * Upsert notification recipients with smart defaults
 */
async function upsertNotificationRecipients(): Promise<void> {
  console.log('   → Upserting notification recipients...');
  
  await sbFetch('/rest/v1/notification_recipients?on_conflict=id', {
    method: 'POST',
    body: JSON.stringify([
      // new_appointment → Assistantes
      {
        id: RECIPIENT_IDS.new_appointment,
        structure_id: STRUCTURE_ID,
        event_key: 'new_appointment',
        target_type: 'team',
        target_id: TEAM_IDS.assistantes,
        channel: 'email',
        is_enabled: true,
      },
      // cancel_appointment → Assistantes
      {
        id: RECIPIENT_IDS.cancel_appointment,
        structure_id: STRUCTURE_ID,
        event_key: 'cancel_appointment',
        target_type: 'team',
        target_id: TEAM_IDS.assistantes,
        channel: 'email',
        is_enabled: true,
      },
      // no_show → Assistantes + Coordination
      {
        id: RECIPIENT_IDS.no_show_1,
        structure_id: STRUCTURE_ID,
        event_key: 'no_show',
        target_type: 'team',
        target_id: TEAM_IDS.assistantes,
        channel: 'email',
        is_enabled: true,
      },
      {
        id: RECIPIENT_IDS.no_show_2,
        structure_id: STRUCTURE_ID,
        event_key: 'no_show',
        target_type: 'team',
        target_id: TEAM_IDS.coordination,
        channel: 'email',
        is_enabled: true,
      },
      // daily_summary → Coordination
      {
        id: RECIPIENT_IDS.daily_summary,
        structure_id: STRUCTURE_ID,
        event_key: 'daily_summary',
        target_type: 'team',
        target_id: TEAM_IDS.coordination,
        channel: 'email',
        is_enabled: true,
      },
      // Note: urgent_alert has NO default recipients for security
    ]),
  });
}

/**
 * Main seed function for teams
 */
export async function seedTeams(): Promise<void> {
  console.log('\n🏢 Teams Seed Starting...');
  console.log(`   Structure ID: ${STRUCTURE_ID}`);

  try {
    const userId = await getTestUserIdByEmail();
    console.log(`   ✅ Found user: ${userId}`);

    await upsertTeams();
    await upsertTeamMemberships(userId);
    await upsertNotificationRecipients();

    console.log('\n✅ Teams Seed completed!');
    console.log('   Created/Updated:');
    console.log('   - 4 teams (Assistantes, Médecins, Coordination, PDSA)');
    console.log('   - 2 team memberships for test user');
    console.log('   - 5 notification recipients (smart defaults)');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Teams seed failed:', error);
    throw error;
  }
}

// Export team IDs for use in tests
export { TEAM_IDS, MEMBERSHIP_IDS, RECIPIENT_IDS, STRUCTURE_ID };

// Run standalone if executed directly
if (require.main === module) {
  // Validate env vars
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TEST_USER_EMAIL) {
    console.error('Missing required environment variables');
    process.exit(1);
  }
  
  seedTeams().catch(() => process.exit(1));
}
