import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Calendar, Building2, AlertTriangle, FileText, ClipboardList, Plus, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  HospitalPassage,
  TacheVille,
  PASSAGE_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
} from '@/lib/hospitalPassages';

interface HospitalPassageDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passage: HospitalPassage | null;
  onUpdateTaches: (taches: TacheVille[]) => Promise<void>;
  onCreateAppointment?: () => void;
  onAssignIPA?: () => void;
}

export function HospitalPassageDrawer({
  open,
  onOpenChange,
  passage,
  onUpdateTaches,
  onCreateAppointment,
  onAssignIPA,
}: HospitalPassageDrawerProps) {
  const [taches, setTaches] = useState<TacheVille[]>([]);
  const [newTacheLabel, setNewTacheLabel] = useState('');

  useEffect(() => {
    if (passage) {
      setTaches(passage.taches_ville || []);
    }
  }, [passage]);

  if (!passage) return null;

  const handleToggleTache = async (tacheId: string) => {
    const updated = taches.map(t =>
      t.id === tacheId ? { ...t, completed: !t.completed } : t
    );
    setTaches(updated);
    await onUpdateTaches(updated);
  };

  const handleAddTache = async () => {
    if (!newTacheLabel.trim()) return;
    
    const newTache: TacheVille = {
      id: crypto.randomUUID(),
      label: newTacheLabel.trim(),
      completed: false,
    };
    const updated = [...taches, newTache];
    setTaches(updated);
    setNewTacheLabel('');
    await onUpdateTaches(updated);
  };

  const handleCreateAppointment = () => {
    if (onCreateAppointment) {
      onCreateAppointment();
    } else {
      toast.info('Fonctionnalité à venir');
    }
  };

  const handleAssignIPA = () => {
    if (onAssignIPA) {
      onAssignIPA();
    } else {
      toast.info('Fonctionnalité à venir');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Badge className={RISK_LEVEL_COLORS[passage.risk_level]}>
              {RISK_LEVEL_LABELS[passage.risk_level]}
            </Badge>
            <Badge variant="outline">
              {PASSAGE_TYPE_LABELS[passage.passage_type]}
            </Badge>
          </div>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {passage.etablissement}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(new Date(passage.passage_date), 'EEEE dd MMMM yyyy', { locale: fr })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Motif */}
          {passage.motif && (
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4" />
                Motif de recours
              </h4>
              <p className="text-sm text-muted-foreground">{passage.motif}</p>
            </div>
          )}

          <Separator />

          {/* AI Structured Summary */}
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4" />
              Résumé structuré
            </h4>
            <div className="space-y-3 text-sm">
              <SummaryField label="Diagnostics" value={passage.diagnostics} />
              <SummaryField label="Examens clés" value={passage.examens_cles} />
              <SummaryField label="Traitements" value={passage.traitements} />
              <SummaryField label="Suivi recommandé" value={passage.suivi_recommande} />
            </div>
          </div>

          <Separator />

          {/* Tasks to do in town */}
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
              <ClipboardList className="h-4 w-4" />
              À faire en ville
            </h4>
            
            <div className="space-y-2">
              {taches.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Aucune tâche définie
                </p>
              ) : (
                taches.map(tache => (
                  <div key={tache.id} className="flex items-center gap-3">
                    <Checkbox
                      id={tache.id}
                      checked={tache.completed}
                      onCheckedChange={() => handleToggleTache(tache.id)}
                    />
                    <label
                      htmlFor={tache.id}
                      className={`text-sm flex-1 cursor-pointer ${
                        tache.completed ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {tache.label}
                    </label>
                  </div>
                ))
              )}
              
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="Ajouter une tâche..."
                  value={newTacheLabel}
                  onChange={(e) => setNewTacheLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTache()}
                  className="text-sm"
                />
                <Button size="sm" variant="outline" onClick={handleAddTache}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          {passage.notes && (
            <>
              <div>
                <h4 className="text-sm font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">{passage.notes}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button className="flex-1 gap-2" onClick={handleCreateAppointment}>
              <Calendar className="h-4 w-4" />
              Créer un RDV
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={handleAssignIPA}>
              <UserPlus className="h-4 w-4" />
              Assigner à IPA
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SummaryField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="font-medium">{label}:</span>{' '}
      <span className="text-muted-foreground">
        {value || <span className="italic">Données à compléter (IA)</span>}
      </span>
    </div>
  );
}
