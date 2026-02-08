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
  Brain,
  Flag,
  Copy,
  ChevronRight,
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
import { Textarea } from '@/components/ui/textarea';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';

function getWaitingTime(arrivalTime: string): { minutes: number; formatted: string } {
  const arrival = new Date(arrivalTime);
  const now = new Date();
  const diffMs = now.getTime() - arrival.getTime();
  const minutes = Math.floor(diffMs / 60000);
  
  if (minutes < 60) {
    return { minutes, formatted: `${minutes} min` };
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return { 
    minutes, 
    formatted: `${hours}h ${remainingMinutes}min` 
  };
}
import { toast } from 'sonner';
import type { FileAttenteEntry } from '@/pages/FileAttentePage';

interface FileAttenteDrawerProps {
  entry: FileAttenteEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  icon: typeof Activity;
  checked: boolean;
  category: 'vitals' | 'other';
}

const PRIORITY_CONFIG = {
  1: { label: 'Critique', color: 'bg-red-500/15 text-red-700 border-red-300' },
  2: { label: 'Urgent', color: 'bg-orange-500/15 text-orange-700 border-orange-300' },
  3: { label: "Aujourd'hui", color: 'bg-yellow-500/15 text-yellow-700 border-yellow-300' },
  4: { label: 'Différé', color: 'bg-gray-500/15 text-gray-700 border-gray-300' },
} as const;

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: 'ta', label: 'TA (Tension artérielle)', icon: Activity, checked: false, category: 'vitals' },
  { id: 'fc', label: 'FC (Fréquence cardiaque)', icon: Heart, checked: false, category: 'vitals' },
  { id: 'fr', label: 'FR (Fréquence respiratoire)', icon: Wind, checked: false, category: 'vitals' },
  { id: 'spo2', label: 'SpO2 (Saturation)', icon: Droplets, checked: false, category: 'vitals' },
  { id: 'temp', label: 'T° (Température)', icon: Thermometer, checked: false, category: 'vitals' },
  { id: 'pain', label: 'Douleur (EVA)', icon: Zap, checked: false, category: 'vitals' },
  { id: 'ecg', label: 'ECG fait', icon: Heart, checked: false, category: 'other' },
  { id: 'docs', label: 'Documents reçus', icon: FileText, checked: false, category: 'other' },
  { id: 'consent', label: 'Consentement signé', icon: Signature, checked: false, category: 'other' },
];

export function FileAttenteDrawer({ entry, open, onOpenChange, onUpdate }: FileAttenteDrawerProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
  const [freeText, setFreeText] = useState('');

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleAction = (action: string) => {
    toast.success(`Action: ${action}`);
  };

  if (!entry) return null;

  const priority = (entry.priority || 3) as keyof typeof PRIORITY_CONFIG;
  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[3];
  const waitingTime = entry.arrival_time ? getWaitingTime(entry.arrival_time) : null;

  // Count completed checklist items
  const vitalsChecklist = checklist.filter((item) => item.category === 'vitals');
  const otherChecklist = checklist.filter((item) => item.category === 'other');
  const completedCount = checklist.filter((item) => item.checked).length;
  const totalCount = checklist.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <SheetHeader className="space-y-1">
              <div className="flex items-start justify-between">
                <SheetTitle className="text-xl">
                  {entry.patient?.first_name} {entry.patient?.last_name}
                </SheetTitle>
                <Badge className={`${priorityConfig.color} border`}>{priorityConfig.label}</Badge>
              </div>
              {entry.patient?.phone && (
                <p className="text-sm text-muted-foreground">{entry.patient.phone}</p>
              )}
              {entry.is_new_patient && (
                <Badge variant="secondary" className="w-fit">Nouveau patient</Badge>
              )}
            </SheetHeader>

            {/* Free Text Notes */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Notes libres
              </h3>
              <Textarea
                placeholder="Ajoutez vos observations..."
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* AI Summary */}
            {entry.ai_summary && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                  Résumé IA
                </h3>
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <p className="text-sm text-purple-700 dark:text-purple-300">{entry.ai_summary}</p>
                </div>
              </div>
            )}

            {/* Red Flags */}
            {entry.red_flags && entry.red_flags.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-red-600">
                  <Flag className="h-4 w-4" />
                  Drapeaux rouges
                </h3>
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <ul className="space-y-1">
                    {entry.red_flags.map((flag, idx) => (
                      <li key={idx} className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ATCD Majeurs */}
            {entry.atcd_majeurs && entry.atcd_majeurs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-amber-600" />
                  ATCD majeurs
                </h3>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="flex flex-wrap gap-2">
                    {entry.atcd_majeurs.map((atcd, idx) => (
                      <Badge key={idx} variant="outline" className="bg-amber-100 dark:bg-amber-900/30 border-amber-300">
                        {atcd}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Patient Summary */}
            <div className="space-y-3 bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Arrivée</span>
                <span className="font-medium">
                  {entry.arrival_time
                    ? format(new Date(entry.arrival_time), 'HH:mm', { locale: fr })
                    : '--:--'}
                  {waitingTime && (
                    <span className="text-muted-foreground ml-2">({waitingTime.formatted})</span>
                  )}
                </span>
              </div>

              <div className="flex items-start justify-between text-sm">
                <span className="text-muted-foreground">Motif</span>
                <span className="font-medium text-right max-w-[200px]">{entry.reason || 'Non précisé'}</span>
              </div>

              {entry.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground block mb-1">Notes initiales</span>
                  <p className="bg-background rounded p-2">{entry.notes}</p>
                </div>
              )}
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
                  {vitalsChecklist.map((item) => (
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
                  {otherChecklist.map((item) => (
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
                  onClick={() => handleAction('Appeler le patient')}
                >
                  <Phone className="h-5 w-5 text-blue-600" />
                  <span className="text-xs">Appeler</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => handleAction('Programmer RDV')}
                >
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <span className="text-xs">Programmer RDV</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => handleAction('Mettre en salle d\'attente')}
                >
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="text-xs">Salle d'attente</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => handleAction('Transmettre au médecin')}
                >
                  <UserCog className="h-5 w-5 text-green-600" />
                  <span className="text-xs">Transmettre</span>
                </Button>
              </div>

              {/* Copy summary for Omnidoc */}
              <CopyToClipboard
                text={formatSummaryForCopy(entry, freeText)}
                label="Copier résumé pour Omnidoc"
                className="w-full"
              />
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
        className={`h-4 w-4 ${item.checked ? 'text-green-600' : 'text-muted-foreground'}`}
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

function formatSummaryForCopy(entry: FileAttenteEntry, freeText: string): string {
  const lines = [
    `=== RÉSUMÉ PATIENT ===`,
    `Patient: ${entry.patient?.first_name} ${entry.patient?.last_name}`,
    `Arrivée: ${entry.arrival_time ? format(new Date(entry.arrival_time), 'dd/MM/yyyy HH:mm', { locale: fr }) : 'N/A'}`,
    `Motif: ${entry.reason || 'Non précisé'}`,
    '',
  ];

  if (entry.red_flags && entry.red_flags.length > 0) {
    lines.push(`⚠️ DRAPEAUX ROUGES:`);
    entry.red_flags.forEach((flag) => lines.push(`  - ${flag}`));
    lines.push('');
  }

  if (entry.atcd_majeurs && entry.atcd_majeurs.length > 0) {
    lines.push(`ATCD majeurs: ${entry.atcd_majeurs.join(', ')}`);
    lines.push('');
  }

  if (entry.ai_summary) {
    lines.push(`Résumé IA: ${entry.ai_summary}`);
    lines.push('');
  }

  if (entry.notes) {
    lines.push(`Notes initiales: ${entry.notes}`);
    lines.push('');
  }

  if (freeText) {
    lines.push(`Notes assistante: ${freeText}`);
  }

  return lines.join('\n');
}
