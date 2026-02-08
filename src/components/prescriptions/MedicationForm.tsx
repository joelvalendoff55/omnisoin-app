import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  X,
  Pill,
  Save,
  FileText,
  Loader2,
  AlertTriangle,
  BookMarked,
  Trash2,
} from 'lucide-react';
import { Medication, PrescriptionTemplate } from '@/lib/prescriptions';
import { usePrescriptionTemplates } from '@/hooks/usePrescriptions';
import { toast } from 'sonner';

interface MedicationFormProps {
  medications: Medication[];
  onMedicationsChange: (medications: Medication[]) => void;
  isAld: boolean;
  onIsAldChange: (isAld: boolean) => void;
  isRenewable: boolean;
  onIsRenewableChange: (isRenewable: boolean) => void;
  renewalCount: number;
  onRenewalCountChange: (count: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function MedicationForm({
  medications,
  onMedicationsChange,
  isAld,
  onIsAldChange,
  isRenewable,
  onIsRenewableChange,
  renewalCount,
  onRenewalCountChange,
  notes,
  onNotesChange,
}: MedicationFormProps) {
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('');
  const { templates, createTemplate, deleteTemplate, isCreating } = usePrescriptionTemplates();

  const [currentMed, setCurrentMed] = useState<Medication>({
    name: '',
    dosage: '',
    duration: '',
    instructions: '',
    isNonSubstitutable: false,
  });

  const addMedication = () => {
    if (!currentMed.name.trim()) {
      toast.error('Le nom du médicament est requis');
      return;
    }
    onMedicationsChange([...medications, currentMed]);
    setCurrentMed({
      name: '',
      dosage: '',
      duration: '',
      instructions: '',
      isNonSubstitutable: false,
    });
  };

  const removeMedication = (index: number) => {
    onMedicationsChange(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (index: number, field: keyof Medication, value: string | boolean) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    onMedicationsChange(updated);
  };

  const applyTemplate = (template: PrescriptionTemplate) => {
    onMedicationsChange([...medications, ...template.medications]);
    if (template.notes) {
      onNotesChange(notes ? `${notes}\n${template.notes}` : template.notes);
    }
    toast.success(`Template "${template.name}" appliqué`);
  };

  const saveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error('Le nom du template est requis');
      return;
    }
    if (medications.length === 0) {
      toast.error('Ajoutez au moins un médicament');
      return;
    }
    createTemplate({
      name: newTemplateName,
      category: newTemplateCategory || undefined,
      medications,
      notes: notes || undefined,
    });
    setShowTemplateDialog(false);
    setNewTemplateName('');
    setNewTemplateCategory('');
  };

  return (
    <div className="space-y-6">
      {/* Special fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <Switch checked={isAld} onCheckedChange={onIsAldChange} id="ald" />
          <div>
            <Label htmlFor="ald" className="cursor-pointer font-medium">ALD</Label>
            <p className="text-xs text-muted-foreground">Affection longue durée</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <Switch checked={isRenewable} onCheckedChange={onIsRenewableChange} id="renewable" />
          <div>
            <Label htmlFor="renewable" className="cursor-pointer font-medium">Renouvellement</Label>
            <p className="text-xs text-muted-foreground">Autoriser le renouvellement</p>
          </div>
        </div>

        {isRenewable && (
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <Label htmlFor="renewalCount" className="whitespace-nowrap">Nombre:</Label>
            <Input
              id="renewalCount"
              type="number"
              min={1}
              max={12}
              value={renewalCount}
              onChange={(e) => onRenewalCountChange(parseInt(e.target.value) || 1)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">fois</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="add" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add">Ajouter médicament</TabsTrigger>
          <TabsTrigger value="templates">
            <BookMarked className="h-4 w-4 mr-1" />
            Templates ({templates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="space-y-4">
          {/* Medication input form */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="medName">Nom du médicament *</Label>
                  <Input
                    id="medName"
                    placeholder="Ex: Amoxicilline 500mg"
                    value={currentMed.name}
                    onChange={(e) => setCurrentMed({ ...currentMed, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medDosage">Posologie</Label>
                  <Input
                    id="medDosage"
                    placeholder="Ex: 1 comprimé 3x/jour"
                    value={currentMed.dosage}
                    onChange={(e) => setCurrentMed({ ...currentMed, dosage: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="medDuration">Durée</Label>
                  <Input
                    id="medDuration"
                    placeholder="Ex: 7 jours"
                    value={currentMed.duration}
                    onChange={(e) => setCurrentMed({ ...currentMed, duration: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    checked={currentMed.isNonSubstitutable}
                    onCheckedChange={(checked) => setCurrentMed({ ...currentMed, isNonSubstitutable: checked })}
                    id="nonSub"
                  />
                  <Label htmlFor="nonSub" className="cursor-pointer">
                    <span className="font-medium">Non substituable</span>
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medInstructions">Instructions</Label>
                <Textarea
                  id="medInstructions"
                  placeholder="Ex: Prendre au milieu des repas..."
                  value={currentMed.instructions}
                  onChange={(e) => setCurrentMed({ ...currentMed, instructions: e.target.value })}
                  rows={2}
                />
              </div>

              <Button onClick={addMedication} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter à l'ordonnance
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowTemplateDialog(true)}>
              <Save className="h-4 w-4 mr-1" />
              Sauvegarder comme template
            </Button>
          </div>

          <ScrollArea className="h-[200px]">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookMarked className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun template sauvegardé</p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex-1" onClick={() => applyTemplate(template)}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{template.name}</span>
                          {template.category && (
                            <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.medications.length} médicament(s)
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplate(template.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Current medications list */}
      {medications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <h4 className="font-medium">Médicaments prescrits ({medications.length})</h4>
          </div>
          <div className="space-y-2">
            {medications.map((med, index) => (
              <Card key={index} className="bg-muted/30">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-primary" />
                        <span className="font-medium">{med.name}</span>
                        {med.isNonSubstitutable && (
                          <Badge variant="destructive" className="text-xs">NS</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground pl-6 space-y-0.5">
                        {med.dosage && <p>Posologie: {med.dosage}</p>}
                        {med.duration && <p>Durée: {med.duration}</p>}
                        {med.instructions && <p className="italic">{med.instructions}</p>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMedication(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optionnel)</Label>
        <Textarea
          id="notes"
          placeholder="Remarques complémentaires..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
        />
      </div>

      {/* Save template dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder comme template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Nom du template *</Label>
              <Input
                id="templateName"
                placeholder="Ex: Angine streptococcique"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateCategory">Catégorie (optionnel)</Label>
              <Input
                id="templateCategory"
                placeholder="Ex: ORL, Cardiologie..."
                value={newTemplateCategory}
                onChange={(e) => setNewTemplateCategory(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={saveAsTemplate} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
