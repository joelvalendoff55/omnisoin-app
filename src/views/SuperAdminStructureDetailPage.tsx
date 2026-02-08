"use client";

import { useState } from 'react';
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/hooks/useAuth';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  Calendar,
  Mail,
  Phone,
  MapPin,
  Globe,
  Clock,
  Shield,
  Power,
  PowerOff,
  AlertTriangle,
  Stethoscope,
  FileText,
  Mic,
  UserCog,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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

interface StructureDetails {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  timezone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  finess: string | null;
}

interface StructureMember {
  id: string;
  user_id: string;
  org_role: string;
  is_active: boolean;
  created_at: string;
  accepted_at: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
}

interface StructureStats {
  patients_count: number;
  consultations_count: number;
  transcripts_count: number;
  appointments_count: number;
  documents_count: number;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  doctor: 'Médecin',
  ipa: 'IPA',
  nurse: 'Infirmier(e)',
  coordinator: 'Coordinateur',
  assistant: 'Assistant(e)',
  viewer: 'Lecteur',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-500',
  admin: 'bg-red-500',
  doctor: 'bg-blue-500',
  ipa: 'bg-purple-500',
  nurse: 'bg-pink-500',
  coordinator: 'bg-green-500',
  assistant: 'bg-orange-500',
  viewer: 'bg-gray-500',
};

export default function SuperAdminStructureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);
  const [memberToPromote, setMemberToPromote] = useState<StructureMember | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);

  // Fetch structure details
  const { data: structure, isLoading: structureLoading } = useQuery({
    queryKey: ['super-admin-structure', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('structures')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as StructureDetails;
    },
    enabled: !!id && isSuperAdmin,
  });

  // Fetch structure members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['super-admin-structure-members', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_members')
        .select(`
          id,
          user_id,
          org_role,
          is_active,
          created_at,
          accepted_at
        `)
        .eq('structure_id', id)
        .order('org_role', { ascending: true });
      
      if (error) throw error;
      
      // Fetch profiles for each member
      const membersWithProfiles = await Promise.all(
        data.map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, phone')
            .eq('user_id', member.user_id)
            .single();
          
          return {
            ...member,
            profile,
          } as StructureMember;
        })
      );
      
      return membersWithProfiles;
    },
    enabled: !!id && isSuperAdmin,
  });

  // Fetch structure statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['super-admin-structure-stats', id],
    queryFn: async () => {
      const [patients, consultations, transcripts, appointments, documents] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('structure_id', id),
        supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('structure_id', id),
        supabase.from('patient_transcripts').select('id', { count: 'exact', head: true }).eq('structure_id', id),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('structure_id', id),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('structure_id', id),
      ]);

      return {
        patients_count: patients.count || 0,
        consultations_count: consultations.count || 0,
        transcripts_count: transcripts.count || 0,
        appointments_count: appointments.count || 0,
        documents_count: documents.count || 0,
      } as StructureStats;
    },
    enabled: !!id && isSuperAdmin,
  });

const handleToggleStatus = async () => {
    if (!structure) return;
    
    setIsToggling(true);
    try {
      const { error } = await supabase.rpc('super_admin_toggle_structure', {
        _structure_id: structure.id,
        _is_active: !structure.is_active,
      });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['super-admin-structure', id] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-structures'] });
      toast.success(structure.is_active ? 'Structure désactivée' : 'Structure activée');
    } catch (error) {
      console.error('Error toggling structure:', error);
      toast.error('Erreur lors du changement de statut');
    } finally {
      setIsToggling(false);
    }
  };

  const handlePromoteToAdmin = async () => {
    if (!memberToPromote) return;
    
    setIsPromoting(true);
    try {
      const { error } = await supabase
        .from('org_members')
        .update({ org_role: 'admin' })
        .eq('id', memberToPromote.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['super-admin-structure-members', id] });
      toast.success(`${memberToPromote.profile?.first_name || 'Membre'} a été promu administrateur`);
    } catch (error) {
      console.error('Error promoting member:', error);
      toast.error('Erreur lors de la promotion');
    } finally {
      setIsPromoting(false);
      setMemberToPromote(null);
    }
  };

  const getMemberDisplayName = (member: StructureMember) => {
    if (member.profile?.first_name || member.profile?.last_name) {
      return `${member.profile.first_name || ''} ${member.profile.last_name || ''}`.trim();
    }
    return 'Ce membre';
  };

  // Redirect if not authenticated
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  // Loading state
  if (authLoading || superAdminLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  // Access denied
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Accès refusé</CardTitle>
            <CardDescription>
              Vous n'avez pas les droits d'accès à cette page.
              Seuls les super administrateurs peuvent y accéder.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/')}>
              Retour au dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = structureLoading || membersLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!structure) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
            <CardTitle>Structure introuvable</CardTitle>
            <CardDescription>
              La structure demandée n'existe pas ou a été supprimée.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/super-admin')}>
              Retour à l'administration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    { label: 'Patients', value: stats?.patients_count || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Consultations', value: stats?.consultations_count || 0, icon: Stethoscope, color: 'text-green-500' },
    { label: 'Transcriptions', value: stats?.transcripts_count || 0, icon: Mic, color: 'text-purple-500' },
    { label: 'Rendez-vous', value: stats?.appointments_count || 0, icon: Calendar, color: 'text-orange-500' },
    { label: 'Documents', value: stats?.documents_count || 0, icon: FileText, color: 'text-pink-500' },
  ];

  // Group members by role
  const membersByRole = members?.reduce((acc, member) => {
    const role = member.org_role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(member);
    return acc;
  }, {} as Record<string, StructureMember[]>) || {};

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{structure.name}</h1>
                    {structure.is_active ? (
                      <Badge className="bg-green-500">Actif</Badge>
                    ) : (
                      <Badge variant="destructive">Inactif</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">{structure.slug}</p>
                </div>
              </div>
            </div>
            <Button
              variant={structure.is_active ? 'destructive' : 'default'}
              disabled={isToggling}
              onClick={handleToggleStatus}
            >
              {structure.is_active ? (
                <>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Désactiver
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  Activer
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-2">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Structure Info & Members */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Structure Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informations de la structure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p className="font-medium">{structure.email || '-'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Téléphone
                  </div>
                  <p className="font-medium">{structure.phone || '-'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Adresse
                  </div>
                  <p className="font-medium">{structure.address || '-'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    Pays
                  </div>
                  <p className="font-medium">{structure.country || '-'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Fuseau horaire
                  </div>
                  <p className="font-medium">{structure.timezone || '-'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Date de création
                  </div>
                  <p className="font-medium">
                    {format(new Date(structure.created_at), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  ID technique
                </div>
                <p className="font-mono text-xs bg-muted p-2 rounded">{structure.id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Members Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Membres ({members?.length || 0})
              </CardTitle>
              <CardDescription>
                Répartition des membres par rôle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(membersByRole).map(([role, roleMembers]) => (
                  <div key={role} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={ROLE_COLORS[role] || 'bg-gray-500'}>
                        {ROLE_LABELS[role] || role}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {roleMembers.length}
                    </Badge>
                  </div>
                ))}
                {Object.keys(membersByRole).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun membre dans cette structure
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Liste complète des membres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Inscrit le</TableHead>
                    <TableHead>Validé le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members?.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.profile?.first_name || member.profile?.last_name
                          ? `${member.profile.first_name || ''} ${member.profile.last_name || ''}`.trim()
                          : 'Profil incomplet'}
                      </TableCell>
                      <TableCell>{member.profile?.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[member.org_role] || 'bg-gray-500'}>
                          {ROLE_LABELS[member.org_role] || member.org_role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.is_active ? (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            En attente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(member.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {member.accepted_at 
                          ? format(new Date(member.accepted_at), 'dd MMM yyyy', { locale: fr })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {member.org_role !== 'admin' && member.org_role !== 'owner' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMemberToPromote(member)}
                          >
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Promouvoir admin
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!members || members.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Aucun membre dans cette structure
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Promote to Admin Dialog */}
      <AlertDialog open={!!memberToPromote} onOpenChange={() => setMemberToPromote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promouvoir en administrateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir promouvoir <strong>{memberToPromote && getMemberDisplayName(memberToPromote)}</strong> au rôle d'administrateur ?
              <br /><br />
              Cette personne aura accès à toutes les fonctionnalités de gestion de la structure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPromoting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePromoteToAdmin}
              disabled={isPromoting}
            >
              {isPromoting ? 'Promotion...' : 'Confirmer la promotion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
