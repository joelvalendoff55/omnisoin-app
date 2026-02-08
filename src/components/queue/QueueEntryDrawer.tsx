"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Phone,
  Calendar,
  Clock,
  UserCog,
  AlertTriangle,
  Stethoscope,
  FileText,
  Signature,
  Activity,
  Heart,
  Wind,
  Droplets,
  Thermometer,
  Zap,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePatientJourney } from '@/hooks/usePatientJourney';
import { getWaitingTime } from '@/lib/queue';
import type { QueueEntry } from '@/lib/queue';

interface QueueEntryDrawerProps {
  entry: QueueEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  icon: typeof Activity;
  checked: boolean;
}

const PRIORITY_CONFIG = {
  1: { label: 'Critique', color: 'bg-red-500/15 text-red-700 border-red-300' },
  2: { label: 'Urgent', color: 'bg-orange-500/15 text-orange-700 border-orange-300' },
  3: { label: 'Normal', color: 'bg-blue-500/15 text-blue-700 border-blue-300' },
  4: { label: 'Différé', color: 'bg-gray-500/15 text-gray-700 border-gray-300' },
} as const;

export function QueueEntryDrawer({ entry, open, onOpenChange, onUpdate }: QueueEntryDrawerProps) {
  const { loading, callPatient } = usePatientJourney();
  
  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'ta', label: 'TA (Tension artérielle)', icon: Activity, checked: false },
    { id: 'fc', label: 'FC (Fréquence cardiaque)', icon: Heart, checked: false },
    { id: 'fr', label: 'FR (Fréquence respiratoire)', icon: Wind, checked: false },
    { id: 'spo2', label: 'SpO2 (Saturation)', icon: Droplets, checked: false },
    { id: 'temp', label: 'T° (Température)', icon: Thermometer, checked: false },
    { id: 'pain', label: 'Douleur (EVA)', icon: Zap, checked: false },
    { id: 'ecg', label: 'ECG fait', icon: Activity, checked: false },
    { id: 'docs', label: 'Documents reçus', icon: FileText, checked: false },
    { id: 'consent', label: 'Consentement signé', icon: Signature, checked: false },
  ]);

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleAction = async (action: () => Promise<void>) => {
    try {
      await action();
      onUpdate();
    } catch {
      // Error handled in hook
    }
  };

  if (!entry) return null;

  const priority = (entry.priority || 3) as keyof typeof PRIORITY_CONFIG;
  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[3];
  const waitingTime = entry.arrival_time ? getWaitingTime(entry.arrival_time) : null;

  // Count completed checklist items
  const completedCount = checklist.filter(item => item.checked).length;
  const totalCount = checklist.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <SheetHeader className="space-y-1">
              <div className="flex items-start justify-between">
                <SheetTitle className="text-xl">
                  {entry.patient?.first_name} {entry.patient?.last_name}
                </SheetTitle>
                <Badge className={`${priorityConfig.color} border`}>
                  {priorityConfig.label}
                </Badge>
              </div>
              {entry.patient?.phone && (
                <p className="text-sm text-muted-foreground">{entry.patient.phone}</p>
              )}
            </SheetHeader>

            {/* Patient Summary */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                Récapitulatif patient
              </h3>

              <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                {/* Arrival & Wait time */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Arrivée</span>
                  <span className="font-medium">
                    {entry.arrival_time
                      ? format(new Date(entry.arrival_time), 'HH:mm', { locale: fr })
                      : '--:--'}
                    {waitingTime && (
                      <span className="text-muted-foreground ml-2">
                        ({waitingTime.formatted})
                      </span>
                    )}
                  </span>
                </div>

                {/* Reason */}
                <div className="flex items-start justify-between text-sm">
                  <span className="text-muted-foreground">Motif</span>
                  <div className="text-right">
                    {entry.consultation_reason ? (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: entry.consultation_reason.color || undefined,
                          color: entry.consultation_reason.color || undefined,
                        }}
                      >
                        {entry.consultation_reason.label}
                      </Badge>
                    ) : entry.reason ? (
                      <span className="font-medium">{entry.reason}</span>
                    ) : (
                      <span className="text-muted-foreground">Non précisé</span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {entry.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground block mb-1">Notes</span>
                    <p className="bg-background rounded p-2 text-sm">{entry.notes}</p>
                  </div>
                )}
              </div>

              {/* Medical History Placeholder */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ATCD majeurs
                </h4>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-400 italic">
                    Les antécédents seront affichés ici une fois le dossier patient chargé.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Checklist Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Checklist assistante</h3>
                <Badge variant="outline" className="text-xs">
                  {completedCount}/{totalCount}
                </Badge>
              </div>

              {/* Vitals */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Constantes
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {checklist.slice(0, 6).map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggleChecklistItem(item.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Other checks */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Autres vérifications
                </h4>
                <div className="space-y-2">
                  {checklist.slice(6).map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggleChecklistItem(item.id)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Actions rapides</h3>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => handleAction(() => callPatient(entry))}
                  disabled={loading || entry.status !== 'waiting'}
                >
                  <Phone className="h-5 w-5 text-blue-600" />
                  <span className="text-xs">Appeler</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  disabled
                >
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <span className="text-xs">Programmer RDV</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  disabled
                >
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="text-xs">Salle d'attente</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  disabled
                >
                  <UserCog className="h-5 w-5 text-green-600" />
                  <span className="text-xs">Transmettre</span>
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface ChecklistItemRowProps {
  item: ChecklistItem;
  onToggle: () => void;
}

function ChecklistItemRow({ item, onToggle }: ChecklistItemRowProps) {
  const Icon = item.icon;

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
        item.checked
          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
          : 'bg-background border-border hover:bg-muted/50'
      }`}
      onClick={onToggle}
    >
      <Checkbox
        id={item.id}
        checked={item.checked}
        onCheckedChange={onToggle}
        className="pointer-events-none"
      />
      <Icon
        className={`h-4 w-4 ${
          item.checked ? 'text-green-600' : 'text-muted-foreground'
        }`}
      />
      <Label
        htmlFor={item.id}
        className={`text-sm cursor-pointer flex-1 ${
          item.checked ? 'text-green-700 dark:text-green-400' : ''
        }`}
      >
        {item.label}
      </Label>
    </div>
  );
}
