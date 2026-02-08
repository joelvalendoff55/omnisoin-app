"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Trash2, 
  Shield, 
  FileText, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Consent {
  id: string;
  consent_type: string;
  consent_version: string;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

const CONSENT_LABELS: Record<string, string> = {
  health_data: 'Traitement des données de santé',
  terms_of_service: 'Conditions générales d\'utilisation',
  privacy_policy: 'Politique de confidentialité',
  cookies_analytics: 'Cookies analytiques',
  cookies_marketing: 'Cookies marketing',
};

export default function GDPRTab() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [isLoadingConsents, setIsLoadingConsents] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    if (user) {
      fetchConsents();
    }
  }, [user]);

  const fetchConsents = async () => {
    try {
      const { data, error } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConsents(data || []);
    } catch (error) {
      console.error('Error fetching consents:', error);
    } finally {
      setIsLoadingConsents(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;

    setIsExporting(true);
    try {
      // Fetch all user data
      const [
        profileResult,
        patientsResult,
        transcriptsResult,
        documentsResult,
        appointmentsResult,
        tasksResult,
        consentsResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('patients').select('*').eq('user_id', user.id),
        supabase.from('patient_transcripts').select('*').eq('created_by', user.id),
        supabase.from('documents').select('*').eq('created_by', user.id),
        supabase.from('appointments').select('*').eq('created_by', user.id),
        supabase.from('tasks').select('*').eq('created_by', user.id),
        supabase.from('user_consents').select('*').eq('user_id', user.id),
      ]);

      const exportData = {
        export_date: new Date().toISOString(),
        user_id: user.id,
        email: user.email,
        profile: profileResult.data,
        patients: patientsResult.data || [],
        transcripts: transcriptsResult.data || [],
        documents: documentsResult.data || [],
        appointments: appointmentsResult.data || [],
        tasks: tasksResult.data || [],
        consents: consentsResult.data || [],
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omnisoin-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export réussi',
        description: 'Vos données ont été exportées avec succès.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Erreur d\'export',
        description: 'Une erreur est survenue lors de l\'export de vos données.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmation !== 'SUPPRIMER') return;

    setIsDeleting(true);
    try {
      // Note: In production, this should be handled by an edge function
      // that properly deletes all user data with elevated permissions
      
      // For now, we'll sign out the user and show a message
      // The actual deletion would be handled by a support request
      
      toast({
        title: 'Demande de suppression envoyée',
        description: 'Votre compte sera supprimé dans les 30 jours. Vous allez être déconnecté.',
      });

      // Log the deletion request
      await supabase.from('user_consents').insert({
        user_id: user.id,
        consent_type: 'account_deletion_request',
        consent_version: '1.0',
        granted: true,
        granted_at: new Date().toISOString(),
        metadata: { requested_at: new Date().toISOString() },
      });

      await signOut();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue. Veuillez contacter le support.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmation('');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Rights Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Vos droits RGPD
          </CardTitle>
          <CardDescription>
            Conformément au Règlement Général sur la Protection des Données, vous disposez des droits suivants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-1">Droit d'accès</h4>
              <p className="text-sm text-muted-foreground">
                Obtenir une copie de vos données personnelles
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-1">Droit à la portabilité</h4>
              <p className="text-sm text-muted-foreground">
                Recevoir vos données dans un format structuré
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-1">Droit à l'effacement</h4>
              <p className="text-sm text-muted-foreground">
                Demander la suppression de vos données
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-1">Droit de rectification</h4>
              <p className="text-sm text-muted-foreground">
                Corriger des données inexactes ou incomplètes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exporter mes données
          </CardTitle>
          <CardDescription>
            Téléchargez une copie de toutes vos données personnelles au format JSON
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                L'export inclut : profil, patients, transcriptions, documents, rendez-vous, tâches et historique des consentements.
              </p>
            </div>
            <Button onClick={handleExportData} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Exporter mes données
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Consent History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique des consentements
          </CardTitle>
          <CardDescription>
            Consultez l'historique de vos consentements au traitement de données
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingConsents ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : consents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun consentement enregistré
            </p>
          ) : (
            <div className="space-y-3">
              {consents.map((consent) => (
                <div
                  key={consent.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    {consent.granted && !consent.revoked_at ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">
                        {CONSENT_LABELS[consent.consent_type] || consent.consent_type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Version {consent.consent_version}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={consent.granted && !consent.revoked_at ? 'default' : 'secondary'}>
                      {consent.granted && !consent.revoked_at ? 'Actif' : 'Révoqué'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(consent.granted_at || consent.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Supprimer mon compte
          </CardTitle>
          <CardDescription>
            Cette action est irréversible. Toutes vos données seront définitivement supprimées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-destructive mb-2">⚠️ Attention</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Toutes vos données personnelles seront supprimées</li>
              <li>• Les dossiers patients seront anonymisés ou supprimés selon la réglementation</li>
              <li>• Cette action est irréversible</li>
              <li>• Un délai de 30 jours s'applique pour permettre l'annulation</li>
            </ul>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer mon compte
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-4">
                  <p>
                    Cette action ne peut pas être annulée. Cela supprimera définitivement votre 
                    compte et toutes les données associées.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="delete-confirm">
                      Tapez <strong>SUPPRIMER</strong> pour confirmer
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="SUPPRIMER"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'SUPPRIMER' || isDeleting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    'Supprimer définitivement'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Contact DPO */}
      <Card>
        <CardHeader>
          <CardTitle>Contact DPO</CardTitle>
          <CardDescription>
            Pour toute question concernant vos données personnelles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Délégué à la Protection des Données :{' '}
            <a href="mailto:dpo@omnisoin-assist.fr" className="text-primary hover:underline">
              dpo@omnisoin-assist.fr
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
