"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  Mail,
  User,
  Building2,
  UserCog,
  Key,
  LogOut,
  Activity,
  Loader2,
  AlertCircle,
  Clock,
  Monitor,
  Globe,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import MFAManagementSection from './MFAManagementSection';

interface Profile {
  first_name: string | null;
  last_name: string | null;
}

interface Structure {
  name: string;
}

interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  patient_id: string | null;
  patients?: {
    first_name: string;
    last_name: string;
  } | null;
}

// Sensitive actions to display in audit
const SENSITIVE_ACTIONS = [
  'DELEGATION_CREATED',
  'DELEGATION_UPDATED',
  'DELEGATION_DELETED',
  'TRANSCRIPTION_REQUESTED',
  'TRANSCRIPTION_READY',
  'TRANSCRIPTION_FAILED',
  'TRANSCRIPT_SUMMARY_REQUESTED',
  'TRANSCRIPT_SUMMARY_READY',
  'TRANSCRIPT_SUMMARY_FAILED',
];

// Human-readable action labels
const ACTION_LABELS: Record<string, string> = {
  DELEGATION_CREATED: 'Délégation créée',
  DELEGATION_UPDATED: 'Délégation modifiée',
  DELEGATION_DELETED: 'Délégation supprimée',
  TRANSCRIPTION_REQUESTED: 'Transcription demandée',
  TRANSCRIPTION_READY: 'Transcription terminée',
  TRANSCRIPTION_FAILED: 'Transcription échouée',
  TRANSCRIPT_SUMMARY_REQUESTED: 'Résumé demandé',
  TRANSCRIPT_SUMMARY_READY: 'Résumé terminé',
  TRANSCRIPT_SUMMARY_FAILED: 'Résumé échoué',
};

export default function SecurityTab() {
  const { user, signOut } = useAuth();
  const { roles, isAdmin, isCoordinator, loading: roleLoading } = useRole();
  const { structureId, loading: structureLoading } = useStructureId();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [sendingReset, setSendingReset] = useState(false);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);

  const canViewAudit = isAdmin || isCoordinator;

  // Fetch profile and structure
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setLoadingProfile(true);

      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .maybeSingle();

        setProfile(profileData);

        // Get last sign in from user metadata
        if (user.last_sign_in_at) {
          setLastSignIn(user.last_sign_in_at);
        }

        // Fetch structure if we have structureId
        if (structureId) {
          const { data: structureData } = await supabase
            .from('structures')
            .select('name')
            .eq('id', structureId)
            .maybeSingle();

          setStructure(structureData);
        }
      } catch (err) {
        console.error('Error fetching security data:', err);
      } finally {
        setLoadingProfile(false);
      }
    };

    if (!structureLoading) {
      fetchData();
    }
  }, [user, structureId, structureLoading]);

  // Fetch activity logs for audit (admin/coordinator only)
  useEffect(() => {
    const fetchActivity = async () => {
      if (!canViewAudit || !structureId || roleLoading) {
        setLoadingActivity(false);
        return;
      }

      setLoadingActivity(true);

      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select(`
            id,
            action,
            created_at,
            patient_id,
            patients (
              first_name,
              last_name
            )
          `)
          .eq('structure_id', structureId)
          .in('action', SENSITIVE_ACTIONS)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        setActivityLogs((data as ActivityLog[]) || []);
      } catch (err) {
        console.error('Error fetching activity logs:', err);
      } finally {
        setLoadingActivity(false);
      }
    };

    fetchActivity();
  }, [canViewAudit, structureId, roleLoading]);

  const handleResetPassword = async () => {
    if (!user?.email) {
      toast.error('Email non disponible');
      return;
    }

    setSendingReset(true);

    try {
      const redirectUrl = `${window.location.origin}/auth?reset=1`;

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast.success('Email envoyé', {
        description: 'Vérifiez votre boîte mail pour réinitialiser votre mot de passe.',
      });
    } catch (err) {
      console.error('Error sending reset email:', err);
      toast.error('Erreur', {
        description: "Impossible d'envoyer l'email de réinitialisation.",
      });
    } finally {
      setSendingReset(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Déconnexion réussie');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'coordinator':
        return 'default';
      case 'practitioner':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrateur',
      coordinator: 'Coordinateur',
      practitioner: 'Praticien',
      assistant: 'Assistant',
      prompt_admin: 'Admin Prompts',
    };
    return labels[role] || role;
  };

  const isLoading = loadingProfile || roleLoading || structureLoading;

  return (
    <div className="space-y-6">
      {/* Account Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Compte
          </CardTitle>
          <CardDescription>
            Informations de votre compte utilisateur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Email */}
              <div className="flex items-center gap-4">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium w-36">Email</span>
                <span className="text-sm text-muted-foreground">{user?.email}</span>
              </div>

              {/* Name */}
              <div className="flex items-center gap-4">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium w-36">Nom</span>
                <span className="text-sm text-muted-foreground">
                  {profile?.first_name || profile?.last_name
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                    : 'Non renseigné'}
                </span>
              </div>

              {/* Structure */}
              <div className="flex items-center gap-4">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium w-36">Structure</span>
                <span className="text-sm text-muted-foreground">
                  {structure?.name || 'Aucune structure'}
                </span>
              </div>

              {/* Roles */}
              <div className="flex items-center gap-4">
                <UserCog className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium w-36">Rôles</span>
                <div className="flex gap-2 flex-wrap">
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <Badge key={role} variant={getRoleBadgeVariant(role)}>
                        {getRoleLabel(role)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Aucun rôle</span>
                  )}
                </div>
              </div>

              {/* Last sign in */}
              <div className="flex items-center gap-4">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium w-36">Dernière connexion</span>
                <span className="text-sm text-muted-foreground">
                  {lastSignIn
                    ? `${format(new Date(lastSignIn), 'dd MMM yyyy à HH:mm', { locale: fr })} (${formatDistanceToNow(new Date(lastSignIn), { addSuffix: true, locale: fr })})`
                    : 'Inconnue'}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Security Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Actions de sécurité
          </CardTitle>
          <CardDescription>
            Gérez l'accès à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={handleResetPassword}
              disabled={sendingReset}
              className="gap-2"
            >
              {sendingReset ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              {sendingReset ? 'Envoi...' : 'Changer le mot de passe'}
            </Button>

            <Button
              variant="destructive"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MFA Management Section */}
      <MFAManagementSection />

      {/* Active Sessions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Sessions actives
          </CardTitle>
          <CardDescription>
            Appareils connectés à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current session */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Session actuelle</p>
                  <p className="text-xs text-muted-foreground">
                    Navigateur web • {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Clock className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>

            {/* Placeholder for other sessions */}
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                La gestion multi-sessions sera disponible prochainement
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Section - Admin/Coordinator only */}
      {canViewAudit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Journal d'audit
            </CardTitle>
            <CardDescription>
              Dernières actions sensibles dans votre structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground py-8">
                <Activity className="h-8 w-8 opacity-50" />
                <span className="text-sm">Aucune activité sensible récente</span>
                <p className="text-xs text-center max-w-sm">
                  Les actions liées aux délégations et transcriptions apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground w-28 flex-shrink-0 font-mono">
                      {format(new Date(log.created_at), 'dd MMM HH:mm', { locale: fr })}
                    </span>
                    <Badge variant="outline" className="flex-shrink-0">
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                    {log.patients && (
                      <span className="text-sm text-muted-foreground truncate">
                        {log.patients.first_name} {log.patients.last_name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
