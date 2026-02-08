import { supabase } from '@/integrations/supabase/client';
import { logActivity } from './activity';

export interface VitalSign {
  id: string;
  patient_id: string;
  structure_id: string;
  recorded_by: string;
  recorded_at: string;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  heart_rate: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  temperature_celsius: number | null;
  spo2: number | null;
  assistant_notes: string | null;
  practitioner_notes: string | null;
  created_at: string;
  updated_at: string;
  recorder?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface VitalSignFormData {
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  heart_rate?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  temperature_celsius?: number | null;
  spo2?: number | null;
  assistant_notes?: string | null;
  practitioner_notes?: string | null;
}

export type TemperatureCategory = 'hypothermia' | 'normal' | 'subfever' | 'fever';

export interface TemperatureResult {
  value: number;
  category: TemperatureCategory;
  label: string;
  color: string;
}

export function getTemperatureStatus(tempCelsius: number | null): TemperatureResult | null {
  if (tempCelsius === null || tempCelsius === undefined) return null;
  
  let category: TemperatureCategory;
  let label: string;
  let color: string;
  
  if (tempCelsius < 36) {
    category = 'hypothermia';
    label = 'Hypothermie';
    color = 'text-blue-600 bg-blue-50 border-blue-200';
  } else if (tempCelsius <= 37.5) {
    category = 'normal';
    label = 'Normale';
    color = 'text-green-600 bg-green-50 border-green-200';
  } else if (tempCelsius <= 38) {
    category = 'subfever';
    label = 'Fébricule';
    color = 'text-orange-600 bg-orange-50 border-orange-200';
  } else {
    category = 'fever';
    label = 'Fièvre';
    color = 'text-red-600 bg-red-50 border-red-200';
  }
  
  return { value: tempCelsius, category, label, color };
}

export type BMICategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export interface BMIResult {
  value: number;
  category: BMICategory;
  label: string;
  color: string;
}

export function calculateBMI(weightKg: number | null, heightCm: number | null): BMIResult | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const roundedBmi = Math.round(bmi * 10) / 10;
  
  let category: BMICategory;
  let label: string;
  let color: string;
  
  if (roundedBmi < 18.5) {
    category = 'underweight';
    label = 'Insuffisance pondérale';
    color = 'text-blue-600 bg-blue-50 border-blue-200';
  } else if (roundedBmi < 25) {
    category = 'normal';
    label = 'Poids normal';
    color = 'text-green-600 bg-green-50 border-green-200';
  } else if (roundedBmi < 30) {
    category = 'overweight';
    label = 'Surpoids';
    color = 'text-orange-600 bg-orange-50 border-orange-200';
  } else {
    category = 'obese';
    label = 'Obésité';
    color = 'text-red-600 bg-red-50 border-red-200';
  }
  
  return { value: roundedBmi, category, label, color };
}

export async function fetchVitalSigns(patientId: string): Promise<VitalSign[]> {
  const { data, error } = await supabase
    .from('patient_vital_signs')
    .select(`
      *,
      recorder:profiles!recorded_by (first_name, last_name)
    `)
    .eq('patient_id', patientId)
    .order('recorded_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as VitalSign[];
}

export async function fetchLatestVitalSign(patientId: string): Promise<VitalSign | null> {
  const { data, error } = await supabase
    .from('patient_vital_signs')
    .select(`
      *,
      recorder:profiles!recorded_by (first_name, last_name)
    `)
    .eq('patient_id', patientId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as VitalSign | null;
}

export async function createVitalSign(
  patientId: string,
  structureId: string,
  userId: string,
  formData: VitalSignFormData
): Promise<VitalSign> {
  // Calculate BMI if weight and height are provided
  const bmi = calculateBMI(formData.weight_kg ?? null, formData.height_cm ?? null);
  
  const { data, error } = await supabase
    .from('patient_vital_signs')
    .insert({
      patient_id: patientId,
      structure_id: structureId,
      recorded_by: userId,
      systolic_bp: formData.systolic_bp ?? null,
      diastolic_bp: formData.diastolic_bp ?? null,
      heart_rate: formData.heart_rate ?? null,
      weight_kg: formData.weight_kg ?? null,
      height_cm: formData.height_cm ?? null,
      bmi: bmi?.value ?? null,
      temperature_celsius: formData.temperature_celsius ?? null,
      spo2: formData.spo2 ?? null,
      assistant_notes: formData.assistant_notes ?? null,
      practitioner_notes: formData.practitioner_notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'VITAL_SIGNS_RECORDED',
    patientId,
    metadata: {
      vital_sign_id: data.id,
      has_bp: !!(formData.systolic_bp && formData.diastolic_bp),
      has_hr: !!formData.heart_rate,
      has_weight: !!formData.weight_kg,
      has_height: !!formData.height_cm,
      has_temp: !!formData.temperature_celsius,
      has_spo2: !!formData.spo2,
      bmi: bmi?.value,
    },
  });

  return data as VitalSign;
}

export async function updateVitalSign(
  vitalSignId: string,
  userId: string,
  structureId: string,
  patientId: string,
  formData: Partial<VitalSignFormData>
): Promise<VitalSign> {
  // First get current data to merge for BMI calculation
  const { data: current } = await supabase
    .from('patient_vital_signs')
    .select('weight_kg, height_cm')
    .eq('id', vitalSignId)
    .single();

  const newWeight = formData.weight_kg !== undefined ? formData.weight_kg : current?.weight_kg;
  const newHeight = formData.height_cm !== undefined ? formData.height_cm : current?.height_cm;
  const bmi = calculateBMI(newWeight ?? null, newHeight ?? null);

  const updateData: Record<string, unknown> = {};
  
  if (formData.systolic_bp !== undefined) updateData.systolic_bp = formData.systolic_bp;
  if (formData.diastolic_bp !== undefined) updateData.diastolic_bp = formData.diastolic_bp;
  if (formData.heart_rate !== undefined) updateData.heart_rate = formData.heart_rate;
  if (formData.weight_kg !== undefined) updateData.weight_kg = formData.weight_kg;
  if (formData.height_cm !== undefined) updateData.height_cm = formData.height_cm;
  if (formData.temperature_celsius !== undefined) updateData.temperature_celsius = formData.temperature_celsius;
  if (formData.spo2 !== undefined) updateData.spo2 = formData.spo2;
  if (formData.assistant_notes !== undefined) updateData.assistant_notes = formData.assistant_notes;
  if (formData.practitioner_notes !== undefined) updateData.practitioner_notes = formData.practitioner_notes;
  
  // Always recalculate BMI
  updateData.bmi = bmi?.value ?? null;

  const { data, error } = await supabase
    .from('patient_vital_signs')
    .update(updateData)
    .eq('id', vitalSignId)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    structureId,
    actorUserId: userId,
    action: 'VITAL_SIGNS_UPDATED',
    patientId,
    metadata: { vital_sign_id: vitalSignId },
  });

  return data as VitalSign;
}
