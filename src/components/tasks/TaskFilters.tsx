import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STATUS_OPTIONS, CATEGORY_OPTIONS, TaskFilters } from '@/lib/tasks';
import { fetchTeamMembers, TeamMember } from '@/lib/team';
import { useStructureId } from '@/hooks/useStructureId';

interface TaskFiltersProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

export function TaskFiltersComponent({ filters, onFiltersChange }: TaskFiltersProps) {
  const { structureId } = useStructureId();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!structureId) return;
      try {
        const data = await fetchTeamMembers(structureId);
        setTeamMembers(data);
      } catch (err) {
        console.error('Error loading team members:', err);
      }
    };
    loadTeamMembers();
  }, [structureId]);

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={filters.status || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, status: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="w-[160px]" data-testid="task-filter-status">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.assigned_to || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, assigned_to: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="w-[200px]" data-testid="task-filter-assignee">
          <SelectValue placeholder="Assigné à" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les membres</SelectItem>
          <SelectItem value="unassigned">Non assigné</SelectItem>
          {teamMembers.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.profile?.first_name} {member.profile?.last_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.category || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, category: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Catégorie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes catégories</SelectItem>
          {CATEGORY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
