"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  HeartPulse, 
  Shield, 
  Users, 
  AlertCircle, 
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
  Lock,
  Mail,
  User,
  AlertTriangle,
} from 'lucide-react';
import { z } from 'zod';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import ForgotPasswordDialog from '@/components/auth/ForgotPasswordDialog';
import { StructureSetupStep } from '@/components/auth/StructureSetupStep';
import { DemoLoginSection } from '@/components/auth/DemoLoginSection';
import { getRememberMe, setRememberMe, transferSessionToSessionStorage } from '@/lib/authStorage';
import { recordSignupConsents } from '@/lib/consents';
import { cn } from '@/lib/utils';

// Validation schemas
const emailSchema = z.string().email('Email invalide');
const passwordSchema = z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères');

// Password strength rules
const PASSWORD_RULES = [
  { regex: /.{8,}/, label: 'Au moins 8 caractères' },
  { regex: /[A-Z]/, label: 'Une majuscule' },
  { regex: /[a-z]/, label: 'Une minuscule' },
  { regex: /[0-9]/, label: 'Un chiffre' },
  { regex: /[^A-Za-z0-9]/, label: 'Un caractère spécial' },
];

// Anti-brute force config
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30; // seconds

interface LoginAttempts {
  count: number;
  lockedUntil: number | null;
}

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [hasValidResetSession, setHasValidResetSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [rememberMe, setRememberMeState] = useState(() => getRememberMe());
  const [healthDataConsent, setHealthDataConsent] = useState(false);
  const [showStructureSetup, setShowStructureSetup] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [isAnimating, setIsAnimating] = useState(true);
  
  // Real-time validation state
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  
  // Anti-brute force state
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempts>(() => {
    const stored = localStorage.getItem('loginAttempts');
    return stored ? JSON.parse(stored) : { count: 0, lockedUntil: null };
  });
  const [lockoutCountdown, setLockoutCountdown] = useState(0);
  
  const { signIn, signUp, user } = useAuth();
  const router = useRouter();
  const [searchParams] = useSearchParams();

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // Anti-brute force: persist attempts
  useEffect(() => {
    localStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
  }, [loginAttempts]);

  // Anti-brute force: countdown timer
  useEffect(() => {
    if (loginAttempts.lockedUntil) {
      const remaining = Math.ceil((loginAttempts.lockedUntil - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutCountdown(remaining);
        const interval = setInterval(() => {
          const newRemaining = Math.ceil((loginAttempts.lockedUntil! - Date.now()) / 1000);
          if (newRemaining <= 0) {
            setLockoutCountdown(0);
            setLoginAttempts({ count: 0, lockedUntil: null });
            clearInterval(interval);
          } else {
            setLockoutCountdown(newRemaining);
          }
        }, 1000);
        return () => clearInterval(interval);
      }
    }
  }, [loginAttempts.lockedUntil]);

  // Check for reset mode and valid session
  useEffect(() => {
    const checkResetMode = async () => {
      const resetParam = searchParams.get('reset');
      const devRecovery = searchParams.get('dev_recovery');
      
      if (resetParam === '1') {
        setIsResetMode(true);
        
        if (devRecovery === '1' && import.meta.env.DEV) {
          console.warn('[DEV] Bypassing session check for E2E testing');
          setHasValidResetSession(true);
          setCheckingSession(false);
          return;
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setHasValidResetSession(true);
        } else {
          setHasValidResetSession(false);
        }
      }
      
      setCheckingSession(false);
    };

    checkResetMode();
  }, [searchParams]);

  // Listen for auth events
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetMode(true);
        setHasValidResetSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (user && !isResetMode && !showStructureSetup) {
      navigate('/');
    }
  }, [user, navigate, isResetMode, showStructureSetup]);

  // Real-time validation
  const emailError = useMemo(() => {
    if (!emailTouched || !email) return null;
    try {
      emailSchema.parse(email);
      return null;
    } catch (e) {
      if (e instanceof z.ZodError) return e.errors[0].message;
      return null;
    }
  }, [email, emailTouched]);

  const emailValid = useMemo(() => {
    if (!email) return false;
    try {
      emailSchema.parse(email);
      return true;
    } catch {
      return false;
    }
  }, [email]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const passedRules = PASSWORD_RULES.filter(rule => rule.regex.test(password));
    return {
      score: (passedRules.length / PASSWORD_RULES.length) * 100,
      passed: passedRules.length,
      total: PASSWORD_RULES.length,
      rules: PASSWORD_RULES.map(rule => ({
        ...rule,
        passed: rule.regex.test(password),
      })),
    };
  }, [password]);

  const getStrengthColor = useCallback((score: number) => {
    if (score < 40) return 'bg-red-500';
    if (score < 60) return 'bg-orange-500';
    if (score < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  }, []);

  const getStrengthLabel = useCallback((score: number) => {
    if (score < 40) return 'Faible';
    if (score < 60) return 'Moyen';
    if (score < 80) return 'Bon';
    return 'Excellent';
  }, []);

  const isLocked = lockoutCountdown > 0;

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMeState(checked);
    setRememberMe(checked);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Check lockout
    if (isLocked) {
      setError(`Trop de tentatives. Réessayez dans ${lockoutCountdown} secondes.`);
      return;
    }
    
    // Validate
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.errors[0].message);
      }
      return;
    }
    
    setRememberMe(rememberMe);
    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (!error && !rememberMe) {
      transferSessionToSessionStorage();
    }
    
    setIsLoading(false);
    
    if (error) {
      // Increment failed attempts
      const newCount = loginAttempts.count + 1;
      if (newCount >= MAX_ATTEMPTS) {
        setLoginAttempts({
          count: newCount,
          lockedUntil: Date.now() + (LOCKOUT_DURATION * 1000),
        });
        setError(`Compte temporairement verrouillé. Réessayez dans ${LOCKOUT_DURATION} secondes.`);
      } else {
        setLoginAttempts({ ...loginAttempts, count: newCount });
        if (error.message.includes('Invalid login credentials')) {
          setError(`Email ou mot de passe incorrect (${MAX_ATTEMPTS - newCount} tentative(s) restante(s))`);
        } else {
          setError(error.message);
        }
      }
    } else {
      // Reset attempts on success
      setLoginAttempts({ count: 0, lockedUntil: null });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate all fields
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.errors[0].message);
        return;
      }
    }
    
    if (!firstName.trim() || !lastName.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    
    if (passwordStrength.score < 60) {
      setError('Le mot de passe est trop faible');
      return;
    }
    
    if (!healthDataConsent) {
      setError('Vous devez accepter le traitement des données de santé');
      return;
    }
    
    setIsLoading(true);
    const { error, data } = await signUp(email, password, firstName, lastName);
    
    if (error) {
      setIsLoading(false);
      if (error.message.includes('User already registered')) {
        setError('Un compte existe déjà avec cet email');
      } else {
        setError(error.message);
      }
      return;
    }

    if (data?.user?.id) {
      await recordSignupConsents(data.user.id, {
        user_agent: navigator.userAgent,
      });
      
      setNewUserId(data.user.id);
      setShowStructureSetup(true);
    }
    
    setIsLoading(false);
  };

  const handleStructureComplete = (structureId: string, role: string) => {
    setShowStructureSetup(false);
    navigate('/');
  };

  const handleStructureSkip = () => {
    setShowStructureSetup(false);
    navigate('/');
  };

  // Loading state
  if (checkingSession && searchParams.get('reset') === '1') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Vérification en cours...</p>
        </div>
      </div>
    );
  }

  // Reset password mode
  if (isResetMode) {
    return <ResetPasswordForm hasValidSession={hasValidResetSession} />;
  }

  // Structure setup mode
  if (showStructureSetup && newUserId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className={cn(
          "w-full max-w-md border-0 shadow-xl transition-all duration-500",
          isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        )}>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-3 gradient-primary rounded-xl w-fit mb-4 animate-pulse">
              <HeartPulse className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Bienvenue sur OmniSoin !</CardTitle>
            <CardDescription>
              Dernière étape : configurez votre structure de soins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StructureSetupStep
              userId={newUserId}
              firstName={firstName}
              lastName={lastName}
              onComplete={handleStructureComplete}
              onSkip={handleStructureSkip}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding with animation */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className={cn(
          "max-w-md text-white relative z-10 transition-all duration-700",
          isAnimating ? "opacity-0 -translate-x-8" : "opacity-100 translate-x-0"
        )}>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg">
              <HeartPulse className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold">OmniSoin Assist</h1>
          </div>
          
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Simplifiez la gestion de votre structure de soins
          </h2>
          
          <p className="text-white/90 text-lg mb-8">
            Patientèle, assistantes, WhatsApp, transcription & assistant clinique — tout en un.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/90 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <Users className="h-5 w-5" />
              <span>Multi-praticiens & délégations</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <Shield className="h-5 w-5" />
              <span>Architecture RGPD-ready</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <Lock className="h-5 w-5" />
              <span>Authentification sécurisée MFA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className={cn(
          "w-full max-w-md transition-all duration-500",
          isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        )}>
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="p-2 gradient-primary rounded-lg shadow-lg">
                <HeartPulse className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">OmniSoin Assist</h1>
            </div>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Bienvenue</CardTitle>
              <CardDescription>
                Connectez-vous ou créez un compte pour commencer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Connexion</TabsTrigger>
                  <TabsTrigger value="signup">Inscription</TabsTrigger>
                </TabsList>

                {/* Error display */}
                {error && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-destructive/10 text-destructive rounded-lg text-sm animate-in slide-in-from-top-2 duration-200">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Lockout warning */}
                {isLocked && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-orange-500/10 text-orange-600 rounded-lg text-sm animate-pulse">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Compte verrouillé. Réessayez dans {lockoutCountdown}s</span>
                  </div>
                )}

                {/* Sign In Tab */}
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-signin">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email-signin"
                          type="email"
                          placeholder="praticien@structure.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => setEmailTouched(true)}
                          className={cn(
                            "pl-10 transition-all",
                            emailTouched && emailError && "border-destructive focus-visible:ring-destructive",
                            emailTouched && emailValid && "border-green-500 focus-visible:ring-green-500"
                          )}
                          required
                          disabled={isLocked}
                        />
                        {emailTouched && email && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {emailValid ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <X className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                        )}
                      </div>
                      {emailTouched && emailError && (
                        <p className="text-xs text-destructive">{emailError}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password-signin">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password-signin"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10"
                          required
                          disabled={isLocked}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember-me"
                          checked={rememberMe}
                          onCheckedChange={(checked) => handleRememberMeChange(checked === true)}
                          disabled={isLocked}
                        />
                        <label
                          htmlFor="remember-me"
                          className="text-sm text-muted-foreground cursor-pointer select-none"
                        >
                          Se souvenir de moi
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForgotPasswordOpen(true)}
                        className="text-sm text-primary hover:underline"
                        disabled={isLocked}
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading || isLocked}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        'Se connecter'
                      )}
                    </Button>
                    
                    {/* Demo Login Section */}
                    <DemoLoginSection 
                      disabled={isLocked} 
                      onError={(err) => setError(err)} 
                    />
                  </form>
                </TabsContent>

                {/* Sign Up Tab */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Prénom</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="firstName"
                            placeholder="Jean"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input
                          id="lastName"
                          placeholder="Dupont"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email-signup">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email-signup"
                          type="email"
                          placeholder="praticien@structure.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => setEmailTouched(true)}
                          className={cn(
                            "pl-10",
                            emailTouched && emailError && "border-destructive",
                            emailTouched && emailValid && "border-green-500"
                          )}
                          required
                        />
                        {emailTouched && email && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {emailValid ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <X className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password-signup">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password-signup"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setPasswordTouched(true);
                          }}
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      
                      {/* Password strength indicator */}
                      {passwordTouched && password && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Force du mot de passe</span>
                            <span className={cn(
                              "font-medium",
                              passwordStrength.score < 40 && "text-red-500",
                              passwordStrength.score >= 40 && passwordStrength.score < 60 && "text-orange-500",
                              passwordStrength.score >= 60 && passwordStrength.score < 80 && "text-yellow-600",
                              passwordStrength.score >= 80 && "text-green-500"
                            )}>
                              {getStrengthLabel(passwordStrength.score)}
                            </span>
                          </div>
                          <Progress 
                            value={passwordStrength.score} 
                            className={cn("h-2", getStrengthColor(passwordStrength.score))}
                          />
                          <div className="grid grid-cols-2 gap-1">
                            {passwordStrength.rules.map((rule, index) => (
                              <div
                                key={index}
                                className={cn(
                                  "flex items-center gap-1 text-xs",
                                  rule.passed ? "text-green-600" : "text-muted-foreground"
                                )}
                              >
                                {rule.passed ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                                {rule.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Health Data Consent */}
                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="health-consent"
                          checked={healthDataConsent}
                          onCheckedChange={(checked) => setHealthDataConsent(checked === true)}
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <label
                            htmlFor="health-consent"
                            className="text-sm font-medium cursor-pointer select-none"
                          >
                            J'accepte les Conditions Générales d'Utilisation et la Politique de Confidentialité *
                          </label>
                          <p className="text-xs text-muted-foreground">
                            J'accepte le traitement de mes données personnelles conformément au RGPD.
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        En créant un compte, vous acceptez nos{' '}
                        <Link href="/terms" className="text-primary hover:underline">
                          CGU
                        </Link>{' '}
                        et notre{' '}
                        <Link href="/privacy" className="text-primary hover:underline">
                          Politique de confidentialité
                        </Link>.
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading || !healthDataConsent || passwordStrength.score < 60}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Création...
                        </>
                      ) : (
                        'Créer un compte'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Logiciel non réglementaire — non dispositif médical
          </p>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
      />
    </div>
  );
}
