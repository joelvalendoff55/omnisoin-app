"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MapPin, Save, Loader2, Edit2, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Origin types
export const ORIGIN_TYPES = {
  spontane: { label: 'Venu de lui-même / démarche spontanée', needsReferrer: false },
  medecin_liberal: { label: 'Adressé par un médecin libéral', needsReferrer: true, referrerLabel: 'Nom du médecin adresseur' },
  samu: { label: 'Adressé par SAMU/15', needsReferrer: false },
  hopital: { label: 'Adressé par un hôpital', needsReferrer: true, referrerLabel: 'Nom de l\'établissement' },
  autre_pro: { label: 'Adressé par un autre professionnel de santé', needsReferrer: true, referrerLabel: 'Professionnel (kiné, infirmier, pharmacien...)' },
  autre: { label: 'Autre', needsReferrer: true, referrerLabel: 'Précisez' },
} as const;

export type OriginType = keyof typeof ORIGIN_TYPES;

interface PatientOriginSectionProps {
  patientId: string;
  originType?: string | null;
  originReferrerName?: string | null;
  originNotes?: string | null;
  onUpdate?: () => void;
}

export function PatientOriginSection({
  patientId,
  originType: initialOriginType,
  originReferrerName: initialReferrerName,
  originNotes: initialNotes,
  onUpdate,
}: PatientOriginSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [originType, setOriginType] = useState<string>(initialOriginType || '');
  const [referrerName, setReferrerName] = useState(initialReferrerName || '');
  const [notes, setNotes] = useState(initialNotes || '');

  // Sync with props when they change
  useEffect(() => {
    setOriginType(initialOriginType || '');
    setReferrerName(initialReferrerName || '');
    setNotes(initialNotes || '');
  }, [initialOriginType, initialReferrerName, initialNotes]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update({
          origin_type: originType || null,
          origin_referrer_name: referrerName || null,
          origin_notes: notes || null,
        })
        .eq('id', patientId);

      if (error) throw error;

      toast.success('Origine du patient mise à jour');
      setEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating patient origin:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setOriginType(initialOriginType || '');
    setReferrerName(initialReferrerName || '');
    setNotes(initialNotes || '');
    setEditing(false);
  };

  const currentOrigin = originType && ORIGIN_TYPES[originType as OriginType];
  const needsReferrer = currentOrigin?.needsReferrer;

  // Display mode
  if (!editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Origine du patient
            </CardTitle>
            <CardDescription>
              Comment le patient est arrivé à la MSP
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </CardHeader>
        <CardContent>
          {!initialOriginType ? (
            <div className="text-center py-6 text-muted-foreground">
              <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Origine non renseignée</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setEditing(true)}
              >
                Renseigner l'origine
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {ORIGIN_TYPES[initialOriginType as OriginType]?.label || initialOriginType}
                </Badge>
              </div>
              
              {initialReferrerName && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {(ORIGIN_TYPES[initialOriginType as OriginType] as { referrerLabel?: string })?.referrerLabel || 'Référent'}
                  </p>
                  <p className="font-medium">{initialReferrerName}</p>
                </div>
              )}
              
              {initialNotes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{initialNotes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Edit mode
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Origine du patient
          </CardTitle>
          <CardDescription>
            Comment le patient est arrivé à la MSP
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={originType}
          onValueChange={(value) => {
            setOriginType(value);
            // Clear referrer if new type doesn't need one
            if (!ORIGIN_TYPES[value as OriginType]?.needsReferrer) {
              setReferrerName('');
            }
          }}
          className="space-y-3"
        >
          {Object.entries(ORIGIN_TYPES).map(([key, config]) => (
            <div key={key} className="flex items-center space-x-3">
              <RadioGroupItem value={key} id={`origin-${key}`} />
              <Label htmlFor={`origin-${key}`} className="cursor-pointer">
                {config.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {needsReferrer && (
          <div className="space-y-2 pl-6 border-l-2 border-primary/20">
            <Label htmlFor="referrer-name">
              {currentOrigin.referrerLabel}
            </Label>
            <Input
              id="referrer-name"
              value={referrerName}
              onChange={(e) => setReferrerName(e.target.value)}
              placeholder={currentOrigin.referrerLabel}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="origin-notes">Notes complémentaires (optionnel)</Label>
          <Textarea
            id="origin-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Informations supplémentaires sur l'arrivée du patient..."
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}
