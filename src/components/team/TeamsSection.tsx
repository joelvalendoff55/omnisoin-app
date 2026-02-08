import { useState } from 'react';
import { useTeams, useTeamMembers as useTeamMembersList } from '@/hooks/useTeams';
import { Team, TEAM_COLORS } from '@/lib/teams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Plus, 
  Trash2, 
  Loader2, 
  UserPlus,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TeamMemberAddDialog from './TeamMemberAddDialog';
import TeamFormDialog from './TeamFormDialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

interface TeamsSectionProps {
  canManage: boolean;
}

export default function TeamsSection({ canManage }: TeamsSectionProps) {
  const { teams, loading, createDefaults, remove, refetch } = useTeams();
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [selectedTeamForAdd, setSelectedTeamForAdd] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [creatingDefaults, setCreatingDefaults] = useState(false);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const handleCreateDefaults = async () => {
    setCreatingDefaults(true);
    await createDefaults();
    setCreatingDefaults(false);
  };

  const handleDeleteTeam = async () => {
    if (teamToDelete) {
      await remove(teamToDelete.id);
      setTeamToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium text-foreground">
          Aucune équipe créée
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          Les équipes permettent de regrouper les membres de votre structure 
          (Assistantes, Médecins, IPA, Coordination) pour les notifications et la gestion.
        </p>
        {canManage && (
          <div className="flex gap-3 mt-6">
            <Button onClick={handleCreateDefaults} disabled={creatingDefaults}>
              {creatingDefaults ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Créer les équipes par défaut
            </Button>
            <Button variant="outline" onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer une équipe
            </Button>
          </div>
        )}
        <TeamFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSuccess={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      {canManage && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle équipe
          </Button>
        </div>
      )}

      {/* Teams list */}
      <div className="grid gap-4">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            isExpanded={expandedTeams.has(team.id)}
            onToggle={() => toggleTeam(team.id)}
            canManage={canManage}
            onAddMember={() => setSelectedTeamForAdd(team)}
            onDelete={() => setTeamToDelete(team)}
          />
        ))}
      </div>

      {/* Add member dialog */}
      <TeamMemberAddDialog
        team={selectedTeamForAdd}
        open={!!selectedTeamForAdd}
        onOpenChange={(open) => !open && setSelectedTeamForAdd(null)}
      />

      {/* Create team dialog */}
      <TeamFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={refetch}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'équipe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera l'équipe "{teamToDelete?.name}" et retirera tous ses membres.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface TeamCardProps {
  team: Team;
  isExpanded: boolean;
  onToggle: () => void;
  canManage: boolean;
  onAddMember: () => void;
  onDelete: () => void;
}

function TeamCard({ team, isExpanded, onToggle, canManage, onAddMember, onDelete }: TeamCardProps) {
  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: team.color + '20' }}
              >
                <Users className="h-5 w-5" style={{ color: team.color }} />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {team.name}
                  {!team.is_active && (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                </CardTitle>
                {team.description && (
                  <p className="text-sm text-muted-foreground">{team.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-normal">
                {team.member_count || 0} membre{(team.member_count || 0) > 1 ? 's' : ''}
              </Badge>
              {canManage && (
                <>
                  <Button variant="ghost" size="icon" onClick={onAddMember}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <TeamMembersContent teamId={team.id} canManage={canManage} />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function TeamMembersContent({ teamId, canManage }: { teamId: string; canManage: boolean }) {
  const { members, loading, remove } = useTeamMembersList(teamId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Aucun membre dans cette équipe
      </div>
    );
  }

  return (
    <div className="divide-y">
      {members.map((member) => (
        <div 
          key={member.id} 
          className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {(member.profile?.first_name?.[0] || '') + (member.profile?.last_name?.[0] || '')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {member.profile?.first_name} {member.profile?.last_name}
              </p>
              {member.role_in_team && (
                <p className="text-xs text-muted-foreground">{member.role_in_team}</p>
              )}
            </div>
          </div>
          {canManage && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => remove(member.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
