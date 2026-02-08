"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { recordConsent, hasConsent, ConsentType } from '@/lib/consents';
import { ClinicalDisclaimerDialog } from './ClinicalDisclaimerDialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Lightbulb,
  Loader2,
  AlertTriangle,
  FlaskConical,
  Pill,
  Stethoscope,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface ClinicalSuggestionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  patientAge?: number;
  patientSex?: string | null;
  transcriptText?: string;
}

export function ClinicalSuggestionsDrawer({
  open,
  onOpenChange,
  patientName,
  patientAge,
  patientSex,
  transcriptText,
}: ClinicalSuggestionsDrawerProps) {
  const { user } = useAuth();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [checkingConsent, setCheckingConsent] = useState(true);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user has already consented today
  useEffect(() => {
    const checkExistingConsent = async () => {
      if (!user || !open) return;
      
      setCheckingConsent(true);
      try {
        const hasExistingConsent = await hasConsent(user.id, 'clinical_aid_disclaimer' as ConsentType);
        setHasAcceptedDisclaimer(hasExistingConsent);
        if (!hasExistingConsent) {
          setShowDisclaimer(true);
        }
      } catch (error) {
        console.error('Error checking consent:', error);
        setShowDisclaimer(true);
      } finally {
        setCheckingConsent(false);
      }
    };

    checkExistingConsent();
  }, [user, open]);

  const handleAcceptDisclaimer = async () => {
    if (!user) return;

    try {
      // Record consent in database
      await recordConsent({
        user_id: user.id,
        consent_type: 'clinical_aid_disclaimer' as ConsentType,
        consent_version: '1.0',
        granted: true,
        user_agent: navigator.userAgent,
      });

      setHasAcceptedDisclaimer(true);
      setShowDisclaimer(false);
      toast.success('Accès accordé à l\'aide à la réflexion clinique');
    } catch (error) {
      console.error('Error recording consent:', error);
      toast.error('Erreur lors de l\'enregistrement du consentement');
    }
  };

  const handleCancelDisclaimer = () => {
    setShowDisclaimer(false);
    onOpenChange(false);
  };

  const buildPatientContext = () => {
    const parts = [`Patient: ${patientName}`];
    if (patientAge) parts.push(`Âge: ${patientAge} ans`);
    if (patientSex) {
      const sexLabel = patientSex === 'M' ? 'Masculin' : patientSex === 'F' ? 'Féminin' : 'Autre';
      parts.push(`Sexe: ${sexLabel}`);
    }
    return parts.join('\n');
  };

  const handleGenerateSuggestions = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuggestions(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Session expirée');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/clinical-suggestions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            patientContext: buildPatientContext(),
            transcriptText: transcriptText,
            additionalNotes: additionalNotes || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error('Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.');
        }
        if (response.status === 402) {
          throw new Error('Crédits insuffisants. Veuillez contacter l\'administrateur.');
        }
        throw new Error(errorData.error || 'Erreur lors de la génération des suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
    } catch (err) {
      console.error('Error generating suggestions:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast.error('Erreur lors de la génération des pistes de réflexion');
    } finally {
      setLoading(false);
    }
  };

  const getSexLabel = (sex: string | null) => {
    switch (sex) {
      case 'M':
        return 'Masculin';
      case 'F':
        return 'Féminin';
      case 'O':
        return 'Autre';
      default:
        return null;
    }
  };

  if (checkingConsent) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <ClinicalDisclaimerDialog
        open={showDisclaimer}
        onAccept={handleAcceptDisclaimer}
        onCancel={handleCancelDisclaimer}
      />

      <Sheet open={open && hasAcceptedDisclaimer} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Aide à la Réflexion Clinique
            </SheetTitle>
            <SheetDescription>
              Pistes de réflexion basées sur le contexte patient
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-4">
            <div className="space-y-6">
              {/* Disclaimer Banner */}
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  <strong>Rappel :</strong> Ces suggestions sont des pistes de réflexion uniquement. 
                  Le praticien reste seul responsable de ses décisions cliniques.
                </AlertDescription>
              </Alert>

              {/* Patient Context */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Contexte patient</Label>
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <p className="font-medium">{patientName}</p>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    {patientAge && <span>{patientAge} ans</span>}
                    {patientSex && (
                      <>
                        {patientAge && <span>•</span>}
                        <span>{getSexLabel(patientSex)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Transcript Preview */}
              {transcriptText && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Transcription disponible</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {transcriptText}
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      {transcriptText.length} caractères
                    </Badge>
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="additional-notes" className="text-sm font-medium">
                  Notes additionnelles (optionnel)
                </Label>
                <Textarea
                  id="additional-notes"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Symptômes observés, antécédents pertinents, éléments de contexte..."
                  className="min-h-[100px]"
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateSuggestions}
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération en cours...
                  </>
                ) : suggestions ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Régénérer les pistes
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4" />
                    Générer des pistes de réflexion
                  </>
                )}
              </Button>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Suggestions Display */}
              {suggestions && (
                <div className="space-y-4">
                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Pistes de réflexion
                    </h3>

                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <div className="space-y-4 text-sm">
                        {suggestions.split('##').map((section, index) => {
                          if (!section.trim()) return null;
                          
                          const lines = section.trim().split('\n');
                          const title = lines[0];
                          const content = lines.slice(1).join('\n');

                          let icon = <Lightbulb className="h-4 w-4" />;
                          let bgColor = 'bg-gray-50 border-gray-200';
                          let iconColor = 'text-gray-600';

                          if (title.toLowerCase().includes('examen') || title.toLowerCase().includes('biolog')) {
                            icon = <FlaskConical className="h-4 w-4" />;
                            bgColor = 'bg-blue-50 border-blue-200';
                            iconColor = 'text-blue-600';
                          } else if (title.toLowerCase().includes('thérapeutique') || title.toLowerCase().includes('classe')) {
                            icon = <Pill className="h-4 w-4" />;
                            bgColor = 'bg-green-50 border-green-200';
                            iconColor = 'text-green-600';
                          } else if (title.toLowerCase().includes('diagnostic') || title.toLowerCase().includes('différentiel')) {
                            icon = <Stethoscope className="h-4 w-4" />;
                            bgColor = 'bg-purple-50 border-purple-200';
                            iconColor = 'text-purple-600';
                          } else if (title.toLowerCase().includes('vigilance') || title.toLowerCase().includes('point')) {
                            icon = <ShieldAlert className="h-4 w-4" />;
                            bgColor = 'bg-amber-50 border-amber-200';
                            iconColor = 'text-amber-600';
                          }

                          return (
                            <div key={index} className={`p-4 rounded-lg border ${bgColor}`}>
                              <h4 className={`font-medium flex items-center gap-2 mb-2 ${iconColor}`}>
                                <span className={iconColor}>{icon}</span>
                                {title}
                              </h4>
                              <div className="text-muted-foreground whitespace-pre-wrap">
                                {content.trim()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Final Disclaimer */}
                  <Alert className="border-gray-200 bg-gray-50 mt-4">
                    <ShieldAlert className="h-4 w-4 text-gray-600" />
                    <AlertDescription className="text-gray-700 text-xs">
                      Ces suggestions doivent être adaptées au contexte clinique local. 
                      Le praticien reste seul responsable de ses décisions diagnostiques et thérapeutiques.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
