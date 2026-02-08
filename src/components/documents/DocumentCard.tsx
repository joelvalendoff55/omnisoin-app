import { useState } from 'react';
import { FileText, Eye, Trash2, FileImage, MoreVertical, Download, RotateCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Document, getDocumentFileUrl, fetchOCRResult, DocumentOCR } from '@/lib/documents';
import { OCRResult } from './OCRResult';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
  onTriggerOCR?: (documentId: string) => Promise<boolean>;
  canDelete?: boolean;
}

export function DocumentCard({ document, onDelete, onTriggerOCR, canDelete = false }: DocumentCardProps) {
  const [showOCR, setShowOCR] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [ocrData, setOcrData] = useState<DocumentOCR | null>(document.ocr || null);
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);

  const handleViewOCR = async () => {
    if (!ocrData) {
      setLoadingOCR(true);
      const ocr = await fetchOCRResult(document.id);
      setOcrData(ocr);
      setLoadingOCR(false);
    }
    setShowOCR(true);
  };

  const handleTriggerOCR = async () => {
    if (!onTriggerOCR) return;
    
    setProcessingOCR(true);
    try {
      const success = await onTriggerOCR(document.id);
      if (success) {
        // Refresh OCR data
        const ocr = await fetchOCRResult(document.id);
        setOcrData(ocr);
      }
    } finally {
      setProcessingOCR(false);
    }
  };

  const handleDownload = async () => {
    if (!document.file_path) return;
    
    setDownloading(true);
    try {
      const url = await getDocumentFileUrl(document.file_path);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(document.id);
    }
    setShowDelete(false);
  };

  const getStatusBadge = () => {
    switch (document.status) {
      case 'uploaded':
        return <Badge variant="secondary">Uploadé</Badge>;
      case 'processed':
        return <Badge variant="default">OCR traité</Badge>;
      case 'failed':
        return <Badge variant="destructive">Erreur</Badge>;
      default:
        return <Badge variant="outline">{document.status}</Badge>;
    }
  };

  const getFileIcon = () => {
    const type = document.mime_type || document.file_type || '';
    if (type.includes('image')) {
      return <FileImage className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 bg-muted rounded-lg">
                {getFileIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{document.title}</h4>
                {document.patient && (
                  <p className="text-sm text-muted-foreground">
                    {document.patient.first_name} {document.patient.last_name}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {getStatusBadge()}
                  {document.file_type && (
                    <Badge variant="outline" className="text-xs">
                      {document.file_type.toUpperCase()}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(document.created_at), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </div>
                {document.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {document.description}
                  </p>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {document.file_path && (
                  <DropdownMenuItem onClick={handleDownload} disabled={downloading}>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleViewOCR}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir OCR
                </DropdownMenuItem>
                {onTriggerOCR && (
                  <DropdownMenuItem onClick={handleTriggerOCR} disabled={processingOCR}>
                    <RotateCw className={`h-4 w-4 mr-2 ${processingOCR ? 'animate-spin' : ''}`} />
                    {processingOCR ? 'Analyse en cours...' : 'Relancer OCR'}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDelete(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* OCR Dialog */}
      <Dialog open={showOCR} onOpenChange={setShowOCR}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Résultat OCR</DialogTitle>
            <DialogDescription>{document.title}</DialogDescription>
          </DialogHeader>
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
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun résultat OCR disponible pour ce document.</p>
              <p className="text-sm mt-2">
                Le document n'a pas encore été analysé.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le document "{document.title}" sera
              définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
