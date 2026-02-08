import { Link } from 'react-router-dom';
import { Phone, ArrowRight, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CallbackItem } from '@/hooks/useAssistantDashboard';

interface AssistantCallbackWidgetProps {
  items: CallbackItem[];
  loading: boolean;
}

export function AssistantCallbackWidget({ items, loading }: AssistantCallbackWidgetProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5 text-primary" />
            Appels à rappeler
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/inbox" className="gap-1">
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{items.length}</span> rappel{items.length !== 1 ? 's' : ''} en attente
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Phone className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun rappel en attente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  to={`/inbox?message=${item.id}`}
                  className="block p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.patient
                          ? `${item.patient.first_name} ${item.patient.last_name}`
                          : item.sender_phone || 'Inconnu'}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.text_body || 'Demande de rappel'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(item.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
