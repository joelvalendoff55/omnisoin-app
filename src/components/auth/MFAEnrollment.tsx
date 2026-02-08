"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, CheckCircle, Copy, AlertCircle } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { toast } from 'sonner';

interface MFAEnrollmentProps {
  onComplete?: () => void;
  onSkip?: () => void;
  onCancel?: () => void;
  required?: boolean;
}

export function MFAEnrollment({ onComplete, onSkip, onCancel, required = false }: MFAEnrollmentProps) {
  const { enrollTOTP, verifyTOTP, refreshStatus } = useMFA();
  const [step, setStep] = useState<'intro' | 'qrcode' | 'verify' | 'success'>('intro');
  const [enrollmentData, setEnrollmentData] = useState<{
    qrCode: string;
    secret: string;
    factorId: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartEnrollment = async () => {
    setLoading(true);
    setError(null);

    const data = await enrollTOTP();
    if (data) {
      setEnrollmentData(data);
      setStep('qrcode');
    } else {
      setError('Erreur lors de la configuration MFA. Veuillez réessayer.');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!enrollmentData || verificationCode.length !== 6) return;

    setLoading(true);
    setError(null);

    const result = await verifyTOTP(verificationCode, enrollmentData.factorId);
    if (result.success) {
      setStep('success');
      await refreshStatus();
      toast.success('MFA activé avec succès !');
      setTimeout(() => {
        onComplete?.();
      }, 1500);
    } else {
      setError(result.error || 'Code invalide. Veuillez réessayer.');
    }
    setLoading(false);
  };

  const handleCopySecret = async () => {
    if (enrollmentData?.secret) {
      await navigator.clipboard.writeText(enrollmentData.secret);
      toast.success('Clé secrète copiée !');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Authentification à deux facteurs</CardTitle>
        <CardDescription>
          {required 
            ? 'La MFA est obligatoire pour votre rôle. Veuillez configurer l\'authentification à deux facteurs.'
            : 'Sécurisez votre compte avec une authentification supplémentaire.'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 'intro' && (
          <>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire à votre compte.</p>
              <p>Vous aurez besoin d'une application d'authentification comme :</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Google Authenticator</li>
                <li>Microsoft Authenticator</li>
                <li>Authy</li>
              </ul>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={handleStartEnrollment} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Configuration...
                  </>
                ) : (
                  'Configurer MFA'
                )}
              </Button>
              {!required && (onSkip || onCancel) && (
                <Button variant="ghost" onClick={onCancel || onSkip} disabled={loading}>
                  {onCancel ? 'Annuler' : 'Passer pour l\'instant'}
                </Button>
              )}
            </div>
          </>
        )}

        {step === 'qrcode' && enrollmentData && (
          <>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Scannez ce QR code avec votre application d'authentification
              </p>

              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img 
                  src={enrollmentData.qrCode} 
                  alt="QR Code MFA" 
                  className="w-48 h-48"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Ou entrez cette clé manuellement :
                </Label>
                <div className="flex gap-2">
                  <Input 
                    value={enrollmentData.secret} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopySecret}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button onClick={() => setStep('verify')} className="w-full">
              Continuer
            </Button>
          </>
        )}

        {step === 'verify' && (
          <>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Entrez le code à 6 chiffres affiché dans votre application
              </p>

              <div className="space-y-2">
                <Label htmlFor="verification-code">Code de vérification</Label>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('qrcode')} disabled={loading}>
                Retour
              </Button>
              <Button 
                onClick={handleVerify} 
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  'Vérifier'
                )}
              </Button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="mx-auto p-3 bg-green-100 rounded-full w-fit">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-700">MFA activé avec succès !</p>
              <p className="text-sm text-muted-foreground">
                Votre compte est maintenant protégé par l'authentification à deux facteurs.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
