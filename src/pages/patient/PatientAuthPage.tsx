import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientAuth } from '@/hooks/usePatientAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Heart, Mail, Key, Eye, EyeOff, Loader2, Shield, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PatientAuthPage() {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, loading: authLoading } = usePatientAuth();
  
  const [email, setEmail] = useState('');
  const [patientCode, setPatientCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/patient-portal/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn(email, patientCode);
    
    if (result.error) {
      setError(result.error);
    } else {
      navigate('/patient-portal/dashboard');
    }
    
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-32 right-16 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-white/10 rounded-full blur-2xl animate-pulse delay-500" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-12">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 shadow-2xl">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4">
              Espace Patient
            </h1>
            <p className="text-xl text-white/80 max-w-md">
              Accédez à vos rendez-vous, documents médicaux et communiquez avec votre équipe soignante
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Prise de RDV en ligne</h3>
                <p className="text-white/70 text-sm">Réservez vos consultations 24h/24</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Documents médicaux</h3>
                <p className="text-white/70 text-sm">Ordonnances et résultats accessibles</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Messagerie sécurisée</h3>
                <p className="text-white/70 text-sm">Échangez avec vos praticiens en toute sécurité</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Shapes */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-background via-background to-accent/20">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">OmniSoin</span>
                <span className="text-sm text-muted-foreground block">Espace Patient</span>
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Connexion Patient</CardTitle>
              <CardDescription>
                Entrez votre email et votre code patient pour accéder à votre espace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Adresse email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre.email@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      className={cn(
                        "pl-11 h-12 transition-all",
                        emailTouched && email && !isValidEmail(email) && "border-destructive focus-visible:ring-destructive"
                      )}
                      required
                    />
                  </div>
                  {emailTouched && email && !isValidEmail(email) && (
                    <p className="text-xs text-destructive">Veuillez entrer une adresse email valide</p>
                  )}
                </div>

                {/* Patient Code Field */}
                <div className="space-y-2">
                  <Label htmlFor="patientCode" className="text-sm font-medium">
                    Code patient
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="patientCode"
                      type={showCode ? 'text' : 'password'}
                      placeholder="Votre code patient"
                      value={patientCode}
                      onChange={(e) => setPatientCode(e.target.value.toUpperCase())}
                      className="pl-11 pr-11 h-12 uppercase tracking-widest font-mono"
                      maxLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCode(!showCode)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Le code patient vous a été communiqué par votre praticien
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center animate-in slide-in-from-top-2">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  disabled={loading || !email || !patientCode || !isValidEmail(email)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </form>

              {/* Help Section */}
              <div className="mt-6 pt-6 border-t border-border/50">
                <p className="text-center text-sm text-muted-foreground">
                  Vous n'avez pas de code patient ?{' '}
                  <span className="text-primary font-medium">
                    Contactez votre praticien
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Back to main site */}
          <div className="mt-6 text-center">
            <a 
              href="/auth" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← Accès praticien
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
