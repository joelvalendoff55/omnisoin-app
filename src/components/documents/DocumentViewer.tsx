"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, ExternalLink, FileText, RotateCw, X, ZoomIn, ZoomOut, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Document, DocumentOCR } from '@/lib/documents';
import { fetchOCRResult } from '@/lib/documents';
import { OCRResult } from './OCRResult';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DocumentViewerProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTriggerOCR?: (documentId: string) => Promise<boolean>;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  ordonnance: { label: 'Ordonnance', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  resultat: { label: 'Résultat', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  certificat: { label: 'Certificat', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  imagerie: { label: 'Imagerie', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  courrier: { label: 'Courrier', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  autre: { label: 'Autre', color: 'bg-muted text-muted-foreground border-border' },
};

export function DocumentViewer({ document, open, onOpenChange, onTriggerOCR }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState<'preview' | 'ocr'>('preview');
  const [ocrData, setOcrData] = useState<DocumentOCR | null>(null);
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);

  // Load OCR data when switching to OCR tab
  useEffect(() => {
    if (activeTab === 'ocr' && document && !ocrData && !loadingOCR) {
      setLoadingOCR(true);
      fetchOCRResult(document.id)
        .then((data) => setOcrData(data))
        .finally(() => setLoadingOCR(false));
    }
  }, [activeTab, document, ocrData, loadingOCR]);

  // Reset state when document changes
  useEffect(() => {
    if (document) {
      setOcrData(document.ocr || null);
      setActiveTab('preview');
      setLoading(true);
    }
  }, [document?.id]);

  if (!document) return null;

  const isPDF = document.mime_type === 'application/pdf';
  const isImage = document.mime_type?.startsWith('image/');
  const category = CATEGORY_LABELS[document.category || 'autre'] || CATEGORY_LABELS.autre;

  const handleDownload = () => {
    if (document.file_url) {
      window.open(document.file_url, '_blank');
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 25, 200));
  const handleZoomOut = () => setZoom(Math.max(zoom - 25, 50));

  const handleTriggerOCR = async () => {
    if (!onTriggerOCR) return;
    
    setProcessingOCR(true);
    try {
      const success = await onTriggerOCR(document.id);
      if (success) {
        // Refresh OCR data
        const ocr = await fetchOCRResult(document.id);
        setOcrData(ocr);
        setActiveTab('ocr');
      }
    } finally {
      setProcessingOCR(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <DialogTitle className="text-lg">{document.title}</DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className={cn('text-xs', category.color)}>
                  {category.label}
                </Badge>
                {document.patient && (
                  <span>
                    {document.patient.first_name} {document.patient.last_name}
                  </span>
                )}
                <span>•</span>
                <span>
                  {format(new Date(document.created_at), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>
              {document.description && (
                <p className="text-sm text-muted-foreground">{document.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'preview' && (isPDF || isImage) && (
                <>
                  <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={zoom <= 50}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-12 text-center">{zoom}%</span>
                  <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={zoom >= 200}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </>
              )}
              {onTriggerOCR && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTriggerOCR}
                  disabled={processingOCR}
                >
                  <RotateCw className={cn("h-4 w-4 mr-2", processingOCR && "animate-spin")} />
                  {processingOCR ? 'Analyse...' : 'Relancer OCR'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tabs for Preview/OCR */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preview' | 'ocr')} className="mt-3">
            <TabsList>
              <TabsTrigger value="preview" className="text-sm">
                <FileText className="h-4 w-4 mr-2" />
                Aperçu
              </TabsTrigger>
              <TabsTrigger value="ocr" className="text-sm">
                <Eye className="h-4 w-4 mr-2" />
                Données OCR
                {ocrData && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    ✓
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30 relative">
          {activeTab === 'preview' ? (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <div className="space-y-3 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Chargement du document...</p>
                  </div>
                </div>
              )}

              {isPDF && document.file_url ? (
                <iframe
                  src={`${document.file_url}#zoom=${zoom}`}
                  className="w-full h-full border-0"
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                  onLoad={() => setLoading(false)}
                  title={document.title}
                />
              ) : isImage && document.file_url ? (
                <div className="flex items-center justify-center min-h-full p-8">
                  <img
                    src={document.file_url}
                    alt={document.title}
                    className="max-w-full h-auto rounded-lg shadow-lg transition-transform"
                    style={{ transform: `scale(${zoom / 100})` }}
                    onLoad={() => setLoading(false)}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="p-6 bg-muted rounded-full mb-4">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Aperçu non disponible pour ce type de fichier
                  </p>
                  <Button onClick={handleDownload}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ouvrir dans un nouvel onglet
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="p-6">
              {loadingOCR ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : ocrData ? (
                <OCRResult 
                  ocr={ocrData} 
                  patientId={document.patient_id}
                  documentId={document.id}
                  documentTitle={document.title}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">Aucun résultat OCR disponible</p>
                  <p className="text-sm mb-4">
                    Le document n'a pas encore été analysé.
                  </p>
                  {onTriggerOCR && (
                    <Button onClick={handleTriggerOCR} disabled={processingOCR}>
                      <RotateCw className={cn("h-4 w-4 mr-2", processingOCR && "animate-spin")} />
                      {processingOCR ? 'Analyse en cours...' : 'Lancer l\'analyse OCR'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
