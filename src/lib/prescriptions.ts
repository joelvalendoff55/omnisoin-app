import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export interface Medication {
  name: string;
  dosage: string;
  duration: string;
  instructions: string;
  isNonSubstitutable?: boolean;
}

export interface Prescription {
  id: string;
  structure_id: string;
  patient_id: string;
  practitioner_id: string;
  medications: Medication[];
  is_ald: boolean;
  is_renewable: boolean;
  renewal_count: number | null;
  notes: string | null;
  status: 'draft' | 'signed' | 'printed' | 'cancelled';
  signed_at: string | null;
  document_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  patient?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    dob: string | null;
  };
  practitioner?: {
    id: string;
    job_title: string | null;
    specialty: string | null;
    professional_id: string | null;
    first_name?: string | null;
    last_name?: string | null;
    rpps_number?: string | null;
    adeli_number?: string | null;
  };
}

export interface PrescriptionTemplate {
  id: string;
  structure_id: string;
  created_by: string | null;
  name: string;
  category: string | null;
  medications: Medication[];
  notes: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePrescriptionData {
  structure_id: string;
  patient_id: string;
  practitioner_id: string;
  medications: Medication[];
  is_ald?: boolean;
  is_renewable?: boolean;
  renewal_count?: number;
  notes?: string;
  status?: 'draft' | 'signed' | 'printed' | 'cancelled';
  created_by?: string;
}

export interface CreateTemplateData {
  structure_id: string;
  name: string;
  category?: string;
  medications: Medication[];
  notes?: string;
  is_shared?: boolean;
  created_by?: string;
}

// Fetch all prescriptions for a structure
export async function fetchPrescriptions(structureId: string): Promise<Prescription[]> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      *,
      patient:patients(id, first_name, last_name, dob),
      practitioner:team_members(id, job_title, specialty, professional_id)
    `)
    .eq('structure_id', structureId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching prescriptions:', error);
    throw error;
  }

  return (data || []).map(p => ({
    ...p,
    medications: Array.isArray(p.medications) ? p.medications as unknown as Medication[] : [],
  })) as unknown as Prescription[];
}

// Fetch a single prescription
export async function fetchPrescription(prescriptionId: string): Promise<Prescription | null> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      *,
      patient:patients(id, first_name, last_name, dob),
      practitioner:team_members(id, job_title, specialty, professional_id)
    `)
    .eq('id', prescriptionId)
    .single();

  if (error) {
    console.error('Error fetching prescription:', error);
    throw error;
  }

  return data ? {
    ...data,
    medications: Array.isArray(data.medications) ? data.medications as unknown as Medication[] : [],
  } as unknown as Prescription : null;
}

// Create a new prescription
export async function createPrescription(prescriptionData: CreatePrescriptionData): Promise<Prescription> {
  const insertData = {
    structure_id: prescriptionData.structure_id,
    patient_id: prescriptionData.patient_id,
    practitioner_id: prescriptionData.practitioner_id,
    medications: JSON.parse(JSON.stringify(prescriptionData.medications)),
    is_ald: prescriptionData.is_ald ?? false,
    is_renewable: prescriptionData.is_renewable ?? false,
    renewal_count: prescriptionData.renewal_count ?? 0,
    notes: prescriptionData.notes,
    status: prescriptionData.status ?? 'draft',
    created_by: prescriptionData.created_by,
  };

  const { data, error } = await supabase
    .from('prescriptions')
    .insert(insertData)
    .select(`
      *,
      patient:patients(id, first_name, last_name, dob),
      practitioner:team_members(id, job_title, specialty, professional_id)
    `)
    .single();

  if (error) {
    console.error('Error creating prescription:', error);
    throw error;
  }

  return {
    ...data,
    medications: Array.isArray(data.medications) ? data.medications as unknown as Medication[] : [],
  } as unknown as Prescription;
}

// Update a prescription
export async function updatePrescription(
  prescriptionId: string,
  updates: Partial<CreatePrescriptionData>
): Promise<Prescription> {
  const updateData: Record<string, unknown> = {};
  
  if (updates.patient_id !== undefined) updateData.patient_id = updates.patient_id;
  if (updates.practitioner_id !== undefined) updateData.practitioner_id = updates.practitioner_id;
  if (updates.is_ald !== undefined) updateData.is_ald = updates.is_ald;
  if (updates.is_renewable !== undefined) updateData.is_renewable = updates.is_renewable;
  if (updates.renewal_count !== undefined) updateData.renewal_count = updates.renewal_count;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.medications !== undefined) {
    updateData.medications = JSON.parse(JSON.stringify(updates.medications));
  }

  const { data, error } = await supabase
    .from('prescriptions')
    .update(updateData)
    .eq('id', prescriptionId)
    .select(`
      *,
      patient:patients(id, first_name, last_name, dob),
      practitioner:team_members(id, job_title, specialty, professional_id)
    `)
    .single();

  if (error) {
    console.error('Error updating prescription:', error);
    throw error;
  }

  return {
    ...data,
    medications: Array.isArray(data.medications) ? data.medications as unknown as Medication[] : [],
  } as unknown as Prescription;
}

// Sign a prescription
export async function signPrescription(prescriptionId: string): Promise<Prescription> {
  const { data, error } = await supabase
    .from('prescriptions')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
    })
    .eq('id', prescriptionId)
    .select(`
      *,
      patient:patients(id, first_name, last_name, dob),
      practitioner:team_members(id, job_title, specialty, professional_id)
    `)
    .single();

  if (error) {
    console.error('Error signing prescription:', error);
    throw error;
  }

  return {
    ...data,
    medications: Array.isArray(data.medications) ? data.medications as unknown as Medication[] : [],
  } as unknown as Prescription;
}

// Delete a prescription (only drafts)
export async function deletePrescription(prescriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('prescriptions')
    .delete()
    .eq('id', prescriptionId);

  if (error) {
    console.error('Error deleting prescription:', error);
    throw error;
  }
}

// Fetch all templates for a structure
export async function fetchPrescriptionTemplates(structureId: string): Promise<PrescriptionTemplate[]> {
  const { data, error } = await supabase
    .from('prescription_templates')
    .select('*')
    .eq('structure_id', structureId)
    .order('name');

  if (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }

  return (data || []).map(t => ({
    ...t,
    medications: Array.isArray(t.medications) ? t.medications as unknown as Medication[] : [],
  })) as unknown as PrescriptionTemplate[];
}

// Create a new template
export async function createPrescriptionTemplate(templateData: CreateTemplateData): Promise<PrescriptionTemplate> {
  const insertData = {
    structure_id: templateData.structure_id,
    name: templateData.name,
    category: templateData.category,
    medications: JSON.parse(JSON.stringify(templateData.medications)),
    notes: templateData.notes,
    is_shared: templateData.is_shared ?? false,
    created_by: templateData.created_by,
  };

  const { data, error } = await supabase
    .from('prescription_templates')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating template:', error);
    throw error;
  }

  return {
    ...data,
    medications: Array.isArray(data.medications) ? data.medications as unknown as Medication[] : [],
  } as unknown as PrescriptionTemplate;
}

// Delete a template
export async function deletePrescriptionTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('prescription_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
}

// Search patients for autocomplete
export async function searchPatients(structureId: string, query: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('id, first_name, last_name, dob')
    .eq('structure_id', structureId)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error('Error searching patients:', error);
    throw error;
  }

  return data || [];
}

// Upload signature to storage
export async function uploadSignature(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const filePath = `signatures/${userId}/signature.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error('Error uploading signature:', uploadError);
    throw uploadError;
  }

  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  // Update profile with signature URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ signature_url: urlData.publicUrl })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating profile signature:', updateError);
    throw updateError;
  }

  return urlData.publicUrl;
}

// Fetch user's signature URL
export async function fetchSignatureUrl(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('signature_url')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching signature:', error);
    return null;
  }

  return data?.signature_url || null;
}
