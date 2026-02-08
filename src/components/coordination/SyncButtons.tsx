"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStructureId } from '@/hooks/useStructureId';

export function SyncButtons() {
  const { structureId } = useStructureId();
  const [syncingAirtable, setSyncingAirtable] = useState(false);
  const [syncingNotion, setSyncingNotion] = useState(false);

  const handleAirtableSync = async () => {
    if (!structureId) {
      toast.error('Structure non trouvée');
      return;
    }

    try {
      setSyncingAirtable(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expirée');
        return;
      }

      const response = await supabase.functions.invoke('airtable-sync', {
        body: { structureId, syncType: 'indicators' },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur de synchronisation');
      }

      if (response.data?.success) {
        toast.success(response.data.message || 'Synchronisation Airtable réussie');
      } else {
        throw new Error(response.data?.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Airtable sync error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la synchronisation Airtable');
    } finally {
      setSyncingAirtable(false);
    }
  };

  const handleNotionSync = async () => {
    if (!structureId) {
      toast.error('Structure non trouvée');
      return;
    }

    try {
      setSyncingNotion(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expirée');
        return;
      }

      const response = await supabase.functions.invoke('notion-sync', {
        body: { structureId, syncType: 'indicators' },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur de synchronisation');
      }

      if (response.data?.success) {
        toast.success(response.data.message || 'Synchronisation Notion réussie');
      } else {
        throw new Error(response.data?.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Notion sync error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la synchronisation Notion');
    } finally {
      setSyncingNotion(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleAirtableSync}
        disabled={syncingAirtable || !structureId}
      >
        {syncingAirtable ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        Sync Airtable
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleNotionSync}
        disabled={syncingNotion || !structureId}
      >
        {syncingNotion ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        Sync Notion
      </Button>
    </div>
  );
}
