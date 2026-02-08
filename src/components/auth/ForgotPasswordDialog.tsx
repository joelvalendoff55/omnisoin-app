import { useState } from 'react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Veuillez entrer une adresse email valide');

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email
    try {
      emailSchema.parse(email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth?reset=1`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        // Don't reveal if email exists or not for security
        console.error('Reset password error:', resetError);
      }

      // Always show success for security (don't reveal if email exists)
      setSuccess(true);
      toast.success('Email envoyé', {
        description: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
      });
    } catch (err) {
      toast.error('Erreur', {
        description: "Une erreur est survenue. Veuillez réessayer.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setEmail('');
    setError('');
    setSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Mot de passe oublié
          </DialogTitle>
          <DialogDescription>
            Entrez votre adresse email pour recevoir un lien de réinitialisation.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Email envoyé !
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Si un compte existe avec l'adresse <strong>{email}</strong>, 
                  vous recevrez un email avec un lien de réinitialisation.
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  Pensez à vérifier vos spams si vous ne voyez pas l'email.
                </p>
              </div>
            </div>

            <Button onClick={handleClose} className="w-full">
              Retour à la connexion
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-email">Adresse email</Label>
              <Input
                id="reset-email"
                data-testid="forgot-password-email"
                type="email"
                placeholder="praticien@structure.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Envoyer le lien de réinitialisation'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="w-full"
              >
                Retour à la connexion
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
