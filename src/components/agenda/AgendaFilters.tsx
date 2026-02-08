"use client";

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { APPOINTMENT_TYPE_OPTIONS, STATUS_OPTIONS } from '@/lib/appointments';

interface TeamMember {
  id: string;
  user_id: string;
  job_title: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface AgendaFiltersProps {
  practitioners: TeamMember[];
  selectedPractitioners: string[];
  onPractitionersChange: (ids: string[]) => void;
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  selectedStatuses: string[];
  onStatusesChange: (statuses: string[]) => void;
}

// Couleurs distinctes pour chaque praticien
const PRACTITIONER_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-indigo-500',
];

export function getPractitionerColor(index: number): string {
  return PRACTITIONER_COLORS[index % PRACTITIONER_COLORS.length];
}

export default function AgendaFilters({
  practitioners,
  selectedPractitioners,
  onPractitionersChange,
  selectedTypes,
  onTypesChange,
  selectedStatuses,
  onStatusesChange,
}: AgendaFiltersProps) {
  const togglePractitioner = (id: string) => {
    if (selectedPractitioners.includes(id)) {
      onPractitionersChange(selectedPractitioners.filter((p) => p !== id));
    } else {
      onPractitionersChange([...selectedPractitioners, id]);
    }
  };

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Praticiens */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">Praticiens</div>
        <div className="flex flex-wrap gap-1.5">
          {practitioners.map((p, index) => {
            const isSelected = selectedPractitioners.length === 0 || selectedPractitioners.includes(p.id);
            const name = `${p.profile?.first_name || ''} ${p.profile?.last_name || ''}`.trim() || 'N/A';
            
            return (
              <Badge
                key={p.id}
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-all text-xs',
                  isSelected && getPractitionerColor(index),
                  isSelected && 'text-white hover:opacity-80'
                )}
                onClick={() => togglePractitioner(p.id)}
              >
                <span className={cn(
                  'w-2 h-2 rounded-full mr-1.5',
                  getPractitionerColor(index)
                )} />
                {name}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Types de RDV */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">Type de RDV</div>
        <div className="flex flex-wrap gap-1.5">
          {APPOINTMENT_TYPE_OPTIONS.map((type) => {
            const isSelected = selectedTypes.length === 0 || selectedTypes.includes(type.value);
            
            return (
              <Badge
                key={type.value}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer transition-all text-xs"
                onClick={() => toggleType(type.value)}
              >
                {type.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Statuts */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">Statut</div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((status) => {
            const isSelected = selectedStatuses.length === 0 || selectedStatuses.includes(status.value);
            
            return (
              <Badge
                key={status.value}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer transition-all text-xs"
                onClick={() => toggleStatus(status.value)}
              >
                {status.label}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}
