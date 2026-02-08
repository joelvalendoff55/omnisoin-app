import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  Image,
  Download,
  Trash2,
  Eye,
  MoreVertical,
  FileType,
  Calendar,
  User,
  Tag,
  RotateCw,
} from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { Document } from '@/lib/documents';

interface EnhancedDocumentCardProps {
  document: Document;
  onView: (document: Document) => void;
  onDelete?: (documentId: string) => Promise<boolean>;
  onTriggerOCR?: (documentId: string) => Promise<boolean>;
  canDelete?: boolean;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ordonnance: { label: 'Ordonnance', icon: FileText, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  resultat: { label: 'Résultat', icon: FileType, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  certificat: { label: 'Certificat', icon: FileText, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  imagerie: { label: 'Imagerie', icon: Image, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  courrier: { label: 'Courrier', icon: FileText, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  autre: { label: 'Autre', icon: FileText, color: 'bg-muted text-muted-foreground border-border' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  processed: { label: 'Traité', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  archived: { label: 'Archivé', color: 'bg-muted text-muted-foreground border-border' },
};

export function EnhancedDocumentCard({
  document,
  onView,
  onDelete,
  onTriggerOCR,
  canDelete = false,
}: EnhancedDocumentCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  const category = CATEGORY_CONFIG[document.category || 'autre'] || CATEGORY_CONFIG.autre;
  const status = STATUS_CONFIG[document.status || 'pending'] || STATUS_CONFIG.pending;
  const CategoryIcon = category.icon;

  const isPDF = document.mime_type === 'application/pdf';
  const isImage = document.mime_type?.startsWith('image/');

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (document.file_url) {
      window.open(document.file_url, '_blank');
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(document.id);
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTriggerOCR = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onTriggerOCR) return;
    setIsProcessingOCR(true);
    try {
      await onTriggerOCR(document.id);
    } finally {
      setIsProcessingOCR(false);
    }
  };

  return (
    <>
      <Card 
        className={cn(
          'group cursor-pointer transition-all hover:shadow-md hover:border-primary/30',
          'overflow-hidden'
        )}
        onClick={() => onView(document)}
      >
        {/* Preview thumbnail */}
        <div className="h-32 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative overflow-hidden">
          {isImage && document.file_url ? (
            <img
              src={document.file_url}
              alt={document.title}
              className="w-full h-full object-cover"
            />
          ) : isPDF ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <FileText className="h-10 w-10" />
              <span className="text-xs font-medium">PDF</span>
            </div>
          ) : (
            <CategoryIcon className="h-10 w-10 text-muted-foreground" />
          )}
          
          {/* Status badge overlay */}
          <Badge 
            variant="outline" 
            className={cn('absolute top-2 right-2 text-[10px]', status.color)}
          >
            {status.label}
          </Badge>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onView(document); }}>
              <Eye className="h-4 w-4 mr-1" />
              Voir
            </Button>
            <Button size="sm" variant="secondary" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CardContent className="p-3 space-y-2">
          {/* Title & Category */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{document.title}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="outline" className={cn('text-[10px] gap-1', category.color)}>
                  <Tag className="h-2.5 w-2.5" />
                  {category.label}
                </Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(document); }}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualiser
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </DropdownMenuItem>
                {onTriggerOCR && (
                  <DropdownMenuItem onClick={handleTriggerOCR} disabled={isProcessingOCR}>
                    <RotateCw className={cn("h-4 w-4 mr-2", isProcessingOCR && "animate-spin")} />
                    {isProcessingOCR ? 'Analyse...' : 'Relancer OCR'}
                  </DropdownMenuItem>
                )}
                {canDelete && onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {document.patient && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[100px]">
                  {document.patient.first_name} {document.patient.last_name}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(document.created_at), 'dd/MM/yy', { locale: fr })}</span>
            </div>
          </div>

          {/* Description preview */}
          {document.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {document.description}
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le document "{document.title}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
