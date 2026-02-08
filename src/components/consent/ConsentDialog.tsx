"use client";

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ScrollText,
  PenLine,
  Scale,
  Clock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ConsentTemplate, CONSENT_TYPE_CONFIG } from '@/lib/patientConsents';

interface ConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ConsentTemplate | null;
  patientName: string;
  onConsent: (params: {
    template_id: string;
    consent_type: string;
    signature_data?: string;
    scroll_completed: boolean;
    checkbox_confirmed: boolean;
  }) => Promise<void>;
  onRefuse: (reason: string) => Promise<void>;
}

export function ConsentDialog({
  open,
  onOpenChange,
  template,
  patientName,
  onConsent,
  onRefuse,
}: ConsentDialogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [scrollCompleted, setScrollCompleted] = useState(false);
  const [checkboxConfirmed, setCheckboxConfirmed] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showRefuseForm, setShowRefuseForm] = useState(false);
  const [refuseReason, setRefuseReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setScrollCompleted(false);
      setCheckboxConfirmed(false);
      setHasSignature(false);
      setShowRefuseForm(false);
      setRefuseReason('');
      clearSignature();
    }
  }, [open, template?.id]);

  // Track scroll position
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollPercentage = (target.scrollTop + target.clientHeight) / target.scrollHeight;
    if (scrollPercentage >= 0.95) {
      setScrollCompleted(true);
    }
  };

  // Signature canvas handlers
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const getSignatureData = (): string | undefined => {
    if (!hasSignature || !canvasRef.current) return undefined;
    return canvasRef.current.toDataURL('image/png');
  };

  const handleConsent = async () => {
    if (!template) return;

    setSubmitting(true);
    try {
      await onConsent({
        template_id: template.id,
        consent_type: template.consent_type,
        signature_data: getSignatureData(),
        scroll_completed: scrollCompleted,
        checkbox_confirmed: checkboxConfirmed,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefuse = async () => {
    if (!refuseReason.trim()) return;

    setSubmitting(true);
    try {
      await onRefuse(refuseReason);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!template) return null;

  const typeConfig = CONSENT_TYPE_CONFIG[template.consent_type];
  const canSubmit = scrollCompleted && checkboxConfirmed && hasSignature;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {template.title}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-xs', typeConfig.color)}>
              {typeConfig.label}
            </Badge>
            <span>•</span>
            <span>Patient : {patientName}</span>
            {template.required_for_care && (
              <>
                <span>•</span>
                <Badge variant="destructive" className="text-xs">Requis pour les soins</Badge>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!showRefuseForm ? (
          <>
            {/* Scroll indicator */}
            {!scrollCompleted && (
              <Alert>
                <ScrollText className="h-4 w-4" />
                <AlertDescription>
                  Veuillez lire l'intégralité du document en faisant défiler jusqu'en bas.
                </AlertDescription>
              </Alert>
            )}

            {/* Content area with scroll tracking */}
            <ScrollArea
              className="flex-1 max-h-[300px] border rounded-md p-4 bg-muted/30"
              onScrollCapture={handleScroll}
              ref={scrollRef}
            >
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {template.content}
                </p>

                {template.legal_references && template.legal_references.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <Scale className="h-3 w-3" />
                      Références juridiques
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {template.legal_references.map((ref, i) => (
                        <li key={i}>• {ref}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>

            {scrollCompleted && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Document lu intégralement
              </div>
            )}

            <Separator />

            {/* Checkbox confirmation */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="confirm"
                checked={checkboxConfirmed}
                onCheckedChange={(checked) => setCheckboxConfirmed(checked === true)}
                disabled={!scrollCompleted}
              />
              <Label htmlFor="confirm" className={cn('text-sm leading-relaxed', !scrollCompleted && 'text-muted-foreground')}>
                Je déclare avoir lu et compris les informations ci-dessus et je donne mon consentement libre et éclairé.
              </Label>
            </div>

            {/* Signature area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <PenLine className="h-4 w-4" />
                  Signature numérique
                </Label>
                {hasSignature && (
                  <Button variant="ghost" size="sm" onClick={clearSignature}>
                    Effacer
                  </Button>
                )}
              </div>
              <div className="border rounded-md bg-white p-1">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={100}
                  className="w-full h-[100px] cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              {!hasSignature && (
                <p className="text-xs text-muted-foreground">
                  Signez dans le cadre ci-dessus avec votre souris ou votre doigt.
                </p>
              )}
            </div>

            {/* Timestamp info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <Clock className="h-3 w-3" />
              <span>
                Horodatage : {format(new Date(), "dd MMMM yyyy 'à' HH:mm:ss", { locale: fr })}
              </span>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRefuseForm(true)}
                disabled={submitting}
              >
                Refuser
              </Button>
              <Button
                onClick={handleConsent}
                disabled={!canSubmit || submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmer le consentement
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Refuse form */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Attention :</strong> Le refus de ce consentement sera enregistré dans le dossier patient.
                {template.required_for_care && (
                  <span className="block mt-1 font-semibold">
                    Ce consentement est requis pour les soins. Le refus peut impacter la prise en charge.
                  </span>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="refuseReason">Motif du refus (obligatoire)</Label>
              <Textarea
                id="refuseReason"
                placeholder="Veuillez indiquer le motif du refus..."
                value={refuseReason}
                onChange={(e) => setRefuseReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRefuseForm(false);
                  setRefuseReason('');
                }}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleRefuse}
                disabled={!refuseReason.trim() || submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmer le refus
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
