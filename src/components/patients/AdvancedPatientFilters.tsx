import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Search, X, Filter, Calendar as CalendarIcon, Check, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Patient } from '@/types/patient';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export type FilterChip = 'active' | 'archived' | 'mine' | 'unassigned';
export type LastVisitFilter = 'all' | '1month' | '3months' | '1year' | 'over1year';
export type SortField = 'name' | 'created_at' | 'last_visit' | 'dob';
export type SortDirection = 'asc' | 'desc';

export interface AdvancedFilters {
  searchQuery: string;
  phone: string;
  email: string;
  practitionerId: string | null;
  activeFilters: FilterChip[];
  lastVisitFilter: LastVisitFilter;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  sortBy: SortField;
  sortDirection: SortDirection;
}

interface AdvancedPatientFiltersProps {
  patients: Patient[];
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  practitioners: { user_id: string; first_name: string | null; last_name: string | null }[];
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

const SORT_OPTIONS: { id: SortField; label: string }[] = [
  { id: 'name', label: 'Nom' },
  { id: 'created_at', label: 'Date de création' },
  { id: 'last_visit', label: 'Dernière visite' },
  { id: 'dob', label: 'Âge' },
];

export function AdvancedPatientFilters({
  patients,
  filters,
  onFiltersChange,
  practitioners,
  isPractitioner,
  resultCount,
}: AdvancedPatientFiltersProps) {
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!filters.searchQuery || filters.searchQuery.length < 2) return [];
    const query = filters.searchQuery.toLowerCase();
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
  }, [patients, filters.searchQuery]);

  const updateFilter = <K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleChipFilter = (filterId: FilterChip) => {
    const current = filters.activeFilters;
    // Handle mutually exclusive filters
    if (filterId === 'mine' && current.includes('unassigned')) {
      updateFilter('activeFilters', [...current.filter(f => f !== 'unassigned'), filterId]);
    } else if (filterId === 'unassigned' && current.includes('mine')) {
      updateFilter('activeFilters', [...current.filter(f => f !== 'mine'), filterId]);
    } else if (filterId === 'active' && current.includes('archived')) {
      updateFilter('activeFilters', [...current.filter(f => f !== 'archived'), filterId]);
    } else if (filterId === 'archived' && current.includes('active')) {
      updateFilter('activeFilters', [...current.filter(f => f !== 'active'), filterId]);
    } else if (current.includes(filterId)) {
      updateFilter('activeFilters', current.filter(f => f !== filterId));
    } else {
      updateFilter('activeFilters', [...current, filterId]);
    }
  };

  const clearAllFilters = () => {
    onFiltersChange({
      searchQuery: '',
      phone: '',
      email: '',
      practitionerId: null,
      activeFilters: [],
      lastVisitFilter: 'all',
      dateRange: { from: undefined, to: undefined },
      sortBy: 'name',
      sortDirection: 'asc',
    });
  };

  const hasActiveFilters = 
    filters.activeFilters.length > 0 || 
    filters.lastVisitFilter !== 'all' || 
    filters.searchQuery ||
    filters.phone ||
    filters.email ||
    filters.practitionerId ||
    filters.dateRange.from ||
    filters.dateRange.to;

  const advancedFilterCount = [
    filters.phone,
    filters.email,
    filters.practitionerId,
    filters.dateRange.from || filters.dateRange.to,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Main Search Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Primary search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Popover open={isAutocompleteOpen && suggestions.length > 0} onOpenChange={setIsAutocompleteOpen}>
            <PopoverTrigger asChild>
              <Input
                placeholder="Rechercher par nom, prénom..."
                value={filters.searchQuery}
                onChange={(e) => {
                  updateFilter('searchQuery', e.target.value);
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
                          updateFilter('searchQuery', suggestion.label);
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
          {filters.searchQuery && (
            <button
              onClick={() => updateFilter('searchQuery', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Advanced Filters Popover */}
        <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtres avancés
              {advancedFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {advancedFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filtres avancés</h4>
              
              {/* Phone filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Téléphone</Label>
                <Input
                  placeholder="Filtrer par numéro..."
                  value={filters.phone}
                  onChange={(e) => updateFilter('phone', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              {/* Email filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  placeholder="Filtrer par email..."
                  value={filters.email}
                  onChange={(e) => updateFilter('email', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              {/* Practitioner filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Praticien référent</Label>
                <Select
                  value={filters.practitionerId || '__all__'}
                  onValueChange={(v) => updateFilter('practitionerId', v === '__all__' ? null : v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Tous les praticiens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tous les praticiens</SelectItem>
                    {practitioners.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {`${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sans nom'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date range (creation date) */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date de création</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "flex-1 justify-start text-left font-normal h-8 text-sm",
                          !filters.dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {filters.dateRange.from ? format(filters.dateRange.from, 'dd/MM/yy') : 'Du'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.from}
                        onSelect={(date) => updateFilter('dateRange', { ...filters.dateRange, from: date })}
                        locale={fr}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "flex-1 justify-start text-left font-normal h-8 text-sm",
                          !filters.dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {filters.dateRange.to ? format(filters.dateRange.to, 'dd/MM/yy') : 'Au'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.to}
                        onSelect={(date) => updateFilter('dateRange', { ...filters.dateRange, to: date })}
                        locale={fr}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  updateFilter('phone', '');
                  updateFilter('email', '');
                  updateFilter('practitionerId', null);
                  updateFilter('dateRange', { from: undefined, to: undefined });
                }}
                className="w-full text-muted-foreground"
              >
                Réinitialiser les filtres avancés
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Last visit filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {LAST_VISIT_OPTIONS.find(o => o.id === filters.lastVisitFilter)?.label}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start">
            {LAST_VISIT_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => updateFilter('lastVisitFilter', option.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                  filters.lastVisitFilter === option.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                {filters.lastVisitFilter === option.id && <Check className="h-4 w-4" />}
                <span className={filters.lastVisitFilter !== option.id ? "ml-6" : ""}>{option.label}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Sort controls */}
        <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/30">
          <Select
            value={filters.sortBy}
            onValueChange={(v) => updateFilter('sortBy', v as SortField)}
          >
            <SelectTrigger className="h-7 text-xs border-0 bg-transparent shadow-none min-w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => updateFilter('sortDirection', filters.sortDirection === 'asc' ? 'desc' : 'asc')}
          >
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              filters.sortDirection === 'asc' && "rotate-180"
            )} />
          </Button>
        </div>

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
                filters.activeFilters.includes(chip.id)
                  ? chip.color
                  : "bg-background hover:bg-muted/50"
              )}
              onClick={() => toggleChipFilter(chip.id)}
            >
              {filters.activeFilters.includes(chip.id) && (
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

export const defaultAdvancedFilters: AdvancedFilters = {
  searchQuery: '',
  phone: '',
  email: '',
  practitionerId: null,
  activeFilters: [],
  lastVisitFilter: 'all',
  dateRange: { from: undefined, to: undefined },
  sortBy: 'name',
  sortDirection: 'asc',
};
