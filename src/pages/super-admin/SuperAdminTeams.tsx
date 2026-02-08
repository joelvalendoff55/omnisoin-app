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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, RefreshCw, Building2, Stethoscope, UserCog, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TeamMember {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  specialty: string | null;
  is_active: boolean;
  created_at: string;
  structure_id: string;
  structure_name: string;
}

async function fetchTeamMembers(): Promise<TeamMember[]> {
  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .select('id, user_id, job_title, specialty, is_active, created_at, structure_id');

  if (membersError) throw membersError;

  const { data: structures, error: structuresError } = await supabase
    .from('structures')
    .select('id, name');

  if (structuresError) throw structuresError;

  // Get profiles for names
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name');

  const structureMap = new Map((structures || []).map(s => [s.id, s.name]));
  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

  return (members || []).map(m => {
    const profile = m.user_id ? profileMap.get(m.user_id) : null;
    return {
      id: m.id,
      user_id: m.user_id,
      first_name: profile?.first_name || null,
      last_name: profile?.last_name || null,
      job_title: m.job_title,
      specialty: m.specialty,
      is_active: m.is_active,
      created_at: m.created_at,
      structure_id: m.structure_id,
      structure_name: structureMap.get(m.structure_id) || 'Structure inconnue',
    };
  });
}

export default function SuperAdminTeams() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStructure, setSelectedStructure] = useState<string>('all');

  const { data: teamMembers, isLoading, refetch } = useQuery({
    queryKey: ['super-admin-team-members'],
    queryFn: fetchTeamMembers,
  });

  // Get unique structures for filter
  const structures = [...new Set((teamMembers || []).map(m => m.structure_name))].sort();

  const filteredMembers = (teamMembers || []).filter(member => {
    const matchesSearch = 
      `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.job_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.specialty || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.structure_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStructure = selectedStructure === 'all' || member.structure_name === selectedStructure;

    return matchesSearch && matchesStructure;
  });

  const getJobIcon = (jobTitle: string | null) => {
    const title = (jobTitle || '').toLowerCase();
    if (title.includes('médecin') || title.includes('docteur')) {
      return <Stethoscope className="h-4 w-4 text-blue-500" />;
    }
    if (title.includes('infirmier') || title.includes('ipa')) {
      return <Heart className="h-4 w-4 text-pink-500" />;
    }
    if (title.includes('coordinat')) {
      return <UserCog className="h-4 w-4 text-purple-500" />;
    }
    return <Users className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <SuperAdminLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Équipes</h1>
            <p className="text-muted-foreground mt-1">
              Gestion des membres d'équipe (team_members)
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un membre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedStructure} onValueChange={setSelectedStructure}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filtrer par organisation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les organisations</SelectItem>
              {structures.map((structure) => (
                <SelectItem key={structure} value={structure}>
                  {structure}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{(teamMembers || []).length}</p>
                  <p className="text-sm text-muted-foreground">Total membres</p>
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
                  <p className="text-2xl font-bold">
                    {(teamMembers || []).filter(m => m.is_active).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Membres actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{structures.length}</p>
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
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery || selectedStructure !== 'all' 
                  ? 'Aucun membre trouvé' 
                  : 'Aucun membre d\'équipe'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membre</TableHead>
                    <TableHead>Fonction</TableHead>
                    <TableHead>Spécialité</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getJobIcon(member.job_title)}
                          <span>
                            {member.first_name || member.last_name
                              ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                              : 'Nom non renseigné'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.job_title || '-'}
                      </TableCell>
                      <TableCell>
                        {member.specialty ? (
                          <Badge variant="outline">{member.specialty}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {member.structure_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.is_active ? (
                          <Badge className="bg-green-500/10 text-green-600 border-0">Actif</Badge>
                        ) : (
                          <Badge variant="secondary">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(member.created_at), 'dd MMM yyyy', { locale: fr })}
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
