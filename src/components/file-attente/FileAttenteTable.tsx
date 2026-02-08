"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Phone,
  Globe,
  Footprints,
  Building2,
  Heart,
  Stethoscope,
  UserCog,
  UserCheck,
  CircleDot,
  CircleCheck,
  CircleX,
  Activity,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FileAttenteActionButtons } from './FileAttenteActionButtons';
import { WaitingTimeCell } from './WaitingTimeCell';
import type { FileAttenteEntry } from '@/pages/FileAttentePage';

interface FileAttenteTableProps {
  entries: FileAttenteEntry[];
  onRowClick: (entry: FileAttenteEntry) => void;
  onCall: (entryId: string) => Promise<void>;
  onStart: (entryId: string) => Promise<void>;
  onSendToExam: (entryId: string) => Promise<void>;
  onReturnFromExam: (entryId: string) => Promise<void>;
  onComplete: (entryId: string) => Promise<void>;
  onNoShow: (entryId: string) => Promise<void>;
  onSetPriority: (entryId: string, priority: number) => Promise<void>;
  onOpenEncounter?: (patientId: string, queueEntryId: string) => void;
}

// Priority configuration
const PRIORITY_CONFIG = {
  1: { label: 'Critique', color: 'bg-red-500/15 text-red-700 border-red-300 dark:text-red-400' },
  2: { label: 'Urgent', color: 'bg-orange-500/15 text-orange-700 border-orange-300 dark:text-orange-400' },
  3: { label: 'Normal', color: 'bg-yellow-500/15 text-yellow-700 border-yellow-300 dark:text-yellow-400' },
  4: { label: 'Différé', color: 'bg-gray-500/15 text-gray-700 border-gray-300 dark:text-gray-400' },
} as const;

// Origin configuration
const ORIGIN_CONFIG = {
  phone: { icon: Phone, label: 'Téléphone 3CX', color: 'text-green-600' },
  web: { icon: Globe, label: 'Web', color: 'text-blue-600' },
  walkin: { icon: Footprints, label: 'Sans rendez-vous', color: 'text-orange-600' },
  hospital: { icon: Building2, label: 'Retour hôpital', color: 'text-purple-600' },
} as const;

// Vitals status configuration
const VITALS_CONFIG = {
  complete: { icon: CircleCheck, label: 'Constantes complètes', color: 'text-green-600' },
  partial: { icon: CircleDot, label: 'Constantes partielles', color: 'text-orange-600' },
  none: { icon: CircleX, label: 'Non faites', color: 'text-gray-400' },
} as const;

// Destinataire configuration
const DESTINATAIRE_CONFIG = {
  medecin_traitant: { icon: Stethoscope, label: 'Médecin traitant', color: 'text-blue-600' },
  autre_mg: { icon: UserCog, label: 'Autre MG', color: 'text-purple-600' },
  ipa: { icon: UserCheck, label: 'IPA', color: 'text-green-600' },
  infirmier: { icon: Activity, label: 'Infirmier', color: 'text-orange-600' },
} as const;

// Status configuration
const STATUS_CONFIG = {
  present: { label: 'Présent', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-300' },
  waiting: { label: 'En attente', color: 'bg-blue-500/15 text-blue-700 border-blue-300' },
  called: { label: 'Appelé', color: 'bg-purple-500/15 text-purple-700 border-purple-300' },
  in_consultation: { label: 'En consultation', color: 'bg-green-500/15 text-green-700 border-green-300' },
  awaiting_exam: { label: 'Attente examen', color: 'bg-orange-500/15 text-orange-700 border-orange-300' },
  completed: { label: 'Terminé', color: 'bg-gray-500/15 text-gray-700 border-gray-300' },
  closed: { label: 'Clôturé', color: 'bg-slate-500/15 text-slate-700 border-slate-300' },
  cancelled: { label: 'Annulé', color: 'bg-red-500/15 text-red-700 border-red-300' },
  no_show: { label: 'Absent', color: 'bg-orange-500/15 text-orange-700 border-orange-300' },
} as const;

type OriginType = keyof typeof ORIGIN_CONFIG;
type PriorityType = keyof typeof PRIORITY_CONFIG;
type VitalsType = keyof typeof VITALS_CONFIG;
type DestinataireType = keyof typeof DESTINATAIRE_CONFIG;
type StatusType = keyof typeof STATUS_CONFIG;

export function FileAttenteTable({ 
  entries, 
  onRowClick, 
  onCall, 
  onStart, 
  onSendToExam,
  onReturnFromExam,
  onComplete, 
  onNoShow,
  onSetPriority,
  onOpenEncounter,
}: FileAttenteTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (entryId: string, action: () => Promise<void>) => {
    setLoadingId(entryId);
    try {
      await action();
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[70px]">Arrivée</TableHead>
            <TableHead className="w-[100px]">Attente</TableHead>
            <TableHead className="w-[160px]">Patient</TableHead>
            <TableHead>Motif</TableHead>
            <TableHead className="w-[50px] text-center">Orig.</TableHead>
            <TableHead className="w-[85px]">Priorité</TableHead>
            <TableHead className="w-[55px] text-center">Const.</TableHead>
            <TableHead className="w-[45px] text-center">ECG</TableHead>
            <TableHead className="w-[55px] text-center">Dest.</TableHead>
            <TableHead className="w-[100px]">Statut</TableHead>
            <TableHead className="w-[130px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                Aucun patient dans la file d'attente
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <FileAttenteTableRow
                key={entry.id}
                entry={entry}
                loading={loadingId === entry.id}
                onClick={() => onRowClick(entry)}
                onCall={() => handleAction(entry.id, () => onCall(entry.id))}
                onStart={() => handleAction(entry.id, () => onStart(entry.id))}
                onSendToExam={() => handleAction(entry.id, () => onSendToExam(entry.id))}
                onReturnFromExam={() => handleAction(entry.id, () => onReturnFromExam(entry.id))}
                onComplete={() => handleAction(entry.id, () => onComplete(entry.id))}
                onNoShow={() => handleAction(entry.id, () => onNoShow(entry.id))}
                onSetPriority={(priority) => handleAction(entry.id, () => onSetPriority(entry.id, priority))}
                onOpenEncounter={onOpenEncounter ? () => onOpenEncounter(entry.patient_id, entry.id) : undefined}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

interface FileAttenteTableRowProps {
  entry: FileAttenteEntry;
  loading: boolean;
  onClick: () => void;
  onCall: () => void;
  onStart: () => void;
  onSendToExam: () => void;
  onReturnFromExam: () => void;
  onComplete: () => void;
  onNoShow: () => void;
  onSetPriority: (priority: number) => void;
  onOpenEncounter?: () => void;
}

function FileAttenteTableRow({ 
  entry, 
  loading,
  onClick, 
  onCall, 
  onStart,
  onSendToExam,
  onReturnFromExam,
  onComplete, 
  onNoShow,
  onSetPriority,
  onOpenEncounter,
}: FileAttenteTableRowProps) {
  const status = (entry.status || 'waiting') as StatusType;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.waiting;

  // Priority
  const priority = (entry.priority || 3) as PriorityType;
  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[3];

  // Origin
  const origin = (entry.origin || 'walkin') as OriginType;
  const originConfig = ORIGIN_CONFIG[origin] || ORIGIN_CONFIG.walkin;
  const OriginIcon = originConfig.icon;

  // Vitals
  const vitalsStatus = (entry.vitals_status || 'none') as VitalsType;
  const vitalsConfig = VITALS_CONFIG[vitalsStatus];
  const VitalsIcon = vitalsConfig.icon;

  // Destinataire
  const destinataire = (entry.destinataire || 'medecin_traitant') as DestinataireType;
  const destinataireConfig = DESTINATAIRE_CONFIG[destinataire];
  const DestinataireIcon = destinataireConfig.icon;

  // Highlight row based on status
  const rowBgClass = status === 'in_consultation' 
    ? 'bg-green-50/50 dark:bg-green-950/20' 
    : status === 'called'
    ? 'bg-purple-50/50 dark:bg-purple-950/20'
    : status === 'awaiting_exam'
    ? 'bg-orange-50/50 dark:bg-orange-950/20'
    : '';

  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 ${rowBgClass}`}
      onClick={onClick}
    >
      {/* Arrival Time */}
      <TableCell>
        <span className="font-medium">
          {entry.arrival_time
            ? format(new Date(entry.arrival_time), 'HH:mm', { locale: fr })
            : '--:--'}
        </span>
      </TableCell>

      {/* Waiting Time - Real-time with color coding */}
      <TableCell>
        {entry.arrival_time ? (
          <WaitingTimeCell arrivalTime={entry.arrival_time} status={status} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Patient */}
      <TableCell>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate max-w-[120px]">
              {entry.patient?.first_name} {entry.patient?.last_name}
            </span>
            {entry.is_new_patient ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Nouveau</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Connu</Badge>
            )}
          </div>
        </div>
      </TableCell>

      {/* Reason */}
      <TableCell>
        <span className="text-sm line-clamp-1">{entry.reason || '—'}</span>
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

      {/* Priority */}
      <TableCell>
        <Badge className={`${priorityConfig.color} border text-xs`}>
          {priorityConfig.label}
        </Badge>
      </TableCell>

      {/* Vitals Status */}
      <TableCell className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex justify-center">
                <VitalsIcon className={`h-5 w-5 ${vitalsConfig.color}`} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{vitalsConfig.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* ECG */}
      <TableCell className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex justify-center">
                <Heart
                  className={`h-5 w-5 ${
                    entry.needs_ecg ? 'text-red-500 fill-red-500/20' : 'text-gray-300'
                  }`}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{entry.needs_ecg ? 'ECG requis' : 'ECG non requis'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Destinataire */}
      <TableCell className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex justify-center">
                <DestinataireIcon className={`h-5 w-5 ${destinataireConfig.color}`} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{destinataireConfig.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge className={`${statusConfig.color} border text-xs`}>
          {statusConfig.label}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <FileAttenteActionButtons
          status={status}
          priority={priority}
          loading={loading}
          patientId={entry.patient_id}
          queueEntryId={entry.id}
          onCall={onCall}
          onStart={onStart}
          onSendToExam={onSendToExam}
          onReturnFromExam={onReturnFromExam}
          onComplete={onComplete}
          onNoShow={onNoShow}
          onSetPriority={onSetPriority}
          onOpenEncounter={onOpenEncounter}
        />
      </TableCell>
    </TableRow>
  );
}
