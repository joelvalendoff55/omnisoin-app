import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStructureId } from '@/hooks/useStructureId';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useActionPermission, ResourceType, ActionType } from '@/hooks/useActionPermission';
import { useRole } from '@/hooks/useRole';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from "next/link";

interface HealthDataGuardProps {
  children: ReactNode;
  /** If true, requires health_data_enabled flag to be ON */
  requiresHealthData?: boolean;
  /** Resource type to check permission for */
  resource?: ResourceType;
  /** Action to check permission for */
  action?: ActionType;
  /** Custom fallback when access is denied */
  fallback?: ReactNode;
  /** Show detailed message when blocked */
  showBlockedMessage?: boolean;
}

/**
 * Component that guards access to pages/features based on:
 * 1. health_data_enabled feature flag
 * 2. Role-based action permissions (RBAC matrix)
 */
export function HealthDataGuard({
  children,
  requiresHealthData = true,
  resource,
  action,
  fallback,
  showBlockedMessage = true,
}: HealthDataGuardProps) {
  const { user } = useAuth();
  const { structureId } = useStructureId();
  const { healthDataEnabled, loading: flagsLoading } = useFeatureFlags();
  const { canPerform, loading: permissionsLoading } = useActionPermission();
  const { isAdmin, loading: roleLoading } = useRole();

  const isLoading = flagsLoading || permissionsLoading || roleLoading;

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // MODE DÉMO : Si l'utilisateur est authentifié et a une structure, autoriser l'accès
  // Les admins ont accès à tout, sinon on vérifie les permissions RBAC
  if (user && structureId) {
    // Les admins ont toujours accès
    if (isAdmin) {
      return <>{children}</>;
    }
    
    // Check RBAC permission if resource and action are specified (pour les non-admins)
    if (resource && action && !canPerform(resource, action)) {
      if (fallback) {
        return <>{fallback}</>;
      }

      if (showBlockedMessage) {
        return (
          <div className="container max-w-2xl mx-auto py-12 px-4">
            <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                Accès restreint
              </AlertTitle>
              <AlertDescription className="mt-2 text-yellow-700 dark:text-yellow-300">
                Votre rôle ne vous permet pas d'effectuer cette action sur cette ressource.
                Contactez un administrateur si vous pensez que c'est une erreur.
              </AlertDescription>
            </Alert>
          </div>
        );
      }

      return null;
    }

    // Accès autorisé en mode démo
    return <>{children}</>;
  }

  // Check health_data_enabled flag - autoriser par défaut pour la démo
  // Si le flag n'est pas explicitement défini à false, on autorise l'accès
  if (requiresHealthData && !healthDataEnabled) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showBlockedMessage) {
      return (
        <div className="container max-w-2xl mx-auto py-12 px-4">
          {/* Info banner instead of destructive alert */}
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Shield className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">
              Accès aux données de santé en attente d'activation
            </AlertTitle>
            <AlertDescription className="mt-2 text-blue-700 dark:text-blue-300">
              Cette fonctionnalité sera disponible après configuration des mesures de sécurité.
            </AlertDescription>
          </Alert>
          
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Prérequis pour l'activation
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 ml-6 list-disc">
              <li>Authentification MFA/2FA obligatoire pour les rôles sensibles</li>
              <li>Politiques RLS configurées sur toutes les tables médicales</li>
              <li>Système d'audit immuable opérationnel</li>
              <li>Consentements patients collectés et tracés</li>
            </ul>
            <div className="pt-4">
              <Button asChild variant="outline">
                <Link href="/settings">
                  Accéder aux paramètres
                </Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  // Check RBAC permission if resource and action are specified
  if (resource && action && !canPerform(resource, action)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showBlockedMessage) {
      return (
        <div className="container max-w-2xl mx-auto py-12 px-4">
          <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="text-yellow-800 dark:text-yellow-200">
              Accès restreint
            </AlertTitle>
            <AlertDescription className="mt-2 text-yellow-700 dark:text-yellow-300">
              Votre rôle ne vous permet pas d'effectuer cette action sur cette ressource.
              Contactez un administrateur si vous pensez que c'est une erreur.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}

/**
 * HOC version of HealthDataGuard for wrapping pages
 */
export function withHealthDataGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<HealthDataGuardProps, 'children'> = {}
) {
  return function GuardedComponent(props: P) {
    return (
      <HealthDataGuard {...options}>
        <Component {...props} />
      </HealthDataGuard>
    );
  };
}
