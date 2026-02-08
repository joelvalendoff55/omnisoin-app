import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Demo users configuration
const DEMO_USERS = [
  {
    email: 'super.admin@omnisoin.fr',
    password: 'Demo2024!',
    firstName: 'Super',
    lastName: 'ADMIN',
    roles: ['admin'],
    orgRole: 'owner',
    jobTitle: 'Super Administrateur Plateforme',
  },
  {
    email: 'demo.medecin@omnisoin.fr',
    password: 'Demo2024!',
    firstName: 'Martin',
    lastName: 'DUPONT',
    roles: ['admin', 'practitioner'],
    orgRole: 'admin',
    jobTitle: 'Médecin généraliste - Dr. Martin Dupont',
  },
  {
    email: 'demo.medecin2@omnisoin.fr',
    password: 'Demo2024!',
    firstName: 'Sophie',
    lastName: 'BERNARD',
    roles: ['practitioner'],
    orgRole: 'doctor',
    jobTitle: 'Médecin généraliste - Dr. Sophie Bernard',
  },
  {
    email: 'demo.assistante@omnisoin.fr',
    password: 'Demo2024!',
    firstName: 'Marie',
    lastName: 'LAURENT',
    roles: ['assistant'],
    orgRole: 'assistant',
    jobTitle: 'Assistante médicale',
  },
  {
    email: 'demo.ipa@omnisoin.fr',
    password: 'Demo2024!',
    firstName: 'Julie',
    lastName: 'MOREAU',
    roles: ['practitioner'],
    orgRole: 'ipa',
    jobTitle: 'Infirmière en Pratique Avancée',
  },
  {
    email: 'demo.coordinatrice@omnisoin.fr',
    password: 'Demo2024!',
    firstName: 'Claire',
    lastName: 'PETIT',
    roles: ['coordinator'],
    orgRole: 'coordinator',
    jobTitle: 'Coordinatrice de soins',
  },
];

// Demo patients
const DEMO_PATIENTS = [
  {
    first_name: 'Jean',
    last_name: 'MARTIN',
    dob: '1965-03-15',
    sex: 'M',
    phone: '+33612345678',
    email: 'jean.martin@email.fr',
    origin: 'spontanee',
    status: 'actif',
  },
  {
    first_name: 'Marie',
    last_name: 'LEROY',
    dob: '1978-07-22',
    sex: 'F',
    phone: '+33687654321',
    email: 'marie.leroy@email.fr',
    origin: 'confrere',
    status: 'actif',
  },
  {
    first_name: 'Pierre',
    last_name: 'DUBOIS',
    dob: '1952-11-08',
    sex: 'M',
    phone: '+33654321987',
    email: 'pierre.dubois@email.fr',
    origin: 'hopital',
    status: 'actif',
  },
  {
    first_name: 'Sophie',
    last_name: 'BERNARD',
    dob: '1990-05-30',
    sex: 'F',
    phone: '+33698765432',
    email: 'sophie.bernard.patient@email.fr',
    origin: 'spontanee',
    status: 'actif',
  },
  {
    first_name: 'François',
    last_name: 'THOMAS',
    dob: '1945-01-12',
    sex: 'M',
    phone: '+33643218765',
    email: 'francois.thomas@email.fr',
    origin: 'samu',
    status: 'actif',
  },
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const results: any = {
      structure: null,
      users: [],
      patients: [],
      consultations: [],
      vitalSigns: [],
      observations: [],
    };

    // 1. Create or get demo structure
    const structureSlug = 'msp-faidherbe';
    
    const { data: existingStructure } = await supabaseAdmin
      .from('structures')
      .select('id, name')
      .eq('slug', structureSlug)
      .single();

    let structureId: string;

    if (existingStructure) {
      structureId = existingStructure.id;
      results.structure = { id: structureId, name: existingStructure.name, status: 'existing' };
    } else {
      const { data: newStructure, error: structureError } = await supabaseAdmin
        .from('structures')
        .insert({
          name: 'MSP Faidherbe',
          slug: structureSlug,
          country: 'FR',
          timezone: 'Europe/Paris',
          is_active: true,
          email: 'contact@msp-faidherbe.fr',
        })
        .select()
        .single();

      if (structureError) throw new Error(`Structure creation failed: ${structureError.message}`);
      
      structureId = newStructure.id;
      results.structure = { id: structureId, name: newStructure.name, status: 'created' };
    }

    // 2. Create demo users
    const createdUserIds: { [email: string]: string } = {};
    
    for (const demoUser of DEMO_USERS) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === demoUser.email);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        results.users.push({ email: demoUser.email, status: 'existing', id: userId });
      } else {
        // Create auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: demoUser.email,
          password: demoUser.password,
          email_confirm: true,
          user_metadata: {
            first_name: demoUser.firstName,
            last_name: demoUser.lastName,
          },
        });

        if (authError) {
          results.users.push({ email: demoUser.email, status: 'error', error: authError.message });
          continue;
        }

        userId = authUser.user.id;
        results.users.push({ email: demoUser.email, status: 'created', id: userId });
      }

      createdUserIds[demoUser.email] = userId;

      // Create or update profile
      await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: userId,
          email: demoUser.email,
          first_name: demoUser.firstName,
          last_name: demoUser.lastName,
          full_name: `${demoUser.firstName} ${demoUser.lastName}`,
          structure_id: structureId,
        }, { onConflict: 'user_id' });

      // Create user_roles (for legacy system)
      for (const role of demoUser.roles) {
        await supabaseAdmin
          .from('user_roles')
          .upsert({
            user_id: userId,
            structure_id: structureId,
            role: role as any,
            is_active: true,
          }, { onConflict: 'user_id,structure_id,role' });
      }

      // Create org_members (for new org system)
      await supabaseAdmin
        .from('org_members')
        .upsert({
          user_id: userId,
          structure_id: structureId,
          org_role: demoUser.orgRole as any,
          is_active: true,
          accepted_at: new Date().toISOString(),
        }, { onConflict: 'user_id,structure_id' });

      // Create team_member entry
      await supabaseAdmin
        .from('team_members')
        .upsert({
          user_id: userId,
          structure_id: structureId,
          full_name: `${demoUser.firstName} ${demoUser.lastName}`,
          job_title: demoUser.jobTitle,
          is_active: true,
          email: demoUser.email,
        }, { onConflict: 'user_id,structure_id' });
    }

    // 3. Create demo patients
    const adminUserId = createdUserIds['demo.medecin@omnisoin.fr'];
    const createdPatientIds: string[] = [];

    for (const patient of DEMO_PATIENTS) {
      // Check if patient already exists
      const { data: existingPatient } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('structure_id', structureId)
        .eq('email', patient.email)
        .single();

      if (existingPatient) {
        createdPatientIds.push(existingPatient.id);
        results.patients.push({ name: `${patient.first_name} ${patient.last_name}`, status: 'existing' });
      } else {
        const { data: newPatient, error: patientError } = await supabaseAdmin
          .from('patients')
          .insert({
            ...patient,
            structure_id: structureId,
            user_id: adminUserId,
            primary_practitioner_user_id: adminUserId,
          })
          .select()
          .single();

        if (patientError) {
          results.patients.push({ name: `${patient.first_name} ${patient.last_name}`, status: 'error', error: patientError.message });
          continue;
        }

        createdPatientIds.push(newPatient.id);
        results.patients.push({ name: `${patient.first_name} ${patient.last_name}`, status: 'created' });
      }
    }

    // 4. Get team member IDs for consultations
    const { data: teamMembers } = await supabaseAdmin
      .from('team_members')
      .select('id, user_id')
      .eq('structure_id', structureId);

    const adminTeamMember = teamMembers?.find(tm => tm.user_id === adminUserId);
    
    if (adminTeamMember && createdPatientIds.length >= 3) {
      // 5. Create consultations for the first 3 patients
      for (let i = 0; i < 3; i++) {
        const patientId = createdPatientIds[i];
        
        // Check if consultation already exists for this patient today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingConsultation } = await supabaseAdmin
          .from('consultations')
          .select('id')
          .eq('patient_id', patientId)
          .gte('consultation_date', today)
          .single();

        if (existingConsultation) {
          results.consultations.push({ patientId, status: 'existing' });
          continue;
        }

        const { data: consultation, error: consultError } = await supabaseAdmin
          .from('consultations')
          .insert({
            structure_id: structureId,
            patient_id: patientId,
            practitioner_id: adminTeamMember.id,
            created_by: adminUserId,
            motif: ['Suivi régulier', 'Douleurs abdominales', 'Renouvellement ordonnance'][i],
            consultation_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (consultError) {
          results.consultations.push({ patientId, status: 'error', error: consultError.message });
          continue;
        }

        results.consultations.push({ patientId, status: 'created', id: consultation.id });

        // 6. Add vital signs for consultations
        const { error: vitalsError } = await supabaseAdmin
          .from('patient_vital_signs')
          .insert({
            patient_id: patientId,
            structure_id: structureId,
            consultation_id: consultation.id,
            created_by: adminUserId,
            weight_kg: [75, 62, 85][i],
            height_cm: [175, 165, 180][i],
            systolic_bp: [120, 135, 145][i],
            diastolic_bp: [80, 85, 92][i],
            heart_rate: [72, 78, 68][i],
            temperature_celsius: [36.8, 37.2, 36.5][i],
            spo2: [98, 97, 96][i],
            assistant_notes: 'Patient calme, bien orienté.',
          });

        if (!vitalsError) {
          results.vitalSigns.push({ patientId, status: 'created' });
        }

        // 7. Add observations
        const { error: obsError } = await supabaseAdmin
          .from('consultation_observations')
          .insert({
            patient_id: patientId,
            structure_id: structureId,
            consultation_id: consultation.id,
            author_id: adminUserId,
            author_role: 'practitioner',
            content: ['Patient en bon état général, suivi des recommandations.', 
                     'Légère sensibilité à la palpation, examens complémentaires prescrits.',
                     'Ordonnance renouvelée pour 3 mois, contrôle tension prévu.'][i],
          });

        if (!obsError) {
          results.observations.push({ patientId, status: 'created' });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo data seeded successfully',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error seeding demo data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
