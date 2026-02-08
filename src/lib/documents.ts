import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export interface Document {
  id: string;
  patient_id: string;
  structure_id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  file_type: string | null;
  file_size: number | null;
  mime_type: string | null;
  source: string;
  status: string;
  category?: string | null;
  file_url?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  ocr?: DocumentOCR | null;
}

export interface DocumentOCR {
  id: string;
  document_id: string;
  raw_text: string | null;
  extracted_data: Record<string, unknown>;
  confidence: number | null;
  processed_at: string;
  created_at: string;
}

export interface CreateDocumentData {
  patient_id: string;
  structure_id: string;
  title: string;
  description?: string;
  file_path?: string;
  file_type?: string;
  file_size?: number;
  mime_type?: string;
  source?: string;
  created_by?: string;
}

export async function fetchDocuments(structureId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      patient:patients(id, first_name, last_name)
    `)
    .eq('structure_id', structureId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }

  // Enrich documents with signed URLs
  const enrichedDocs = await Promise.all(
    (data || []).map(async (doc) => {
      let file_url: string | null = null;
      if (doc.file_path) {
        file_url = await getDocumentFileUrl(doc.file_path);
      }
      return { ...doc, file_url } as Document;
    })
  );

  return enrichedDocs;
}

export async function fetchDocumentWithOCR(documentId: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      patient:patients(id, first_name, last_name)
    `)
    .eq('id', documentId)
    .single();

  if (error) {
    console.error('Error fetching document:', error);
    return null;
  }

  // Fetch OCR data separately
  const { data: ocrData } = await supabase
    .from('document_ocr')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  return {
    ...data,
    ocr: ocrData,
  } as Document;
}

export async function createDocument(documentData: CreateDocumentData): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .insert(documentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating document:', error);
    throw error;
  }

  return data as Document;
}

export async function updateDocument(
  documentId: string,
  updates: Partial<CreateDocumentData>
): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating document:', error);
    throw error;
  }

  return data as Document;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

export async function uploadDocumentFile(
  file: File,
  structureId: string,
  patientId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  // Use structureId for proper multi-tenant isolation
  const fileName = `${structureId}/${patientId}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(fileName, file);

  if (error) {
    console.error('Error uploading file:', error);
    throw error;
  }

  return fileName;
}

export async function getDocumentFileUrl(filePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  return data?.signedUrl || null;
}

export async function saveOCRResult(
  documentId: string,
  rawText: string,
  extractedData: Record<string, unknown> = {},
  confidence: number | null = null
): Promise<DocumentOCR> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('document_ocr')
    .insert({
      document_id: documentId,
      raw_text: rawText,
      extracted_data: extractedData,
      confidence: confidence,
      processed_at: new Date().toISOString(),
    } as any)
    .select()
    .single();

  if (error) {
    console.error('Error saving OCR result:', error);
    throw error;
  }

  return data as DocumentOCR;
}

export async function fetchOCRResult(documentId: string): Promise<DocumentOCR | null> {
  const { data, error } = await supabase
    .from('document_ocr')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching OCR result:', error);
    return null;
  }

  return data as DocumentOCR | null;
}
