import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Building2, MapPin, Phone, Mail, Globe, Clock, Upload, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface StructureData {
  name: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  siret: string;
  description: string;
  logoUrl: string | null;
}

interface OpeningHours {
  day: string;
  open: string;
  close: string;
  breakStart: string | null;
  breakEnd: string | null;
  isClosed: boolean;
}

interface StructureSettingsTabProps {
  structure: StructureData;
  openingHours: OpeningHours[];
  onStructureChange: (data: StructureData) => void;
  onOpeningHoursChange: (hours: OpeningHours[]) => void;
  onSave: () => Promise<void>;
  hasChanges: boolean;
  isAdmin: boolean;
}

const DAYS = [
  { id: 'monday', label: 'Lundi' },
  { id: 'tuesday', label: 'Mardi' },
  { id: 'wednesday', label: 'Mercredi' },
  { id: 'thursday', label: 'Jeudi' },
  { id: 'friday', label: 'Vendredi' },
  { id: 'saturday', label: 'Samedi' },
  { id: 'sunday', label: 'Dimanche' },
];

const DEFAULT_HOURS: OpeningHours[] = DAYS.map(d => ({
  day: d.id,
  open: '08:00',
  close: '19:00',
  breakStart: '12:00',
  breakEnd: '14:00',
  isClosed: d.id === 'sunday',
}));

export function StructureSettingsTab({
  structure,
  openingHours,
  onStructureChange,
  onOpeningHoursChange,
  onSave,
  hasChanges,
  isAdmin,
}: StructureSettingsTabProps) {
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const updateField = <K extends keyof StructureData>(field: K, value: StructureData[K]) => {
    onStructureChange({ ...structure, [field]: value });
  };

  const updateHours = (dayId: string, updates: Partial<OpeningHours>) => {
    const newHours = openingHours.map(h => 
      h.day === dayId ? { ...h, ...updates } : h
    );
    onOpeningHoursChange(newHours);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
      toast.success('Paramètres de structure sauvegardés');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Le fichier doit être une image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 2 Mo)');
      return;
    }

    setUploadingLogo(true);
    try {
      // In a real app, upload to Supabase Storage
      const reader = new FileReader();
      reader.onload = (e) => {
        updateField('logoUrl', e.target?.result as string);
      };
      reader.readAsDataURL(file);
      toast.success('Logo mis à jour');
    } catch {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informations de la structure
          </CardTitle>
          <CardDescription>
            Coordonnées et identité de votre établissement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30 overflow-hidden">
              {structure.logoUrl ? (
                <img 
                  src={structure.logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <Label>Logo de la structure</Label>
              <p className="text-xs text-muted-foreground mb-2">
                PNG, JPG ou SVG (max 2 Mo)
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
                disabled={!isAdmin}
              />
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={!isAdmin || uploadingLogo}
              >
                <label htmlFor="logo-upload" className="cursor-pointer">
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Changer le logo
                </label>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="structure-name">Nom de la structure</Label>
            <Input
              id="structure-name"
              value={structure.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Maison de Santé Pluriprofessionnelle"
              disabled={!isAdmin}
            />
          </div>

          {/* Address */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Adresse
            </Label>
            <Input
              value={structure.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="123 Avenue de la Santé"
              disabled={!isAdmin}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                value={structure.postalCode}
                onChange={(e) => updateField('postalCode', e.target.value)}
                placeholder="75001"
                maxLength={5}
                disabled={!isAdmin}
              />
              <Input
                value={structure.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Paris"
                disabled={!isAdmin}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Téléphone
              </Label>
              <Input
                value={structure.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+33 1 23 45 67 89"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                type="email"
                value={structure.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="contact@msp.fr"
                disabled={!isAdmin}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Site web
              </Label>
              <Input
                value={structure.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://www.msp.fr"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>SIRET</Label>
              <Input
                value={structure.siret}
                onChange={(e) => updateField('siret', e.target.value)}
                placeholder="123 456 789 00001"
                maxLength={17}
                disabled={!isAdmin}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={structure.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Présentation de votre structure..."
              rows={3}
              disabled={!isAdmin}
            />
          </div>
        </CardContent>
      </Card>

      {/* Opening Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horaires d'ouverture
          </CardTitle>
          <CardDescription>
            Définissez les horaires de votre établissement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DAYS.map((day) => {
              const hours = openingHours.find(h => h.day === day.id) || DEFAULT_HOURS.find(h => h.day === day.id)!;
              
              return (
                <div 
                  key={day.id}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20"
                >
                  <div className="w-24 font-medium">{day.label}</div>
                  
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!hours.isClosed}
                      onChange={(e) => updateHours(day.id, { isClosed: !e.target.checked })}
                      disabled={!isAdmin}
                      className="rounded"
                    />
                    Ouvert
                  </label>

                  {!hours.isClosed && (
                    <>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => updateHours(day.id, { open: e.target.value })}
                          className="w-28"
                          disabled={!isAdmin}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => updateHours(day.id, { close: e.target.value })}
                          className="w-28"
                          disabled={!isAdmin}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Pause:</span>
                        <Input
                          type="time"
                          value={hours.breakStart || ''}
                          onChange={(e) => updateHours(day.id, { breakStart: e.target.value || null })}
                          className="w-24"
                          disabled={!isAdmin}
                        />
                        <span>-</span>
                        <Input
                          type="time"
                          value={hours.breakEnd || ''}
                          onChange={(e) => updateHours(day.id, { breakEnd: e.target.value || null })}
                          className="w-24"
                          disabled={!isAdmin}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && isAdmin && (
        <div className="sticky bottom-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full shadow-lg gap-2"
            size="lg"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </Button>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_HOURS };
export type { StructureData, OpeningHours };
