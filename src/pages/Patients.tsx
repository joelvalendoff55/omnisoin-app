"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import { usePatientPreferences } from '@/hooks/useUserPreferences';
import DashboardLayout from '@/components/layout/DashboardLayout';
import NoAccessPage from '@/components/layout/NoAccessPage';
import { HealthDataGuard } from '@/components/shared/HealthDataGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PatientFormDialog } from '@/components/patients/PatientFormDialog';
import { EnhancedPatientCard } from '@/components/patients/EnhancedPatientCard';
import { PatientListView } from '@/components/patients/PatientListView';
import { AdvancedPatientFilters, AdvancedFilters } from '@/components/patients/AdvancedPatientFilters';
import { PatientViewToggle, ViewMode } from '@/components/patients/PatientViewToggle';
import { EnhancedPatientStatsExport } from '@/components/patients/EnhancedPatientStatsExport';
import { PatientPagination } from '@/components/patients/PatientPagination';
import { PatientImportDialog } from '@/components/patients/PatientImportDialog';
import { BulkActionsBar } from '@/components/patients/PatientQuickActions';
import { SecurePatientForm } from '@/components/patients/SecurePatientForm';
import { PatientCalendarDrawer } from '@/components/patients/PatientCalendarDrawer';
import GlobalHospitalPassagesSection from '@/components/hospital/GlobalHospitalPassagesSection';
import { Patient, PatientFormData } from '@/types/patient';
import {
  fetchPatients,
  createPatient,
  updatePatient,
  archivePatient,
} from '@/lib/patients';
import { fetchUsersByRole, UserWithProfile } from '@/lib/delegations';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { Plus, User, Building2, Users, Shield, RefreshCw, Upload, Loader2, CalendarDays, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SensitivePageBanner } from '@/components/shared/LegalBanner';
import { differenceInMonths, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

interface ExtractedPatientData {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
}

export default function Patients() {
  const { user, loading: authLoading } = useAuth();
  const { isPractitioner, loading: roleLoading } = useRole();
  const { structureId, loading: structureLoading } = useStructureId();
  const router = useRouter();

  // User preferences (persisted)
  const {
    filters,
    setFilters,
    viewMode,
    setViewMode,
    pageSize,
    setPageSize,
    resetPreferences,
    hasStoredPreferences,
  } = usePatientPreferences();

  // Core state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vaultPatientIds, setVaultPatientIds] = useState<Set<string>>(new Set());
  const [practitioners, setPractitioners] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSecureFormOpen, setIsSecureFormOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [prefillData, setPrefillData] = useState<PatientFormData | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Calendar drawer state
  const [calendarPatient, setCalendarPatient] = useState<Patient | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Selection state
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());

  // Pagination state (page size from preferences)
  const [currentPage, setCurrentPage] = useState(1);

  // Patient metadata (appointments, last visits)
  const [patientAppointments, setPatientAppointments] = useState<Record<string, boolean>>({});
  const [patientLastVisits, setPatientLastVisits] = useState<Record<string, string | null>>({});

  // Data loading
  const loadPatients = useCallback(async () => {
    if (!structureId) return;
    try {
      setLoading(true);
      const showArchived = filters.activeFilters.includes('archived');
      const data = await fetchPatients(showArchived, structureId);
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Erreur lors du chargement des patients');
    } finally {
      setLoading(false);
    }
  }, [filters.activeFilters, structureId]);

  const loadPractitioners = useCallback(async () => {
    if (!structureId) return;
    try {
      const data = await fetchUsersByRole(structureId, 'practitioner');
      setPractitioners(data);
    } catch (error) {
      console.error('Error loading practitioners:', error);
    }
  }, [structureId]);

  const loadVaultEntries = useCallback(async () => {
    if (!structureId) return;
    try {
      const { data, error } = await supabase
        .from('identities_vault')
        .select('patient_uuid')
        .eq('structure_id', structureId);
      
      if (error) throw error;
      setVaultPatientIds(new Set(data?.map(entry => entry.patient_uuid) || []));
    } catch (error) {
      console.error('Error loading vault entries:', error);
    }
  }, [structureId]);

  const loadPatientMetadata = useCallback(async () => {
    if (!structureId || patients.length === 0) return;
    
    try {
      // Load upcoming appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('structure_id', structureId)
        .gte('start_time', new Date().toISOString())
        .in('status', ['scheduled', 'confirmed']);

      const appointmentMap: Record<string, boolean> = {};
      appointments?.forEach(apt => {
        if (apt.patient_id) appointmentMap[apt.patient_id] = true;
      });
      setPatientAppointments(appointmentMap);

      // Load last consultations
      const { data: consultations } = await supabase
        .from('consultations')
        .select('patient_id, consultation_date')
        .in('patient_id', patients.map(p => p.id))
        .order('consultation_date', { ascending: false });

      const lastVisitMap: Record<string, string | null> = {};
      consultations?.forEach(c => {
        if (c.patient_id && !lastVisitMap[c.patient_id]) {
          lastVisitMap[c.patient_id] = c.consultation_date;
        }
      });
      setPatientLastVisits(lastVisitMap);
    } catch (error) {
      console.error('Error loading patient metadata:', error);
    }
  }, [structureId, patients]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && structureId) {
      loadPatients();
      loadPractitioners();
      loadVaultEntries();
    }
  }, [user, structureId, loadPatients, loadPractitioners, loadVaultEntries]);

  useEffect(() => {
    loadPatientMetadata();
  }, [loadPatientMetadata]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Handlers
  const handleCreateOrUpdate = async (data: PatientFormData) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }
    
    if (!structureId) {
      toast.error('Aucune structure sélectionnée');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPatient) {
        await updatePatient(editingPatient.id, data, user.id, structureId);
        toast.success('Patient mis à jour');
      } else {
        await createPatient(data, user.id, structureId);
        toast.success('Patient créé avec succès');
      }
      setIsDialogOpen(false);
      setEditingPatient(null);
      loadPatients();
    } catch (error) {
      console.error('Error saving patient:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsDialogOpen(true);
  };

  const handleArchive = async (patient: Patient) => {
    if (!user) return;
    try {
      const newArchivedState = !patient.is_archived;
      await archivePatient(patient.id, newArchivedState, user.id, structureId);
      toast.success(newArchivedState ? 'Patient archivé' : 'Patient restauré');
      loadPatients();
    } catch (error) {
      console.error('Error archiving patient:', error);
      toast.error("Erreur lors de l'archivage");
    }
  };

  const handleViewDetail = (patient: Patient) => {
    navigate(`/patients/${patient.id}`);
  };

  const handleOpenCalendar = (patient: Patient) => {
    setCalendarPatient(patient);
    setIsCalendarOpen(true);
  };

  const handleDialogCloseWithReset = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingPatient(null);
      setPrefillData(null);
    }
  };

  const handlePdfImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez PDF, JPG, PNG ou WebP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 10 Mo).');
      return;
    }

    setIsExtractingPdf(true);

    try {
      // Convert file to base64 for Edge Function
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Use secure Edge Function proxy instead of direct n8n call
      const { data, error } = await supabase.functions.invoke('extract-patient-pdf', {
        body: {
          file: base64,
          fileName: file.name,
          mimeType: file.type,
        },
      });

      if (error) throw new Error(error.message || 'Erreur lors de l\'extraction');
      if (data?.error) throw new Error(data.error);

      const extracted: ExtractedPatientData = data;
      const prefill: PatientFormData = {
        first_name: extracted.firstName || '',
        last_name: extracted.lastName || '',
        dob: extracted.dateOfBirth || '',
        sex: (extracted.gender as 'M' | 'F' | 'O') || null,
        phone: extracted.phone || '',
        email: extracted.email || '',
        primary_practitioner_user_id: null,
        note_admin: '',
      };

      setPrefillData(prefill);
      setIsDialogOpen(true);

      const fieldsExtracted = [
        extracted.firstName && 'prénom',
        extracted.lastName && 'nom',
        extracted.dateOfBirth && 'date de naissance',
        extracted.gender && 'sexe',
        extracted.phone && 'téléphone',
        extracted.email && 'email',
      ].filter(Boolean);

      if (fieldsExtracted.length > 0) {
        toast.success(`Données extraites : ${fieldsExtracted.join(', ')}`);
      } else {
        toast.warning('Aucune donnée patient trouvée dans le document.');
      }
    } catch (err) {
      console.error('PDF extraction error:', err);
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'extraction du PDF");
    } finally {
      setIsExtractingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  // CSV Import handler
  const handleCSVImport = async (importedPatients: { first_name: string; last_name: string; dob?: string; sex?: 'M' | 'F' | 'O'; phone?: string; email?: string; note_admin?: string }[]) => {
    if (!user || !structureId) return;

    for (const patientData of importedPatients) {
      await createPatient({
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        dob: patientData.dob || '',
        sex: patientData.sex || null,
        phone: patientData.phone || '',
        email: patientData.email || '',
        primary_practitioner_user_id: null,
        note_admin: patientData.note_admin || '',
      }, user.id, structureId, { skipLog: true });
    }
    
    loadPatients();
  };

  // Selection handlers
  const handleSelectPatient = (patientId: string, selected: boolean) => {
    setSelectedPatients(prev => {
      const next = new Set(prev);
      if (selected) next.add(patientId);
      else next.delete(patientId);
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedPatients(new Set(paginatedPatients.map(p => p.id)));
    } else {
      setSelectedPatients(new Set());
    }
  };

  const handleArchiveSelected = async () => {
    if (!user) return;
    const toArchive = patients.filter(p => selectedPatients.has(p.id) && !p.is_archived);
    for (const patient of toArchive) {
      await archivePatient(patient.id, true, user.id, structureId);
    }
    toast.success(`${toArchive.length} patient(s) archivé(s)`);
    setSelectedPatients(new Set());
    loadPatients();
  };

  const handleExportSelected = () => {
    toast.info('Utilisez le bouton Export CSV pour exporter les patients filtrés');
  };

  // Practitioner name helper
  const getPractitionerName = (practitionerId: string | null) => {
    if (!practitionerId) return 'Non assigné';
    const practitioner = practitioners.find((p) => p.user_id === practitionerId);
    if (!practitioner) return 'Inconnu';
    return `${practitioner.first_name || ''} ${practitioner.last_name || ''}`.trim() || 'Sans nom';
  };

  // Advanced filtering and sorting logic
  const filteredPatients = useMemo(() => {
    let result = patients.filter((patient) => {
      // Main search filter (name)
      const query = filters.searchQuery.toLowerCase();
      const matchesSearch = !query ||
        patient.first_name.toLowerCase().includes(query) ||
        patient.last_name.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Phone filter
      if (filters.phone && !patient.phone?.includes(filters.phone)) {
        return false;
      }

      // Email filter
      if (filters.email && !patient.email?.toLowerCase().includes(filters.email.toLowerCase())) {
        return false;
      }

      // Practitioner filter
      if (filters.practitionerId && patient.primary_practitioner_user_id !== filters.practitionerId) {
        return false;
      }

      // Chip filters
      if (filters.activeFilters.includes('mine') && patient.primary_practitioner_user_id !== user?.id) {
        return false;
      }
      if (filters.activeFilters.includes('unassigned') && patient.primary_practitioner_user_id) {
        return false;
      }
      if (filters.activeFilters.includes('active') && patient.is_archived) {
        return false;
      }
      if (filters.activeFilters.includes('archived') && !patient.is_archived) {
        return false;
      }

      // Date range filter (creation date)
      if (filters.dateRange.from || filters.dateRange.to) {
        const createdAt = new Date(patient.created_at);
        if (filters.dateRange.from && isBefore(createdAt, startOfDay(filters.dateRange.from))) {
          return false;
        }
        if (filters.dateRange.to && isAfter(createdAt, endOfDay(filters.dateRange.to))) {
          return false;
        }
      }

      // Last visit filter
      if (filters.lastVisitFilter !== 'all') {
        const lastVisit = patientLastVisits[patient.id];
        if (!lastVisit && filters.lastVisitFilter !== 'over1year') return false;
        
        if (lastVisit) {
          const visitDate = new Date(lastVisit);
          const monthsAgo = differenceInMonths(new Date(), visitDate);
          
          switch (filters.lastVisitFilter) {
            case '1month': if (monthsAgo >= 1) return false; break;
            case '3months': if (monthsAgo >= 3) return false; break;
            case '1year': if (monthsAgo >= 12) return false; break;
            case 'over1year': if (monthsAgo < 12) return false; break;
          }
        }
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'last_visit':
          const aVisit = patientLastVisits[a.id];
          const bVisit = patientLastVisits[b.id];
          if (!aVisit && !bVisit) comparison = 0;
          else if (!aVisit) comparison = 1;
          else if (!bVisit) comparison = -1;
          else comparison = new Date(aVisit).getTime() - new Date(bVisit).getTime();
          break;
        case 'dob':
          if (!a.dob && !b.dob) comparison = 0;
          else if (!a.dob) comparison = 1;
          else if (!b.dob) comparison = -1;
          else comparison = new Date(a.dob).getTime() - new Date(b.dob).getTime();
          break;
      }
      
      return filters.sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [patients, filters, user?.id, patientLastVisits]);

  // Paginated patients
  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPatients.slice(startIndex, startIndex + pageSize);
  }, [filteredPatients, currentPage, pageSize]);

  // Loading state
  const isLoading = authLoading || roleLoading || structureLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary text-lg">Chargement...</div>
      </div>
    );
  }

  if (!user) return null;
  if (!structureId) return <NoAccessPage />;

  return (
    <DashboardLayout>
      <HealthDataGuard resource="patients" action="read">
        <TooltipProvider>
          <div className="space-y-6">
            <SensitivePageBanner />

            {/* Page Header */}
            <div className="page-header">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Patients</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gestion et suivi de vos patients
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {hasStoredPreferences && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetPreferences}
                      className="gap-1.5 text-muted-foreground hover:text-foreground"
                      title="Réinitialiser les préférences de filtrage"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="hidden lg:inline">Réinitialiser vue</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadPatients()}
                    disabled={loading}
                    className="gap-1.5"
                  >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    <span className="hidden sm:inline">Actualiser</span>
                  </Button>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    onChange={handlePdfImport}
                    className="hidden"
                    disabled={isExtractingPdf}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={isExtractingPdf}
                  >
                    {isExtractingPdf ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Extraction...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span className="hidden sm:inline">Importer PDF</span>
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5" 
                    onClick={() => setIsSecureFormOpen(true)}
                  >
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Privacy by Design</span>
                  </Button>
                  <Button size="sm" className="gap-1.5 btn-primary-action" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Nouveau patient
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats Dashboard with Import/Export */}
            <EnhancedPatientStatsExport
              patients={patients}
              filteredPatients={filteredPatients}
              practitioners={practitioners}
              onImportClick={() => setIsImportDialogOpen(true)}
            />

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="list" className="gap-2 data-[state=active]:bg-background">
                  <Users className="h-4 w-4" />
                  Patients
                </TabsTrigger>
                <TabsTrigger value="hospital" className="gap-2 data-[state=active]:bg-background">
                  <Building2 className="h-4 w-4" />
                  Passages hospitaliers
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-6 space-y-4">
                {/* Filters + View Toggle */}
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1">
                    <AdvancedPatientFilters
                      patients={patients}
                      filters={filters}
                      onFiltersChange={setFilters}
                      practitioners={practitioners}
                      isPractitioner={isPractitioner}
                      currentUserId={user?.id}
                      resultCount={filteredPatients.length}
                    />
                  </div>
                  <PatientViewToggle
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                  />
                </div>

                {/* Patients Display */}
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="patient-card animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted" />
                          <div className="space-y-2 flex-1">
                            <div className="h-4 w-32 bg-muted rounded" />
                            <div className="h-3 w-20 bg-muted rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <Card data-testid="patients-empty" className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-base font-medium mb-1">Aucun patient trouvé</h3>
                      <p className="text-sm text-muted-foreground">
                        {filters.searchQuery
                          ? 'Essayez une autre recherche'
                          : 'Commencez par ajouter votre premier patient'}
                      </p>
                    </CardContent>
                  </Card>
                ) : viewMode === 'grid' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {paginatedPatients.map((patient, index) => (
                        <EnhancedPatientCard
                          key={patient.id}
                          patient={patient}
                          index={index}
                          practitionerName={getPractitionerName(patient.primary_practitioner_user_id)}
                          hasVaultEntry={vaultPatientIds.has(patient.id)}
                          hasUpcomingAppointment={patientAppointments[patient.id]}
                          lastVisitDate={patientLastVisits[patient.id]}
                          selected={selectedPatients.has(patient.id)}
                          onSelectChange={(sel) => handleSelectPatient(patient.id, sel)}
                          showCheckbox={selectedPatients.size > 0}
                          onEdit={handleEdit}
                          onArchive={handleArchive}
                          onViewDetail={handleViewDetail}
                          onOpenCalendar={handleOpenCalendar}
                        />
                      ))}
                    </div>
                    <PatientPagination
                      currentPage={currentPage}
                      totalItems={filteredPatients.length}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                    />
                  </>
                ) : (
                  <>
                    <PatientListView
                      patients={paginatedPatients}
                      practitioners={practitioners}
                      vaultPatientIds={vaultPatientIds}
                      patientAppointments={patientAppointments}
                      patientLastVisits={patientLastVisits}
                      selectedPatients={selectedPatients}
                      onSelectPatient={handleSelectPatient}
                      onSelectAll={handleSelectAll}
                      onEdit={handleEdit}
                      onArchive={handleArchive}
                      onViewDetail={handleViewDetail}
                      onOpenCalendar={handleOpenCalendar}
                    />
                    <PatientPagination
                      currentPage={currentPage}
                      totalItems={filteredPatients.length}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="hospital" className="mt-6">
                <GlobalHospitalPassagesSection />
              </TabsContent>
            </Tabs>

            {/* Bulk Actions Bar */}
            <BulkActionsBar
              selectedCount={selectedPatients.size}
              onArchiveSelected={handleArchiveSelected}
              onExportSelected={handleExportSelected}
              onClearSelection={() => setSelectedPatients(new Set())}
            />

            {/* Dialogs */}
            <PatientFormDialog
              open={isDialogOpen}
              onOpenChange={handleDialogCloseWithReset}
              onSubmit={handleCreateOrUpdate}
              patient={editingPatient}
              isSubmitting={isSubmitting}
              prefillData={prefillData}
            />

            <SecurePatientForm
              open={isSecureFormOpen}
              onOpenChange={setIsSecureFormOpen}
              onSuccess={() => {
                loadPatients();
                loadVaultEntries();
              }}
            />

            <PatientCalendarDrawer
              open={isCalendarOpen}
              onOpenChange={setIsCalendarOpen}
              patient={calendarPatient}
            />

            <PatientImportDialog
              open={isImportDialogOpen}
              onOpenChange={setIsImportDialogOpen}
              onImport={handleCSVImport}
            />
          </div>
        </TooltipProvider>
      </HealthDataGuard>
    </DashboardLayout>
  );
}
