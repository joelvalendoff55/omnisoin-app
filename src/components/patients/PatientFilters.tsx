import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Search, X, Filter, Calendar, Check } from 'lucide-react';
import { Patient } from '@/types/patient';
import { cn } from '@/lib/utils';

export type FilterChip = 'active' | 'archived' | 'mine' | 'unassigned';
export type LastVisitFilter = 'all' | '1month' | '3months' | '1year' | 'over1year';

interface PatientFiltersProps {
  patients: Patient[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilters: FilterChip[];
  onFiltersChange: (filters: FilterChip[]) => void;
  lastVisitFilter: LastVisitFilter;
  onLastVisitChange: (filter: LastVisitFilter) => void;
  isPractitioner: boolean;
  currentUserId?: string;
  resultCount: number;
}

const FILTER_CHIPS: { id: FilterChip; label: string; color: string }[] = [
  { id: 'active', label: 'Actifs', color: 'bg-success/10 text-success border-success/30 hover:bg-success/20' },
  { id: 'archived', label: 'Archivés', color: 'bg-muted text-muted-foreground border-border hover:bg-muted/80' },
  { id: 'mine', label: 'Mes patients', color: 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20' },
  { id: 'unassigned', label: 'Non assignés', color: 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20' },
];

const LAST_VISIT_OPTIONS: { id: LastVisitFilter; label: string }[] = [
  { id: 'all', label: 'Toutes les visites' },
  { id: '1month', label: '< 1 mois' },
  { id: '3months', label: '< 3 mois' },
  { id: '1year', label: '< 1 an' },
  { id: 'over1year', label: '> 1 an' },
];

export function PatientFilters({
  patients,
  searchQuery,
  onSearchChange,
  activeFilters,
  onFiltersChange,
  lastVisitFilter,
  onLastVisitChange,
  isPractitioner,
  resultCount,
}: PatientFiltersProps) {
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return patients
      .filter(p => 
        p.first_name.toLowerCase().includes(query) ||
        p.last_name.toLowerCase().includes(query) ||
        p.phone?.includes(query)
      )
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        label: `${p.last_name.toUpperCase()}, ${p.first_name}`,
        subtitle: p.phone || p.email || '',
      }));
  }, [patients, searchQuery]);

  const toggleFilter = (filterId: FilterChip) => {
    // Handle mutually exclusive filters
    if (filterId === 'mine' && activeFilters.includes('unassigned')) {
      onFiltersChange([...activeFilters.filter(f => f !== 'unassigned'), filterId]);
    } else if (filterId === 'unassigned' && activeFilters.includes('mine')) {
      onFiltersChange([...activeFilters.filter(f => f !== 'mine'), filterId]);
    } else if (filterId === 'active' && activeFilters.includes('archived')) {
      onFiltersChange([...activeFilters.filter(f => f !== 'archived'), filterId]);
    } else if (filterId === 'archived' && activeFilters.includes('active')) {
      onFiltersChange([...activeFilters.filter(f => f !== 'active'), filterId]);
    } else if (activeFilters.includes(filterId)) {
      onFiltersChange(activeFilters.filter(f => f !== filterId));
    } else {
      onFiltersChange([...activeFilters, filterId]);
    }
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
    onLastVisitChange('all');
    onSearchChange('');
  };

  const hasActiveFilters = activeFilters.length > 0 || lastVisitFilter !== 'all' || searchQuery;

  return (
    <div className="space-y-3">
      {/* Search with autocomplete */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Popover open={isAutocompleteOpen && suggestions.length > 0} onOpenChange={setIsAutocompleteOpen}>
            <PopoverTrigger asChild>
              <Input
                placeholder="Rechercher par nom, prénom, téléphone..."
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setIsAutocompleteOpen(true);
                }}
                onFocus={() => setIsAutocompleteOpen(true)}
                className="pl-9 pr-9 bg-background"
              />
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandList>
                  <CommandEmpty>Aucun résultat</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    {suggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion.id}
                        onSelect={() => {
                          onSearchChange(suggestion.label);
                          setIsAutocompleteOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{suggestion.label}</span>
                          {suggestion.subtitle && (
                            <span className="text-xs text-muted-foreground">{suggestion.subtitle}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Last visit filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              {LAST_VISIT_OPTIONS.find(o => o.id === lastVisitFilter)?.label}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start">
            {LAST_VISIT_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => onLastVisitChange(option.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                  lastVisitFilter === option.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                {lastVisitFilter === option.id && <Check className="h-4 w-4" />}
                <span className={lastVisitFilter !== option.id ? "ml-6" : ""}>{option.label}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Result count */}
        <div className="ml-auto text-sm text-muted-foreground font-medium">
          {resultCount} résultat{resultCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_CHIPS
          .filter(chip => chip.id !== 'mine' || isPractitioner)
          .map((chip) => (
            <Badge
              key={chip.id}
              variant="outline"
              className={cn(
                "cursor-pointer transition-all px-3 py-1.5 text-sm font-medium",
                activeFilters.includes(chip.id)
                  ? chip.color
                  : "bg-background hover:bg-muted/50"
              )}
              onClick={() => toggleFilter(chip.id)}
            >
              {activeFilters.includes(chip.id) && (
                <Check className="h-3 w-3 mr-1.5" />
              )}
              {chip.label}
            </Badge>
          ))}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground h-8"
          >
            <X className="h-3 w-3 mr-1" />
            Effacer tout
          </Button>
        )}
      </div>
    </div>
  );
}
