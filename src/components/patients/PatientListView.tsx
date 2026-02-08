"use client";

import { useMemo } from 'react';
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
import { PatientStatusBadge } from './PatientStatusBadge';
import { PatientQuickActions, PatientContextMenu } from './PatientQuickActions';
import { PatientStatusIndicators, LastVisitBadge } from './PatientStatusIndicators';
import { Patient } from '@/types/patient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Shield } from 'lucide-react';

interface PatientListViewProps {
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
}

export type { PatientListViewProps };

export function PatientListView({
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
}: PatientListViewProps) {
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

  const allSelected = patients.length > 0 && patients.every(p => selectedPatients.has(p.id));
  const someSelected = patients.some(p => selectedPatients.has(p.id)) && !allSelected;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) (el as any).indeterminate = someSelected;
                }}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Patient</TableHead>
            <TableHead className="hidden md:table-cell">Contact</TableHead>
            <TableHead className="hidden lg:table-cell">Praticien</TableHead>
            <TableHead className="hidden xl:table-cell">Dernière visite</TableHead>
            <TableHead className="hidden sm:table-cell">Statut</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
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
