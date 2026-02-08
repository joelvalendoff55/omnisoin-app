import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useStructureId } from './useStructureId';
import { saveOCRResult, fetchOCRResult, DocumentOCR, updateDocument } from '@/lib/documents';
import { logActivity } from '@/lib/activity';
import { toast } from 'sonner';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

export interface ExtractedMedicalData {
  medications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
  }>;
  dates: Array<{
    value: string;
    context?: string;
  }>;
  labResults: Array<{
    name: string;
    value: string;
    unit?: string;
    reference?: string;
    status?: 'normal' | 'high' | 'low' | 'critical';
  }>;
  diagnoses: string[];
  procedures: string[];
  patientInfo: {
    name?: string;
    birthDate?: string;
    socialSecurityNumber?: string;
  };
  documentType?: string;
  summary?: string;
}

interface UseDocumentOCRResult {
  processing: boolean;
  error: string | null;
  result: DocumentOCR | null;
  processOCR: (documentId: string, fileUrl: string, mimeType?: string) => Promise<DocumentOCR | null>;
  processOCRFromImage: (documentId: string, imageData: string) => Promise<DocumentOCR | null>;
  fetchOCR: (documentId: string) => Promise<DocumentOCR | null>;
}

export function useDocumentOCR(): UseDocumentOCRResult {
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentOCR | null>(null);

  const processOCR = useCallback(
    async (documentId: string, fileUrl: string, mimeType?: string): Promise<DocumentOCR | null> => {
      if (!user || !structureId) {
        toast.error('Utilisateur non connecté');
        return null;
      }

      setProcessing(true);
      setError(null);

      try {
        // Call the document-ocr edge function
        const { data, error: functionError } = await supabase.functions.invoke('document-ocr', {
          body: {
            documentId,
            fileUrl,
            mimeType
          }
        });

        if (functionError) {
          throw new Error(functionError.message || 'Erreur lors du traitement OCR');
        }

        if (data.error) {
          throw new Error(data.error);
        }

        // Save OCR result to database
        const savedResult = await saveOCRResult(
          documentId,
          data.rawText,
          data.extractedData,
          data.confidence
        );

        // Log activity
        await logActivity({
          action: 'DOCUMENT_OCR_PROCESSED',
          structureId,
          actorUserId: user.id,
          metadata: { 
            documentId, 
            documentType: data.extractedData?.documentType,
            medicationsCount: data.extractedData?.medications?.length || 0,
            labResultsCount: data.extractedData?.labResults?.length || 0
          },
        });

        setResult(savedResult);
        toast.success('OCR traité avec succès');
        return savedResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur lors du traitement OCR';
        console.error('OCR processing error:', err);
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [user, structureId]
  );

  // Legacy method for image data (for scanner component)
  const processOCRFromImage = useCallback(
    async (documentId: string, imageData: string): Promise<DocumentOCR | null> => {
      if (!user || !structureId) {
        toast.error('Utilisateur non connecté');
        return null;
      }

      setProcessing(true);
      setError(null);

      try {
        // For image data, we need to convert it to a data URL
        const mimeType = imageData.startsWith('data:') 
          ? imageData.split(';')[0].split(':')[1] 
          : 'image/jpeg';
        
        const fileUrl = imageData.startsWith('data:') 
          ? imageData 
          : `data:${mimeType};base64,${imageData}`;

        // Call the document-ocr edge function with the image
        const { data, error: functionError } = await supabase.functions.invoke('document-ocr', {
          body: {
            documentId,
            fileUrl,
            mimeType
          }
        });

        if (functionError) {
          throw new Error(functionError.message || 'Erreur lors du traitement OCR');
        }

        if (data.error) {
          throw new Error(data.error);
        }

        // Save OCR result to database
        const savedResult = await saveOCRResult(
          documentId,
          data.rawText,
          data.extractedData,
          data.confidence
        );

        // Log activity
        await logActivity({
          action: 'DOCUMENT_OCR_PROCESSED',
          structureId,
          actorUserId: user.id,
          metadata: { 
            documentId,
            documentType: data.extractedData?.documentType,
            source: 'scanner'
          },
        });

        setResult(savedResult);
        toast.success('OCR traité avec succès');
        return savedResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur lors du traitement OCR';
        console.error('OCR processing error:', err);
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [user, structureId]
  );

  const fetchOCR = useCallback(async (documentId: string): Promise<DocumentOCR | null> => {
    try {
      const ocrData = await fetchOCRResult(documentId);
      setResult(ocrData);
      return ocrData;
    } catch (err) {
      console.error('Error fetching OCR:', err);
      return null;
    }
  }, []);

  return {
    processing,
    error,
    result,
    processOCR,
    processOCRFromImage,
    fetchOCR,
  };
}
