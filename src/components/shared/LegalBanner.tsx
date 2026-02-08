import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scale, AlertTriangle, Info, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BannerVariant = 'legal' | 'warning' | 'info' | 'security';

interface LegalBannerProps {
  variant?: BannerVariant;
  className?: string;
  compact?: boolean;
  children?: React.ReactNode;
}

const variantConfig: Record<BannerVariant, {
  icon: React.ReactNode;
  className: string;
  defaultText: string;
}> = {
  legal: {
    icon: <Scale className="h-4 w-4 shrink-0" />,
    className: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-300',
    defaultText: 'Ce logiciel est un outil d\'aide à l\'organisation. Il ne constitue pas un dispositif médical, ni une aide au diagnostic ou à la prescription. Toute décision clinique relève de la responsabilité exclusive du praticien.',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
    className: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200',
    defaultText: 'Les informations affichées sont des suggestions à titre indicatif. Elles doivent être vérifiées et validées par un professionnel de santé avant toute utilisation.',
  },
  info: {
    icon: <Info className="h-4 w-4 shrink-0" />,
    className: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200',
    defaultText: 'Les données affichées sont en cours de traitement. Veuillez patienter ou actualiser la page.',
  },
  security: {
    icon: <Shield className="h-4 w-4 shrink-0" />,
    className: 'bg-violet-50 border-violet-200 text-violet-800 dark:bg-violet-900/30 dark:border-violet-800 dark:text-violet-200',
    defaultText: 'Accès restreint. Les actions sur cette page sont enregistrées dans le journal d\'audit.',
  },
};

export function LegalBanner({ 
  variant = 'legal', 
  className, 
  compact = false,
  children,
}: LegalBannerProps) {
  const config = variantConfig[variant];

  return (
    <Alert className={cn('border', config.className, className)}>
      <div className={cn('flex gap-2', compact ? 'items-center' : 'items-start')}>
        {config.icon}
        <AlertDescription className={cn('text-inherit', compact ? 'text-xs' : 'text-sm')}>
          {children || config.defaultText}
        </AlertDescription>
      </div>
    </Alert>
  );
}

// Composant banner persistant pour pages sensibles
export function SensitivePageBanner({ className }: { className?: string }) {
  return (
    <LegalBanner 
      variant="legal" 
      compact 
      className={cn('mb-4', className)}
    >
      <strong>Note légale :</strong> Ce logiciel est non réglementaire, non dispositif médical, 
      non aide au diagnostic et non aide à la prescription. Les données affichées doivent être 
      validées par un professionnel de santé.
    </LegalBanner>
  );
}
