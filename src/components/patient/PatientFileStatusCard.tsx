import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FileCheck, FileLock, Loader2, Lock, Unlock, User } from 'lucide-react';
import { useDoctorPermission } from '@/hooks/useDoctorPermission';
import { closePatientFile, reopenPatientFile, getStatusLabel } from '@/lib/patientStatus';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PatientFileStatusCardProps {
  patientId: string;
  status: 'actif' | 'clos' | string | null;
  closedAt: string | null;
  closedBy: string | null;
  closedByName?: string;
  onStatusChange: () => void;
}

export function PatientFileStatusCard({
  patientId,
  status,
  closedAt,
  closedBy,
  closedByName,
  onStatusChange,
}: PatientFileStatusCardProps) {
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const { isDoctor, canClosePatientFile, loading } = useDoctorPermission();
  const [isProcessing, setIsProcessing] = useState(false);

  const isClosed = status === 'clos';

  const handleCloseFile = async () => {
    if (!user || !structureId) return;

    setIsProcessing(true);
    try {
      await closePatientFile({
        patientId,
        closedByUserId: user.id,
        structureId,
      });
      toast.success('Dossier patient clôturé');
      onStatusChange();
    } catch (error) {
      console.error('Error closing patient file:', error);
      toast.error('Erreur lors de la clôture du dossier');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReopenFile = async () => {
    if (!user || !structureId) return;

    setIsProcessing(true);
    try {
      await reopenPatientFile({
        patientId,
        reopenedByUserId: user.id,
        structureId,
      });
      toast.success('Dossier patient réouvert');
      onStatusChange();
    } catch (error) {
      console.error('Error reopening patient file:', error);
      toast.error('Erreur lors de la réouverture du dossier');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className={isClosed ? 'border-muted bg-muted/30' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isClosed ? (
              <FileLock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <FileCheck className="h-5 w-5 text-green-600" />
            )}
            Statut du dossier
          </div>
          <Badge variant={isClosed ? 'secondary' : 'default'} className="gap-1">
            {isClosed ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            {getStatusLabel(status)}
          </Badge>
        </CardTitle>
        {isClosed && closedAt && (
          <CardDescription className="flex items-center gap-2">
            <span>
              Clôturé le {format(new Date(closedAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
            </span>
            {closedByName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                par {closedByName}
              </span>
            )}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !canClosePatientFile ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Seul un médecin peut modifier le statut du dossier
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Vous devez être médecin avec une spécialité pour clôturer ou rouvrir un dossier</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : isClosed ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
                Rouvrir le dossier
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rouvrir le dossier patient ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Le dossier sera à nouveau actif et accessible pour les consultations et prescriptions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleReopenFile}>
                  Confirmer la réouverture
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileLock className="h-4 w-4" />
                )}
                Clôturer le dossier
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clôturer le dossier patient ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action marque la fin du parcours de soin. Le dossier restera consultable mais ne pourra plus recevoir de nouvelles prescriptions ou consultations.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleCloseFile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Confirmer la clôture
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}
