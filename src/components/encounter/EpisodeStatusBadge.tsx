import { 
  Circle, 
  UserCheck, 
  CheckCircle, 
  Stethoscope, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  type EncounterStatus, 
  ENCOUNTER_STATUS_CONFIG 
} from '@/types/encounter';

interface EpisodeStatusBadgeProps {
  status: EncounterStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const iconMap = {
  Circle,
  UserCheck,
  CheckCircle,
  Stethoscope,
  CheckCircle2,
  XCircle,
};

export function EpisodeStatusBadge({ 
  status, 
  size = 'md',
  showIcon = true,
  className 
}: EpisodeStatusBadgeProps) {
  const config = ENCOUNTER_STATUS_CONFIG[status];
  const IconComponent = iconMap[config.icon as keyof typeof iconMap];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border-0 gap-1.5',
        config.bgColor,
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && IconComponent && (
        <IconComponent className={iconSizes[size]} />
      )}
      {config.label}
    </Badge>
  );
}
