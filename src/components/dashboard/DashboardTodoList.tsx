import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, Mic, ArrowRight, AlertCircle } from 'lucide-react';
import { useTodoItems, TodoInboxItem, TodoTranscriptItem } from '@/hooks/useTodoItems';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DashboardTodoList() {
  const { inboxItems, transcriptItems, loading } = useTodoItems();

  const hasItems = inboxItems.length > 0 || transcriptItems.length > 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-warning" />
          À traiter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !hasItems ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun élément à traiter</p>
          </div>
        ) : (
          <>
            {/* Inbox Items */}
            {inboxItems.length > 0 && (
              <div data-testid="dashboard-todo-inbox" className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Messages non rattachés
                  </span>
                  <Link
                    to="/inbox?filter=unassigned"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Voir tout <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {inboxItems.slice(0, 3).map((item) => (
                  <InboxTodoItem key={item.id} item={item} />
                ))}
              </div>
            )}

            {/* Transcript Items */}
            {transcriptItems.length > 0 && (
              <div
                data-testid="dashboard-todo-transcripts"
                className={inboxItems.length > 0 ? 'pt-4 border-t' : ''}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Transcriptions en attente
                  </span>
                  <Link
                    to="/transcripts?status=uploaded"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Voir tout <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {transcriptItems.slice(0, 3).map((item) => (
                  <TranscriptTodoItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function InboxTodoItem({ item }: { item: TodoInboxItem }) {
  return (
    <Link
      to={`/inbox?openMessage=${item.id}`}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="p-2 rounded-lg bg-accent/10">
        <Inbox className="h-4 w-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {item.sender_phone || 'Expéditeur inconnu'}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {item.text_body?.substring(0, 50) || 'Message média'}
        </p>
      </div>
      <Badge variant="secondary" className="text-xs flex-shrink-0">
        {format(new Date(item.created_at), 'dd MMM', { locale: fr })}
      </Badge>
    </Link>
  );
}

function TranscriptTodoItem({ item }: { item: TodoTranscriptItem }) {
  return (
    <Link
      to={`/transcripts?openTranscript=${item.id}`}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="p-2 rounded-lg bg-warning/10">
        <Mic className="h-4 w-4 text-warning" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {item.patient_name}
        </p>
        <p className="text-xs text-muted-foreground">En attente de transcription</p>
      </div>
      <Badge variant="secondary" className="text-xs flex-shrink-0">
        {format(new Date(item.created_at), 'dd MMM', { locale: fr })}
      </Badge>
    </Link>
  );
}
