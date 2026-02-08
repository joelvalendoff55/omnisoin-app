import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FileAttenteTable } from '@/components/file-attente/FileAttenteTable';
import { FileAttenteDrawer } from '@/components/file-attente/FileAttenteDrawer';
import { RegisterArrivalDialog } from '@/components/file-attente/RegisterArrivalDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Filter,
  UserPlus,
  Users,
  Clock,
  AlertTriangle,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { usePatientQueue } from '@/hooks/usePatientQueue';
import { usePatientJourney } from '@/hooks/usePatientJourney';
import { useAutoRecording } from '@/hooks/useAutoRecording';
import { useOpenEncounter } from '@/hooks/useOpenEncounter';
import { useStructureId } from '@/hooks/useStructureId';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { toast } from 'sonner';
import { SensitivePageBanner } from '@/components/shared/LegalBanner';

// Extended queue entry with additional fields for file-attente
export interface FileAttenteEntry {
  id: string;
  structure_id: string;
  patient_id: string;
  status?: string;
  priority?: number;
  arrival_time?: string;
  reason?: string | null;
  notes?: string | null;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
  };
  origin?: 'phone' | 'web' | 'walkin' | 'hospital';
  vitals_status?: 'complete' | 'partial' | 'none';
  needs_ecg?: boolean;
  docs_pending?: number;
  destinataire?: 'medecin_traitant' | 'autre_mg' | 'ipa' | 'infirmier';
  ai_summary?: string;
  red_flags?: string[];
  atcd_majeurs?: string[];
  is_new_patient?: boolean;
}

export default function FileAttentePage() {
  const navigate = useNavigate();
  const { structureId } = useStructureId();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [selectedEntry, setSelectedEntry] = useState<FileAttenteEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  // Use real queue data
  const { 
    entries: queueEntries, 
    loading, 
    addEntry,
    updateEntry,
    refresh,
    stats 
  } = usePatientQueue();

  const { 
    callPatient, 
    startConsultation,
    sendToExam,
    returnFromExam,
    completeConsultation, 
    markNoShow 
  } = usePatientJourney();

  const { startRecording, stopRecording, isRecording } = useAutoRecording();

  // Transform queue entries to FileAttenteEntry format
  const entries: FileAttenteEntry[] = useMemo(() => {
    return queueEntries.map(entry => ({
      id: entry.id,
      structure_id: entry.structure_id,
      patient_id: entry.patient_id,
      status: entry.status,
      priority: entry.priority,
      arrival_time: entry.arrival_time,
      reason: entry.reason,
      notes: entry.notes,
      patient: entry.patient ? {
        id: entry.patient.id,
        first_name: entry.patient.first_name,
        last_name: entry.patient.last_name,
        phone: entry.patient.phone,
      } : undefined,
      origin: 'walkin' as const, // Default for now
      vitals_status: 'none' as const, // Default for now
      needs_ecg: false,
      docs_pending: 0,
      destinataire: 'medecin_traitant' as const,
      is_new_patient: false, // Would need to check patient creation date
    }));
  }, [queueEntries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        // Search filter
        const patientName = `${entry.patient?.first_name || ''} ${entry.patient?.last_name || ''}`.toLowerCase();
        const reason = (entry.reason || '').toLowerCase();
        const matchesSearch =
          searchTerm === '' ||
          patientName.includes(searchTerm.toLowerCase()) ||
          reason.includes(searchTerm.toLowerCase());

        // Priority filter
        const matchesPriority = priorityFilter === 'all' || entry.priority === Number(priorityFilter);

        // Status filter - "active" means waiting, called, in_consultation, or awaiting_exam
        let matchesStatus = false;
        if (statusFilter === 'all') {
          matchesStatus = true;
        } else if (statusFilter === 'active') {
          matchesStatus = ['present', 'waiting', 'called', 'in_consultation', 'awaiting_exam'].includes(entry.status || 'waiting');
        } else {
          matchesStatus = entry.status === statusFilter;
        }

        return matchesSearch && matchesPriority && matchesStatus;
      })
      .sort((a, b) => {
        // Sort by priority first, then by arrival time
        const priorityDiff = (a.priority || 3) - (b.priority || 3);
        if (priorityDiff !== 0) return priorityDiff;
        
        const aTime = a.arrival_time ? new Date(a.arrival_time).getTime() : 0;
        const bTime = b.arrival_time ? new Date(b.arrival_time).getTime() : 0;
        return aTime - bTime;
      });
  }, [entries, searchTerm, priorityFilter, statusFilter]);

  const handleRowClick = (entry: FileAttenteEntry) => {
    setSelectedEntry(entry);
    setDrawerOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('all');
    setStatusFilter('active');
  };

  const hasFilters =
    searchTerm !== '' ||
    priorityFilter !== 'all' ||
    statusFilter !== 'active';

  // Handle actions
  const handleCall = useCallback(async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    
    try {
      await callPatient(entry as any);
      
      // Start automatic recording
      const patientName = `${entry.patient?.first_name || ''} ${entry.patient?.last_name || ''}`.trim();
      if (patientName && entry.patient_id) {
        await startRecording(entry.patient_id, patientName, entry.id);
      }
      
      toast.success('Patient appelé', { 
        description: `${entry.patient?.first_name} ${entry.patient?.last_name}` 
      });
      await refresh();
    } catch (err) {
      console.error('Error calling patient:', err);
      toast.error('Erreur lors de l\'appel du patient');
    }
  }, [entries, callPatient, refresh, startRecording]);

  const handleStart = useCallback(async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    
    try {
      await startConsultation(entry as any);
      
      // Start automatic recording if not already recording
      const patientName = `${entry.patient?.first_name || ''} ${entry.patient?.last_name || ''}`.trim();
      if (patientName && entry.patient_id && !isRecording) {
        await startRecording(entry.patient_id, patientName, entry.id);
      }
      
      toast.success('Consultation démarrée', { 
        description: `${entry.patient?.first_name} ${entry.patient?.last_name}` 
      });
      await refresh();
    } catch (err) {
      console.error('Error starting consultation:', err);
      toast.error('Erreur lors du démarrage de la consultation');
    }
  }, [entries, startConsultation, refresh, startRecording, isRecording]);

  const handleComplete = useCallback(async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    
    try {
      // Stop recording before completing
      if (isRecording) {
        await stopRecording();
      }
      
      await completeConsultation(entry as any);
      toast.success('Consultation terminée', { 
        description: `${entry.patient?.first_name} ${entry.patient?.last_name}` 
      });
      await refresh();
    } catch (err) {
      console.error('Error completing consultation:', err);
      toast.error('Erreur lors de la fin de consultation');
    }
  }, [entries, completeConsultation, refresh, isRecording, stopRecording]);

  const handleSendToExam = useCallback(async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    
    try {
      await sendToExam(entry as any);
      toast.success('Patient envoyé pour examen', { 
        description: `${entry.patient?.first_name} ${entry.patient?.last_name}` 
      });
      await refresh();
    } catch (err) {
      console.error('Error sending to exam:', err);
      toast.error('Erreur lors de l\'envoi pour examen');
    }
  }, [entries, sendToExam, refresh]);

  const handleReturnFromExam = useCallback(async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    
    try {
      await returnFromExam(entry as any);
      toast.success('Consultation reprise', { 
        description: `${entry.patient?.first_name} ${entry.patient?.last_name}` 
      });
      await refresh();
    } catch (err) {
      console.error('Error returning from exam:', err);
      toast.error('Erreur lors de la reprise de consultation');
    }
  }, [entries, returnFromExam, refresh]);

  const handleNoShow = useCallback(async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    
    try {
      await markNoShow(entry as any);
      toast.success('Patient marqué absent', { 
        description: `${entry.patient?.first_name} ${entry.patient?.last_name}` 
      });
      await refresh();
    } catch (err) {
      console.error('Error marking no show:', err);
      toast.error('Erreur lors du marquage absent');
    }
  }, [entries, markNoShow, refresh]);

  const handleSetPriority = useCallback(async (entryId: string, priority: number) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    
    try {
      await updateEntry(entryId, { priority });
      const priorityLabel = priority === 1 ? 'critique' : priority === 2 ? 'urgent' : 'normal';
      toast.success(`Priorité mise à jour: ${priorityLabel}`, { 
        description: `${entry.patient?.first_name} ${entry.patient?.last_name}` 
      });
      await refresh();
    } catch (err) {
      console.error('Error updating priority:', err);
      toast.error('Erreur lors de la mise à jour de la priorité');
    }
  }, [entries, updateEntry, refresh]);

  const handleRegisterArrival = useCallback(async (data: {
    patient_id: string;
    priority: number;
    reason: string;
    notes?: string;
  }) => {
    await addEntry({
      patient_id: data.patient_id,
      priority: data.priority,
      reason: data.reason,
      notes: data.notes,
    });
    await refresh();
  }, [addEntry, refresh]);

  // Handle opening/creating encounter
  const handleOpenEncounter = useCallback(async (patientId: string, queueEntryId: string) => {
    if (!structureId || !patientId) {
      toast.error('Données manquantes');
      return;
    }

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
        .eq('patient_id', patientId)
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

      // Create new encounter in solo mode (default from file d'attente)
      const { data: newEncounter, error: createError } = await supabase
        .from('encounters')
        .insert({
          patient_id: patientId,
          structure_id: structureId,
          mode: 'solo',
          status: 'consultation_in_progress',
          queue_entry_id: queueEntryId,
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
    }
  }, [structureId, navigate]);

  // Calculate active stats
  const activeStats = useMemo(() => {
    const waiting = entries.filter((e) => e.status === 'waiting').length;
    const called = entries.filter((e) => e.status === 'called').length;
    const inProgress = entries.filter((e) => e.status === 'in_consultation').length;
    const awaitingExam = entries.filter((e) => e.status === 'awaiting_exam').length;
    const critical = entries.filter((e) => e.priority === 1 && !['completed', 'cancelled', 'no_show'].includes(e.status || '')).length;
    const urgent = entries.filter((e) => e.priority === 2 && !['completed', 'cancelled', 'no_show'].includes(e.status || '')).length;
    const totalActive = waiting + called + inProgress + awaitingExam;
    return { waiting, called, inProgress, awaitingExam, critical, urgent, totalActive };
  }, [entries]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Legal Banner */}
        <SensitivePageBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">File d'attente</h1>
              <p className="text-muted-foreground">Préparation organisationnelle des patients</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refresh()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setRegisterDialogOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Enregistrer arrivée patient
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {/* Total actifs - card principale */}
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{activeStats.totalActive}</p>
                  <p className="text-xs text-muted-foreground">Total actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeStats.waiting}</p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeStats.inProgress}</p>
                  <p className="text-xs text-muted-foreground">En consultation</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeStats.awaitingExam}</p>
                  <p className="text-xs text-muted-foreground">Attente examen</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeStats.critical}</p>
                  <p className="text-xs text-muted-foreground">Critiques</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeStats.urgent}</p>
                  <p className="text-xs text-muted-foreground">Urgents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou motif..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes priorités</SelectItem>
                    <SelectItem value="1">Critique</SelectItem>
                    <SelectItem value="2">Urgent</SelectItem>
                    <SelectItem value="3">Normal</SelectItem>
                    <SelectItem value="4">Différé</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Tous actifs</SelectItem>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="waiting">En attente</SelectItem>
                    <SelectItem value="called">Appelés</SelectItem>
                    <SelectItem value="in_consultation">En consultation</SelectItem>
                    <SelectItem value="awaiting_exam">Attente examen</SelectItem>
                    <SelectItem value="completed">Terminés</SelectItem>
                    <SelectItem value="no_show">Absents</SelectItem>
                  </SelectContent>
                </Select>

                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <Filter className="h-4 w-4 mr-1" />
                    Effacer
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-3 text-sm text-muted-foreground">
              {filteredEntries.length} patient{filteredEntries.length !== 1 ? 's' : ''}
              {hasFilters && ` (sur ${entries.length})`}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <FileAttenteTable
            entries={filteredEntries}
            onRowClick={handleRowClick}
            onCall={handleCall}
            onStart={handleStart}
            onSendToExam={handleSendToExam}
            onReturnFromExam={handleReturnFromExam}
            onComplete={handleComplete}
            onNoShow={handleNoShow}
            onSetPriority={handleSetPriority}
            onOpenEncounter={handleOpenEncounter}
          />
        )}

        {/* Drawer */}
        <FileAttenteDrawer
          entry={selectedEntry}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onUpdate={refresh}
        />

        {/* Register Arrival Dialog */}
        <RegisterArrivalDialog
          open={registerDialogOpen}
          onOpenChange={setRegisterDialogOpen}
          onSubmit={handleRegisterArrival}
        />
      </div>
    </DashboardLayout>
  );
}
