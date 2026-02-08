import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type ZoneVariant = 'default' | 'critical' | 'work' | 'info';

interface CockpitZoneProps {
  title: string;
  count?: number;
  priority?: boolean;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  children: ReactNode;
  className?: string;
  variant?: ZoneVariant;
}

const variantStyles: Record<ZoneVariant, string> = {
  default: 'border-border bg-card',
  critical: 'border-destructive/50 bg-destructive/5 ring-1 ring-destructive/20',
  work: 'border-primary/50 bg-primary/5 ring-1 ring-primary/20',
  info: 'border-muted-foreground/30 bg-muted/30',
};

const variantHeaderStyles: Record<ZoneVariant, string> = {
  default: '',
  critical: 'text-destructive',
  work: 'text-primary',
  info: 'text-muted-foreground',
};

export function CockpitZone({
  title,
  count,
  priority,
  icon,
  action,
  children,
  className,
  variant = 'default',
}: CockpitZoneProps) {
  // Use priority prop to override variant to critical
  const effectiveVariant = priority ? 'critical' : variant;

  return (
    <div className={cn(
      "rounded-lg border-2 transition-all",
      variantStyles[effectiveVariant],
      className
    )}>
      <div className={cn(
        "flex items-center justify-between p-4 border-b border-inherit",
        variantHeaderStyles[effectiveVariant]
      )}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-sm">{title}</h3>
          {count !== undefined && (
            <Badge 
              variant={effectiveVariant === 'critical' ? 'destructive' : count > 0 ? 'default' : 'secondary'} 
              className="h-5 min-w-5 text-[10px]"
            >
              {count}
            </Badge>
          )}
        </div>
        {action && (
          <Button variant="ghost" size="sm" onClick={action.onClick} className="text-xs h-7">
            {action.label}
          </Button>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
