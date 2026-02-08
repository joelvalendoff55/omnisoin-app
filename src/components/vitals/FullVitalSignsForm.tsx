import { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Heart, 
  Scale, 
  Ruler, 
  Calculator, 
  Thermometer,
  Droplets,
  FileText,
  Stethoscope,
  Save,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useVitalSigns } from '@/hooks/useVitalSigns';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { calculateBMI, getTemperatureStatus, VitalSign } from '@/lib/vitalSigns';
import { cn } from '@/lib/utils';

interface FullVitalSignsFormProps {
  patientId: string;
  structureId: string;
  onClose?: () => void;
  editingVitalSign?: VitalSign | null;
}

export function FullVitalSignsForm({ 
  patientId, 
  structureId, 
  onClose,
  editingVitalSign 
}: FullVitalSignsFormProps) {
  const { user } = useAuth();
  const { isPractitioner, isAssistant, isAdmin, isCoordinator, hasRole } = useRole();
  const isNurse = hasRole('nurse');
  const isIPA = hasRole('ipa');
  
  const { addVitalSign, editVitalSign, saving, latestVitalSign } = useVitalSigns({
    patientId,
    structureId,
  });

  const canEdit = isAdmin || isPractitioner || isAssistant || isNurse || isIPA || isCoordinator;
  const canEditPractitionerNotes = isPractitioner || isAdmin || isIPA;

  // Form state
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [systolicBp, setSystolicBp] = useState('');
  const [diastolicBp, setDiastolicBp] = useState('');
  const [temperature, setTemperature] = useState('');
  const [spo2, setSpo2] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [assistantNotes, setAssistantNotes] = useState('');
  const [practitionerNotes, setPractitionerNotes] = useState('');

  // Pre-fill from editing or latest
  useEffect(() => {
    const source = editingVitalSign || latestVitalSign;
    if (source) {
      if (source.weight_kg) setWeightKg(source.weight_kg.toString());
      if (source.height_cm) setHeightCm(source.height_cm.toString());
      if (source.systolic_bp) setSystolicBp(source.systolic_bp.toString());
      if (source.diastolic_bp) setDiastolicBp(source.diastolic_bp.toString());
      if (source.temperature_celsius) setTemperature(source.temperature_celsius.toString());
      if ((source as any).spo2) setSpo2((source as any).spo2.toString());
      if (source.heart_rate) setHeartRate(source.heart_rate.toString());
      if (editingVitalSign) {
        if (source.assistant_notes) setAssistantNotes(source.assistant_notes);
        if (source.practitioner_notes) setPractitionerNotes(source.practitioner_notes);
      }
    }
  }, [editingVitalSign, latestVitalSign]);

  // Calculate BMI in real-time
  const currentBMI = useMemo(() => {
    return calculateBMI(
      weightKg ? parseFloat(weightKg) : null,
      heightCm ? parseInt(heightCm) : null
    );
  }, [weightKg, heightCm]);

  // Temperature status
  const tempStatus = useMemo(() => {
    return getTemperatureStatus(temperature ? parseFloat(temperature) : null);
  }, [temperature]);

  // Heart rate status
  const getHeartRateStatus = (hr: number | null) => {
    if (!hr) return null;
    if (hr < 60) return { label: 'Bradycardie', color: 'text-blue-600 bg-blue-50' };
    if (hr <= 100) return { label: 'Normal', color: 'text-green-600 bg-green-50' };
    return { label: 'Tachycardie', color: 'text-red-600 bg-red-50' };
  };

  const hrStatus = useMemo(() => {
    return getHeartRateStatus(heartRate ? parseInt(heartRate) : null);
  }, [heartRate]);

  // Blood pressure status
  const getBPStatus = (sys: number | null, dia: number | null) => {
    if (!sys || !dia) return null;
    if (sys < 90 || dia < 60) return { label: 'Hypotension', color: 'text-blue-600 bg-blue-50' };
    if (sys <= 120 && dia <= 80) return { label: 'Normal', color: 'text-green-600 bg-green-50' };
    if (sys <= 139 || dia <= 89) return { label: 'Préhypertension', color: 'text-orange-600 bg-orange-50' };
    return { label: 'Hypertension', color: 'text-red-600 bg-red-50' };
  };

  const bpStatus = useMemo(() => {
    return getBPStatus(
      systolicBp ? parseInt(systolicBp) : null,
      diastolicBp ? parseInt(diastolicBp) : null
    );
  }, [systolicBp, diastolicBp]);

  // SpO2 status
  const getSpO2Status = (value: number | null) => {
    if (!value) return null;
    if (value >= 95) return { label: 'Normal', color: 'text-green-600 bg-green-50' };
    if (value >= 90) return { label: 'Hypoxémie légère', color: 'text-orange-600 bg-orange-50' };
    return { label: 'Hypoxémie sévère', color: 'text-red-600 bg-red-50' };
  };

  const spo2Status = useMemo(() => {
    return getSpO2Status(spo2 ? parseInt(spo2) : null);
  }, [spo2]);

  const handleSubmit = async () => {
    if (!user || !canEdit) return;

    const formData = {
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      height_cm: heightCm ? parseInt(heightCm) : null,
      systolic_bp: systolicBp ? parseInt(systolicBp) : null,
      diastolic_bp: diastolicBp ? parseInt(diastolicBp) : null,
      temperature_celsius: temperature ? parseFloat(temperature) : null,
      spo2: spo2 ? parseInt(spo2) : null,
      heart_rate: heartRate ? parseInt(heartRate) : null,
      assistant_notes: assistantNotes || null,
      practitioner_notes: practitionerNotes || null,
    };

    if (editingVitalSign) {
      await editVitalSign(editingVitalSign.id, user.id, formData);
    } else {
      await addVitalSign(user.id, formData);
    }

    onClose?.();
  };

  const hasAnyValue = weightKg || heightCm || systolicBp || diastolicBp || 
    temperature || spo2 || heartRate;

  if (!canEdit) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Vous n'avez pas les droits pour saisir des constantes vitales.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-primary" />
            {editingVitalSign ? 'Modifier les constantes' : 'Saisie des constantes vitales'}
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Morphométrie - Poids, Taille, IMC */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Scale className="h-4 w-4 text-blue-500" />
            Morphométrie
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Poids (kg)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ex: 72.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                min={1}
                max={400}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Taille (cm)</Label>
              <Input
                type="number"
                placeholder="Ex: 175"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                min={30}
                max={250}
              />
            </div>
            <div className="col-span-2 flex items-end">
              {currentBMI && (
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className={cn('text-sm', currentBMI.color)}>
                    IMC: {currentBMI.value} - {currentBMI.label}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Tension Artérielle */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            Tension Artérielle (mmHg)
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Systolique</Label>
              <Input
                type="number"
                placeholder="Ex: 120"
                value={systolicBp}
                onChange={(e) => setSystolicBp(e.target.value)}
                min={50}
                max={300}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Diastolique</Label>
              <Input
                type="number"
                placeholder="Ex: 80"
                value={diastolicBp}
                onChange={(e) => setDiastolicBp(e.target.value)}
                min={30}
                max={200}
              />
            </div>
            <div className="col-span-2 flex items-end">
              {bpStatus && (
                <Badge variant="outline" className={cn('text-sm', bpStatus.color)}>
                  {systolicBp}/{diastolicBp} - {bpStatus.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Autres constantes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Autres constantes</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Température */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Thermometer className="h-3 w-3 text-orange-500" />
                Température (°C)
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ex: 37.2"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                min={30}
                max={45}
              />
              {tempStatus && (
                <Badge variant="outline" className={cn('text-xs mt-1', tempStatus.color)}>
                  {tempStatus.label}
                </Badge>
              )}
            </div>

            {/* Saturation O2 */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Droplets className="h-3 w-3 text-blue-500" />
                SpO₂ (%)
              </Label>
              <Input
                type="number"
                placeholder="Ex: 98"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                min={50}
                max={100}
              />
              {spo2Status && (
                <Badge variant="outline" className={cn('text-xs mt-1', spo2Status.color)}>
                  {spo2Status.label}
                </Badge>
              )}
            </div>

            {/* Fréquence Cardiaque */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Heart className="h-3 w-3 text-pink-500" />
                FC (bpm)
              </Label>
              <Input
                type="number"
                placeholder="Ex: 72"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                min={20}
                max={250}
              />
              {hrStatus && (
                <Badge variant="outline" className={cn('text-xs mt-1', hrStatus.color)}>
                  {hrStatus.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Notes */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes libres
            </Label>
            <Textarea
              placeholder="Observations, contexte de la prise de constantes..."
              value={assistantNotes}
              onChange={(e) => setAssistantNotes(e.target.value)}
              rows={3}
            />
          </div>

          {canEditPractitionerNotes && (
            <div className="space-y-1">
              <Label className="text-sm flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Notes médecin
              </Label>
              <Textarea
                placeholder="Interprétation clinique, commentaires médicaux..."
                value={practitionerNotes}
                onChange={(e) => setPractitionerNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
          )}
          <Button 
            onClick={handleSubmit} 
            disabled={saving || !hasAnyValue}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Enregistrement...' : editingVitalSign ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
