import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Stethoscope, 
  AlertTriangle, 
  Lock,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { 
  useSecurePatientCreation, 
  detectPII, 
  SecurePatientData,
  IdentityData,
  ClinicalData
} from '@/hooks/useSecurePatientCreation';

interface SecurePatientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (patientUUID: string) => void;
}

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Critique', color: 'bg-red-500' },
  { value: 2, label: 'Urgent', color: 'bg-orange-500' },
  { value: 3, label: "Aujourd'hui", color: 'bg-yellow-500' },
  { value: 4, label: 'Différé', color: 'bg-gray-400' },
];

export function SecurePatientForm({ open, onOpenChange, onSuccess }: SecurePatientFormProps) {
  const { createSecurePatient, isCreating } = useSecurePatientCreation();
  
  // Identity data (PII - Vault)
  const [identity, setIdentity] = useState<IdentityData>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    nir: '',
    date_of_birth: '',
  });
  
  // Clinical data (sanitized for n8n/AI)
  const [clinical, setClinical] = useState<ClinicalData>({
    symptoms: [],
    notes: '',
    priority: 3,
  });
  
  const [showNIR, setShowNIR] = useState(false);
  const [symptomsInput, setSymptomsInput] = useState('');

  // Detect PII in clinical notes
  const piiDetection = useMemo(() => {
    return detectPII(clinical.notes || '');
  }, [clinical.notes]);

  const handleIdentityChange = (field: keyof IdentityData, value: string) => {
    setIdentity(prev => ({ ...prev, [field]: value }));
  };

  const handleClinicalChange = (field: keyof ClinicalData, value: string | number | string[]) => {
    setClinical(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSymptom = () => {
    if (symptomsInput.trim()) {
      setClinical(prev => ({
        ...prev,
        symptoms: [...(prev.symptoms || []), symptomsInput.trim()],
      }));
      setSymptomsInput('');
    }
  };

  const handleRemoveSymptom = (index: number) => {
    setClinical(prev => ({
      ...prev,
      symptoms: (prev.symptoms || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identity.first_name || !identity.last_name) {
      return;
    }

    const data: SecurePatientData = {
      identity,
      clinical,
    };

    const result = await createSecurePatient(data);
    
    if (result.success) {
      onOpenChange(false);
      onSuccess?.(result.patientUUID);
      // Reset form
      setIdentity({ first_name: '', last_name: '', phone: '', email: '', nir: '', date_of_birth: '' });
      setClinical({ symptoms: [], notes: '', priority: 3 });
    }
  };

  const getPIITypeLabel = (type: string): string => {
    switch (type) {
      case 'nir': return 'N° Sécu';
      case 'email': return 'Email';
      case 'phone': return 'Téléphone';
      case 'name': return 'Nom';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Nouveau patient - Mode Privacy by Design
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Section 1: Identity Vault (Blue) */}
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Lock className="h-5 w-5" />
                Coffre-fort Identité
              </CardTitle>
              <CardDescription className="text-blue-600/80 dark:text-blue-400/80">
                Ces données ne sont JAMAIS transmises aux services externes (n8n, IA)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-blue-700 dark:text-blue-400">
                    Prénom *
                  </Label>
                  <Input
                    id="first_name"
                    value={identity.first_name}
                    onChange={(e) => handleIdentityChange('first_name', e.target.value)}
                    className="border-blue-200 focus:border-blue-400"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-blue-700 dark:text-blue-400">
                    Nom *
                  </Label>
                  <Input
                    id="last_name"
                    value={identity.last_name}
                    onChange={(e) => handleIdentityChange('last_name', e.target.value)}
                    className="border-blue-200 focus:border-blue-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-blue-700 dark:text-blue-400">
                    Téléphone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={identity.phone || ''}
                    onChange={(e) => handleIdentityChange('phone', e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-blue-700 dark:text-blue-400">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={identity.email || ''}
                    onChange={(e) => handleIdentityChange('email', e.target.value)}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nir" className="text-blue-700 dark:text-blue-400 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    N° Sécurité Sociale (NIR)
                  </Label>
                  <div className="relative">
                    <Input
                      id="nir"
                      type={showNIR ? 'text' : 'password'}
                      value={identity.nir || ''}
                      onChange={(e) => handleIdentityChange('nir', e.target.value)}
                      placeholder="1 XX XX XX XXX XXX XX"
                      className="border-blue-200 focus:border-blue-400 pr-10"
                      maxLength={15}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNIR(!showNIR)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700"
                    >
                      {showNIR ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob" className="text-blue-700 dark:text-blue-400">
                    Date de naissance
                  </Label>
                  <Input
                    id="dob"
                    type="date"
                    value={identity.date_of_birth || ''}
                    onChange={(e) => handleIdentityChange('date_of_birth', e.target.value)}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Clinical Data (Green) */}
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                <Stethoscope className="h-5 w-5" />
                Données Cliniques
              </CardTitle>
              <CardDescription className="text-green-600/80 dark:text-green-400/80">
                Ces données peuvent être transmises (anonymisées) pour analyse IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-green-700 dark:text-green-400">Priorité</Label>
                <Select
                  value={String(clinical.priority || 3)}
                  onValueChange={(value) => handleClinicalChange('priority', parseInt(value))}
                >
                  <SelectTrigger className="border-green-200 focus:border-green-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${opt.color}`} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Symptoms */}
              <div className="space-y-2">
                <Label className="text-green-700 dark:text-green-400">Symptômes</Label>
                <div className="flex gap-2">
                  <Input
                    value={symptomsInput}
                    onChange={(e) => setSymptomsInput(e.target.value)}
                    placeholder="Ajouter un symptôme..."
                    className="border-green-200 focus:border-green-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSymptom();
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAddSymptom}
                    className="border-green-300 text-green-700 hover:bg-green-100"
                  >
                    Ajouter
                  </Button>
                </div>
                {clinical.symptoms && clinical.symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {clinical.symptoms.map((symptom, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer"
                        onClick={() => handleRemoveSymptom(index)}
                      >
                        {symptom} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes with PII Detection */}
              <div className="space-y-2">
                <Label className="text-green-700 dark:text-green-400">
                  Notes cliniques
                </Label>
                <Textarea
                  value={clinical.notes || ''}
                  onChange={(e) => handleClinicalChange('notes', e.target.value)}
                  placeholder="Description des symptômes, contexte clinique..."
                  rows={4}
                  className="border-green-200 focus:border-green-400"
                />
                
                {/* PII Detection Alert */}
                {piiDetection.hasPII && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="ml-2">
                      <strong>⚠️ Données personnelles détectées !</strong>
                      <p className="text-sm mt-1">
                        Les éléments suivants seront automatiquement masqués avant transmission :
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {piiDetection.detections.map((detection, idx) => (
                          <Badge key={idx} variant="destructive" className="bg-red-100 text-red-800">
                            {getPIITypeLabel(detection.type)}: {detection.matches.length} trouvé(s)
                          </Badge>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {!piiDetection.hasPII && clinical.notes && clinical.notes.length > 10 && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Aucune donnée personnelle détectée
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Privacy Reminder */}
          <Alert className="bg-muted/50 border-muted-foreground/20">
            <Shield className="h-4 w-4 text-primary" />
            <AlertDescription className="ml-2 text-sm">
              <strong>Architecture Privacy by Design :</strong> Les données d'identité 
              (section bleue) restent dans le coffre-fort local. Seules les données cliniques 
              anonymisées sont transmises aux services d'IA.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isCreating || !identity.first_name || !identity.last_name}
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              {isCreating ? 'Création sécurisée...' : 'Créer patient (Privacy by Design)'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
