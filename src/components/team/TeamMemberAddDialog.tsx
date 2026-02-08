"use client";

import { useState, useEffect } from 'react';
import { useTeamMembers as useTeamMembersList } from '@/hooks/useTeams';
import { useStructureId } from '@/hooks/useStructureId';
import { Team } from '@/lib/teams';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, UserPlus, Search } from 'lucide-react';

interface StructureProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

interface TeamMemberAddDialogProps {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TeamMemberAddDialog({ team, open, onOpenChange }: TeamMemberAddDialogProps) {
  const { structureId } = useStructureId();
  const { add, members, refetch } = useTeamMembersList(team?.id || null);
  
  const [profiles, setProfiles] = useState<StructureProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [roleInTeam, setRoleInTeam] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch available profiles (not already in this team)
  useEffect(() => {
    if (!open || !structureId || !team) return;

    const fetchProfiles = async () => {
      setLoading(true);
      try {
        // Get all org_members in the structure and join with profiles
        const { data: members, error: membersError } = await supabase
          .from('org_members')
          .select('user_id')
          .eq('structure_id', structureId)
          .eq('is_active', true);

        if (membersError) throw membersError;

        const userIds = (members || []).map(m => m.user_id);
        if (userIds.length === 0) {
          setProfiles([]);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        if (error) throw error;

        // Filter out users already in the team
        const memberUserIds = new Set(members.map(m => m.user_id));
        const availableProfiles = (data || []).filter(p => !memberUserIds.has(p.user_id));
        
        setProfiles(availableProfiles);
      } catch (err) {
        console.error('Error fetching profiles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [open, structureId, team, members]);

  const filteredProfiles = profiles.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    return fullName.includes(query);
  });

  const handleAdd = async () => {
    if (!selectedUserId || !team) return;

    setAdding(true);
    const success = await add(selectedUserId, roleInTeam || undefined);
    setAdding(false);

    if (success) {
      setSelectedUserId('');
      setRoleInTeam('');
      await refetch();
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedUserId('');
      setRoleInTeam('');
      setSearchQuery('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" style={{ color: team?.color }} />
            Ajouter un membre
          </DialogTitle>
          <DialogDescription>
            Ajouter un membre à l'équipe "{team?.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un membre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* User selection */}
          <div className="space-y-2">
            <Label>Membre *</Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {profiles.length === 0 
                  ? 'Tous les membres font déjà partie de cette équipe'
                  : 'Aucun membre trouvé'
                }
              </p>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un membre" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProfiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {(profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {profile.first_name} {profile.last_name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Role in team */}
          <div className="space-y-2">
            <Label htmlFor="roleInTeam">Rôle dans l'équipe (optionnel)</Label>
            <Input
              id="roleInTeam"
              value={roleInTeam}
              onChange={(e) => setRoleInTeam(e.target.value)}
              placeholder="Ex: Responsable, Coordinateur..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={adding || !selectedUserId}
          >
            {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
