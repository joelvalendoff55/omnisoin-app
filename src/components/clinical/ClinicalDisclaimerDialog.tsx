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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield, Scale, Stethoscope } from 'lucide-react';

interface ClinicalDisclaimerDialogProps {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export function ClinicalDisclaimerDialog({
  open,
  onAccept,
  onCancel,
}: ClinicalDisclaimerDialogProps) {
  const [understood, setUnderstood] = useState(false);

  const handleAccept = () => {
    if (understood) {
      onAccept();
      setUnderstood(false);
    }
  };

  const handleCancel = () => {
    setUnderstood(false);
    onCancel();
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Avertissement Important
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p className="font-medium text-foreground">
                Avant d'accéder à l'aide à la réflexion clinique, veuillez lire attentivement les points suivants :
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Shield className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">Outil d'aide à la réflexion</p>
                    <p className="text-sm text-amber-700">
                      Cet outil ne constitue <strong>PAS</strong> un avis médical et ne remplace en aucun cas le jugement clinique professionnel.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Stethoscope className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800">Responsabilité du praticien</p>
                    <p className="text-sm text-blue-700">
                      Le praticien reste <strong>SEUL responsable</strong> de ses décisions diagnostiques et thérapeutiques.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <Scale className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-purple-800">Adaptation au contexte</p>
                    <p className="text-sm text-purple-700">
                      Les informations fournies doivent être <strong>adaptées au contexte clinique local</strong> et aux spécificités du patient.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="understood"
                  checked={understood}
                  onCheckedChange={(checked) => setUnderstood(checked === true)}
                />
                <Label
                  htmlFor="understood"
                  className="text-sm font-medium leading-tight cursor-pointer"
                >
                  J'ai compris que cet outil fournit uniquement des pistes de réflexion et que je reste seul(e) responsable de mes décisions cliniques.
                </Label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAccept}
            disabled={!understood}
            className="bg-primary hover:bg-primary/90"
          >
            Accéder à l'aide à la réflexion
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
