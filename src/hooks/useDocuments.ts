"use client";

import { useState, useEffect, useCallback } from 'react';
import { useStructureId } from './useStructureId';
import { useAuth } from './useAuth';
import {
  Document,
  fetchDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentFile,
  CreateDocumentData,
  getDocumentFileUrl,
} from '@/lib/documents';
import { logActivity } from '@/lib/activity';
import { toast } from 'sonner';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { processLabResultsForAlerts } from '@/lib/criticalLabAlerts';

interface OCRProcessingContext {
  patientId: string;
  structureId: string;
  userId: string;
}

// Function to trigger OCR processing in background
async function triggerOCRProcessing(
  documentId: string,
  fileUrl: string,
  mimeType?: string,
  context?: OCRProcessingContext
) {
  try {
    const { data, error } = await supabase.functions.invoke('document-ocr', {
      body: { documentId, fileUrl, mimeType }
    });

    if (error) {
      console.error('OCR trigger error:', error);
      return null;
    }

    if (data && !data.error) {
      // Save OCR result to database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: saveError } = await supabase
        .from('document_ocr')
        .insert({
          document_id: documentId,
          raw_text: data.rawText,
          extracted_data: data.extractedData,
          confidence: data.confidence,
          processed_at: new Date().toISOString(),
        } as any);

      if (saveError) {
        console.error('Error saving OCR result:', saveError);
      } else {
        console.log(`OCR completed for document ${documentId}`);
      }

      // Process critical lab results and create alerts
      if (context && data.extractedData) {
        try {
          const alertResult = await processLabResultsForAlerts(
            documentId,
            context.patientId,
            context.structureId,
            data.extractedData,
            context.userId
          );

          if (alertResult.criticalCount > 0) {
            toast.warning(
              `🚨 ${alertResult.criticalCount} résultat(s) critique(s) détecté(s)`,
              { duration: 8000 }
            );
          } else if (alertResult.warningCount > 0) {
            toast.info(
              `⚠️ ${alertResult.warningCount} résultat(s) anormal(aux) détecté(s)`,
              { duration: 5000 }
            );
          }
        } catch (alertErr) {
          console.error('Error processing lab result alerts:', alertErr);
        }
      }

      return data;
    }

    return null;
  } catch (err) {
    console.error('OCR processing failed:', err);
    return null;
  }
}

export function useDocuments() {
  const { structureId, loading: structureLoading } = useStructureId();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!structureId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchDocuments(structureId);
      setDocuments(data);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => {
    if (structureLoading) return;
    loadDocuments();
  }, [structureId, structureLoading, loadDocuments]);

  const addDocument = useCallback(
    async (
      file: File,
      patientId: string,
      title: string,
      description?: string,
      autoOCR: boolean = true
    ): Promise<Document | null> => {
      if (!structureId || !user) {
        toast.error('Structure ou utilisateur non disponible');
        return null;
      }

      try {
        // Upload file to storage using structureId for proper multi-tenant isolation
        const filePath = await uploadDocumentFile(file, structureId, patientId);

        // Create document record
        const documentData: CreateDocumentData = {
          patient_id: patientId,
          structure_id: structureId,
          title,
          description,
          file_path: filePath,
          file_type: file.name.split('.').pop() || 'unknown',
          file_size: file.size,
          mime_type: file.type,
          source: 'upload',
          created_by: user.id,
        };

        const newDocument = await createDocument(documentData);

        // Log activity
        await logActivity({
          action: 'DOCUMENT_UPLOADED',
          patientId,
          structureId,
          actorUserId: user.id,
          metadata: { documentId: newDocument.id, title },
        });

        setDocuments((prev) => [newDocument, ...prev]);
        toast.success('Document ajouté avec succès');

        // Trigger OCR in background for supported file types
        if (autoOCR && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
          // Get signed URL for the uploaded file
          const fileUrl = await getDocumentFileUrl(filePath);
          
          if (fileUrl) {
            toast.info('Analyse OCR en cours...', { id: `ocr-${newDocument.id}` });
            
            // Process OCR in background with context for lab alerts
            const ocrContext: OCRProcessingContext = {
              patientId,
              structureId,
              userId: user.id,
            };
            
            triggerOCRProcessing(newDocument.id, fileUrl, file.type, ocrContext)
              .then((result) => {
                if (result && !result.error) {
                  toast.success('Analyse OCR terminée', { id: `ocr-${newDocument.id}` });
                } else {
                  toast.dismiss(`ocr-${newDocument.id}`);
                }
              })
              .catch(() => {
                toast.dismiss(`ocr-${newDocument.id}`);
              });
          }
        }

        return newDocument;
      } catch (err) {
        console.error('Error adding document:', err);
        toast.error('Erreur lors de l\'ajout du document');
        return null;
      }
    },
    [structureId, user]
  );

  const editDocument = useCallback(
    async (documentId: string, updates: Partial<CreateDocumentData>): Promise<boolean> => {
      try {
        const updated = await updateDocument(documentId, updates);
        setDocuments((prev) =>
          prev.map((doc) => (doc.id === documentId ? { ...doc, ...updated } : doc))
        );
        toast.success('Document mis à jour');
        return true;
      } catch (err) {
        console.error('Error updating document:', err);
        toast.error('Erreur lors de la mise à jour');
        return false;
      }
    },
    []
  );

  const removeDocument = useCallback(
    async (documentId: string): Promise<boolean> => {
      if (!user || !structureId) return false;

      try {
        const doc = documents.find((d) => d.id === documentId);
        await deleteDocument(documentId);

        // Log activity
        if (doc) {
          await logActivity({
            action: 'DOCUMENT_DELETED',
            patientId: doc.patient_id,
            structureId,
            actorUserId: user.id,
            metadata: { documentId, title: doc.title },
          });
        }

        setDocuments((prev) => prev.filter((d) => d.id !== documentId));
        toast.success('Document supprimé');
        return true;
      } catch (err) {
        console.error('Error deleting document:', err);
        toast.error('Erreur lors de la suppression');
        return false;
      }
    },
    [documents, user, structureId]
  );

  // Manual OCR trigger for existing documents
  const triggerDocumentOCR = useCallback(
    async (documentId: string): Promise<boolean> => {
      const doc = documents.find((d) => d.id === documentId);
      if (!doc || !doc.file_path || !structureId || !user) {
        toast.error('Document introuvable');
        return false;
      }

      try {
        const fileUrl = await getDocumentFileUrl(doc.file_path);
        if (!fileUrl) {
          toast.error('Impossible de récupérer le fichier');
          return false;
        }

        toast.info('Analyse OCR en cours...', { id: `ocr-${documentId}` });

        // Include context for lab result alerts
        const ocrContext: OCRProcessingContext = {
          patientId: doc.patient_id,
          structureId,
          userId: user.id,
        };

        const result = await triggerOCRProcessing(documentId, fileUrl, doc.mime_type || undefined, ocrContext);

        if (result && !result.error) {
          toast.success('Analyse OCR terminée', { id: `ocr-${documentId}` });
          return true;
        } else {
          toast.error('Échec de l\'analyse OCR', { id: `ocr-${documentId}` });
          return false;
        }
      } catch (err) {
        console.error('Error triggering OCR:', err);
        toast.error('Erreur lors de l\'analyse OCR');
        return false;
      }
    },
    [documents, structureId, user]
  );

  return {
    documents,
    loading: loading || structureLoading,
    error,
    refetch: loadDocuments,
    addDocument,
    editDocument,
    removeDocument,
    triggerDocumentOCR,
  };
}
