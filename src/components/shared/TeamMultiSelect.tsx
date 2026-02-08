import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X, Users2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Team } from '@/lib/teams';

interface TeamMultiSelectProps {
  teams: Team[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TeamMultiSelect({
  teams,
  selectedIds,
  onChange,
  placeholder = 'Sélectionner des équipes...',
  disabled = false,
  className,
}: TeamMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const activeTeams = useMemo(() => teams.filter(t => t.is_active), [teams]);

  const selectedTeams = useMemo(
    () => activeTeams.filter(t => selectedIds.includes(t.id)),
    [activeTeams, selectedIds]
  );

  const toggleTeam = (teamId: string) => {
    if (selectedIds.includes(teamId)) {
      onChange(selectedIds.filter(id => id !== teamId));
    } else {
      onChange([...selectedIds, teamId]);
    }
  };

  const removeTeam = (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(id => id !== teamId));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between h-auto min-h-10',
            selectedTeams.length > 0 && 'py-2',
            className
          )}
        >
          <div className="flex flex-wrap gap-1.5 flex-1 text-left">
            {selectedTeams.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedTeams.map(team => (
                <Badge
                  key={team.id}
                  variant="secondary"
                  className="gap-1 pr-1"
                  style={{ backgroundColor: `${team.color}20`, color: team.color, borderColor: team.color }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  {team.name}
                  <button
                    type="button"
                    onClick={(e) => removeTeam(team.id, e)}
                    className="ml-1 rounded-full hover:bg-background/50 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher une équipe..." />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <Users2 className="h-8 w-8" />
                <p>Aucune équipe trouvée</p>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {activeTeams.map(team => {
                const isSelected = selectedIds.includes(team.id);
                return (
                  <CommandItem
                    key={team.id}
                    value={team.name}
                    onSelect={() => toggleTeam(team.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="flex-1">{team.name}</span>
                      {team.member_count !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {team.member_count} membre{team.member_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <Check
                      className={cn(
                        'ml-2 h-4 w-4',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
