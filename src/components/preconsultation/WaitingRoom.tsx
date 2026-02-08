import { useState } from 'react';
import { RefreshCw, Users, Clock, Stethoscope, CheckCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { usePreconsultations } from '@/hooks/usePreconsultations';
import { WaitingRoomCard } from './WaitingRoomCard';
import { PreconsultationFormDialog } from './PreconsultationFormDialog';
import { PreconsultationDrawer } from './PreconsultationDrawer';
import { Preconsultation, WaitingStatus } from '@/lib/preconsultations';
import { LegalBanner } from '@/components/shared/LegalBanner';
import { NonValideBadge } from '@/components/shared/DraftBadge';

export function WaitingRoom() {
  const {
    preconsultations,
    loading,
    stats,
    create,
    updateStatus,
    updatePriority,
    refresh,
  } = usePreconsultations();

  const [statusFilter, setStatusFilter] = useState<WaitingStatus | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPreconsultation, setSelectedPreconsultation] = useState<Preconsultation | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter preconsultations
  const filteredPreconsultations = statusFilter === 'all'
    ? preconsultations
    : preconsultations.filter((p) => p.waiting_status === statusFilter);

  const handleStatusChange = async (id: string, status: WaitingStatus) => {
    setActionLoading(id);
    try {
      await updateStatus(id, status);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePriorityChange = async (id: string, priority: 'normal' | 'urgent' | 'emergency') => {
    setActionLoading(id);
    try {
      await updatePriority(id, priority);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFormSubmit = async (data: {
    patient_id: string;
    priority: 'normal' | 'urgent' | 'emergency';
    initial_symptoms: string;
    notes?: string;
  }) => {
    await create(data);
    setFormOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Legal Banner for pre-consultation */}
      <LegalBanner variant="warning" compact>
        <strong>Note :</strong> Les informations de pré-consultation sont des notes internes 
        de préparation organisationnelle. Elles ne constituent pas un diagnostic.
      </LegalBanner>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold">Salle d'attente</h2>
            <p className="text-muted-foreground text-sm">
              Préparation organisationnelle des patients
            </p>
          </div>
          <NonValideBadge />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Enregistrer arrivée
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.arrived}</p>
                <p className="text-xs text-muted-foreground">Arrivés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.waiting}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Stethoscope className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Terminés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as WaitingStatus | 'all')}>
        <TabsList>
          <TabsTrigger value="all">
            Tous ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="arrived">
            Arrivés ({stats.arrived})
          </TabsTrigger>
          <TabsTrigger value="waiting">
            En attente ({stats.waiting})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            En cours ({stats.inProgress})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Patient List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredPreconsultations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Aucun patient {statusFilter !== 'all' ? `avec le statut "${statusFilter}"` : ''} pour le moment.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Enregistrer une arrivée
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-480px)] min-h-[300px]">
          <div className="space-y-3 pr-4">
            {filteredPreconsultations.map((preconsultation) => (
              <WaitingRoomCard
                key={preconsultation.id}
                preconsultation={preconsultation}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onClick={() => setSelectedPreconsultation(preconsultation)}
                loading={actionLoading === preconsultation.id}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Form Dialog */}
      <PreconsultationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
      />

      {/* Detail Drawer */}
      <PreconsultationDrawer
        preconsultation={selectedPreconsultation}
        onClose={() => setSelectedPreconsultation(null)}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
      />
    </div>
  );
}
