"use client";

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { PatientStatusBadge } from './PatientStatusBadge';
import { PatientQuickActions, PatientContextMenu } from './PatientQuickActions';
import { PatientStatusIndicators, LastVisitBadge } from './PatientStatusIndicators';
import { Patient } from '@/types/patient';
import { cn } from '@/lib/utils';
import { Shield } from 'lucide-react';

export type SortField = 'name' | 'dob' | 'created_at' | 'last_visit' | 'practitioner';
export type SortDirection = 'asc' | 'desc';

interface SortablePatientTableProps {
  patients: Patient[];
  practitioners: { user_id: string; first_name: string | null; last_name: string | null }[];
  vaultPatientIds: Set<string>;
  patientAppointments: Record<string, boolean>;
  patientLastVisits: Record<string, string | null>;
  selectedPatients: Set<string>;
  onSelectPatient: (patientId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit: (patient: Patient) => void;
  onArchive: (patient: Patient) => void;
  onViewDetail: (patient: Patient) => void;
  onCreateAppointment?: (patient: Patient) => void;
  onOpenCalendar?: (patient: Patient) => void;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
}

export function SortablePatientTable({
  patients,
  practitioners,
  vaultPatientIds,
  patientAppointments,
  patientLastVisits,
  selectedPatients,
  onSelectPatient,
  onSelectAll,
  onEdit,
  onArchive,
  onViewDetail,
  onCreateAppointment,
  onOpenCalendar,
  sortField: externalSortField,
  sortDirection: externalSortDirection,
  onSortChange,
}: SortablePatientTableProps) {
  const [internalSortField, setInternalSortField] = useState<SortField>('name');
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>('asc');

  const sortField = externalSortField ?? internalSortField;
  const sortDirection = externalSortDirection ?? internalSortDirection;

  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    if (onSortChange) {
      onSortChange(field, newDirection);
    } else {
      setInternalSortField(field);
      setInternalSortDirection(newDirection);
    }
  };

  const getPractitionerName = (practitionerId: string | null) => {
    if (!practitionerId) return 'Non assigné';
    const practitioner = practitioners.find((p) => p.user_id === practitionerId);
    if (!practitioner) return 'Inconnu';
    const firstName = practitioner.first_name || '';
    const lastName = practitioner.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Sans nom';
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
          break;
        case 'dob':
          comparison = (a.dob || '').localeCompare(b.dob || '');
          break;
        case 'created_at':
          comparison = (a.created_at || '').localeCompare(b.created_at || '');
          break;
        case 'last_visit':
          const aVisit = patientLastVisits[a.id] || '';
          const bVisit = patientLastVisits[b.id] || '';
          comparison = aVisit.localeCompare(bVisit);
          break;
        case 'practitioner':
          comparison = getPractitionerName(a.primary_practitioner_user_id)
            .localeCompare(getPractitionerName(b.primary_practitioner_user_id));
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [patients, sortField, sortDirection, patientLastVisits]);

  const allSelected = patients.length > 0 && patients.every(p => selectedPatients.has(p.id));
  const someSelected = patients.some(p => selectedPatients.has(p.id)) && !allSelected;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
      : <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  };

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 -ml-2 px-2 font-medium hover:bg-transparent"
        onClick={() => handleSort(field)}
      >
        {children}
        <SortIcon field={field} />
      </Button>
    </TableHead>
  );

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-muted/30">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) (el as any).indeterminate = someSelected;
                }}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <SortableHeader field="name">Patient</SortableHeader>
            <TableHead className="hidden md:table-cell">Contact</TableHead>
            <SortableHeader field="practitioner" className="hidden lg:table-cell">Praticien</SortableHeader>
            <SortableHeader field="last_visit" className="hidden xl:table-cell">Dernière visite</SortableHeader>
            <TableHead className="hidden sm:table-cell">Statut</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPatients.map((patient) => (
            <PatientContextMenu
              key={patient.id}
              patient={patient}
              onEdit={onEdit}
              onArchive={onArchive}
              onViewDetail={onViewDetail}
              onCreateAppointment={onCreateAppointment}
              onOpenCalendar={onOpenCalendar}
            >
              <TableRow
                className={cn(
                  "cursor-pointer transition-colors",
                  patient.is_archived && "opacity-60",
                  selectedPatients.has(patient.id) && "bg-primary/5"
                )}
                onClick={() => onViewDetail(patient)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedPatients.has(patient.id)}
                    onCheckedChange={(checked) => onSelectPatient(patient.id, !!checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {getInitials(patient.first_name, patient.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">
                          {patient.last_name.toUpperCase()}, {patient.first_name}
                        </span>
                        {vaultPatientIds.has(patient.id) && (
                          <Shield className="h-3 w-3 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {patient.dob && <span>{calculateAge(patient.dob)} ans</span>}
                        {patient.sex && (
                          <>
                            <span className="text-border">•</span>
                            <span>{patient.sex === 'M' ? 'M' : patient.sex === 'F' ? 'F' : 'A'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="space-y-0.5 text-sm">
                    {patient.phone && <div className="font-mono text-xs">{patient.phone}</div>}
                    {patient.email && (
                      <div className="text-muted-foreground text-xs truncate max-w-[180px]">
                        {patient.email}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {getPractitionerName(patient.primary_practitioner_user_id)}
                  </span>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <div className="flex items-center gap-2">
                    <LastVisitBadge lastVisitDate={patientLastVisits[patient.id]} />
                    <PatientStatusIndicators
                      hasUpcomingAppointment={patientAppointments[patient.id]}
                      compact
                    />
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <PatientStatusBadge
                    isArchived={!!patient.is_archived}
                    hasAssignment={!!patient.primary_practitioner_user_id}
                  />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <PatientQuickActions
                    patient={patient}
                    onEdit={onEdit}
                    onArchive={onArchive}
                    onViewDetail={onViewDetail}
                    onCreateAppointment={onCreateAppointment}
                    onOpenCalendar={onOpenCalendar}
                  />
                </TableCell>
              </TableRow>
            </PatientContextMenu>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
