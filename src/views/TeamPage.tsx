"use client";

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useRole } from '@/hooks/useRole';
import { TeamMember, JOB_TITLE_OPTIONS } from '@/lib/team';
import TeamMemberCard from '@/components/team/TeamMemberCard';
import TeamMemberFormDialog from '@/components/team/TeamMemberFormDialog';
import TeamMemberDetailDrawer from '@/components/team/TeamMemberDetailDrawer';
import StructureMembersSection from '@/components/team/StructureMembersSection';
import { PractitionerSchedulesSection } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, Users, Search, Loader2, Calendar, Building2 } from 'lucide-react';

export default function TeamPage() {
  const { teamMembers, loading, create, update, deactivate } = useTeamMembers();
  const { isAdmin, isCoordinator } = useRole();
  const canManage = isAdmin || isCoordinator;

  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const filteredMembers = useMemo(() => {
    return teamMembers.filter((member) => {
      // Job title filter
      if (jobFilter !== 'all' && member.job_title !== jobFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const firstName = member.profile?.first_name?.toLowerCase() || '';
        const lastName = member.profile?.last_name?.toLowerCase() || '';
        const jobTitle = member.job_title.toLowerCase();
        const specialty = member.specialty?.toLowerCase() || '';

        if (
          !firstName.includes(query) &&
          !lastName.includes(query) &&
          !jobTitle.includes(query) &&
          !specialty.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [teamMembers, jobFilter, searchQuery]);

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMember(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Équipe</h1>
              <p className="text-sm text-muted-foreground">
                Gestion des membres et praticiens
              </p>
            </div>
          </div>

          {canManage && (
            <Button
              onClick={() => setIsFormOpen(true)}
              data-testid="team-add-button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un membre
            </Button>
          )}
        </div>

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Structure
            </TabsTrigger>
            <TabsTrigger value="practitioners" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Praticiens
            </TabsTrigger>
            <TabsTrigger value="planning" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Plannings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <StructureMembersSection canManage={canManage} />
          </TabsContent>

          <TabsContent value="practitioners" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un membre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="w-full sm:w-[200px]" data-testid="team-filter-job">
                  <SelectValue placeholder="Filtrer par poste" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les postes</SelectItem>
                  {JOB_TITLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  Aucun membre trouvé
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery || jobFilter !== 'all'
                    ? 'Essayez de modifier vos filtres'
                    : 'Ajoutez des membres à votre équipe'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMembers.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    canManage={canManage}
                    onEdit={() => handleEdit(member)}
                    onDeactivate={() => deactivate(member.id)}
                    onClick={() => setSelectedMember(member)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="planning">
            <PractitionerSchedulesSection />
          </TabsContent>
        </Tabs>
      </div>

      {/* Form Dialog */}
      <TeamMemberFormDialog
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        member={editingMember}
        onCreate={create}
        onUpdate={update}
      />

      {/* Detail Drawer */}
      <TeamMemberDetailDrawer
        member={selectedMember}
        open={!!selectedMember}
        onOpenChange={(open) => !open && setSelectedMember(null)}
        canManage={canManage}
        onEdit={() => selectedMember && handleEdit(selectedMember)}
        onDeactivate={() => selectedMember && deactivate(selectedMember.id)}
      />
    </DashboardLayout>
  );
}
