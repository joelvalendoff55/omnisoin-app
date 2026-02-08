"use client";

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, User } from 'lucide-react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useStructureId } from '@/hooks/useStructureId';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface Patient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  status?: 'actif' | 'clos' | null;
}

interface PatientAutocompleteProps {
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient | null) => void;
  disabled?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function PatientAutocomplete({
  selectedPatient,
  onSelectPatient,
  disabled = false,
}: PatientAutocompleteProps) {
  const { structureId } = useStructureId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async () => {
    if (!structureId || !debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, dob, status')
        .eq('structure_id', structureId)
        .or(`first_name.ilike.%${debouncedQuery}%,last_name.ilike.%${debouncedQuery}%`)
        .limit(10);

      if (error) throw error;
      setResults((data || []) as Patient[]);
      setIsOpen(true);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [structureId, debouncedQuery]);

  useEffect(() => {
    search();
  }, [search]);

  const handleSelect = (patient: Patient) => {
    onSelectPatient(patient);
    setQuery('');
    setIsOpen(false);
    setResults([]);
  };

  if (selectedPatient) {
    return (
      <div className="space-y-2">
        <Label>Patient sélectionné</Label>
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</p>
            {selectedPatient.dob && (
              <p className="text-sm text-muted-foreground">
                Né(e) le {format(new Date(selectedPatient.dob), 'dd/MM/yyyy')}
              </p>
            )}
          </div>
          <button type="button" onClick={() => onSelectPatient(null)} className="text-sm text-muted-foreground hover:text-foreground" disabled={disabled}>
            Modifier
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="patientSearch">Rechercher un patient *</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id="patientSearch" placeholder="Nom ou prénom..." value={query} onChange={(e) => { setQuery(e.target.value); if (e.target.value.length < 2) setIsOpen(false); }} onFocus={() => results.length > 0 && setIsOpen(true)} className="pl-10" disabled={disabled} />
        {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg">
          <ScrollArea className="max-h-[200px]">
            {results.map((patient) => (
              <button key={patient.id} type="button" onClick={() => handleSelect(patient)} className={cn('w-full flex items-center gap-3 p-3 text-left hover:bg-accent transition-colors', 'border-b last:border-b-0')}>
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><User className="h-4 w-4" /></div>
                <div>
                  <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                  {patient.dob && <p className="text-xs text-muted-foreground">{format(new Date(patient.dob), 'dd/MM/yyyy')}</p>}
                </div>
              </button>
            ))}
          </ScrollArea>
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg p-4 text-center text-muted-foreground">Aucun patient trouvé</div>
      )}
    </div>
  );
}
