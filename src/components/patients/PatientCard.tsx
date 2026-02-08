"use client";

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PatientStatusBadge } from './PatientStatusBadge';
import { ClickToCallButton } from './ClickToCallButton';
import { Mail, Calendar, MoreVertical, Pencil, Archive, ArchiveRestore, Eye, Stethoscope, Shield, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Patient } from '@/types/patient';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PatientCardProps {
  patient: Patient;
  index: number;
  practitionerName?: string;
  hasVaultEntry?: boolean;
  onEdit: (patient: Patient) => void;
  onArchive: (patient: Patient) => void;
  onViewDetail: (patient: Patient) => void;
}

export function PatientCard({
  patient,
  index,
  practitionerName,
  hasVaultEntry = false,
  onEdit,
  onArchive,
  onViewDetail,
}: PatientCardProps) {
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

  const getSexLabel = (sex: string | null) => {
    switch (sex) {
      case 'M':
        return 'M';
      case 'F':
        return 'F';
      case 'O':
        return 'A';
      default:
        return null;
    }
  };

  const isArchived = patient.is_archived;
  const hasAssignment = !!patient.primary_practitioner_user_id;

  return (
    <div
      data-testid="patient-card"
      data-patient-id={patient.id}
      data-archived={isArchived ? 'true' : 'false'}
      className={cn(
        'patient-card animate-fade-in',
        isArchived && 'patient-card-archived'
      )}
      style={{ animationDelay: `${index * 0.03}s` }}
      onClick={() => onViewDetail(patient)}
    >
      {/* Header row: Avatar + Name + Status + Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
              {getInitials(patient.first_name, patient.last_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base truncate">
                {patient.last_name.toUpperCase()}, {patient.first_name}
              </h3>
              {hasVaultEntry && (
                <span title="Privacy by Design">
                  <Shield className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {patient.dob && (
                <span className="font-medium">{calculateAge(patient.dob)} ans</span>
              )}
              {patient.sex && (
                <>
                  <span className="text-border">•</span>
                  <span>{getSexLabel(patient.sex)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <PatientStatusBadge 
            isArchived={isArchived}
            hasAssignment={hasAssignment}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetail(patient);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Voir détail
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(patient);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(patient);
                }}
                className={isArchived ? 'text-success' : 'text-warning'}
              >
                {isArchived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Restaurer
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Archiver
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Practitioner assignment */}
      {practitionerName && practitionerName !== 'Non assigné' && (
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Stethoscope className="h-3.5 w-3.5" />
          <span className="truncate">{practitionerName}</span>
        </div>
      )}

      {/* Contact info row */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
        {patient.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
            <ClickToCallButton
              phoneNumber={patient.phone}
              patientName={`${patient.first_name} ${patient.last_name}`}
              patientId={patient.id}
              size="icon"
              variant="ghost"
              className="h-5 w-5 p-0"
            />
            <span className="font-mono">{patient.phone}</span>
          </div>
        )}
        {patient.email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span className="truncate max-w-[140px]">{patient.email}</span>
          </div>
        )}
        {patient.dob && !patient.phone && !patient.email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(patient.dob), 'dd MMM yyyy', { locale: fr })}</span>
          </div>
        )}
      </div>

      {/* Admin note preview */}
      {patient.note_admin && (
        <p className="text-xs text-muted-foreground mt-3 line-clamp-1 italic">
          {patient.note_admin}
        </p>
      )}
    </div>
  );
}
