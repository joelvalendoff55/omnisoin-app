import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export interface ComplementaryExam {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  indications: string[] | null;
  contraindications: string[] | null;
  duration_minutes: number | null;
  preparation_instructions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExamPrescription {
  id: string;
  patient_id: string;
  exam_id: string;
  prescribed_by: string;
  consultation_id: string | null;
  structure_id: string;
  indication: string;
  priority: 'urgent' | 'normal' | 'low';
  status: 'prescribed' | 'scheduled' | 'completed' | 'cancelled';
  notes: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  results: string | null;
  created_at: string;
  updated_at: string;
  exam?: ComplementaryExam;
}

export interface ExamRecommendation {
  exam: ComplementaryExam;
  relevance: 'high' | 'medium' | 'low';
  justification: string;
  matchedIndications: string[];
}

export async function fetchComplementaryExams(): Promise<ComplementaryExam[]> {
  const { data, error } = await supabase
    .from('complementary_exams')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching complementary exams:', error);
    throw error;
  }

  return (data || []) as ComplementaryExam[];
}

export async function fetchExamPrescriptions(patientId: string): Promise<ExamPrescription[]> {
  const { data, error } = await supabase
    .from('exam_prescriptions')
    .select(`
      *,
      exam:complementary_exams(*)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching exam prescriptions:', error);
    throw error;
  }

  return (data || []) as ExamPrescription[];
}

export interface CreateExamPrescriptionData {
  patient_id: string;
  exam_id: string;
  structure_id: string;
  indication: string;
  consultation_id?: string;
  priority?: 'urgent' | 'normal' | 'low';
  notes?: string;
  scheduled_date?: string;
}

export async function createExamPrescription(
  userId: string,
  data: CreateExamPrescriptionData
): Promise<ExamPrescription> {
  const { data: prescription, error } = await supabase
    .from('exam_prescriptions')
    .insert({
      ...data,
      prescribed_by: userId,
      status: 'prescribed',
    })
    .select(`
      *,
      exam:complementary_exams(*)
    `)
    .single();

  if (error) {
    console.error('Error creating exam prescription:', error);
    throw error;
  }

  return prescription as ExamPrescription;
}

export async function updateExamPrescriptionStatus(
  prescriptionId: string,
  status: ExamPrescription['status'],
  additionalData?: { scheduled_date?: string; completed_date?: string; results?: string }
): Promise<ExamPrescription> {
  const { data, error } = await supabase
    .from('exam_prescriptions')
    .update({ status, ...additionalData })
    .eq('id', prescriptionId)
    .select(`
      *,
      exam:complementary_exams(*)
    `)
    .single();

  if (error) {
    console.error('Error updating exam prescription:', error);
    throw error;
  }

  return data as ExamPrescription;
}

export const RELEVANCE_LABELS: Record<ExamRecommendation['relevance'], string> = {
  high: 'Fortement recommandé',
  medium: 'Recommandé',
  low: 'À considérer',
};

export const RELEVANCE_COLORS: Record<ExamRecommendation['relevance'], string> = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
};

export const PRIORITY_LABELS: Record<ExamPrescription['priority'], string> = {
  urgent: 'Urgent',
  normal: 'Normal',
  low: 'Basse priorité',
};

export const STATUS_LABELS: Record<ExamPrescription['status'], string> = {
  prescribed: 'Prescrit',
  scheduled: 'Planifié',
  completed: 'Réalisé',
  cancelled: 'Annulé',
};
