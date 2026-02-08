import { useState, useMemo } from 'react';
import { useTeams, useTeamMembers } from '@/hooks/useTeams';
import { Team, TeamFormData, TEAM_COLORS, DEFAULT_TEAMS } from '@/lib/teams';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { UserMultiSelect } from '@/components/shared/UserMultiSelect';
import {
  Users2,
  Plus,
  Search,
  Pencil,
  Trash2,
  UserPlus,
  Loader2,
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function TeamsSettingsTab() {
  const { teams, loading, create, update, remove, createDefaults } = useTeams();
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);
  const [creatingDefaults, setCreatingDefaults] = useState(false);

  // Form state
  const [formData, setFormData] = useState<TeamFormData>({
    name: '',
    description: '',
    color: TEAM_COLORS[0],
    is_active: true,
  });

  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teams;
    const query = searchQuery.toLowerCase();
    return teams.filter(
      t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
    );
  }, [teams, searchQuery]);

  // Check which default teams already exist
  const existingDefaultTeamNames = useMemo(() => {
    return new Set(teams.map(t => t.name));
  }, [teams]);

  const missingDefaultTeams = useMemo(() => {
    return DEFAULT_TEAMS.filter(dt => !existingDefaultTeamNames.has(dt.name));
  }, [existingDefaultTeamNames]);

  const openCreateForm = () => {
    setEditingTeam(null);
    setFormData({
      name: '',
      description: '',
      color: TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)],
      is_active: true,
    });
    setFormOpen(true);
  };

  const openEditForm = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      color: team.color,
      is_active: team.is_active,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      if (editingTeam) {
        await update(editingTeam.id, formData);
      } else {
        await create(formData);
      }
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await remove(deleteConfirm.id);
    setDeleteConfirm(null);
    if (detailTeam?.id === deleteConfirm.id) {
      setDetailTeam(null);
    }
  };

  const handleToggleActive = async (team: Team, isActive: boolean) => {
    await update(team.id, { is_active: isActive });
    if (isActive) {
      toast.success(`Équipe "${team.name}" activée`);
    } else {
      toast.info(`Équipe "${team.name}" désactivée`);
    }
  };

  const handleCreateDefaultTeams = async () => {
    setCreatingDefaults(true);
    try {
      const created = await createDefaults();
      if (created && created.length > 0) {
        toast.success(`${created.length} équipe(s) par défaut créée(s)`);
      } else {
        toast.info('Toutes les équipes par défaut existent déjà');
      }
    } catch (error) {
      toast.error('Erreur lors de la création des équipes');
    } finally {
      setCreatingDefaults(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users2 className="h-5 w-5" />
                Gestion des équipes
              </CardTitle>
              <CardDescription>
                Organisez les membres de votre structure en équipes pour cibler les notifications
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {missingDefaultTeams.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleCreateDefaultTeams}
                  disabled={creatingDefaults}
                  className="gap-2"
                >
                  {creatingDefaults ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Créer équipes par défaut
                </Button>
              )}
              <Button onClick={openCreateForm} className="gap-2">
                <Plus className="h-4 w-4" />
                Créer une équipe
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une équipe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Teams List */}
          {filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users2 className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Aucune équipe</p>
              <p className="text-sm mb-4">Créez votre première équipe pour commencer</p>
              <Button 
                variant="outline" 
                onClick={handleCreateDefaultTeams}
                disabled={creatingDefaults}
                className="gap-2"
              >
                {creatingDefaults ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Créer les équipes par défaut
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredTeams.map(team => (
                <div
                  key={team.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all',
                    'hover:bg-muted/50',
                    !team.is_active && 'opacity-60 bg-muted/30'
                  )}
                  onClick={() => setDetailTeam(team)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Color badge */}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm border-2 border-background"
                      style={{ backgroundColor: team.color }}
                    />
                    
                    {/* Team info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{team.name}</span>
                        
                        {/* Status badge */}
                        {team.is_active ? (
                          <Badge variant="default" className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </div>
                      
                      {/* Description */}
                      {team.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {team.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Right side: member count + actions */}
                  <div className="flex items-center gap-3 ml-4">
                    <Badge variant="outline" className="gap-1">
                      <Users2 className="h-3 w-3" />
                      {team.member_count || 0} membre{(team.member_count || 0) !== 1 ? 's' : ''}
                    </Badge>
                    
                    {/* Active toggle */}
                    <Switch
                      checked={team.is_active}
                      onCheckedChange={(checked) => {
                        // Prevent event bubbling
                        handleToggleActive(team, checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={team.is_active ? 'Désactiver l\'équipe' : 'Activer l\'équipe'}
                    />
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditForm(team);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? 'Modifier l\'équipe' : 'Créer une équipe'}
            </DialogTitle>
            <DialogDescription>
              {editingTeam
                ? 'Modifiez les informations de l\'équipe'
                : 'Créez une nouvelle équipe pour organiser vos membres'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Nom de l'équipe *</Label>
              <Input
                id="team-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Médecins, Infirmiers..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-description">Description</Label>
              <Textarea
                id="team-description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description optionnelle de l'équipe..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {TEAM_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded-full transition-all',
                      formData.color === color
                        ? 'ring-2 ring-offset-2 ring-primary'
                        : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            {editingTeam && (
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="team-active">Équipe active</Label>
                  <p className="text-sm text-muted-foreground">
                    Désactiver au lieu de supprimer
                  </p>
                </div>
                <Switch
                  id="team-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTeam ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Detail Dialog */}
      <TeamDetailDialog
        team={detailTeam}
        open={!!detailTeam}
        onOpenChange={(open) => !open && setDetailTeam(null)}
        onEdit={() => {
          if (detailTeam) {
            openEditForm(detailTeam);
            setDetailTeam(null);
          }
        }}
        onDelete={() => {
          if (detailTeam) {
            setDeleteConfirm(detailTeam);
            setDetailTeam(null);
          }
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'équipe ?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-amber-600">Attention :</span> Cette action est irréversible. 
              L'équipe "{deleteConfirm?.name}" et tous ses membres seront supprimés.
              <br /><br />
              <span className="text-muted-foreground">
                Conseil : Désactivez l'équipe plutôt que de la supprimer pour conserver l'historique.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface TeamDetailDialogProps {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TeamDetailDialog({ team, open, onOpenChange, onEdit, onDelete }: TeamDetailDialogProps) {
  const { members, loading, add, remove } = useTeamMembers(team?.id || null);
  const [addingMembers, setAddingMembers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const existingUserIds = useMemo(() => members.map(m => m.user_id), [members]);

  const handleAddMembers = async () => {
    const newUserIds = selectedUserIds.filter(id => !existingUserIds.includes(id));
    for (const userId of newUserIds) {
      await add(userId);
    }
    setSelectedUserIds([]);
    setAddingMembers(false);
  };

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded-full shadow-sm border-2 border-background"
              style={{ backgroundColor: team.color }}
            />
            <DialogTitle className="flex items-center gap-2">
              {team.name}
              {team.is_active ? (
                <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </DialogTitle>
          </div>
          {team.description && (
            <DialogDescription>{team.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Members */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Membres ({members.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingMembers(true)}
                className="gap-1"
              >
                <UserPlus className="h-4 w-4" />
                Ajouter
              </Button>
            </div>

            {addingMembers && (
              <div className="p-3 border rounded-lg space-y-3">
                <UserMultiSelect
                  selectedIds={selectedUserIds}
                  onChange={setSelectedUserIds}
                  placeholder="Sélectionner des membres..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAddingMembers(false);
                      setSelectedUserIds([]);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddMembers}
                    disabled={selectedUserIds.filter(id => !existingUserIds.includes(id)).length === 0}
                  >
                    Ajouter
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="h-[200px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Users2 className="h-8 w-8 mb-2" />
                  <p className="text-sm">Aucun membre</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {(member.profile?.first_name?.[0] || '') +
                              (member.profile?.last_name?.[0] || '') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {member.profile?.first_name || ''} {member.profile?.last_name || ''}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => remove(member.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <Separator />

          <div className="flex justify-between">
            <Button variant="outline" onClick={onEdit} className="gap-2">
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
            <Button variant="destructive" onClick={onDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
