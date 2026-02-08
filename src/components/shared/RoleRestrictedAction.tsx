import { ReactNode } from 'react';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleRestrictedActionProps {
  /** Roles allowed to perform this action */
  allowedRoles: ('admin' | 'practitioner' | 'coordinator' | 'assistant')[];
  /** Content to render when user has permission */
  children: ReactNode;
  /** Optional fallback when user lacks permission */
  fallback?: ReactNode;
  /** Tooltip message when action is blocked */
  blockedMessage?: string;
  /** Hide element entirely if not allowed (instead of showing disabled state) */
  hideIfNotAllowed?: boolean;
}

export function RoleRestrictedAction({
  allowedRoles,
  children,
  fallback,
  blockedMessage = 'Action réservée au médecin',
  hideIfNotAllowed = false,
}: RoleRestrictedActionProps) {
  const { isAdmin, isPractitioner, isCoordinator, isAssistant, loading } = useRole();

  // Build role map
  const userRoles = {
    admin: isAdmin,
    practitioner: isPractitioner,
    coordinator: isCoordinator,
    assistant: isAssistant,
  };

  // Check if user has any of the allowed roles
  const hasPermission = allowedRoles.some((role) => userRoles[role]);

  if (loading) {
    return <>{children}</>; // Show children while loading to avoid flash
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  if (hideIfNotAllowed) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default: show disabled state with tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1 opacity-50 cursor-not-allowed">
          <Lock className="h-3 w-3" />
          <span className="text-xs text-muted-foreground">Accès restreint</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{blockedMessage}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Button wrapper that disables for non-allowed roles
interface RestrictedButtonProps extends React.ComponentProps<typeof Button> {
  allowedRoles: ('admin' | 'practitioner' | 'coordinator' | 'assistant')[];
  blockedMessage?: string;
}

export function RestrictedButton({
  allowedRoles,
  blockedMessage = 'Action réservée au médecin',
  children,
  className,
  ...props
}: RestrictedButtonProps) {
  const { isAdmin, isPractitioner, isCoordinator, isAssistant, loading } = useRole();

  const userRoles = {
    admin: isAdmin,
    practitioner: isPractitioner,
    coordinator: isCoordinator,
    assistant: isAssistant,
  };

  const hasPermission = allowedRoles.some((role) => userRoles[role]);

  if (!hasPermission && !loading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            {...props}
            disabled
            className={cn('cursor-not-allowed', className)}
          >
            <Lock className="h-4 w-4 mr-2" />
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{blockedMessage}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button {...props} className={className}>
      {children}
    </Button>
  );
}
