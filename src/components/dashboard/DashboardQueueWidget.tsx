import { useEffect, useState } from 'react';
import { Clock, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useStructureId } from '@/hooks/useStructureId';
import { supabase } from '@/integrations/supabase/client';

export default function DashboardQueueWidget() {
  const { structureId } = useStructureId();
  const [waitingCount, setWaitingCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueueStats = async () => {
      if (!structureId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('patient_queue')
          .select('status')
          .eq('structure_id', structureId)
          .in('status', ['waiting', 'in_consultation']);

        if (error) throw error;

        const waiting = data?.filter(e => e.status === 'waiting').length || 0;
        const inProgress = data?.filter(e => e.status === 'in_consultation').length || 0;

        setWaitingCount(waiting);
        setInProgressCount(inProgress);
      } catch (err) {
        console.error('Error fetching queue stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQueueStats();

    // Realtime subscription
    if (!structureId) return;

    const channel = supabase
      .channel('dashboard_queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_queue',
          filter: `structure_id=eq.${structureId}`,
        },
        () => {
          fetchQueueStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          File d'attente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-2xl font-bold">{waitingCount}</span>
                <span className="text-sm text-muted-foreground">en attente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-2xl font-bold">{inProgressCount}</span>
                <span className="text-sm text-muted-foreground">en cours</span>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/queue" className="gap-2">
                Voir la file
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
