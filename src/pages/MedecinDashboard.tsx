import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Stethoscope, 
  Pill, 
  Activity, 
  FileCheck, 
  Clock,
  Bell,
  User,
  TestTube
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useDoctorPermission } from '@/hooks/useDoctorPermission';
import { useDoctorQueue } from '@/hooks/useDoctorQueue';
import { usePatientConsultationContext } from '@/hooks/usePatientConsultationContext';
import { OptimizedPatientQueue } from '@/components/queue/OptimizedPatientQueue';
import { PatientSummaryCard } from '@/components/queue/PatientSummaryCard';
import { PrescriptionFormDialog } from '@/components/prescriptions/PrescriptionFormDialog';
import { ExamPrescriptionDialog } from '@/components/exams/ExamPrescriptionDialog';
import NoAccessPage from '@/components/layout/NoAccessPage';
import { QueueEntry } from '@/lib/queue';
import { toast } from 'sonner';

export default function MedecinDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const { isDoctor, loading: doctorLoading } = useDoctorPermission();
  const { 
    entries, 
    readyPatients, 
    inConsultation, 
    loading: queueLoading,
    startConsultation,
    completeConsultation,
    refresh 
  } = useDoctorQueue();
  const {
    startConsultation: startPatientConsultation,
    context: patientContext,
  } = usePatientConsultationContext();
  const contextPatient = patientContext.patient;
  
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [examPrescriptionOpen, setExamPrescriptionOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  // Set patient context when consultation starts
  useEffect(() => {
    if (inConsultation?.patient && startPatientConsultation) {
      startPatientConsultation({
        id: inConsultation.patient_id,
        first_name: inConsultation.patient.first_name || '',
        last_name: inConsultation.patient.last_name || '',
      } as any);
    }
  }, [inConsultation, startPatientConsultation]);

  // Keyboard shortcut: Space to take next patient
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !inConsultation && readyPatients.length > 0) {
        // Check if we're not in an input
        if (document.activeElement?.tagName !== 'INPUT' && 
            document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const nextPatient = readyPatients[0];
          startConsultation(nextPatient.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readyPatients, inConsultation, startConsultation]);

  const handleSelectPatient = (entry: QueueEntry) => {
    setSelectedEntry(entry);
  };

  const handleStartConsultation = async (entryId: string) => {
    await startConsultation(entryId);
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      setSelectedEntry(entry);
    }
  };

  // Patient to use for quick actions (queue selection OR ongoing consultation OR persisted patient context)
  const getActionPatient = () => {
    const entry = inConsultation || selectedEntry;

    if (entry?.patient) {
      return {
        id: entry.patient_id,
        first_name: entry.patient.first_name ?? null,
        last_name: entry.patient.last_name ?? null,
        dob: (entry.patient as any).dob ?? null,
        status: ((entry.patient as any).status as any) ?? 'actif',
      };
    }

    if (contextPatient) {
      return {
        id: contextPatient.id,
        first_name: contextPatient.first_name ?? null,
        last_name: contextPatient.last_name ?? null,
        dob: contextPatient.dob ?? null,
        status: (contextPatient.status as any) ?? 'actif',
      };
    }

    return null;
  };

  const handlePrescribe = () => {
    if (getActionPatient()) {
      setPrescriptionOpen(true);
    } else {
      toast.warning('Sélectionnez un patient d\'abord');
    }
  };

  const handleExamPrescribe = () => {
    if (getActionPatient()) {
      setExamPrescriptionOpen(true);
    } else {
      toast.warning('Sélectionnez un patient d\'abord');
    }
  };

  const handleOpenPatientFile = () => {
    const patientId = getActionPatient()?.id;
    if (patientId) {
      navigate(`/patients/${patientId}`);
    } else {
      toast.warning('Sélectionnez un patient d\'abord');
    }
  };

  const handleCompleteConsultation = async () => {
    if (inConsultation) {
      await completeConsultation(inConsultation.id);
      setSelectedEntry(null);
      toast.success('Consultation terminée');
    } else {
      toast.warning('Aucune consultation en cours');
    }
  };

  // Loading state
  if (authLoading || doctorLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[500px]" />
            <Skeleton className="h-[500px] lg:col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Access control: only doctors
  if (!isDoctor && !isAdmin) {
    return <NoAccessPage />;
  }

  const currentPatient = inConsultation || selectedEntry;
  const actionPatient = getActionPatient();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tableau de bord Médecin</h1>
              <p className="text-muted-foreground">
                Consultez vos patients rapidement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {readyPatients.length > 0 && (
              <Badge className="h-8 px-3 bg-success text-success-foreground animate-pulse">
                <Bell className="h-4 w-4 mr-2" />
                {readyPatients.length} patient{readyPatients.length > 1 ? 's' : ''} prêt{readyPatients.length > 1 ? 's' : ''}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/medecin')}>
              Mode avancé
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prêts</p>
                <p className="text-2xl font-bold">{readyPatients.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En consultation</p>
                <p className="text-2xl font-bold">{inConsultation ? 1 : 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">
                  {entries.filter(e => !e.ready_at && e.status === 'waiting').length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <User className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total actif</p>
                <p className="text-2xl font-bold">{entries.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient queue */}
          <div className="lg:col-span-1">
            <OptimizedPatientQueue
              entries={entries}
              onMarkReady={async () => {}}
              onStartConsultation={handleStartConsultation}
              onComplete={completeConsultation}
              onSelectPatient={handleSelectPatient}
              isDoctor={true}
              loading={queueLoading}
            />
          </div>

          {/* Current patient / selected patient */}
          <div className="lg:col-span-2 space-y-4">
            {currentPatient ? (
              <>
                {/* Current consultation banner */}
                {inConsultation && (
                  <Card className="border-primary bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                            <Stethoscope className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Consultation en cours</p>
                            <p className="text-sm text-muted-foreground">
                              {inConsultation.patient?.first_name} {inConsultation.patient?.last_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handlePrescribe}>
                            <Pill className="h-4 w-4 mr-2" />
                            Prescrire
                          </Button>
                          <Button variant="outline" onClick={() => navigate(`/patients/${inConsultation.patient_id}`)}>
                            Dossier
                          </Button>
                          <Button variant="secondary" onClick={handleCompleteConsultation}>
                            <FileCheck className="h-4 w-4 mr-2" />
                            Terminer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Patient summary */}
                <PatientSummaryCard
                  entry={currentPatient as any}
                  onPrescribe={handlePrescribe}
                  onExams={handleExamPrescribe}
                  onClose={inConsultation ? handleCompleteConsultation : undefined}
                  isDoctor={true}
                />
              </>
            ) : actionPatient ? (
              <Card className="h-[400px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    {actionPatient.first_name} {actionPatient.last_name}
                  </p>
                  <p className="text-sm mt-1">
                    Patient actif via le contexte — utilisez les Actions rapides.
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="h-[400px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Aucun patient sélectionné</p>
                  <p className="text-sm mt-1">
                    {readyPatients.length > 0 
                      ? 'Cliquez sur un patient prêt ou appuyez sur Espace'
                      : 'En attente de patients prêts'
                    }
                  </p>
                </div>
              </Card>
            )}

            {/* Quick actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col"
                    onClick={handlePrescribe}
                    disabled={!actionPatient}
                  >
                    <Pill className="h-5 w-5 mb-1" />
                    <span className="text-xs">Ordonnance</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col"
                    onClick={handleExamPrescribe}
                    disabled={!actionPatient}
                  >
                    <TestTube className="h-5 w-5 mb-1" />
                    <span className="text-xs">Examens</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col"
                    onClick={handleOpenPatientFile}
                    disabled={!actionPatient}
                  >
                    <User className="h-5 w-5 mb-1" />
                    <span className="text-xs">Dossier</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col"
                    onClick={handleCompleteConsultation}
                    disabled={!inConsultation}
                  >
                    <FileCheck className="h-5 w-5 mb-1" />
                    <span className="text-xs">Clôturer</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="text-center text-xs text-muted-foreground">
          <kbd className="px-2 py-1 bg-muted rounded text-xs">Espace</kbd> Prendre le prochain patient
          {' • '}
          <kbd className="px-2 py-1 bg-muted rounded text-xs">O</kbd> Ordonnance
        </div>
      </div>

      {/* Prescription dialog */}
      <PrescriptionFormDialog
        open={prescriptionOpen}
        onOpenChange={setPrescriptionOpen}
        preselectedPatient={actionPatient}
        onSuccess={() => {
          setPrescriptionOpen(false);
          toast.success('Ordonnance créée');
        }}
      />

      {/* Exam prescription dialog */}
      <ExamPrescriptionDialog
        open={examPrescriptionOpen}
        onOpenChange={setExamPrescriptionOpen}
        preselectedPatient={actionPatient}
        onSuccess={() => {
          setExamPrescriptionOpen(false);
        }}
      />
    </DashboardLayout>
  );
}
