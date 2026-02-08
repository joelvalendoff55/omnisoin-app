import { useEffect, useState } from 'react';
import { RefreshCw, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import { cn } from '@/lib/utils';

interface CockpitHeaderProps {
  onRefresh?: () => void;
  loading?: boolean;
  notificationCount?: number;
}

export function CockpitHeader({ onRefresh, loading, notificationCount }: CockpitHeaderProps) {
  const { user } = useAuth();
  const { isAdmin, isCoordinator, isPractitioner, isAssistant } = useRole();
  const { structureId } = useStructureId();
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null } | null>(null);
  const [structureName, setStructureName] = useState<string | null>(null);

  // Compute role label from boolean flags
  const roleLabel = isAdmin ? 'Administrateur' : 
                    isCoordinator ? 'Coordinatrice' : 
                    isPractitioner ? 'Médecin' : 
                    isAssistant ? 'Assistante' : '';

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch structure name
      if (structureId) {
        const { data: structureData } = await supabase
          .from('structures')
          .select('name')
          .eq('id', structureId)
          .maybeSingle();

        if (structureData) {
          setStructureName(structureData.name);
        }
      }
    };

    fetchData();
  }, [user, structureId]);

  const displayName = profile?.first_name || 'Utilisateur';

  return (
    <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/50">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Bonjour, {displayName}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {roleLabel && <span>{roleLabel}</span>}
            {roleLabel && structureName && <span>•</span>}
            {structureName && <span>{structureName}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {notificationCount !== undefined && notificationCount > 0 && (
          <Button variant="ghost" size="sm" className="relative gap-2">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
              {notificationCount}
            </span>
          </Button>
        )}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Actualiser
          </Button>
        )}
      </div>
    </div>
  );
}
