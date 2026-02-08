import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Phone, 
  Globe, 
  Footprints, 
  Building2, 
  Clock,
  Search,
  Filter
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { QueueActionButtons } from './QueueActionButtons';
import { QueueEntryDrawer } from './QueueEntryDrawer';
import { usePatientJourney } from '@/hooks/usePatientJourney';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/patientJourney';
import { getWaitingTime } from '@/lib/queue';
import type { QueueEntry } from '@/lib/queue';

interface QueueTableProps {
  entries: QueueEntry[];
  onUpdate: () => void;
}

// Priority configuration
const PRIORITY_CONFIG = {
  1: { label: 'Critique', color: 'bg-red-500/15 text-red-700 border-red-300 dark:text-red-400' },
  2: { label: 'Urgent', color: 'bg-orange-500/15 text-orange-700 border-orange-300 dark:text-orange-400' },
  3: { label: 'Normal', color: 'bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-400' },
  4: { label: 'Différé', color: 'bg-gray-500/15 text-gray-700 border-gray-300 dark:text-gray-400' },
} as const;

// Origin configuration
const ORIGIN_CONFIG = {
  phone: { icon: Phone, label: 'Téléphone', color: 'text-green-600' },
  web: { icon: Globe, label: 'Web', color: 'text-blue-600' },
  walkin: { icon: Footprints, label: 'Sans rendez-vous', color: 'text-orange-600' },
  hospital: { icon: Building2, label: 'Hôpital', color: 'text-purple-600' },
} as const;

type OriginType = keyof typeof ORIGIN_CONFIG;
type PriorityType = keyof typeof PRIORITY_CONFIG;

export function QueueTable({ entries, onUpdate }: QueueTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleRowClick = (entry: QueueEntry) => {
    setSelectedEntry(entry);
    setDrawerOpen(true);
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    // Search filter
    const patientName = `${entry.patient?.first_name || ''} ${entry.patient?.last_name || ''}`.toLowerCase();
    const matchesSearch = searchTerm === '' || patientName.includes(searchTerm.toLowerCase());

    // Priority filter
    const matchesPriority = priorityFilter === 'all' || entry.priority === Number(priorityFilter);

    // Origin filter - using a default origin for now since the field may not exist
    const entryOrigin = (entry as any).origin || 'walkin';
    const matchesOrigin = originFilter === 'all' || entryOrigin === originFilter;

    return matchesSearch && matchesPriority && matchesOrigin;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('all');
    setOriginFilter('all');
  };

  const hasFilters = searchTerm !== '' || priorityFilter !== 'all' || originFilter !== 'all';

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="queue-search"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]" data-testid="queue-filter-priority">
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

            <Select value={originFilter} onValueChange={setOriginFilter}>
              <SelectTrigger className="w-[140px]" data-testid="queue-filter-origin">
                <SelectValue placeholder="Origine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes origines</SelectItem>
                <SelectItem value="phone">Téléphone</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="walkin">Sans RDV</SelectItem>
                <SelectItem value="hospital">Hôpital</SelectItem>
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

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredEntries.length} patient{filteredEntries.length !== 1 ? 's' : ''} 
          {hasFilters && ` (sur ${entries.length})`}
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Arrivée</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead className="w-[100px]">Priorité</TableHead>
                <TableHead className="w-[80px] text-center">Origine</TableHead>
                <TableHead className="w-[120px]">Statut</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {hasFilters 
                      ? 'Aucun patient ne correspond aux filtres' 
                      : 'Aucun patient dans la file d\'attente'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <QueueTableRow 
                    key={entry.id} 
                    entry={entry} 
                    onUpdate={onUpdate}
                    onClick={() => handleRowClick(entry)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Entry Detail Drawer */}
      <QueueEntryDrawer
        entry={selectedEntry}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdate={onUpdate}
      />
    </>
  );
}

interface QueueTableRowProps {
  entry: QueueEntry;
  onUpdate: () => void;
  onClick: () => void;
}

function QueueTableRow({ entry, onUpdate, onClick }: QueueTableRowProps) {
  const {
    loading,
    callPatient,
    startConsultation,
    completeConsultation,
    markNoShow,
    cancelVisit,
    requeue,
  } = usePatientJourney();

  const status = entry.status || 'waiting';
  const statusLabel = STATUS_LABELS[status] || status;
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.waiting;
  const waitingTime = entry.arrival_time ? getWaitingTime(entry.arrival_time) : null;
  
  // Priority
  const priority = (entry.priority || 3) as PriorityType;
  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[3];
  
  // Origin - default to walkin if not set
  const origin = ((entry as any).origin || 'walkin') as OriginType;
  const originConfig = ORIGIN_CONFIG[origin] || ORIGIN_CONFIG.walkin;
  const OriginIcon = originConfig.icon;

  // Check if patient is new (first visit) - using created_at or a flag
  const isNewPatient = false; // Would need patient visit history to determine

  const handleAction = async (action: () => Promise<void>) => {
    try {
      await action();
      onUpdate();
    } catch {
      // Error already handled in hook
    }
  };

  return (
    <TableRow 
      data-testid={`queue-row-${entry.id}`}
      className="cursor-pointer"
      onClick={onClick}
    >
      {/* Arrival Time */}
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">
            {entry.arrival_time 
              ? format(new Date(entry.arrival_time), 'HH:mm', { locale: fr })
              : '--:--'
            }
          </span>
          {status === 'waiting' && waitingTime && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {waitingTime.formatted}
            </span>
          )}
        </div>
      </TableCell>

      {/* Patient */}
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {entry.patient?.first_name} {entry.patient?.last_name}
          </span>
          {isNewPatient ? (
            <Badge variant="secondary" className="text-xs">Nouveau</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">Connu</Badge>
          )}
        </div>
        {entry.patient?.phone && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {entry.patient.phone}
          </p>
        )}
      </TableCell>

      {/* Reason */}
      <TableCell>
        {entry.consultation_reason ? (
          <Badge 
            variant="outline" 
            className="font-normal"
            style={{ 
              borderColor: entry.consultation_reason.color || undefined,
              color: entry.consultation_reason.color || undefined 
            }}
          >
            {entry.consultation_reason.label}
          </Badge>
        ) : entry.reason ? (
          <span className="text-sm text-muted-foreground">{entry.reason}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Priority */}
      <TableCell>
        <Badge className={`${priorityConfig.color} border`}>
          {priorityConfig.label}
        </Badge>
      </TableCell>

      {/* Origin */}
      <TableCell className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex justify-center">
                <OriginIcon className={`h-5 w-5 ${originConfig.color}`} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{originConfig.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge className={`${statusColor} border`}>{statusLabel}</Badge>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <QueueActionButtons
          entry={entry}
          loading={loading}
          onCall={() => handleAction(() => callPatient(entry))}
          onStart={() => handleAction(() => startConsultation(entry))}
          onComplete={() => handleAction(() => completeConsultation(entry))}
          onCancel={() => handleAction(() => cancelVisit(entry))}
          onNoShow={() => handleAction(() => markNoShow(entry))}
          onRequeue={() => handleAction(() => requeue(entry))}
          compact
        />
      </TableCell>
    </TableRow>
  );
}
