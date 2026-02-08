import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartPulse, AlertCircle, CheckCircle, Loader2, KeyRound, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import ForgotPasswordDialog from './ForgotPasswordDialog';

const passwordSchema = z
  .string()
  .min(10, 'Le mot de passe doit contenir au moins 10 caractères');

interface ResetPasswordFormProps {
  hasValidSession: boolean;
  onRequestNewReset?: () => void;
}

export default function ResetPasswordForm({ hasValidSession, onRequestNewReset }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const navigate = useNavigate();

  const validateInputs = () => {
    setError('');

    // Validate password length
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.errors[0].message);
        return false;
      }
    }

    // Check confirmation match
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInputs()) return;

    setIsLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        if (updateError.message.includes('same as the old password')) {
          setError('Le nouveau mot de passe doit être différent de l\'ancien');
        } else if (updateError.message.includes('should be at least')) {
          setError('Le mot de passe ne répond pas aux critères de sécurité');
        } else {
          setError(updateError.message);
        }
        return;
      }

      setSuccess(true);
      toast.success('Mot de passe mis à jour', {
        description: 'Vous allez être redirigé vers les paramètres.',
      });

      // Redirect after short delay
      setTimeout(() => {
        navigate('/settings?tab=security');
      }, 2000);
    } catch (err) {
      setError('Une erreur inattendue est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  // Invalid/expired link state
  if (!hasValidSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8" data-testid="reset-invalid">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 bg-destructive/10 rounded-full w-fit mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl" data-testid="reset-invalid-title">
                Lien invalide ou expiré
              </CardTitle>
              <CardDescription className="mt-2">
                Ce lien de réinitialisation n'est plus valide. 
                Il a peut-être expiré ou a déjà été utilisé.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Veuillez refaire une demande de réinitialisation.
              </p>
              <div className="flex flex-col gap-2">
                <Button asChild className="w-full" data-testid="back-to-login">
                  <Link to="/auth">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour à la connexion
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setForgotDialogOpen(true)}
                  data-testid="resend-reset-link"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Renvoyer un lien
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <ForgotPasswordDialog
          open={forgotDialogOpen}
          onOpenChange={setForgotDialogOpen}
        />
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 bg-green-100 rounded-full w-fit mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Mot de passe mis à jour</CardTitle>
              <CardDescription className="mt-2">
                Votre mot de passe a été modifié avec succès.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Redirection vers les paramètres...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen bg-background flex" data-testid="reset-valid">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <HeartPulse className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold">OmniSoin Assist</h1>
          </div>
          
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Réinitialisez votre mot de passe
          </h2>
          
          <p className="text-white/90 text-lg">
            Choisissez un nouveau mot de passe sécurisé pour votre compte.
          </p>
        </div>
      </div>

      {/* Right side - Reset form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="p-2 gradient-primary rounded-lg">
                <HeartPulse className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">OmniSoin Assist</h1>
            </div>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl" data-testid="reset-valid-title">Nouveau mot de passe</CardTitle>
              <CardDescription>
                Choisissez un mot de passe d'au moins 10 caractères
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nouveau mot de passe</Label>
                  <Input
                    id="password"
                    data-testid="reset-password"
                    type="password"
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={10}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 10 caractères
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    data-testid="reset-password-confirm"
                    type="password"
                    placeholder="••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={10}
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading} data-testid="reset-submit">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    'Mettre à jour le mot de passe'
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  to="/auth"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Retour à la connexion
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Logiciel non réglementaire — non dispositif médical
          </p>
        </div>
      </div>
    </div>
  );
}
