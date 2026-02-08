import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRole } from '@/hooks/useRole';
import NoAccessPage from '@/components/layout/NoAccessPage';
import { AnamneseSection } from '@/components/medecin/AnamneseSection';
import { ClinicalDecisionSection } from '@/components/medecin/ClinicalDecisionSection';
import { MedicalDocumentsSection } from '@/components/medecin/MedicalDocumentsSection';
import { PrescriptionSection } from '@/components/medecin/PrescriptionSection';
import { ClinicalManagementSection } from '@/components/medecin/ClinicalManagementSection';
import { PatientConsultationBanner } from '@/components/patient/PatientConsultationBanner';
import { PatientSelector } from '@/components/patient/PatientSelector';
import { VitalSignsSection, VitalSignsSectionSafe } from '@/components/vitals/VitalSignsSection';
import { PatientAntecedentsSummary } from '@/components/medical/PatientAntecedentsSummary';
import { ExamRecommendationsSection } from '@/components/medical/ExamRecommendationsSection';
import { ExamClinicalSection } from '@/components/medecin/ExamClinicalSection';
import { SimplifiedConsultationLayout } from '@/components/consultation/SimplifiedConsultationLayout';
import { ConsultationLayoutToggle, ConsultationLayoutMode } from '@/components/consultation/ConsultationLayoutToggle';
import { CockpitZone } from '@/components/dashboard/CockpitZone';
import { MedecinAlertBanner } from '@/components/medecin/MedecinAlertBanner';
import { MedecinFloatingActionButton } from '@/components/medecin/MedecinFloatingActionButton';
import { MedecinKeyboardShortcuts } from '@/components/medecin/MedecinKeyboardShortcuts';
import { FocusModeToggle } from '@/components/medecin/FocusModeToggle';
import { ConsultationTimer } from '@/components/medecin/ConsultationTimer';
import { PatientHistorySidebar } from '@/components/medecin/PatientHistorySidebar';
import { ConsultationObservationsSection } from '@/components/observations/ConsultationObservationsSection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Stethoscope, AlertTriangle, Activity, FileText, History, LayoutGrid, Columns3 } from 'lucide-react';
import { useAssistantDashboard } from '@/hooks/useAssistantDashboard';
import { AssistantStatsWidget } from '@/components/assistant/AssistantStatsWidget';
import { usePatientConsultationContext } from '@/hooks/usePatientConsultationContext';
import { useAntecedents } from '@/hooks/useAntecedents';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClinicalReflection {
  hypotheses: string[];
  differentials: string[];
  semiologicalElements: string[];
  recommendedExams: string[];
  vigilancePoints: string[];
}

interface MedecinAlert {
  type: 'urgent' | 'warning' | 'clinical';
  message: string;
}

export default function MedecinPage() {
  const { isAdmin, isPractitioner, loading } = useRole();
  const navigate = useNavigate();
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [clinicalReflection, setClinicalReflection] = useState<ClinicalReflection | null>(null);
  const [rawReflectionContent, setRawReflectionContent] = useState<string | null>(null);
  const [reflectionSources, setReflectionSources] = useState<Array<{ title: string; url: string; type: 'has' | 'vidal' | 'pubmed' | 'ansm' | 'other' }>>([]);
  const [confidenceLevel, setConfidenceLevel] = useState<'high' | 'medium' | 'low' | 'none'>('none');
  const [clinicalRedFlags, setClinicalRedFlags] = useState<string[]>([]);
  
  // Anamnesis state for exam recommendations
  const [currentMotif, setCurrentMotif] = useState<string>('');
  const [currentSymptoms, setCurrentSymptoms] = useState<string[]>([]);
  const [currentClinicalNotes, setCurrentClinicalNotes] = useState<string>('');
  
  // Exam clinical notes
  const [examClinicalNotes, setExamClinicalNotes] = useState('');
  
  // Layout mode: 'simplified' (3 columns + tools) or 'full' (original cockpit)
  const [layoutMode, setLayoutMode] = useState<ConsultationLayoutMode>('simplified');
  
  // Focus mode state
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  // Patient history sidebar state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Dashboard stats and queue
  const { queueToday, stats, loading: dashboardLoading } = useAssistantDashboard();
  
  // Patient context
  const { context: patientContext } = usePatientConsultationContext();

  // Antecedents for critical alerts
  const { antecedents } = useAntecedents(patientContext.patient?.id);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          setIsFocusMode(prev => !prev);
          break;
        case 'h':
          e.preventDefault();
          setIsHistoryOpen(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute urgent alerts from queue and clinical data
  const urgentAlerts = useMemo<MedecinAlert[]>(() => {
    const alerts: MedecinAlert[] = [];
    
    // Check waiting patients
    const waitingPatients = queueToday.filter(e => e.status === 'waiting');
    
    // Urgent priority patients
    const urgentPatients = waitingPatients.filter(e => e.priority === 1);
    if (urgentPatients.length > 0) {
      alerts.push({
        type: 'urgent',
        message: `${urgentPatients.length} patient(s) en attente priorité URGENTE`,
      });
    }
    
    // Patients waiting > 30 min
    const now = Date.now();
    const longWaitPatients = waitingPatients.filter(e => {
      const arrivalTime = new Date(e.arrival_time).getTime();
      return (now - arrivalTime) > 30 * 60 * 1000;
    });
    if (longWaitPatients.length > 0) {
      alerts.push({
        type: 'warning',
        message: `${longWaitPatients.length} patient(s) en attente > 30 min`,
      });
    }
    
    return alerts;
  }, [queueToday]);

  // Extract important antecedents (allergies, chronic conditions)
  const importantAntecedents = useMemo(() => {
    if (!antecedents) return [];
    return antecedents.filter(a => 
      a.type === 'allergique' || 
      a.type === 'traitement_en_cours' || 
      a.actif
    ).slice(0, 5);
  }, [antecedents]);

  // Show loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Only allow admin and practitioners
  if (!isAdmin && !isPractitioner) {
    return <NoAccessPage />;
  }

  const handleGenerateReflection = async (anamnese: string) => {
    setIsGeneratingReflection(true);
    setClinicalReflection(null);
    setRawReflectionContent(null);
    setReflectionSources([]);
    setClinicalRedFlags([]);
    
    // Update current context for exam recommendations
    setCurrentClinicalNotes(anamnese);
    const firstLine = anamnese.split('\n')[0] || '';
    if (firstLine.toLowerCase().includes('motif')) {
      setCurrentMotif(firstLine.replace(/motif\s*:?\s*/i, '').trim());
    } else {
      setCurrentMotif(firstLine.slice(0, 100));
    }

    try {
      const { data, error } = await supabase.functions.invoke('multi-llm', {
        body: {
          prompt: `À partir de cette anamnèse, génère des pistes de réflexion clinique structurées:\n\nANAMNÈSE:\n${anamnese}\n\nFournis:\n1. HYPOTHÈSES DIAGNOSTIQUES (les plus probables)\n2. DIAGNOSTICS DIFFÉRENTIELS à considérer\n3. ÉLÉMENTS SÉMIOLOGIQUES à rechercher à l'examen\n4. EXAMENS COMPLÉMENTAIRES recommandés\n5. POINTS DE VIGILANCE (drapeaux rouges)\n\nIMPORTANT: Ces suggestions sont des PISTES DE RÉFLEXION. La décision clinique finale appartient au médecin.`,
          patientContext: anamnese,
          mode: 'diagnosis',
        },
      });

      if (error) throw error;

      const content = data.geminiResponse || data.perplexityResponse || '';
      setRawReflectionContent(content);

      if (data.sources && Array.isArray(data.sources)) {
        const formattedSources = data.sources.map((s: string) => ({
          title: s,
          url: s,
          type: 'other' as const,
        }));
        setReflectionSources(formattedSources);
      }

      const redFlagMatch = content.match(/drapeaux?\s*rouges?|vigilance|urgence|attention/gi);
      if (redFlagMatch) {
        const lines = content.split('\n');
        const flagLines = lines.filter((line: string) => 
          line.toLowerCase().includes('drapeau') || 
          line.toLowerCase().includes('vigilance') ||
          line.toLowerCase().includes('urgence')
        ).slice(0, 3);
        setClinicalRedFlags(flagLines.map((l: string) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean));
      }

      if (data.perplexityResponse && data.geminiResponse) {
        setConfidenceLevel('high');
      } else if (data.perplexityResponse || data.geminiResponse) {
        setConfidenceLevel('medium');
      } else {
        setConfidenceLevel('low');
      }

      toast.success('Pistes de réflexion générées');
    } catch (err) {
      console.error('Error generating reflection:', err);
      toast.error('Erreur lors de la génération');
      setConfidenceLevel('none');
    } finally {
      setIsGeneratingReflection(false);
    }
  };

  const handleExploreHypothesis = async (hypothesis: string) => {
    toast.info(`Recherche approfondie: ${hypothesis.slice(0, 50)}...`);
    // Could open a modal or navigate to a detailed research view
    // For now, trigger a new search with the hypothesis
    try {
      const { data, error } = await supabase.functions.invoke('medical-research', {
        body: {
          query: hypothesis,
          mode: 'reference',
        },
      });
      
      if (error) throw error;
      
      if (data?.content) {
        setRawReflectionContent(data.content);
        if (data.sources) {
          setReflectionSources(data.sources);
        }
        toast.success('Recherche approfondie terminée');
      }
    } catch (err) {
      console.error('Error exploring hypothesis:', err);
      toast.error('Erreur lors de la recherche approfondie');
    }
  };

  const handleValidateConsultation = () => {
    if (patientContext.patient) {
      toast.success('Consultation validée');
      navigate(`/patients/${patientContext.patient.id}`);
    } else {
      toast.warning('Veuillez d\'abord sélectionner un patient');
    }
  };

  const patientName = patientContext.patient 
    ? `${patientContext.patient.first_name} ${patientContext.patient.last_name}`
    : undefined;

  return (
    <DashboardLayout hideSidebar={isFocusMode}>
      <div className={cn(
        "space-y-6 transition-all duration-300",
        isFocusMode && "max-w-4xl mx-auto"
      )}>
        {/* Urgent Alert Banner - hidden in focus mode */}
        {!isFocusMode && (
          <MedecinAlertBanner 
            alerts={urgentAlerts} 
            clinicalRedFlags={clinicalRedFlags}
          />
        )}

        {/* Patient Context Banner */}
        <PatientConsultationBanner />
        
        {/* Header with Focus Mode and Timer */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Espace Médecin</h1>
              {!isFocusMode && (
                <p className="text-muted-foreground">
                  Workflow clinique : anamnèse → diagnostic → prescription → conduite à tenir
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Consultation Timer */}
            <ConsultationTimer 
              isActive={!!patientContext.patient}
              startTime={patientContext.startedAt}
            />
            
            {/* History Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              className="gap-2"
              disabled={!patientContext.patient}
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historique</span>
              <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">
                H
              </kbd>
            </Button>
            
            {/* Layout Toggle - Simplified vs Full */}
            {!isFocusMode && (
              <ConsultationLayoutToggle
                mode={layoutMode}
                onChange={setLayoutMode}
              />
            )}
            
            {/* Focus Mode Toggle */}
            <FocusModeToggle 
              isFocusMode={isFocusMode} 
              onToggle={() => setIsFocusMode(!isFocusMode)} 
            />
          </div>
        </div>

        {/* Patient Selector - always visible */}
        <PatientSelector />

        {/* Focus Mode Layout - Single Column */}
        {isFocusMode ? (
          <div className="space-y-6 animate-fade-in">
            {/* Critical Antecedents */}
            {patientContext.patient && (
              <PatientAntecedentsSummary patientId={patientContext.patient.id} />
            )}
            
            {/* Vital Signs */}
            {patientContext.patient && (
              <VitalSignsSectionSafe 
                patientId={patientContext.patient.id} 
                structureId={patientContext.patient.structure_id} 
              />
            )}
            
            {/* Anamnese Section */}
            <AnamneseSection
              onGenerateReflection={handleGenerateReflection}
              isGeneratingReflection={isGeneratingReflection}
            />

            {/* Clinical Decision Section */}
            <ClinicalDecisionSection
              reflection={clinicalReflection}
              rawContent={rawReflectionContent}
              sources={reflectionSources}
              confidenceLevel={confidenceLevel}
              isLoading={isGeneratingReflection}
              onRefresh={() => {
                setClinicalReflection(null);
                setRawReflectionContent(null);
              }}
              onExploreHypothesis={handleExploreHypothesis}
            />
          </div>
        ) : layoutMode === 'simplified' ? (
          /* Simplified 3-Column Layout with +Outils toggle */
          <SimplifiedConsultationLayout
            // Column 1: Anamnesis
            anamnesisContent={
              <AnamneseSection
                onGenerateReflection={handleGenerateReflection}
                isGeneratingReflection={isGeneratingReflection}
              />
            }
            anamnesisHeader={
              patientContext.patient && (
                <PatientAntecedentsSummary 
                  patientId={patientContext.patient.id} 
                />
              )
            }
            
            // Column 2: Vitals + Exam
            vitalsContent={
              patientContext.patient ? (
                <VitalSignsSectionSafe 
                  patientId={patientContext.patient.id} 
                  structureId={patientContext.patient.structure_id}
                  compact
                />
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm border rounded-lg">
                  Sélectionnez un patient
                </div>
              )
            }
            examContent={
              <ExamClinicalSection
                value={examClinicalNotes}
                onChange={setExamClinicalNotes}
                compact
              />
            }
            
            // Column 3: Decision
            decisionContent={
              <ClinicalDecisionSection
                reflection={clinicalReflection}
                rawContent={rawReflectionContent}
                sources={reflectionSources}
                confidenceLevel={confidenceLevel}
                isLoading={isGeneratingReflection}
                onRefresh={() => {
                  setClinicalReflection(null);
                  setRawReflectionContent(null);
                }}
                onExploreHypothesis={handleExploreHypothesis}
              />
            }
            alertsCount={clinicalRedFlags.length}
            
            // Secondary tools (in +Outils panel)
            prescriptionContent={<PrescriptionSection />}
            examsContent={
              <ExamRecommendationsSection
                patientId={patientContext.patient?.id}
                motif={currentMotif}
                symptoms={currentSymptoms}
                clinicalNotes={currentClinicalNotes}
            />
            }
            documentsContent={<MedicalDocumentsSection />}
            notesContent={<ClinicalManagementSection />}
            observationsContent={
              patientContext.patient ? (
                <ConsultationObservationsSection
                  patientId={patientContext.patient.id}
                  structureId={patientContext.patient.structure_id}
                />
              ) : null
            }
          />
        ) : (
          /* Full Cockpit 3 Zone Layout */
          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Zone CRITIQUE - Left Column */}
            <CockpitZone
              title="Zone Critique"
              icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
              variant="critical"
              count={urgentAlerts.length + clinicalRedFlags.length}
              className="lg:col-span-1"
            >
              <div className="space-y-4">
                {/* Important Antecedents */}
                {patientContext.patient && (
                  <PatientAntecedentsSummary patientId={patientContext.patient.id} />
                )}
                
                {/* Red Flags detected */}
                {clinicalRedFlags.length > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <h4 className="font-medium text-sm text-destructive mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Drapeaux rouges détectés
                    </h4>
                    <ul className="space-y-1">
                      {clinicalRedFlags.map((flag, i) => (
                        <li key={i} className="text-sm text-destructive/80">• {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Waiting patients count */}
                {urgentAlerts.length === 0 && clinicalRedFlags.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune alerte critique</p>
                  </div>
                )}
              </div>
            </CockpitZone>

            {/* Zone CLINIQUE - Middle Column */}
            <CockpitZone
              title="Zone Clinique"
              icon={<Activity className="h-4 w-4 text-primary" />}
              variant="work"
              className="lg:col-span-1"
            >
              <div className="space-y-4">
                {/* Vital Signs */}
                {patientContext.patient && (
                  <VitalSignsSectionSafe 
                    patientId={patientContext.patient.id} 
                    structureId={patientContext.patient.structure_id} 
                  />
                )}
                
                {/* Anamnese Section */}
                <AnamneseSection
                  onGenerateReflection={handleGenerateReflection}
                  isGeneratingReflection={isGeneratingReflection}
                />

                {/* Clinical Decision Section */}
                <ClinicalDecisionSection
                  reflection={clinicalReflection}
                  rawContent={rawReflectionContent}
                  sources={reflectionSources}
                  confidenceLevel={confidenceLevel}
                  isLoading={isGeneratingReflection}
                  onRefresh={() => {
                    setClinicalReflection(null);
                    setRawReflectionContent(null);
                  }}
                  onExploreHypothesis={handleExploreHypothesis}
                />

                {/* Exam Recommendations Section */}
                <ExamRecommendationsSection
                  patientId={patientContext.patient?.id}
                  motif={currentMotif}
                  symptoms={currentSymptoms}
                  clinicalNotes={currentClinicalNotes}
                />
              </div>
            </CockpitZone>

            {/* Zone GESTION - Right Column */}
            <CockpitZone
              title="Zone Gestion"
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              variant="info"
              className="lg:col-span-1"
            >
              <div className="space-y-4">
                {/* Daily Stats */}
                <AssistantStatsWidget stats={stats} loading={dashboardLoading} />

                {/* Prescription Section */}
                <PrescriptionSection />

                {/* Medical Documents Section */}
                <MedicalDocumentsSection />

                {/* Clinical Management Section */}
                <ClinicalManagementSection />
              </div>
            </CockpitZone>
          </div>
        )}

        {/* Keyboard Shortcuts Help - hidden in focus mode */}
        {!isFocusMode && <MedecinKeyboardShortcuts />}

        {/* Floating Action Button */}
        <MedecinFloatingActionButton 
          onValidateConsultation={handleValidateConsultation}
        />

        {/* Patient History Sidebar */}
        <PatientHistorySidebar
          patientId={patientContext.patient?.id}
          patientName={patientName}
          open={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
        />
      </div>
    </DashboardLayout>
  );
}
