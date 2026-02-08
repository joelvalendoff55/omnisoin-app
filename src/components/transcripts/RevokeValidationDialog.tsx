"use client";

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface RevokeValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
}

export function RevokeValidationDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: RevokeValidationDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (reason.trim().length < 10) {
      setError('Le motif doit contenir au moins 10 caractères');
      return;
    }
    setError(null);
    await onConfirm(reason.trim());
    setReason('');
  };

  const handleCancel = () => {
    setReason('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Révoquer la validation médicale
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cette action annulera la validation médicale de cette transcription. 
            Un motif obligatoire sera enregistré dans le journal d'audit pour traçabilité.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          <div className="space-y-2">
            <Label htmlFor="revoke-reason" className="text-sm font-medium">
              Motif de révocation <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="revoke-reason"
              placeholder="Indiquez le motif de la révocation (minimum 10 caractères)..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error && e.target.value.trim().length >= 10) {
                  setError(null);
                }
              }}
              className="min-h-[100px]"
              disabled={loading}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {reason.trim().length}/10 caractères minimum
            </p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>Attention :</strong> Cette action sera tracée dans le journal d'audit 
              avec votre identifiant et le motif fourni. Elle est irréversible dans le sens 
              où l'historique de révocation sera conservé.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || reason.trim().length < 10}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Révocation...' : 'Confirmer la révocation'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
