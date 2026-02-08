"use client";

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Activity, 
  Heart, 
  Scale, 
  Ruler, 
  Calculator, 
  Plus,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  FileText,
  Stethoscope,
  Thermometer,
  Droplets,
  Edit2,
  X,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useVitalSigns } from '@/hooks/useVitalSigns';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { calculateBMI, getTemperatureStatus, VitalSign } from '@/lib/vitalSigns';
import { InlineVitalSignsEntry, InlineVitalSignsData } from './InlineVitalSignsEntry';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

/**
 * Fallback component when VitalSignsSection fails to load
 */
function VitalSignsFallback() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Constantes vitales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <AlertTriangle className="h-4 w-4" />
          <span>Les constantes vitales seront bientôt disponibles</span>
        </div>
      </CardContent>
    </Card>
  );
}

export interface VitalSignsSectionProps {
  patientId: string;
  structureId: string;
  compact?: boolean;
}

export function VitalSignsSection({ patientId, structureId, compact = false }: VitalSignsSectionProps) {
  const { user } = useAuth();
  const { isPractitioner, isAssistant, isAdmin, isCoordinator, hasRole } = useRole();
  const isNurse = hasRole('nurse');
  const isIPA = hasRole('ipa');
  const { vitalSigns, latestVitalSign, loading, saving, addVitalSign, editVitalSign } = useVitalSigns({
    patientId,
    structureId,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showExtendedForm, setShowExtendedForm] = useState(false);

  // Inline vital signs data
  const [inlineData, setInlineData] = useState<InlineVitalSignsData>({
    temperature_celsius: null,
    systolic_bp: null,
    diastolic_bp: null,
    heart_rate: null,
    spo2: null,
  });

  // Extended form state (weight, height, notes)
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [assistantNotes, setAssistantNotes] = useState('');
  const [practitionerNotes, setPractitionerNotes] = useState('');

  // Pre-fill height from latest vital sign
  useEffect(() => {
    if (latestVitalSign?.height_cm && !heightCm) {
      setHeightCm(latestVitalSign.height_cm.toString());
    }
  }, [latestVitalSign, heightCm]);

  const canEdit = isAdmin || isPractitioner || isAssistant || isNurse || isIPA || isCoordinator;
  const canEditPractitionerNotes = isPractitioner || isAdmin || isIPA;

  // Calculate BMI in real-time
  const currentBMI = calculateBMI(
    weightKg ? parseFloat(weightKg) : null,
    heightCm ? parseInt(heightCm) : null
  );

  const resetForm = useCallback(() => {
    setInlineData({
      temperature_celsius: null,
      systolic_bp: null,
      diastolic_bp: null,
      heart_rate: null,
      spo2: null,
    });
    setWeightKg('');
    // Keep height as it rarely changes
    setAssistantNotes('');
    setPractitionerNotes('');
    setEditingId(null);
    setShowExtendedForm(false);
  }, []);

  const handleInlineChange = useCallback((data: InlineVitalSignsData) => {
    setInlineData(data);
  }, []);

  const handleSubmit = async () => {
    if (!user) return;

    const formData = {
      systolic_bp: inlineData.systolic_bp,
      diastolic_bp: inlineData.diastolic_bp,
      heart_rate: inlineData.heart_rate,
      temperature_celsius: inlineData.temperature_celsius,
      spo2: inlineData.spo2,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      height_cm: heightCm ? parseInt(heightCm) : null,
      assistant_notes: assistantNotes || null,
      practitioner_notes: practitionerNotes || null,
    };

    if (editingId) {
      await editVitalSign(editingId, user.id, formData);
    } else {
      await addVitalSign(user.id, formData);
    }

    resetForm();
    setIsFormOpen(false);
  };

  const handleEdit = (vitalSign: VitalSign) => {
    setInlineData({
      temperature_celsius: vitalSign.temperature_celsius,
      systolic_bp: vitalSign.systolic_bp,
      diastolic_bp: vitalSign.diastolic_bp,
      heart_rate: vitalSign.heart_rate,
      spo2: (vitalSign as any).spo2 ?? null,
    });
    setWeightKg(vitalSign.weight_kg?.toString() || '');
    setHeightCm(vitalSign.height_cm?.toString() || '');
    setAssistantNotes(vitalSign.assistant_notes || '');
    setPractitionerNotes(vitalSign.practitioner_notes || '');
    setEditingId(vitalSign.id);
    setIsFormOpen(true);
    setShowExtendedForm(true);
  };

  const hasInlineValues = inlineData.temperature_celsius || inlineData.systolic_bp || 
    inlineData.diastolic_bp || inlineData.heart_rate || inlineData.spo2;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Constantes vitales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Compact mode - always visible inline entry
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Constantes vitales
          </Label>
          {latestVitalSign && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(latestVitalSign.recorded_at), "dd/MM HH:mm", { locale: fr })}
            </span>
          )}
        </div>
        
        {canEdit ? (
          <InlineVitalSignsEntry
            initialData={latestVitalSign ? {
              temperature_celsius: latestVitalSign.temperature_celsius,
              systolic_bp: latestVitalSign.systolic_bp,
              diastolic_bp: latestVitalSign.diastolic_bp,
              heart_rate: latestVitalSign.heart_rate,
              spo2: (latestVitalSign as any).spo2,
            } : undefined}
            onChange={handleInlineChange}
            onSave={handleSubmit}
            compact
          />
        ) : (
          <InlineVitalSignsEntry
            initialData={latestVitalSign ? {
              temperature_celsius: latestVitalSign.temperature_celsius,
              systolic_bp: latestVitalSign.systolic_bp,
              diastolic_bp: latestVitalSign.diastolic_bp,
              heart_rate: latestVitalSign.heart_rate,
              spo2: (latestVitalSign as any).spo2,
            } : undefined}
            onChange={() => {}}
            readOnly
          />
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Constantes vitales
          </CardTitle>
          <div className="flex items-center gap-2">
            {latestVitalSign && !isFormOpen && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(latestVitalSign.recorded_at), "dd/MM HH:mm", { locale: fr })}
              </span>
            )}
            {canEdit && (
              <Button
                size="sm"
                variant={isFormOpen ? 'ghost' : 'outline'}
                onClick={() => {
                  if (isFormOpen) {
                    resetForm();
                  }
                  setIsFormOpen(!isFormOpen);
                }}
                className="h-7 px-2"
              >
                {isFormOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <><Plus className="h-3 w-3 mr-1" /> Saisir</>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Always visible inline entry when form is open */}
        {isFormOpen ? (
          <div className="space-y-3">
            <InlineVitalSignsEntry
              initialData={editingId && latestVitalSign ? {
                temperature_celsius: latestVitalSign.temperature_celsius,
                systolic_bp: latestVitalSign.systolic_bp,
                diastolic_bp: latestVitalSign.diastolic_bp,
                heart_rate: latestVitalSign.heart_rate,
                spo2: (latestVitalSign as any).spo2,
              } : inlineData}
              onChange={handleInlineChange}
            />

            {/* Toggle for extended form */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExtendedForm(!showExtendedForm)}
              className="text-xs text-muted-foreground"
            >
              {showExtendedForm ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {showExtendedForm ? 'Masquer' : 'Poids, taille et notes'}
            </Button>

            {/* Extended form */}
            {showExtendedForm && (
              <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Weight */}
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Scale className="h-3 w-3 text-blue-500" />
                      Poids
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="kg"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="h-8 text-sm"
                        min={1}
                        max={400}
                      />
                    </div>
                  </div>

                  {/* Height */}
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Ruler className="h-3 w-3 text-purple-500" />
                      Taille
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        placeholder="cm"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        className="h-8 text-sm"
                        min={30}
                        max={250}
                      />
                    </div>
                  </div>

                  {/* BMI Display */}
                  {currentBMI && (
                    <div className="col-span-2 flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className={cn('text-xs', currentBMI.color)}>
                        IMC: {currentBMI.value} - {currentBMI.label}
                      </Badge>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Notes */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Observations assistante
                    </Label>
                    <Textarea
                      placeholder="Notes de l'assistante..."
                      value={assistantNotes}
                      onChange={(e) => setAssistantNotes(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  {canEditPractitionerNotes && (
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Stethoscope className="h-3 w-3" />
                        Notes médecin
                      </Label>
                      <Textarea
                        placeholder="Notes médicales..."
                        value={practitionerNotes}
                        onChange={(e) => setPractitionerNotes(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetForm();
                  setIsFormOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button 
                size="sm" 
                onClick={handleSubmit} 
                disabled={saving || !hasInlineValues}
              >
                {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Latest vital signs display (read-only inline view) */}
            {latestVitalSign ? (
              <div className="space-y-2">
                <InlineVitalSignsEntry
                  initialData={{
                    temperature_celsius: latestVitalSign.temperature_celsius,
                    systolic_bp: latestVitalSign.systolic_bp,
                    diastolic_bp: latestVitalSign.diastolic_bp,
                    heart_rate: latestVitalSign.heart_rate,
                    spo2: (latestVitalSign as any).spo2,
                  }}
                  onChange={() => {}}
                  readOnly
                />

                {/* Additional info row */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground px-1">
                  {latestVitalSign.weight_kg && (
                    <div className="flex items-center gap-1">
                      <Scale className="h-3 w-3" />
                      <span>{latestVitalSign.weight_kg} kg</span>
                    </div>
                  )}
                  {latestVitalSign.height_cm && (
                    <div className="flex items-center gap-1">
                      <Ruler className="h-3 w-3" />
                      <span>{latestVitalSign.height_cm} cm</span>
                    </div>
                  )}
                  {latestVitalSign.bmi && (
                    <div className="flex items-center gap-1">
                      <Calculator className="h-3 w-3" />
                      <Badge variant="outline" className={cn('text-xs h-5', calculateBMI(latestVitalSign.weight_kg, latestVitalSign.height_cm)?.color)}>
                        IMC {latestVitalSign.bmi}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <User className="h-3 w-3" />
                    <span className="text-xs">
                      {latestVitalSign.recorder?.first_name} {latestVitalSign.recorder?.last_name}
                    </span>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(latestVitalSign)}
                      className="h-6 px-2 text-xs"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Modifier
                    </Button>
                  )}
                </div>

                {/* Notes preview */}
                {(latestVitalSign.assistant_notes || latestVitalSign.practitioner_notes) && (
                  <div className="space-y-1 pt-1 border-t text-sm">
                    {latestVitalSign.assistant_notes && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-3 w-3 text-muted-foreground mt-0.5" />
                        <span className="text-muted-foreground line-clamp-1">{latestVitalSign.assistant_notes}</span>
                      </div>
                    )}
                    {latestVitalSign.practitioner_notes && (
                      <div className="flex items-start gap-2">
                        <Stethoscope className="h-3 w-3 text-muted-foreground mt-0.5" />
                        <span className="text-muted-foreground line-clamp-1">{latestVitalSign.practitioner_notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <InlineVitalSignsEntry
                onChange={() => {}}
                readOnly
              />
            )}
          </>
        )}

        {/* History */}
        {vitalSigns.length > 1 && !isFormOpen && (
          <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs">
                <span>Historique ({vitalSigns.length - 1})</span>
                {isHistoryOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {vitalSigns.slice(1).map((vs) => (
                <div
                  key={vs.id}
                  className="p-2 bg-muted/30 rounded border text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(vs.recorded_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                    </div>
                    <span>{vs.recorder?.first_name} {vs.recorder?.last_name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {vs.systolic_bp && vs.diastolic_bp && (
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-red-500" />
                        {vs.systolic_bp}/{vs.diastolic_bp}
                      </span>
                    )}
                    {vs.heart_rate && (
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3 text-pink-500" />
                        {vs.heart_rate} bpm
                      </span>
                    )}
                    {vs.temperature_celsius && (
                      <span className={cn(
                        "flex items-center gap-1",
                        vs.temperature_celsius > 38 && 'text-red-600 font-medium',
                        vs.temperature_celsius > 37.5 && vs.temperature_celsius <= 38 && 'text-orange-600',
                        vs.temperature_celsius < 36 && 'text-blue-600'
                      )}>
                        <Thermometer className="h-3 w-3" />
                        {vs.temperature_celsius}°C
                      </span>
                    )}
                    {(vs as any).spo2 && (
                      <span className="flex items-center gap-1">
                        <Droplets className="h-3 w-3 text-sky-500" />
                        {(vs as any).spo2}%
                      </span>
                    )}
                    {vs.weight_kg && <span>• {vs.weight_kg} kg</span>}
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(vs)} className="h-5 text-xs px-1">
                      Modifier
                    </Button>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Wrapped VitalSignsSection with ErrorBoundary
 * Prevents vital signs errors from breaking the entire page
 */
export function VitalSignsSectionSafe(props: VitalSignsSectionProps) {
  return (
    <ErrorBoundary fallback={<VitalSignsFallback />}>
      <VitalSignsSection {...props} />
    </ErrorBoundary>
  );
}
