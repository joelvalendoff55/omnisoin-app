import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Clock, ChevronRight, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useStructureId } from '@/hooks/useStructureId';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RecentPatient {
  id: string;
  first_name: string;
  last_name: string;
  last_visit: string;
  reason?: string;
}

export function RecentPatientsWidget() {
  const { structureId, loading: structureLoading } = useStructureId();
  const [patients, setPatients] = useState<RecentPatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (structureLoading || !structureId) return;

    const fetchRecentPatients = async () => {
      setLoading(true);
      try {
        // Get patients from completed queue entries today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('patient_queue')
          .select(`
            id,
            completed_at,
            reason,
            patient:patients!inner(id, first_name, last_name)
          `)
          .eq('structure_id', structureId)
          .eq('status', 'completed')
          .gte('completed_at', today.toISOString())
          .order('completed_at', { ascending: false })
          .limit(8);

        if (error) throw error;

        const recentPatients: RecentPatient[] = (data || []).map((entry: any) => ({
          id: entry.patient.id,
          first_name: entry.patient.first_name,
          last_name: entry.patient.last_name,
          last_visit: entry.completed_at,
          reason: entry.reason,
        }));

        // Remove duplicates (same patient seen multiple times)
        const uniquePatients = recentPatients.filter(
          (patient, index, self) => index === self.findIndex((p) => p.id === patient.id)
        );

        setPatients(uniquePatients);
      } catch (error) {
        console.error('Error fetching recent patients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPatients();
  }, [structureId, structureLoading]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Derniers patients vus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Derniers patients vus
            {patients.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {patients.length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link to="/patients">Voir tous</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {patients.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun patient vu aujourd'hui</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-2">
            <div className="space-y-2">
              {patients.map((patient) => (
                <Link
                  key={patient.id}
                  to={`/patients/${patient.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <Avatar className="h-10 w-10 border">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {getInitials(patient.first_name, patient.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(patient.last_visit), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                      {patient.reason && (
                        <>
                          <span>•</span>
                          <span className="truncate">{patient.reason}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
