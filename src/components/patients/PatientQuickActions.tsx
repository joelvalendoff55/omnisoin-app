import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MoreVertical, 
  Phone, 
  MessageSquare, 
  Calendar, 
  CalendarDays,
  History, 
  Archive, 
  ArchiveRestore,
  Eye,
  Pencil,
  Download,
  FolderOpen
} from 'lucide-react';
import { Patient } from '@/types/patient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useStructureId } from '@/hooks/useStructureId';

interface PatientQuickActionsProps {
  patient: Patient;
  onEdit: (patient: Patient) => void;
  onArchive: (patient: Patient) => void;
  onViewDetail: (patient: Patient) => void;
  onCreateAppointment?: (patient: Patient) => void;
  onOpenCalendar?: (patient: Patient) => void;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  showCheckbox?: boolean;
}

export function PatientQuickActions({
  patient,
  onEdit,
  onArchive,
  onViewDetail,
  onCreateAppointment,
  onOpenCalendar,
  selected = false,
  onSelectChange,
  showCheckbox = false,
}: PatientQuickActionsProps) {
  const navigate = useNavigate();
  const { structureId } = useStructureId();
  const [isOpeningEncounter, setIsOpeningEncounter] = useState(false);

  const handleCall = () => {
    if (patient.phone) {
      window.location.href = `tel:${patient.phone}`;
    } else {
      toast.error('Aucun numéro de téléphone disponible');
    }
  };

  const handleSMS = () => {
    if (patient.phone) {
      window.location.href = `sms:${patient.phone}`;
    } else {
      toast.error('Aucun numéro de téléphone disponible');
    }
  };

  const handleOpenEncounter = async () => {
    if (!structureId || !patient.id) {
      toast.error('Données manquantes');
      return;
    }

    setIsOpeningEncounter(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Check for existing encounter today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data: existingEncounters, error: searchError } = await supabase
        .from('encounters')
        .select('id, status')
        .eq('patient_id', patient.id)
        .eq('structure_id', structureId)
        .gte('started_at', todayISO)
        .not('status', 'in', '("completed","cancelled")')
        .order('started_at', { ascending: false })
        .limit(1);

      if (searchError) throw searchError;

      // If encounter exists, open it
      if (existingEncounters && existingEncounters.length > 0) {
        navigate(`/encounter/${existingEncounters[0].id}`);
        return;
      }

      // Create new encounter in solo mode
      const { data: newEncounter, error: createError } = await supabase
        .from('encounters')
        .insert({
          patient_id: patient.id,
          structure_id: structureId,
          mode: 'solo',
          status: 'consultation_in_progress',
          created_by: userData.user.id,
        })
        .select('id')
        .single();

      if (createError) throw createError;

      toast.success('Épisode créé');
      navigate(`/encounter/${newEncounter.id}`);
    } catch (err) {
      console.error('Error opening/creating encounter:', err);
      toast.error('Impossible d\'ouvrir l\'épisode');
    } finally {
      setIsOpeningEncounter(false);
    }
  };

  const menuItems = (
    <>
      <DropdownMenuItem 
        onClick={handleOpenEncounter} 
        disabled={isOpeningEncounter}
        className="text-primary font-medium"
      >
        <FolderOpen className="h-4 w-4 mr-2" />
        {isOpeningEncounter ? 'Chargement...' : 'Ouvrir l\'épisode'}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onViewDetail(patient)}>
        <Eye className="h-4 w-4 mr-2" />
        Voir détail
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onEdit(patient)}>
        <Pencil className="h-4 w-4 mr-2" />
        Modifier
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleCall} disabled={!patient.phone}>
        <Phone className="h-4 w-4 mr-2" />
        Appeler
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleSMS} disabled={!patient.phone}>
        <MessageSquare className="h-4 w-4 mr-2" />
        Envoyer SMS
      </DropdownMenuItem>
      {onCreateAppointment && (
        <DropdownMenuItem onClick={() => onCreateAppointment(patient)}>
          <Calendar className="h-4 w-4 mr-2" />
          Créer RDV
        </DropdownMenuItem>
      )}
      {onOpenCalendar && (
        <DropdownMenuItem onClick={() => onOpenCalendar(patient)}>
          <CalendarDays className="h-4 w-4 mr-2" />
          Voir calendrier
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem 
        onClick={() => onArchive(patient)}
        className={patient.is_archived ? 'text-success' : 'text-warning'}
      >
        {patient.is_archived ? (
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
    </>
  );

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {showCheckbox && onSelectChange && (
        <Checkbox
          checked={selected}
          onCheckedChange={onSelectChange}
          className="mr-1"
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {menuItems}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Context menu wrapper for right-click actions
interface PatientContextMenuProps {
  children: React.ReactNode;
  patient: Patient;
  onEdit: (patient: Patient) => void;
  onArchive: (patient: Patient) => void;
  onViewDetail: (patient: Patient) => void;
  onCreateAppointment?: (patient: Patient) => void;
  onOpenCalendar?: (patient: Patient) => void;
}

export function PatientContextMenu({
  children,
  patient,
  onEdit,
  onArchive,
  onViewDetail,
  onCreateAppointment,
  onOpenCalendar,
}: PatientContextMenuProps) {
  const handleCall = () => {
    if (patient.phone) {
      window.location.href = `tel:${patient.phone}`;
    } else {
      toast.error('Aucun numéro de téléphone disponible');
    }
  };

  const handleSMS = () => {
    if (patient.phone) {
      window.location.href = `sms:${patient.phone}`;
    } else {
      toast.error('Aucun numéro de téléphone disponible');
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => onViewDetail(patient)}>
          <Eye className="h-4 w-4 mr-2" />
          Voir détail
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onEdit(patient)}>
          <Pencil className="h-4 w-4 mr-2" />
          Modifier
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleCall} disabled={!patient.phone}>
          <Phone className="h-4 w-4 mr-2" />
          Appeler
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSMS} disabled={!patient.phone}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Envoyer SMS
        </ContextMenuItem>
        {onCreateAppointment && (
          <ContextMenuItem onClick={() => onCreateAppointment(patient)}>
            <Calendar className="h-4 w-4 mr-2" />
            Créer RDV
          </ContextMenuItem>
        )}
        {onOpenCalendar && (
          <ContextMenuItem onClick={() => onOpenCalendar(patient)}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Voir calendrier
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={() => onArchive(patient)}
          className={patient.is_archived ? 'text-success' : 'text-warning'}
        >
          {patient.is_archived ? (
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
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Bulk actions bar
interface BulkActionsBarProps {
  selectedCount: number;
  onArchiveSelected: () => void;
  onExportSelected: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onArchiveSelected,
  onExportSelected,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 bg-card border shadow-lg rounded-full px-4 py-2">
        <span className="text-sm font-medium text-muted-foreground">
          {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
        </span>
        <div className="h-4 w-px bg-border" />
        <Button variant="ghost" size="sm" onClick={onArchiveSelected}>
          <Archive className="h-4 w-4 mr-1.5" />
          Archiver
        </Button>
        <Button variant="ghost" size="sm" onClick={onExportSelected}>
          <Download className="h-4 w-4 mr-1.5" />
          Exporter
        </Button>
        <div className="h-4 w-px bg-border" />
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
