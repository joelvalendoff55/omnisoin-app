"use client";

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users, UserCog, TrendingUp, UserPlus, Activity } from 'lucide-react';
import { startOfMonth, isAfter, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GlobalStats {
  totalOrganizations: number;
  totalAdmins: number;
  totalUsers: number;
  newRegistrationsThisMonth: number;
}

async function fetchGlobalStats(): Promise<GlobalStats> {
  // Fetch structures count
  const { data: structures, error: structuresError } = await supabase
    .from('structures')
    .select('id');

  if (structuresError) throw structuresError;

  // Fetch all org members
  const { data: members, error: membersError } = await supabase
    .from('org_members')
    .select('id, org_role, created_at')
    .eq('is_active', true)
    .is('archived_at', null);

  if (membersError) throw membersError;

  const startOfCurrentMonth = startOfMonth(new Date());
  const admins = (members || []).filter(m => m.org_role === 'admin' || m.org_role === 'owner');
  const newRegistrations = (members || []).filter(m => 
    isAfter(new Date(m.created_at), startOfCurrentMonth)
  );

  return {
    totalOrganizations: structures?.length || 0,
    totalAdmins: admins.length,
    totalUsers: members?.length || 0,
    newRegistrationsThisMonth: newRegistrations.length,
  };
}

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['super-admin-global-stats'],
    queryFn: fetchGlobalStats,
  });

  return (
    <SuperAdminLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">
            Vue d'ensemble de la plateforme
          </p>
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.totalOrganizations}</p>
                    <p className="text-sm text-muted-foreground">Organisations</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <UserCog className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.totalAdmins}</p>
                    <p className="text-sm text-muted-foreground">Administrateurs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <Users className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.totalUsers}</p>
                    <p className="text-sm text-muted-foreground">Utilisateurs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-orange-500/10">
                    <UserPlus className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.newRegistrationsThisMonth}</p>
                    <p className="text-sm text-muted-foreground">Inscriptions ce mois</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activité récente
              </CardTitle>
              <CardDescription>
                Dernières actions sur la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Aucune activité récente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Croissance
              </CardTitle>
              <CardDescription>
                Évolution des inscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Graphique de croissance à venir
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
