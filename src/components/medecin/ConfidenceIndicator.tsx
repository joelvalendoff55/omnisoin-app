import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck, ShieldAlert, ShieldQuestion, ShieldOff, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

interface ConfidenceIndicatorProps {
  level: ConfidenceLevel;
  reason?: string;
  className?: string;
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, {
  label: string;
  icon: typeof ShieldCheck;
  colorClass: string;
  bgClass: string;
}> = {
  high: {
    label: 'Confiance élevée',
    icon: ShieldCheck,
    colorClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-500/10 border-green-500/30',
  },
  medium: {
    label: 'Confiance moyenne',
    icon: ShieldAlert,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/30',
  },
  low: {
    label: 'Confiance basse',
    icon: ShieldQuestion,
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-500/10 border-orange-500/30',
  },
  none: {
    label: 'Non vérifiable',
    icon: ShieldOff,
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-500/10 border-red-500/30',
  },
};

export function ConfidenceIndicator({ level, reason, className }: ConfidenceIndicatorProps) {
  const config = CONFIDENCE_CONFIG[level];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            'gap-1.5 cursor-help',
            config.bgClass,
            config.colorClass,
            className
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {config.label}
          <Info className="h-3 w-3 opacity-60" />
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-sm">{reason || 'Indicateur de fiabilité basé sur la qualité des sources'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
