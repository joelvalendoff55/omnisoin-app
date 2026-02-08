import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PatientStatusBadge } from './PatientStatusBadge';
import { PatientQuickActions, PatientContextMenu } from './PatientQuickActions';
import { PatientStatusIndicators, LastVisitBadge } from './PatientStatusIndicators';
import { ClickToCallButton } from './ClickToCallButton';
import { Mail, Stethoscope, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Patient } from '@/types/patient';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface EnhancedPatientCardProps {
  patient: Patient;
  index: number;
  practitionerName?: string;
  hasVaultEntry?: boolean;
  hasUpcomingAppointment?: boolean;
  lastVisitDate?: string | null;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  showCheckbox?: boolean;
  onEdit: (patient: Patient) => void;
  onArchive: (patient: Patient) => void;
  onViewDetail: (patient: Patient) => void;
  onCreateAppointment?: (patient: Patient) => void;
  onOpenCalendar?: (patient: Patient) => void;
}

export function EnhancedPatientCard({
  patient,
  index,
  practitionerName,
  hasVaultEntry = false,
  hasUpcomingAppointment = false,
  lastVisitDate,
  selected = false,
  onSelectChange,
  showCheckbox = false,
  onEdit,
  onArchive,
  onViewDetail,
  onCreateAppointment,
  onOpenCalendar,
}: EnhancedPatientCardProps) {
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
      case 'M': return 'M';
      case 'F': return 'F';
      case 'O': return 'A';
      default: return null;
    }
  };

  const isArchived = patient.is_archived;
  const hasAssignment = !!patient.primary_practitioner_user_id;

  return (
    <PatientContextMenu
      patient={patient}
      onEdit={onEdit}
      onArchive={onArchive}
      onViewDetail={onViewDetail}
      onCreateAppointment={onCreateAppointment}
      onOpenCalendar={onOpenCalendar}
    >
      <div
        data-testid="patient-card"
        data-patient-id={patient.id}
        data-archived={isArchived ? 'true' : 'false'}
        className={cn(
          'patient-card animate-fade-in group relative',
          isArchived && 'patient-card-archived',
          selected && 'ring-2 ring-primary ring-offset-2'
        )}
        style={{ animationDelay: `${index * 0.03}s` }}
        onClick={() => onViewDetail(patient)}
      >
        {/* Checkbox overlay */}
        {showCheckbox && (
          <div 
            className="absolute top-3 left-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={selected}
              onCheckedChange={onSelectChange}
              className="bg-background"
            />
          </div>
        )}

        {/* Header row: Avatar + Name + Status + Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className={cn("flex items-center gap-3 min-w-0 flex-1", showCheckbox && "ml-7")}>
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
              isArchived={!!isArchived}
              hasAssignment={hasAssignment}
            />
            <PatientQuickActions
              patient={patient}
              onEdit={onEdit}
              onArchive={onArchive}
              onViewDetail={onViewDetail}
              onCreateAppointment={onCreateAppointment}
              onOpenCalendar={onOpenCalendar}
            />
          </div>
        </div>

        {/* Status indicators */}
        <div className="mt-3">
          <PatientStatusIndicators
            lastVisitDate={lastVisitDate}
            hasUpcomingAppointment={hasUpcomingAppointment}
            compact
          />
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
        </div>

        {/* Admin note preview */}
        {patient.note_admin && (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-1 italic">
            {patient.note_admin}
          </p>
        )}
      </div>
    </PatientContextMenu>
  );
}
