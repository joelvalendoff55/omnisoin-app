import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users, ArrowRight, Loader2, CheckCircle, Clock, UserPlus, Stethoscope } from 'lucide-react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { JOB_TITLE_OPTIONS, SPECIALTY_OPTIONS } from '@/lib/team';

interface StructureSetupStepProps {
  userId: string;
  firstName?: string;
  lastName?: string;
  onComplete: (structureId: string, role: string) => void;
  onSkip: () => void;
}

type SetupMode = 'create' | 'join';

// Available roles for joining a structure
const AVAILABLE_ROLES = [
  { value: 'assistant', label: 'Assistante médicale', description: 'Gestion administrative et accueil' },
  { value: 'doctor', label: 'Médecin', description: 'Consultations et prescriptions' },
  { value: 'ipa', label: 'IPA', description: 'Infirmier(e) en Pratique Avancée' },
  { value: 'coordinator', label: 'Coordinatrice', description: 'Coordination des soins' },
  { value: 'nurse', label: 'Infirmier(e)', description: 'Soins infirmiers' },
] as const;


interface Structure {
  id: string;
  name: string;
  slug: string;
}

export function StructureSetupStep({ userId, firstName = '', lastName = '', onComplete, onSkip }: StructureSetupStepProps) {
  const [mode, setMode] = useState<SetupMode>('create');
  const [structureName, setStructureName] = useState('');
  const [structureSlug, setStructureSlug] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('assistant');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ message: string; role: string; pending?: boolean } | null>(null);
  const [availableStructures, setAvailableStructures] = useState<Structure[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  
  // Display user name if available
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : '';
  
  // Clinical identity fields for structure creators
  const [jobTitle, setJobTitle] = useState('medecin');
  const [specialty, setSpecialty] = useState('generaliste');

  // Load available structures for joining
  useEffect(() => {
    if (mode === 'join') {
      loadStructures();
    }
  }, [mode]);

  const loadStructures = async () => {
    setLoadingStructures(true);
    try {
      const { data, error } = await supabase
        .from('structures')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setAvailableStructures(data || []);
    } catch (err) {
      console.error('Error loading structures:', err);
    } finally {
      setLoadingStructures(false);
    }
  };

  const handleCreateStructure = async () => {
    if (!structureName.trim()) {
      setError('Le nom de la structure est requis');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create structure using RPC function - includes team_members creation for clinical identity
      const { data: structureId, error: createError } = await supabase.rpc('create_structure_with_admin', {
        _user_id: userId,
        _structure_name: structureName.trim(),
        _structure_slug: null,
        _job_title: jobTitle,
        _specialty: jobTitle === 'medecin' ? specialty : null,
      });

      if (createError) throw createError;

      if (structureId) {
        setSuccess({ 
          message: 'Structure créée avec succès ! Vous êtes administrateur.', 
          role: 'admin' 
        });
        setTimeout(() => onComplete(structureId, 'admin'), 1500);
      }
    } catch (err: any) {
      console.error('Error creating structure:', err);
      setError(err.message || 'Erreur lors de la création de la structure');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinStructure = async () => {
    if (!structureSlug.trim()) {
      setError('Veuillez sélectionner une structure ou entrer un code');
      return;
    }

    if (!selectedRole) {
      setError('Veuillez sélectionner votre rôle');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // First, find the structure by slug
      const { data: structure, error: findError } = await supabase
        .from('structures')
        .select('id, name')
        .eq('slug', structureSlug.trim().toLowerCase())
        .eq('is_active', true)
        .single();

      if (findError || !structure) {
        setError('Structure non trouvée. Vérifiez le code d\'invitation.');
        setIsLoading(false);
        return;
      }

      // Create a pending membership request
      // The admin will need to validate this request (is_active = false, accepted_at = null)
      const { error: membershipError } = await supabase
        .from('org_members')
        .insert({
          user_id: userId,
          structure_id: structure.id,
          org_role: selectedRole as any,
          is_active: false, // Pending validation by admin
          accepted_at: null, // Will be set when admin approves
        });

      if (membershipError) {
        // Check if already a member
        if (membershipError.code === '23505') {
          setError('Vous êtes déjà membre de cette structure');
        } else {
          throw membershipError;
        }
        setIsLoading(false);
        return;
      }

      // Note: structure_id is managed via org_members, not profiles
      // The org_members entry above is the source of truth for structure membership

      setSuccess({ 
        message: `Demande envoyée à ${structure.name}. Un administrateur doit valider votre inscription.`, 
        role: selectedRole,
        pending: true 
      });
      
      // Redirect after showing message
      setTimeout(() => onComplete(structure.id, selectedRole), 2500);
    } catch (err: any) {
      console.error('Error joining structure:', err);
      setError(err.message || 'Erreur lors de la jonction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'create') {
      await handleCreateStructure();
    } else {
      await handleJoinStructure();
    }
  };

  if (success) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
          success.pending ? 'bg-amber-100' : 'bg-green-100'
        }`}>
          {success.pending ? (
            <Clock className="h-8 w-8 text-amber-600" />
          ) : (
            <CheckCircle className="h-8 w-8 text-green-600" />
          )}
        </div>
        <h3 className="text-xl font-semibold text-foreground">{success.message}</h3>
        <p className="text-muted-foreground">
          {success.pending ? 'Vous serez notifié une fois approuvé...' : 'Redirection en cours...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        {displayName && (
          <p className="text-sm text-primary font-medium">Bienvenue, {displayName} !</p>
        )}
        <h3 className="text-xl font-semibold text-foreground">Configuration de votre structure</h3>
        <p className="text-muted-foreground text-sm">
          Créez une nouvelle structure ou rejoignez-en une existante
        </p>
      </div>

      <RadioGroup value={mode} onValueChange={(v) => setMode(v as SetupMode)} className="grid grid-cols-2 gap-4">
        <div>
          <RadioGroupItem value="create" id="create" className="peer sr-only" />
          <Label
            htmlFor="create"
            className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
          >
            <Building2 className="mb-2 h-6 w-6" />
            <span className="text-sm font-medium">Créer</span>
            <span className="text-xs text-muted-foreground mt-1">Nouvelle structure</span>
          </Label>
        </div>
        <div>
          <RadioGroupItem value="join" id="join" className="peer sr-only" />
          <Label
            htmlFor="join"
            className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
          >
            <UserPlus className="mb-2 h-6 w-6" />
            <span className="text-sm font-medium">Rejoindre</span>
            <span className="text-xs text-muted-foreground mt-1">Structure existante</span>
          </Label>
        </div>
      </RadioGroup>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'create' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="structureName">Nom de la structure *</Label>
              <Input
                id="structureName"
                placeholder="Cabinet Médical Dupont"
                value={structureName}
                onChange={(e) => setStructureName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            {/* Clinical identity section */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Stethoscope className="h-4 w-4 text-primary" />
                <span>Votre profil professionnel</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Profession *</Label>
                <Select value={jobTitle} onValueChange={setJobTitle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez votre profession" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TITLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {jobTitle === 'medecin' && (
                <div className="space-y-2">
                  <Label htmlFor="specialty">Spécialité *</Label>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre spécialité" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              Vous serez automatiquement administrateur de cette structure
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="structureSlug">Code ou structure</Label>
              {loadingStructures ? (
                <div className="flex items-center justify-center h-10">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : availableStructures.length > 0 ? (
                <Select value={structureSlug} onValueChange={setStructureSlug}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une structure" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStructures.map((structure) => (
                      <SelectItem key={structure.id} value={structure.slug}>
                        {structure.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="structureSlug"
                  placeholder="cabinet-dupont"
                  value={structureSlug}
                  onChange={(e) => setStructureSlug(e.target.value.toLowerCase())}
                  disabled={isLoading}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Demandez le code à un administrateur de la structure
              </p>
            </div>

            <div className="space-y-2">
              <Label>Votre rôle *</Label>
              <div className="grid gap-2">
                {AVAILABLE_ROLES.map((role) => (
                  <div
                    key={role.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedRole === role.value
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                    onClick={() => setSelectedRole(role.value)}
                  >
                    <RadioGroupItem
                      value={role.value}
                      checked={selectedRole === role.value}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedRole === role.value ? 'border-primary bg-primary' : 'border-muted-foreground/50'
                    }`}>
                      {selectedRole === role.value && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{role.label}</p>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Validation requise
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Un administrateur de la structure devra valider votre inscription
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onSkip} disabled={isLoading} className="flex-1">
            Plus tard
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {mode === 'create' ? 'Créer' : 'Demander à rejoindre'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
