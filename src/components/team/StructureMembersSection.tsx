import { useState } from 'react';
import { useStructureMembers } from '@/hooks/useStructureMembers';
import { useRole } from '@/hooks/useRole';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { StructureMember, OrgRole, ROLE_LABELS, ROLE_COLORS, ROLE_ORDER } from '@/lib/structureMembers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Loader2, 
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  Trash2,
  UserCog,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import InviteMemberDialog from './InviteMemberDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StructureMembersSectionProps {
  canManage: boolean;
}

export default function StructureMembersSection({ canManage }: StructureMembersSectionProps) {
  const { 
    activeMembers, 
    pendingMembers, 
    groupedByRole, 
    loading, 
    approve, 
    reject, 
    remove,
    updateRole,
    refetch 
  } = useStructureMembers();
  const { isAdmin } = useRole();
  const { isSuperAdmin } = useSuperAdmin();
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<StructureMember | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [roleChangeOpen, setRoleChangeOpen] = useState(false);
  const [memberToChangeRole, setMemberToChangeRole] = useState<StructureMember | null>(null);
  const [newRole, setNewRole] = useState<OrgRole | null>(null);

  // Only admins and super_admins can invite members
  const canInvite = isAdmin || isSuperAdmin;

  const getInitials = (member: StructureMember) => {
    const firstName = member.profile?.first_name || '';
    const lastName = member.profile?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
  };

  const getDisplayName = (member: StructureMember) => {
    if (member.profile?.first_name || member.profile?.last_name) {
      return `${member.profile.first_name || ''} ${member.profile.last_name || ''}`.trim();
    }
    return 'Utilisateur';
  };

  const handleRemove = async () => {
    if (memberToRemove) {
      await remove(memberToRemove.id);
      setMemberToRemove(null);
      setRemoveDialogOpen(false);
    }
  };

  const handleRoleChange = async () => {
    if (memberToChangeRole && newRole) {
      await updateRole(memberToChangeRole.id, newRole);
      setMemberToChangeRole(null);
      setRoleChangeOpen(false);
      setNewRole(null);
    }
  };

  const openRemoveDialog = (member: StructureMember) => {
    setMemberToRemove(member);
    setRemoveDialogOpen(true);
  };

  const openRoleChangeDialog = (member: StructureMember) => {
    setMemberToChangeRole(member);
    setNewRole(member.org_role);
    setRoleChangeOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Membres de la structure</h3>
          <p className="text-sm text-muted-foreground">
            {activeMembers.length} membre{activeMembers.length > 1 ? 's' : ''} actif{activeMembers.length > 1 ? 's' : ''}
            {pendingMembers.length > 0 && ` • ${pendingMembers.length} en attente`}
          </p>
        </div>
        {canInvite && (
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Inviter un membre
          </Button>
        )}
      </div>

      {/* Pending Members */}
      {pendingMembers.length > 0 && canManage && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-base">
              <Clock className="h-4 w-4" />
              Demandes en attente ({pendingMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingMembers.map(member => (
              <div 
                key={member.id} 
                className="flex items-center justify-between p-3 bg-background rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">
                      {getInitials(member)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{getDisplayName(member)}</p>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {ROLE_LABELS[member.org_role]}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => reject(member.id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Refuser
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => approve(member.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approuver
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Members grouped by role */}
      {activeMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            Aucun membre dans la structure
          </h3>
          <p 
            className="mt-2 text-sm text-muted-foreground cursor-pointer hover:underline"
            onClick={() => setInviteDialogOpen(true)}
          >
            Invitez des membres pour commencer
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ROLE_ORDER.map(role => {
            const roleMembers = groupedByRole.get(role) || [];
            if (roleMembers.length === 0) return null;

            return (
              <Card key={role}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: ROLE_COLORS[role] }}
                      />
                      <span className="text-base font-medium">
                        {ROLE_LABELS[role]}s
                      </span>
                    </div>
                    <Badge variant="secondary">{roleMembers.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {roleMembers.map(member => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback 
                            className="text-xs"
                            style={{ 
                              backgroundColor: `${ROLE_COLORS[role]}20`,
                              color: ROLE_COLORS[role]
                            }}
                          >
                            {getInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{getDisplayName(member)}</p>
                        </div>
                      </div>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openRoleChangeDialog(member)}>
                              <UserCog className="mr-2 h-4 w-4" />
                              Changer le rôle
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => openRemoveDialog(member)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Retirer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={refetch}
      />

      {/* Remove confirmation */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove && (
                <>
                  <strong>{getDisplayName(memberToRemove)}</strong> sera retiré de la structure.
                  Cette action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground">
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role change dialog */}
      <AlertDialog open={roleChangeOpen} onOpenChange={setRoleChangeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer le rôle</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToChangeRole && (
                <>
                  Modifier le rôle de <strong>{getDisplayName(memberToChangeRole)}</strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={newRole || undefined} onValueChange={(v) => setNewRole(v as OrgRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_ORDER.filter(r => r !== 'owner').map(role => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
