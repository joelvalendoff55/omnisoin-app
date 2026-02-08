import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStructureSettings } from '@/hooks/useStructureAdmin';
import { useStructureId } from '@/hooks/useStructureId';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Upload, Save, Globe, Phone, Mail, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface StructureInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export function StructureSettingsSection() {
  const { structureId } = useStructureId();
  const { settings, loading, saveSettings, uploadLogo } = useStructureSettings();
  const [structureInfo, setStructureInfo] = useState<StructureInfo>({
    name: '',
    address: '',
    phone: '',
    email: '',
  });
  const [localSettings, setLocalSettings] = useState({
    description: '',
    website: '',
    siret: '',
    specialty: '',
    capacity: 50,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch structure info
  useEffect(() => {
    async function fetchStructureInfo() {
      if (!structureId) return;
      const { data, error } = await supabase
        .from('structures')
        .select('name, address, phone, email')
        .eq('id', structureId)
        .single();

      if (data) {
        setStructureInfo({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
        });
      }
    }
    fetchStructureInfo();
  }, [structureId]);

  // Update local settings when settings load
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        description: settings.description || '',
        website: settings.website || '',
        siret: settings.siret || '',
        specialty: settings.specialty || '',
        capacity: settings.capacity || 50,
      });
    }
  }, [settings]);

  const handleSaveStructureInfo = async () => {
    if (!structureId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('structures')
        .update({
          name: structureInfo.name,
          address: structureInfo.address,
          phone: structureInfo.phone,
          email: structureInfo.email,
        })
        .eq('id', structureId);

      if (error) throw error;
      toast.success('Informations enregistrées');
    } catch (error) {
      console.error('Error saving structure info:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await saveSettings(localSettings);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo');
      return;
    }

    setUploading(true);
    try {
      await uploadLogo(file);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Logo de la structure
          </CardTitle>
          <CardDescription>Téléchargez le logo de votre structure (max 2 Mo)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={settings?.logo_url || ''} alt="Logo" />
              <AvatarFallback className="bg-primary/10 text-2xl">
                {structureInfo.name?.charAt(0) || 'S'}
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Téléchargement...' : 'Changer le logo'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations générales</CardTitle>
          <CardDescription>Coordonnées de la structure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la structure</Label>
              <Input
                id="name"
                value={structureInfo.name}
                onChange={(e) => setStructureInfo({ ...structureInfo, name: e.target.value })}
                placeholder="Maison de Santé Pluriprofessionnelle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-10"
                  value={structureInfo.email}
                  onChange={(e) => setStructureInfo({ ...structureInfo, email: e.target.value })}
                  placeholder="contact@msp.fr"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  className="pl-10"
                  value={structureInfo.phone}
                  onChange={(e) => setStructureInfo({ ...structureInfo, phone: e.target.value })}
                  placeholder="01 23 45 67 89"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={structureInfo.address}
                onChange={(e) => setStructureInfo({ ...structureInfo, address: e.target.value })}
                placeholder="123 rue de la Santé, 75001 Paris"
              />
            </div>
          </div>
          <Button onClick={handleSaveStructureInfo} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      {/* Extended Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paramètres avancés</CardTitle>
          <CardDescription>Informations complémentaires</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Site web</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="website"
                  className="pl-10"
                  value={localSettings.website}
                  onChange={(e) => setLocalSettings({ ...localSettings, website: e.target.value })}
                  placeholder="https://www.msp.fr"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="siret"
                  className="pl-10"
                  value={localSettings.siret}
                  onChange={(e) => setLocalSettings({ ...localSettings, siret: e.target.value })}
                  placeholder="123 456 789 00012"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Spécialité principale</Label>
              <Input
                id="specialty"
                value={localSettings.specialty}
                onChange={(e) => setLocalSettings({ ...localSettings, specialty: e.target.value })}
                placeholder="Médecine générale"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacité d'accueil (patients/jour)</Label>
              <Input
                id="capacity"
                type="number"
                value={localSettings.capacity}
                onChange={(e) => setLocalSettings({ ...localSettings, capacity: parseInt(e.target.value) || 50 })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={localSettings.description}
              onChange={(e) => setLocalSettings({ ...localSettings, description: e.target.value })}
              placeholder="Décrivez votre structure..."
              rows={3}
            />
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
