"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Trash2, Save, X } from 'lucide-react';
import { SystemPromptWithVersion, PROMPT_CATEGORIES } from '@/lib/superAdmin';

const EXTENDED_CATEGORIES = [
  ...PROMPT_CATEGORIES,
  { value: 'assistant', label: 'Assistant' },
  { value: 'summary', label: 'Résumé' },
  { value: 'transcription', label: 'Transcription' },
];

// Remove duplicates based on value
const UNIQUE_CATEGORIES = EXTENDED_CATEGORIES.filter(
  (cat, index, self) => index === self.findIndex((c) => c.value === cat.value)
);

interface PromptEditDialogProps {
  prompt: SystemPromptWithVersion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: {
    name?: string;
    display_name?: string;
    description?: string;
    category?: string;
    is_active?: boolean;
  }, newContent?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isSaving?: boolean;
  isDeleting?: boolean;
}

export function PromptEditDialog({
  prompt,
  open,
  onOpenChange,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}: PromptEditDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    category: 'clinical_suggestions',
    is_active: true,
    content: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (prompt) {
      setFormData({
        name: prompt.name || '',
        display_name: prompt.display_name || '',
        description: prompt.description || '',
        category: prompt.category || 'clinical_suggestions',
        is_active: prompt.is_active ?? true,
        content: prompt.published_content || '',
      });
    }
  }, [prompt]);

  const handleSave = async () => {
    if (!prompt) return;
    
    await onSave(
      prompt.id,
      {
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description || undefined,
        category: formData.category,
        is_active: formData.is_active,
      },
      formData.content !== prompt.published_content ? formData.content : undefined
    );
  };

  const handleDelete = async () => {
    if (!prompt) return;
    await onDelete(prompt.id);
    setShowDeleteConfirm(false);
  };

  if (!prompt) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Modifier le prompt
              {prompt.published_version && (
                <Badge variant="secondary">v{prompt.published_version}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Modifiez les paramètres et le contenu du prompt système.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {/* Basic Info Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nom technique</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="assistant_system"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-display_name">Nom d'affichage</Label>
                  <Input
                    id="edit-display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="Assistant système"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-slug">Slug</Label>
                  <Input
                    id="edit-slug"
                    value={prompt.slug}
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Le slug ne peut pas être modifié.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Catégorie</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIQUE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du prompt..."
                  rows={2}
                />
              </div>

              {/* Content Section - after Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-content">Contenu du prompt</Label>
                <Textarea
                  id="edit-content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Entrez le contenu du prompt ici..."
                  className="font-mono text-sm"
                  style={{ minHeight: '200px' }}
                />
                {formData.content !== prompt.published_content && formData.content && (
                  <p className="text-xs text-amber-600">
                    ⚠️ Le contenu a été modifié. Une nouvelle version sera créée lors de la sauvegarde.
                  </p>
                )}
              </div>

              {/* Version field - readonly */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-version">Version</Label>
                  <Input
                    id="edit-version"
                    type="number"
                    value={prompt.published_version || 0}
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    S'incrémente automatiquement lors de la modification du contenu.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Active switch - after content and version */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-is_active" className="text-base">Actif</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer ou désactiver ce prompt système.
                  </p>
                </div>
                <Switch
                  id="edit-is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
          </ScrollArea>

          <Separator className="my-2" />

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving || isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving || isDeleting}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isDeleting}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Enregistrement...' : 'Sauvegarder'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le prompt "{prompt.display_name}" et toutes ses versions seront supprimés définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
