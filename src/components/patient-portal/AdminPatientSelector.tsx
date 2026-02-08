"use client";

import { useState, useEffect } from 'react';
import { useAdminPatientContext } from '@/hooks/useAdminPatientContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { 
  User, 
  ChevronDown, 
  Shield, 
  Search,
  Check,
  Loader2 
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function AdminPatientSelector() {
  const { 
    isAdminMode, 
    selectedPatient, 
    setSelectedPatient, 
    patients, 
    loading 
  } = useAdminPatientContext();
  
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  if (!isAdminMode) return null;

  const filteredPatients = patients.filter(patient => {
    const searchLower = search.toLowerCase();
    return (
      patient.first_name?.toLowerCase().includes(searchLower) ||
      patient.last_name?.toLowerCase().includes(searchLower) ||
      patient.email?.toLowerCase().includes(searchLower)
    );
  });

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${(firstName || 'P').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-lg">
            <Shield className="w-4 h-4 text-amber-700" />
            <span className="text-sm font-medium text-amber-800">Mode Administrateur</span>
          </div>
          
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                role="combobox" 
                aria-expanded={open}
                className={cn(
                  "min-w-[250px] justify-between",
                  !selectedPatient && "text-muted-foreground"
                )}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Chargement...
                  </span>
                ) : selectedPatient ? (
                  <span className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(selectedPatient.first_name, selectedPatient.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Sélectionner un patient
                  </span>
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Rechercher un patient..." 
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList>
                  <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
                  <CommandGroup heading="Patients">
                    <ScrollArea className="max-h-[300px]">
                      {filteredPatients.map((patient) => (
                        <CommandItem
                          key={patient.id}
                          value={`${patient.first_name} ${patient.last_name}`}
                          onSelect={() => {
                            setSelectedPatient(
                              selectedPatient?.id === patient.id ? null : patient
                            );
                            setOpen(false);
                          }}
                          className="flex items-center gap-3 p-3"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(patient.first_name, patient.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {patient.first_name} {patient.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {patient.email || 'Pas d\'email'}
                              {patient.dob && (
                                <span className="ml-2">
                                  • Né(e) le {format(new Date(patient.dob), 'd MMM yyyy', { locale: fr })}
                                </span>
                              )}
                            </p>
                          </div>
                          {selectedPatient?.id === patient.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {selectedPatient && (
          <Badge variant="secondary" className="bg-white">
            Consultation du dossier de {selectedPatient.first_name} {selectedPatient.last_name}
          </Badge>
        )}
      </div>
    </div>
  );
}
