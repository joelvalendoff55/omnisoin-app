import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Shield, 
  Building2, 
  Users, 
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Calendar,
  UserPlus,
  Crown,
  UserCog,
} from 'lucide-react';
import { format, startOfMonth, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StructureMember {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  org_role: string;
  is_active: boolean;
  created_at: string;
}

interface StructureWithMembers {
  id: string;
  name: string;
  slug: string;
  members: StructureMember[];
  admins: StructureMember[];
  member_count: number;
}

interface GlobalStats {
  totalStructures: number;
  totalUsers: number;
  newRegistrationsThisMonth: number;
}

// Fetch all structures with their members
async function fetchStructuresWithMembers(): Promise<StructureWithMembers[]> {
  // First get all structures
  const { data: structures, error: structureError } = await supabase
    .from('structures')
    .select('id, name, slug')
    .order('name', { ascending: true });

  if (structureError) {
    console.error('Error fetching structures:', structureError);
    throw structureError;
  }

  // Get all org members
  const { data: members, error: membersError } = await supabase
    .from('org_members')
    .select('id, user_id, structure_id, org_role, is_active, created_at')
    .is('archived_at', null);

  if (membersError) {
    console.error('Error fetching members:', membersError);
    throw membersError;
  }

  // Get profiles for names
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name');

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  }

  // Try to get admins with emails from RPC
  let adminEmails: Map<string, string> = new Map();
  try {
    const { data: admins } = await supabase.rpc('get_all_org_admins');
    if (admins) {
      (admins as Array<{ user_id: string; email: string }>).forEach(a => {
        adminEmails.set(a.user_id, a.email);
      });
    }
  } catch (e) {
    console.error('Could not fetch admin emails:', e);
  }

  const profileMap = new Map(
    (profiles || []).map(p => [p.user_id, p])
  );

  // Combine data - use structure.id to match with structure_id in org_members
  return (structures || []).map(structure => {
    const structureMembers = (members || [])
      .filter(m => m.structure_id === structure.id)
      .map(m => {
        const profile = profileMap.get(m.user_id);
        const email = adminEmails.get(m.user_id) || 'Email non disponible';
        return {
          id: m.id,
          user_id: m.user_id,
          email,
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          org_role: m.org_role,
          is_active: m.is_active,
          created_at: m.created_at,
        };
      });

    const admins = structureMembers.filter(m => m.org_role === 'owner' || m.org_role === 'admin');

    return {
      ...structure,
      members: structureMembers,
      admins,
      member_count: structureMembers.length,
    };
  });
}

// Calculate global stats
function calculateGlobalStats(structures: StructureWithMembers[]): GlobalStats {
  const startOfCurrentMonth = startOfMonth(new Date());
  
  const allMembers = structures.flatMap(s => s.members);
  const newRegistrations = allMembers.filter(m => 
    isAfter(new Date(m.created_at), startOfCurrentMonth)
  ).length;

  return {
    totalStructures: structures.length,
    totalUsers: allMembers.length,
    newRegistrationsThisMonth: newRegistrations,
  };
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    owner: 'Propriétaire',
    admin: 'Administrateur',
    doctor: 'Médecin',
    ipa: 'IPA',
    nurse: 'Infirmier',
    coordinator: 'Coordinateur',
    assistant: 'Assistant',
  };
  return labels[role] || role;
}

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (role) {
    case 'owner':
      return 'default';
    case 'admin':
      return 'secondary';
    default:
      return 'outline';
  }
}

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

  // Check if user is owner in any structure
  const { data: isOrgOwner, isLoading: ownerCheckLoading } = useQuery({
    queryKey: ['is-org-owner', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('org_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('org_role', 'owner')
        .eq('is_active', true)
        .is('archived_at', null)
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking owner status:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user,
  });

  const { data: structures, isLoading, refetch } = useQuery({
    queryKey: ['super-admin-structures-with-members'],
    queryFn: fetchStructuresWithMembers,
    enabled: !!user && isOrgOwner === true,
  });

  const stats = useMemo(() => {
    if (!structures) return null;
    return calculateGlobalStats(structures);
  }, [structures]);

  const filteredStructures = useMemo(() => {
    if (!structures) return [];
    if (!searchQuery.trim()) return structures;
    
    const query = searchQuery.toLowerCase();
    return structures.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.slug.toLowerCase().includes(query) ||
      s.admins.some(a => 
        a.email?.toLowerCase().includes(query) ||
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(query)
      )
    );
  }, [structures, searchQuery]);

  const toggleExpanded = (orgId: string) => {
    setExpandedOrgs(prev => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  };

  // Redirect if not authenticated
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  // Show loading state
  if (authLoading || ownerCheckLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Access denied
  if (!isOrgOwner) {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Supervision des structures</h1>
                <p className="text-sm text-muted-foreground">
                  Vue d'ensemble des structures PDS sur la plateforme
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Global Statistics */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalStructures}</p>
                    <p className="text-sm text-muted-foreground">Structures</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                    <p className="text-sm text-muted-foreground">Utilisateurs (PDS)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                    <p className="text-sm text-muted-foreground">Utilisateurs (PDS)</p>
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
                    <p className="text-2xl font-bold">{stats.newRegistrationsThisMonth}</p>
                    <p className="text-sm text-muted-foreground">Inscriptions ce mois</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Structures List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Structures ({filteredStructures.length})
                </CardTitle>
                <CardDescription>
                  Liste des structures inscrites sur la plateforme
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une structure..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : filteredStructures.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? 'Aucune structure trouvée' : 'Aucune structure enregistrée'}
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {filteredStructures.map((structure) => (
                    <StructureRow
                      key={structure.id}
                      structure={structure}
                      isExpanded={expandedOrgs.has(structure.id)}
                      onToggle={() => toggleExpanded(structure.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StructureRowProps {
  structure: StructureWithMembers;
  isExpanded: boolean;
  onToggle: () => void;
}

function StructureRow({ structure, isExpanded, onToggle }: StructureRowProps) {
  const adminNames = structure.admins
    .map(a => `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email)
    .slice(0, 2)
    .join(', ');
  
  const hasMoreAdmins = structure.admins.length > 2;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{structure.name}</span>
                  <Badge variant="outline">{structure.slug}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    {adminNames || 'Aucun admin'}
                    {hasMoreAdmins && ` +${structure.admins.length - 2}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4">
              <div className="text-right">
                <Badge variant="outline" className="font-mono">
                  <Users className="h-3 w-3 mr-1" />
                  {structure.member_count} membre{structure.member_count !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t bg-muted/30 p-4">
            {structure.members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun membre dans cette structure
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structure.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {member.org_role === 'owner' && (
                            <Crown className="h-4 w-4 text-amber-500" />
                          )}
                          {member.org_role === 'admin' && (
                            <UserCog className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="font-medium">
                            {member.first_name || member.last_name 
                              ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                              : 'Nom non renseigné'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.org_role)}>
                          {getRoleLabel(member.org_role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.is_active ? (
                          <Badge className="bg-green-500/10 text-green-600 border-0">
                            Actif
                          </Badge>
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
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
