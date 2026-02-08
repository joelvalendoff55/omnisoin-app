import { useState } from 'react';
import { useMFA, useMFARequired } from '@/hooks/useMFA';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
  Plus,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { MFAEnrollment } from '@/components/auth/MFAEnrollment';

export default function MFAManagementSection() {
  const { status, loading, factors, unenroll, refreshStatus } = useMFA();
  const { mfaRequired } = useMFARequired();
  const [enrolling, setEnrolling] = useState(false);
  const [deletingFactorId, setDeletingFactorId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteFactor = async () => {
    if (!deletingFactorId) return;

    setIsDeleting(true);
    const result = await unenroll(deletingFactorId);

    if (result.success) {
      toast.success('Appareil supprimé', {
        description: "L'authentification à deux facteurs a été désactivée pour cet appareil.",
      });
    } else {
      toast.error('Erreur', {
        description: result.error || 'Impossible de supprimer cet appareil.',
      });
    }

    setIsDeleting(false);
    setDeletingFactorId(null);
  };

  const handleEnrollmentComplete = () => {
    setEnrolling(false);
    refreshStatus();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (enrolling) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configurer l'authentification à deux facteurs
          </CardTitle>
          <CardDescription>
            Scannez le QR code avec votre application d'authentification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MFAEnrollment 
            required={false} 
            onComplete={handleEnrollmentComplete}
            onCancel={() => setEnrolling(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentification à deux facteurs (2FA)
          </CardTitle>
          <CardDescription>
            Protégez votre compte avec une vérification supplémentaire
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Banner */}
          <div className={`flex items-center gap-3 p-3 rounded-lg ${
            status === 'verified' || status === 'enrolled'
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-muted/50'
          }`}>
            {status === 'verified' || status === 'enrolled' ? (
              <>
                <ShieldCheck className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    2FA activée
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Votre compte est protégé par l'authentification à deux facteurs
                  </p>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Active
                </Badge>
              </>
            ) : (
              <>
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">2FA non configurée</p>
                  <p className="text-xs text-muted-foreground">
                    Ajoutez une couche de sécurité supplémentaire à votre compte
                  </p>
                </div>
              </>
            )}
          </div>

          {/* MFA Required Warning */}
          {mfaRequired && status === 'not_enrolled' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Configuration requise
                </p>
                <p className="text-xs text-muted-foreground">
                  Votre rôle exige l'activation de l'authentification à deux facteurs pour accéder aux fonctionnalités sensibles.
                </p>
              </div>
            </div>
          )}

          {/* Enrolled Factors List */}
          {factors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Appareils enregistrés</h4>
              {factors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Smartphone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {factor.friendly_name || 'Application Authenticator'}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {factor.type === 'totp' ? 'TOTP (Time-based)' : factor.type}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletingFactorId(factor.id)}
                    disabled={mfaRequired && factors.length === 1}
                    title={mfaRequired && factors.length === 1 
                      ? "Vous ne pouvez pas supprimer le dernier appareil car la 2FA est requise pour votre rôle" 
                      : "Supprimer cet appareil"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {status === 'not_enrolled' ? (
              <Button onClick={() => setEnrolling(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Activer la 2FA
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setEnrolling(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un appareil
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingFactorId} onOpenChange={() => setDeletingFactorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet appareil ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action désactivera l'authentification à deux facteurs pour cet appareil. 
              Vous devrez reconfigurer la 2FA si vous souhaitez la réactiver.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFactor}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
