import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCog, Search, RefreshCw, Crown, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Administrator {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  org_role: string;
  is_active: boolean;
  created_at: string;
  structure_id: string;
  structure_name: string;
}

async function fetchAdministrators(): Promise<Administrator[]> {
  // Get all admins and owners from org_members
  const { data: members, error: membersError } = await supabase
    .from('org_members')
    .select('id, user_id, structure_id, org_role, is_active, created_at')
    .in('org_role', ['admin', 'owner'])
    .is('archived_at', null);

  if (membersError) throw membersError;

  // Get structures for names
  const { data: structures, error: structuresError } = await supabase
    .from('structures')
    .select('id, name');

  if (structuresError) throw structuresError;

  // Get profiles for names
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name');

  if (profilesError) throw profilesError;

  // Try to get emails via RPC
  let emailMap = new Map<string, string>();
  try {
    const { data: admins } = await supabase.rpc('get_all_org_admins');
    if (admins) {
      (admins as Array<{ user_id: string; email: string }>).forEach(a => {
        emailMap.set(a.user_id, a.email);
      });
    }
  } catch (e) {
    console.error('Could not fetch admin emails:', e);
  }

  const structureMap = new Map((structures || []).map(s => [s.id, s.name]));
  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

  return (members || []).map(m => {
    const profile = profileMap.get(m.user_id);
    return {
      id: m.id,
      user_id: m.user_id,
      email: emailMap.get(m.user_id) || 'Email non disponible',
      first_name: profile?.first_name || null,
      last_name: profile?.last_name || null,
      org_role: m.org_role,
      is_active: m.is_active,
      created_at: m.created_at,
      structure_id: m.structure_id,
      structure_name: structureMap.get(m.structure_id) || 'Structure inconnue',
    };
  });
}

export default function SuperAdminAdministrators() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: administrators, isLoading, refetch } = useQuery({
    queryKey: ['super-admin-administrators'],
    queryFn: fetchAdministrators,
  });

  const filteredAdmins = (administrators || []).filter(admin =>
    admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.structure_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${admin.first_name || ''} ${admin.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-amber-500" />;
      case 'admin':
        return <UserCog className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Propriétaire';
      case 'admin':
        return 'Administrateur';
      default:
        return role;
    }
  };

  return (
    <SuperAdminLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Administrateurs</h1>
            <p className="text-muted-foreground mt-1">
              Liste des administrateurs par organisation
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un administrateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Crown className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {(administrators || []).filter(a => a.org_role === 'owner').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Propriétaires</p>
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
                  <p className="text-2xl font-bold">
                    {(administrators || []).filter(a => a.org_role === 'admin').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Administrateurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set((administrators || []).map(a => a.structure_id)).size}
                  </p>
                  <p className="text-sm text-muted-foreground">Organisations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? 'Aucun administrateur trouvé' : 'Aucun administrateur'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Administrateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Depuis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(admin.org_role)}
                          <span>
                            {admin.first_name || admin.last_name
                              ? `${admin.first_name || ''} ${admin.last_name || ''}`.trim()
                              : 'Nom non renseigné'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {admin.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {admin.structure_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={admin.org_role === 'owner' ? 'default' : 'secondary'}>
                          {getRoleLabel(admin.org_role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {admin.is_active ? (
                          <Badge className="bg-green-500/10 text-green-600 border-0">Actif</Badge>
                        ) : (
                          <Badge variant="secondary">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(admin.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
