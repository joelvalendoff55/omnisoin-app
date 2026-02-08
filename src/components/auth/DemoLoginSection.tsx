import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { setRememberMe } from '@/lib/authStorage';
import { 
  UserCircle, 
  Stethoscope, 
  HeadsetIcon, 
  Heart, 
  Users, 
  Loader2,
  Play,
  ChevronDown,
  Shield,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoAccount {
  email: string;
  password: string;
  label: string;
  role: string;
  icon: React.ReactNode;
  color: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'demo.medecin@omnisoin.fr',
    password: 'Demo2024!',
    label: 'Dr. Martin DUPONT',
    role: 'Admin + Médecin',
    icon: <Shield className="h-4 w-4" />,
    color: 'text-purple-500',
  },
  {
    email: 'demo.medecin2@omnisoin.fr',
    password: 'Demo2024!',
    label: 'Dr. Sophie BERNARD',
    role: 'Médecin',
    icon: <Stethoscope className="h-4 w-4" />,
    color: 'text-blue-500',
  },
  {
    email: 'demo.assistante@omnisoin.fr',
    password: 'Demo2024!',
    label: 'Marie LAURENT',
    role: 'Assistante',
    icon: <HeadsetIcon className="h-4 w-4" />,
    color: 'text-green-500',
  },
  {
    email: 'demo.ipa@omnisoin.fr',
    password: 'Demo2024!',
    label: 'Julie MOREAU',
    role: 'IPA',
    icon: <Heart className="h-4 w-4" />,
    color: 'text-pink-500',
  },
  {
    email: 'demo.coordinatrice@omnisoin.fr',
    password: 'Demo2024!',
    label: 'Claire PETIT',
    role: 'Coordinatrice',
    icon: <Users className="h-4 w-4" />,
    color: 'text-orange-500',
  },
];

interface DemoLoginSectionProps {
  disabled?: boolean;
  onError?: (error: string) => void;
}

export function DemoLoginSection({ disabled, onError }: DemoLoginSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = async (account: DemoAccount) => {
    setIsLoading(true);
    setLoadingAccount(account.email);
    
    // Set remember me to false for demo accounts
    setRememberMe(false);
    
    try {
      const { error } = await signIn(account.email, account.password);
      
      if (error) {
        onError?.(error.message || 'Erreur de connexion démo');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      onError?.(err.message || 'Erreur de connexion démo');
    } finally {
      setIsLoading(false);
      setLoadingAccount(null);
    }
  };

  return (
    <div className="pt-4 border-t border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <Play className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Tester l'application</span>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between group hover:border-primary/50 transition-colors"
            disabled={disabled || isLoading}
          >
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span>Connexion Démo</span>
            </div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-72">
          <DropdownMenuLabel className="text-center">
            <span className="font-normal text-muted-foreground">MSP Faidherbe</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {DEMO_ACCOUNTS.map((account) => (
            <DropdownMenuItem
              key={account.email}
              onClick={() => handleDemoLogin(account)}
              disabled={loadingAccount !== null}
              className="flex items-center gap-3 py-3 cursor-pointer"
            >
              <div className={cn("flex-shrink-0", account.color)}>
                {loadingAccount === account.email ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  account.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{account.label}</p>
                <p className="text-xs text-muted-foreground">{account.role}</p>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-2 py-2 text-xs text-center text-muted-foreground">
            Mot de passe: <code className="bg-muted px-1 rounded">Demo2024!</code>
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Super Admin: connexion via le formulaire standard</span>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
