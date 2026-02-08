"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from "next/navigation";
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import { fetchUsersByRole, UserWithProfile } from '@/lib/delegations';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SettingsSidebar, SettingsMobileNav, SettingsSection } from '@/components/settings/SettingsSidebar';
import { StructureSettingsTab, StructureData, OpeningHours, DEFAULT_HOURS } from '@/components/settings/StructureSettingsTab';
import { PractitionerSettings } from '@/components/settings/PractitionerSettings';
import { NotificationSettings, NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '@/components/settings/NotificationsSettings';
import { SettingsExportImport } from '@/components/settings/SettingsExportImport';
import IntegrationsTab from '@/components/settings/IntegrationsTab';
import SecurityTab from '@/components/settings/SecurityTab';
import GDPRTab from '@/components/settings/GDPRTab';
import ConsultationReasonsList from '@/components/settings/ConsultationReasonsList';
import { ChatbotSettingsTab } from '@/components/settings/ChatbotSettingsTab';
import { TeamsSettingsTab } from '@/components/settings/TeamsSettingsTab';
import {
  User,
  Save,
  Mail,
  Phone,
  Briefcase,
  ShieldAlert,
  Loader2,
  MapPin,
  Hash,
  Bell,
  Palette,
  Settings2,
  CheckCircle,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Profile {
  first_name: string | null;
  last_name: string | null;
  specialty: string | null;
  phone: string | null;
}

interface LocalPreferences {
  rpps: string;
  address: string;
  city: string;
  postalCode: string;
  emailNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
}

const DEFAULT_PREFERENCES: LocalPreferences = {
  rpps: '',
  address: '',
  city: '',
  postalCode: '',
  emailNotifications: true,
  theme: 'system',
};

const DEFAULT_STRUCTURE: StructureData = {
  name: '',
  address: '',
  postalCode: '',
  city: '',
  phone: '',
  email: '',
  website: '',
  siret: '',
  description: '',
  logoUrl: null,
};

export default function Settings() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const { structureId } = useStructureId();
  const [searchParams, setSearchParams] = useSearchParams();

  // Profile state
  const [profile, setProfile] = useState<Profile>({
    first_name: '',
    last_name: '',
    specialty: '',
    phone: '',
  });
  const [preferences, setPreferences] = useState<LocalPreferences>(DEFAULT_PREFERENCES);
  const [initialProfile, setInitialProfile] = useState<Profile | null>(null);
  const [initialPreferences, setInitialPreferences] = useState<LocalPreferences | null>(null);

  // Structure state
  const [structure, setStructure] = useState<StructureData>(DEFAULT_STRUCTURE);
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>(DEFAULT_HOURS);
  const [initialStructure, setInitialStructure] = useState<StructureData | null>(null);
  const [initialOpeningHours, setInitialOpeningHours] = useState<OpeningHours[] | null>(null);

  // Practitioners state
  const [practitioners, setPractitioners] = useState<UserWithProfile[]>([]);
  const [practitionersLoading, setPractitionersLoading] = useState(true);

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [initialNotificationPrefs, setInitialNotificationPrefs] = useState<NotificationPreferences | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Get section from URL, default to 'profile'
  const currentSection = (searchParams.get('section') as SettingsSection) || 'profile';

  const handleSectionChange = (section: SettingsSection) => {
    if (section === 'profile') {
      searchParams.delete('section');
    } else {
      searchParams.set('section', section);
    }
    setSearchParams(searchParams);
  };

  // Check if form has changes
  const profileHasChanges = useMemo(() => {
    if (!initialProfile || !initialPreferences) return false;
    const profileChanged =
      profile.first_name !== initialProfile.first_name ||
      profile.last_name !== initialProfile.last_name ||
      profile.specialty !== initialProfile.specialty ||
      profile.phone !== initialProfile.phone;
    const preferencesChanged =
      preferences.rpps !== initialPreferences.rpps ||
      preferences.address !== initialPreferences.address ||
      preferences.city !== initialPreferences.city ||
      preferences.postalCode !== initialPreferences.postalCode ||
      preferences.emailNotifications !== initialPreferences.emailNotifications ||
      preferences.theme !== initialPreferences.theme;
    return profileChanged || preferencesChanged;
  }, [profile, preferences, initialProfile, initialPreferences]);

  const structureHasChanges = useMemo(() => {
    if (!initialStructure) return false;
    return JSON.stringify(structure) !== JSON.stringify(initialStructure) ||
           JSON.stringify(openingHours) !== JSON.stringify(initialOpeningHours);
  }, [structure, openingHours, initialStructure, initialOpeningHours]);

  const notificationsHasChanges = useMemo(() => {
    if (!initialNotificationPrefs) return false;
    return JSON.stringify(notificationPrefs) !== JSON.stringify(initialNotificationPrefs);
  }, [notificationPrefs, initialNotificationPrefs]);

  const hasAnyChanges = profileHasChanges || structureHasChanges || notificationsHasChanges;

  // Load data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, specialty, phone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        const profileData = {
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          specialty: data.specialty || '',
          phone: data.phone || '',
        };
        setProfile(profileData);
        setInitialProfile(profileData);
      }

      // Load local preferences
      const storedPrefs = localStorage.getItem(`omnisoin_preferences_${user.id}`);
      const loadedPrefs = storedPrefs ? JSON.parse(storedPrefs) : DEFAULT_PREFERENCES;
      setPreferences(loadedPrefs);
      setInitialPreferences(loadedPrefs);

      // Load notification preferences
      const storedNotifs = localStorage.getItem(`omnisoin_notifications_${user.id}`);
      const loadedNotifs = storedNotifs ? JSON.parse(storedNotifs) : DEFAULT_NOTIFICATION_PREFERENCES;
      setNotificationPrefs(loadedNotifs);
      setInitialNotificationPrefs(loadedNotifs);

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  // Load structure data
  useEffect(() => {
    const fetchStructure = async () => {
      if (!structureId) return;

      const { data, error } = await supabase
        .from('structures')
        .select('*')
        .eq('id', structureId)
        .maybeSingle();

      if (!error && data) {
        // Parse settings JSON for additional fields
        const settings = (data.settings || {}) as Record<string, any>;
        const structureData: StructureData = {
          name: data.name || '',
          address: data.address || '',
          postalCode: settings.postal_code || '',
          city: settings.city || '',
          phone: data.phone || '',
          email: data.email || '',
          website: settings.website || '',
          siret: settings.siret || '',
          description: settings.description || '',
          logoUrl: settings.logo_url || null,
        };
        setStructure(structureData);
        setInitialStructure(structureData);
      }

      // Load opening hours from localStorage for now
      const storedHours = localStorage.getItem(`omnisoin_hours_${structureId}`);
      const loadedHours = storedHours ? JSON.parse(storedHours) : DEFAULT_HOURS;
      setOpeningHours(loadedHours);
      setInitialOpeningHours(loadedHours);
    };

    fetchStructure();
  }, [structureId]);

  // Load practitioners
  useEffect(() => {
    const loadPractitioners = async () => {
      if (!structureId) return;
      setPractitionersLoading(true);
      try {
        const data = await fetchUsersByRole(structureId, 'practitioner');
        setPractitioners(data);
      } catch (error) {
        console.error('Error loading practitioners:', error);
      } finally {
        setPractitionersLoading(false);
      }
    };

    loadPractitioners();
  }, [structureId]);

  // Save handlers
  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: profile.first_name || null,
        last_name: profile.last_name || null,
        specialty: profile.specialty || null,
        phone: profile.phone || null,
      })
      .eq('user_id', user.id);

    // Save local preferences
    localStorage.setItem(`omnisoin_preferences_${user.id}`, JSON.stringify(preferences));

    setSaving(false);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      return;
    }

    setInitialProfile({ ...profile });
    setInitialPreferences({ ...preferences });
    setLastSaved(new Date());

    toast.success('Profil mis à jour avec succès');
  };

  const handleSaveStructure = async () => {
    if (!structureId) return;

    // Save opening hours to localStorage
    localStorage.setItem(`omnisoin_hours_${structureId}`, JSON.stringify(openingHours));

    // In a real app, also save structure data to DB
    setInitialStructure({ ...structure });
    setInitialOpeningHours([...openingHours]);
    setLastSaved(new Date());
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    localStorage.setItem(`omnisoin_notifications_${user.id}`, JSON.stringify(notificationPrefs));
    setInitialNotificationPrefs({ ...notificationPrefs });
    setLastSaved(new Date());
  };

  const handleUpdatePractitioner = async (userId: string, updates: any) => {
    // In a real app, save to DB
    setPractitioners(prev => 
      prev.map(p => p.user_id === userId ? { ...p, ...updates } : p)
    );
    toast.success('Praticien mis à jour');
  };

  // Export/Import handlers
  const handleExportSettings = useCallback(() => {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profile,
      preferences,
      notifications: notificationPrefs,
    };
  }, [profile, preferences, notificationPrefs]);

  const handleImportSettings = async (data: any) => {
    if (data.profile) {
      setProfile(data.profile);
    }
    if (data.preferences) {
      setPreferences(data.preferences);
    }
    if (data.notifications) {
      setNotificationPrefs(data.notifications);
    }
  };

  // Render section content
  const renderSectionContent = () => {
    switch (currentSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations du profil
                </CardTitle>
                <CardDescription>
                  Ces informations seront affichées sur votre tableau de bord
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-10 bg-muted rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Prénom</Label>
                        <Input
                          id="firstName"
                          value={profile.first_name || ''}
                          onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                          placeholder="Jean"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input
                          id="lastName"
                          value={profile.last_name || ''}
                          onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                          placeholder="Dupont"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        L'email ne peut pas être modifié
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="specialty" className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Spécialité
                        </Label>
                        <Input
                          id="specialty"
                          value={profile.specialty || ''}
                          onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                          placeholder="Médecine générale"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rpps" className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Numéro RPPS
                        </Label>
                        <Input
                          id="rpps"
                          value={preferences.rpps}
                          onChange={(e) => setPreferences({ ...preferences, rpps: e.target.value })}
                          placeholder="12345678901"
                          maxLength={11}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Téléphone
                      </Label>
                      <Input
                        id="phone"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+33 1 23 45 67 89"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Address Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Adresse du cabinet
                </CardTitle>
                <CardDescription>
                  Adresse de votre lieu d'exercice principal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!loading && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="address">Adresse</Label>
                      <Input
                        id="address"
                        value={preferences.address}
                        onChange={(e) => setPreferences({ ...preferences, address: e.target.value })}
                        placeholder="123 rue de la Santé"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Code postal</Label>
                        <Input
                          id="postalCode"
                          value={preferences.postalCode}
                          onChange={(e) => setPreferences({ ...preferences, postalCode: e.target.value })}
                          placeholder="75001"
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Ville</Label>
                        <Input
                          id="city"
                          value={preferences.city}
                          onChange={(e) => setPreferences({ ...preferences, city: e.target.value })}
                          placeholder="Paris"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Preferences Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Préférences
                </CardTitle>
                <CardDescription>
                  Personnalisez votre expérience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!loading && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <Label htmlFor="emailNotifications" className="cursor-pointer">
                            Notifications par email
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Recevoir les alertes et résumés par email
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="emailNotifications"
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) =>
                          setPreferences({ ...preferences, emailNotifications: checked })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Palette className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <Label htmlFor="theme">Thème de l'interface</Label>
                          <p className="text-xs text-muted-foreground">
                            Apparence de l'application
                          </p>
                        </div>
                      </div>
                      <Select
                        value={preferences.theme}
                        onValueChange={(value: 'light' | 'dark' | 'system') =>
                          setPreferences({ ...preferences, theme: value })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Clair</SelectItem>
                          <SelectItem value="dark">Sombre</SelectItem>
                          <SelectItem value="system">Système</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Export/Import Section */}
            <SettingsExportImport
              onExport={handleExportSettings}
              onImport={handleImportSettings}
              lastSaved={lastSaved}
              autoSaveEnabled={true}
              onAutoSaveToggle={() => {}}
            />

            {/* Save Button */}
            {profileHasChanges && (
              <div className="sticky bottom-4 pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full gap-2 shadow-lg"
                  size="lg"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications'}
                </Button>
              </div>
            )}
          </div>
        );

      case 'structure':
        return isAdmin ? (
          <StructureSettingsTab
            structure={structure}
            openingHours={openingHours}
            onStructureChange={setStructure}
            onOpeningHoursChange={setOpeningHours}
            onSave={handleSaveStructure}
            hasChanges={structureHasChanges}
            isAdmin={isAdmin}
          />
        ) : (
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                <ShieldAlert className="h-5 w-5" />
                Accès restreint
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-600 dark:text-amber-400">
                La gestion de la structure est réservée aux administrateurs.
              </p>
            </CardContent>
          </Card>
        );

      case 'practitioners':
        return (
          <PractitionerSettings
            practitioners={practitioners}
            loading={practitionersLoading}
            onUpdate={handleUpdatePractitioner}
            isAdmin={isAdmin}
          />
        );

      case 'teams':
        return <TeamsSettingsTab />;

      case 'motifs':
        return (
          <>
            {!isAdmin && (
              <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500 text-base">
                    <ShieldAlert className="h-5 w-5" />
                    Mode lecture seule
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    La gestion des motifs de consultation est réservée aux administrateurs et coordinateurs.
                  </p>
                </CardContent>
              </Card>
            )}
            <ConsultationReasonsList />
          </>
        );

      case 'notifications':
        return (
          <NotificationSettings
            preferences={notificationPrefs}
            onPreferencesChange={setNotificationPrefs}
            onSave={handleSaveNotifications}
            hasChanges={notificationsHasChanges}
          />
        );

      case 'integrations':
        return (
          <>
            {!isAdmin && (
              <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500 text-base">
                    <ShieldAlert className="h-5 w-5" />
                    Mode lecture seule
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    La configuration des intégrations est réservée aux administrateurs.
                  </p>
                </CardContent>
              </Card>
            )}
            <IntegrationsTab />
          </>
        );

      case 'security':
        return <SecurityTab />;

      case 'gdpr':
        return <GDPRTab />;

      case 'chatbot':
        return isAdmin ? (
          <ChatbotSettingsTab />
        ) : (
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                <ShieldAlert className="h-5 w-5" />
                Accès restreint
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-600 dark:text-amber-400">
                La configuration du chatbot patient est réservée aux administrateurs.
              </p>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Paramètres</h1>
            <p className="text-muted-foreground mt-1">
              Gérez votre profil et vos préférences
            </p>
          </div>
          {lastSaved && (
            <Badge variant="outline" className="gap-1.5 text-success border-success/30">
              <CheckCircle className="h-3.5 w-3.5" />
              Sauvegardé
            </Badge>
          )}
        </div>

        {/* Mobile Navigation */}
        <SettingsMobileNav
          currentSection={currentSection}
          onSectionChange={handleSectionChange}
          isAdmin={isAdmin}
        />

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <SettingsSidebar
            currentSection={currentSection}
            onSectionChange={handleSectionChange}
            isAdmin={isAdmin}
            hasUnsavedChanges={hasAnyChanges}
          />

          {/* Content Area */}
          <div className="flex-1 min-w-0 max-w-3xl">
            {roleLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              renderSectionContent()
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
