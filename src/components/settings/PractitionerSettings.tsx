import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Pencil, Clock, Palette, Stethoscope, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Practitioner {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  specialty?: string | null;
  color?: string;
  work_days?: string[];
  work_start?: string;
  work_end?: string;
  is_active?: boolean;
}

interface PractitionerSettingsProps {
  practitioners: Practitioner[];
  loading: boolean;
  onUpdate: (userId: string, updates: Partial<Practitioner>) => Promise<void>;
  isAdmin: boolean;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#6366F1', // Indigo
];

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Lun' },
  { id: 'tuesday', label: 'Mar' },
  { id: 'wednesday', label: 'Mer' },
  { id: 'thursday', label: 'Jeu' },
  { id: 'friday', label: 'Ven' },
  { id: 'saturday', label: 'Sam' },
];

const SPECIALTIES = [
  'Médecine générale',
  'Cardiologie',
  'Dermatologie',
  'Pédiatrie',
  'Gynécologie',
  'Orthopédie',
  'ORL',
  'Ophtalmologie',
  'Psychiatrie',
  'Radiologie',
  'IPA',
  'Infirmier(e)',
  'Autre',
];

export function PractitionerSettings({
  practitioners,
  loading,
  onUpdate,
  isAdmin,
}: PractitionerSettingsProps) {
  const [editingPractitioner, setEditingPractitioner] = useState<Practitioner | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    color: '#3B82F6',
    specialty: '',
    work_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    work_start: '08:00',
    work_end: '18:00',
    is_active: true,
  });

  const filteredPractitioners = useMemo(() => {
    if (!searchQuery) return practitioners;
    const query = searchQuery.toLowerCase();
    return practitioners.filter(p => 
      p.first_name?.toLowerCase().includes(query) ||
      p.last_name?.toLowerCase().includes(query) ||
      p.specialty?.toLowerCase().includes(query)
    );
  }, [practitioners, searchQuery]);

  const handleEdit = (practitioner: Practitioner) => {
    setEditingPractitioner(practitioner);
    setFormData({
      color: practitioner.color || '#3B82F6',
      specialty: practitioner.specialty || '',
      work_days: practitioner.work_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      work_start: practitioner.work_start || '08:00',
      work_end: practitioner.work_end || '18:00',
      is_active: practitioner.is_active !== false,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingPractitioner) return;
    setSaving(true);
    try {
      await onUpdate(editingPractitioner.user_id, {
        color: formData.color,
        specialty: formData.specialty || null,
        work_days: formData.work_days,
        work_start: formData.work_start,
        work_end: formData.work_end,
        is_active: formData.is_active,
      });
      setIsDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      work_days: prev.work_days.includes(day)
        ? prev.work_days.filter(d => d !== day)
        : [...prev.work_days, day],
    }));
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestion des praticiens
          </CardTitle>
          <CardDescription>
            Personnalisez les couleurs, spécialités et horaires de travail de chaque praticien
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un praticien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Practitioners list */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {filteredPractitioners.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun praticien trouvé
                </div>
              ) : (
                filteredPractitioners.map((practitioner) => (
                  <div
                    key={practitioner.user_id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border bg-card transition-colors",
                      practitioner.is_active === false && "opacity-60"
                    )}
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback
                        style={{ backgroundColor: practitioner.color || '#3B82F6' }}
                        className="text-white font-medium"
                      >
                        {getInitials(practitioner.first_name, practitioner.last_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">
                          {practitioner.first_name} {practitioner.last_name}
                        </h4>
                        {practitioner.is_active === false && (
                          <Badge variant="secondary" className="text-xs">Inactif</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {practitioner.specialty && (
                          <span className="flex items-center gap-1">
                            <Stethoscope className="h-3.5 w-3.5" />
                            {practitioner.specialty}
                          </span>
                        )}
                        {practitioner.work_start && practitioner.work_end && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {practitioner.work_start} - {practitioner.work_end}
                          </span>
                        )}
                      </div>
                      {practitioner.work_days && practitioner.work_days.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <Badge
                              key={day.id}
                              variant={practitioner.work_days?.includes(day.id) ? "default" : "outline"}
                              className="text-xs px-1.5"
                            >
                              {day.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      className="w-4 h-12 rounded flex-shrink-0"
                      style={{ backgroundColor: practitioner.color || '#3B82F6' }}
                    />

                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(practitioner)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le praticien</DialogTitle>
            <DialogDescription>
              {editingPractitioner?.first_name} {editingPractitioner?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Color picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Couleur d'agenda
              </Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      formData.color === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-8 h-8 p-0.5 cursor-pointer"
                />
              </div>
            </div>

            {/* Specialty */}
            <div className="space-y-2">
              <Label>Spécialité</Label>
              <Select
                value={formData.specialty}
                onValueChange={(v) => setFormData({ ...formData, specialty: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une spécialité" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Work hours */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horaires de travail
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Début</Label>
                  <Input
                    type="time"
                    value={formData.work_start}
                    onChange={(e) => setFormData({ ...formData, work_start: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Fin</Label>
                  <Input
                    type="time"
                    value={formData.work_end}
                    onChange={(e) => setFormData({ ...formData, work_end: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Work days */}
            <div className="space-y-2">
              <Label>Jours de travail</Label>
              <div className="flex gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.id}
                    type="button"
                    variant={formData.work_days.includes(day.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleWorkDay(day.id)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Active status */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label>Actif</Label>
                <p className="text-xs text-muted-foreground">
                  Afficher dans les plannings et l'agenda
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
