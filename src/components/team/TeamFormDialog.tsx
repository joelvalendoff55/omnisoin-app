import { useState } from 'react';
import { useTeams } from '@/hooks/useTeams';
import { Team, TEAM_COLORS, TeamFormData } from '@/lib/teams';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: Team | null;
  onSuccess?: () => void;
}

export default function TeamFormDialog({ open, onOpenChange, team, onSuccess }: TeamFormDialogProps) {
  const { create, update } = useTeams();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(team?.name || '');
  const [description, setDescription] = useState(team?.description || '');
  const [color, setColor] = useState(team?.color || TEAM_COLORS[0]);

  const isEditing = !!team;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    const formData: TeamFormData = {
      name: name.trim(),
      description: description.trim() || null,
      color,
    };

    let result;
    if (isEditing && team) {
      result = await update(team.id, formData);
    } else {
      result = await create(formData);
    }

    setSaving(false);

    if (result) {
      onOpenChange(false);
      setName('');
      setDescription('');
      setColor(TEAM_COLORS[0]);
      onSuccess?.();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName(team?.name || '');
      setDescription(team?.description || '');
      setColor(team?.color || TEAM_COLORS[0]);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Modifier l\'équipe' : 'Créer une équipe'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Modifiez les informations de l\'équipe'
                : 'Créez une nouvelle équipe pour organiser vos membres'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'équipe *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Médecins, Assistantes..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de l'équipe..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {TEAM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center transition-all ring-offset-2 ring-offset-background',
                      color === c && 'ring-2'
                    )}
                    style={{ 
                      backgroundColor: c,
                      ...(color === c ? { boxShadow: `0 0 0 2px ${c}` } : {}),
                    }}
                  >
                    {color === c && (
                      <Check className="h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
