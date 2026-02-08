import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateEncounter } from '@/hooks/useEncounter';
import { EpisodeModeToggle } from './EpisodeModeToggle';
import type { EncounterMode } from '@/types/encounter';

interface OpenEncounterButtonProps {
  patientId: string;
  queueEntryId?: string;
  appointmentId?: string;
  assignedPractitionerId?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
  showModeSelector?: boolean;
  defaultMode?: EncounterMode;
  label?: string;
}

export function OpenEncounterButton({
  patientId,
  queueEntryId,
  appointmentId,
  assignedPractitionerId,
  variant = 'default',
  size = 'default',
  className,
  showModeSelector = true,
  defaultMode = 'solo',
  label = 'Ouvrir l\'épisode',
}: OpenEncounterButtonProps) {
  const navigate = useNavigate();
  const { createEncounter, createFromQueue } = useCreateEncounter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<EncounterMode>(defaultMode);
  const [isCreating, setIsCreating] = useState(false);

  const handleClick = () => {
    if (showModeSelector) {
      setIsDialogOpen(true);
    } else {
      handleCreateEncounter();
    }
  };

  const handleCreateEncounter = async () => {
    setIsCreating(true);
    try {
      let encounterId: string | null = null;

      if (queueEntryId) {
        encounterId = await createFromQueue(queueEntryId, selectedMode);
      } else {
        encounterId = await createEncounter(patientId, {
          mode: selectedMode,
          appointmentId,
          assignedPractitionerId,
        });
      }

      if (encounterId) {
        navigate(`/encounter/${encounterId}`);
      }
    } finally {
      setIsCreating(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isCreating}
        className={className}
      >
        {isCreating ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Play className="h-4 w-4 mr-2" />
        )}
        {label}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Démarrer un épisode</DialogTitle>
            <DialogDescription>
              Choisissez le mode de consultation pour cet épisode.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <EpisodeModeToggle
              mode={selectedMode}
              onModeChange={setSelectedMode}
              className="w-full justify-center"
            />
            
            <div className="mt-4 p-3 bg-muted rounded-lg">
              {selectedMode === 'solo' ? (
                <div className="space-y-1">
                  <p className="font-medium text-sm">Mode Solo</p>
                  <p className="text-xs text-muted-foreground">
                    Le médecin gère l'ensemble de la consultation : accueil, 
                    constantes, examen clinique et conclusion.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-medium text-sm">Mode Assisté</p>
                  <p className="text-xs text-muted-foreground">
                    L'assistante prépare le patient (motif, constantes, 
                    antécédents), puis le médecin prend le relais pour 
                    l'examen et la conclusion.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateEncounter} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Démarrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
