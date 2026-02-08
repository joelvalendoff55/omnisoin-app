"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import { useInboxRealtime } from '@/hooks/useInboxRealtime';
import { useAllHospitalPassages } from '@/hooks/useAllHospitalPassages';
import DashboardLayout from '@/components/layout/DashboardLayout';
import NoAccessPage from '@/components/layout/NoAccessPage';
import { InboxMessageDrawer } from '@/components/inbox/InboxMessageDrawer';
import GlobalHospitalPassagesSection from '@/components/hospital/GlobalHospitalPassagesSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchInboxMessages, getInboxMessageById, InboxMessage, InboxFilters, InboxStatus } from '@/lib/inbox';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Inbox,
  MessageSquare,
  Mic,
  Image,
  FileText,
  Phone,
  User,
  RefreshCw,
  AlertCircle,
  Building2,
  Bell,
} from 'lucide-react';

type PeriodFilter = '24h' | '7d' | '30d' | 'all';

export default function InboxPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isCoordinator, isAssistant, loading: roleLoading } = useRole();
  const { structureId, loading: structureLoading } = useStructureId();
  const router = useRouter();
  const [searchParams, setSearchParams] = useSearchParams();

  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState('messages');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<InboxStatus | 'all'>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('7d');

  // Hospital passages
  const { newPassagesCount } = useAllHospitalPassages({ period: '24h' });

  const canAssign = isAdmin || isCoordinator || isAssistant;

  const loadMessages = useCallback(async () => {
    if (!structureId) return;
    setLoading(true);
    try {
      const filters: InboxFilters = {
        unassignedOnly,
        status: statusFilter,
        period: periodFilter,
      };
      const data = await fetchInboxMessages(structureId, filters);
      setMessages(data);
    } catch (error) {
      console.error('Error loading inbox messages:', error);
    } finally {
      setLoading(false);
    }
  }, [structureId, unassignedOnly, statusFilter, periodFilter]);

  // Realtime updates - refresh list when new messages arrive
  useInboxRealtime({
    enabled: !!structureId && !!user,
    onRefresh: loadMessages,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && structureId) {
      loadMessages();
    }
  }, [user, structureId, loadMessages]);

  // Handle openMessage query param from GlobalSearch
  useEffect(() => {
    const openMessageId = searchParams.get('openMessage');
    if (openMessageId && !loading && messages.length >= 0) {
      // Try to find in loaded messages first
      const found = messages.find((m) => m.id === openMessageId);
      if (found) {
        setSelectedMessage(found);
        setDrawerOpen(true);
      } else {
        // Fetch directly if not in list
        getInboxMessageById(openMessageId).then((message) => {
          if (message) {
            setSelectedMessage(message);
            setDrawerOpen(true);
          }
        });
      }
      // Clean URL
      setSearchParams((params) => {
        params.delete('openMessage');
        return params;
      }, { replace: true });
    }
  }, [searchParams, loading, messages, setSearchParams]);

  const handleMessageClick = (message: InboxMessage) => {
    setSelectedMessage(message);
    setDrawerOpen(true);
  };

  const handleMessageUpdated = () => {
    loadMessages();
  };

  // Count unassigned messages (client-side)
  const unassignedCount = useMemo(() => {
    return messages.filter((m) => !m.patient_id).length;
  }, [messages]);

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'audio':
        return <Mic className="h-4 w-4" />;
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'ready':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPreview = (message: InboxMessage): string => {
    if (message.message_type === 'text' && message.text_body) {
      return message.text_body.length > 60
        ? message.text_body.substring(0, 60) + '...'
        : message.text_body;
    }
    const typeLabels: Record<string, string> = {
      audio: '🎤 Audio',
      image: '🖼️ Image',
      document: '📄 Document',
    };
    return typeLabels[message.message_type] || 'Message';
  };

  const isLoading = authLoading || roleLoading || structureLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary text-lg">Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  if (!structureId) {
    return <NoAccessPage />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              Inbox
              {(unassignedCount > 0 || newPassagesCount > 0) && (
                <div className="flex gap-2">
                  {unassignedCount > 0 && (
                    <Badge variant="destructive" className="text-sm">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {unassignedCount} non rattaché{unassignedCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {newPassagesCount > 0 && (
                    <Badge variant="default" className="text-sm bg-orange-600">
                      <Building2 className="h-3 w-3 mr-1" />
                      {newPassagesCount} passage{newPassagesCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Messages et flux hospitaliers à traiter
            </p>
          </div>
          <Button variant="outline" onClick={loadMessages} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
              {unassignedCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unassignedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="hospital" className="gap-2">
              <Building2 className="h-4 w-4" />
              Flux Hôpital
              {newPassagesCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-orange-100 text-orange-700">
                  {newPassagesCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="mt-6 space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <Tabs
                value={unassignedOnly ? 'unassigned' : 'all'}
                onValueChange={(v) => setUnassignedOnly(v === 'unassigned')}
              >
                <TabsList>
                  <TabsTrigger value="all">Tous</TabsTrigger>
                  <TabsTrigger value="unassigned" className="gap-1">
                    Non rattachés
                    {unassignedCount > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                        {unassignedCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as InboxStatus | 'all')}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous status</SelectItem>
                  <SelectItem value="received">Reçu</SelectItem>
                  <SelectItem value="processing">En cours</SelectItem>
                  <SelectItem value="ready">Prêt</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={periodFilter}
                onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Dernières 24h</SelectItem>
                  <SelectItem value="7d">7 derniers jours</SelectItem>
                  <SelectItem value="30d">30 derniers jours</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Messages List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="h-5 w-5" />
                  Messages ({messages.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse flex items-center gap-4 p-4 border rounded-lg"
                      >
                        <div className="h-4 w-20 bg-muted rounded" />
                        <div className="h-4 w-16 bg-muted rounded" />
                        <div className="h-4 flex-1 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div data-testid="inbox-empty" className="text-center py-12 text-muted-foreground">
                    <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun message</p>
                    <p className="text-sm mt-1">
                      Les messages WhatsApp et Web apparaîtront ici.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((message) => (
                      <button
                        key={message.id}
                        data-testid="inbox-message"
                        data-status={message.status}
                        data-assigned={message.patient_id ? 'true' : 'false'}
                        className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                        onClick={() => handleMessageClick(message)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(message.created_at), 'dd MMM HH:mm', { locale: fr })}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={message.channel === 'whatsapp' ? 'default' : 'secondary'} className="text-xs">
                              {message.channel === 'whatsapp' ? 'WA' : 'Web'}
                            </Badge>
                            <Badge variant="outline" className="text-xs gap-1">
                              {getMessageTypeIcon(message.message_type)}
                              {message.message_type}
                            </Badge>
                            <Badge variant={getStatusBadgeVariant(message.status)} className="text-xs">
                              {message.status}
                            </Badge>
                            {message.patient ? (
                              <Badge variant="default" className="text-xs bg-green-600">Assigné</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">Non rattaché</Badge>
                            )}
                          </div>
                          {message.sender_phone && (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground font-mono">
                              <Phone className="h-3 w-3" />
                              {message.sender_phone}
                            </span>
                          )}
                          {message.patient && (
                            <span className="flex items-center gap-1 text-sm text-primary">
                              <User className="h-3 w-3" />
                              {message.patient.first_name} {message.patient.last_name}
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground truncate flex-1">
                            {getPreview(message)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hospital" className="mt-6">
            <GlobalHospitalPassagesSection />
          </TabsContent>
        </Tabs>

        {/* Message Drawer */}
        {user && structureId && (
          <InboxMessageDrawer
            message={selectedMessage}
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            structureId={structureId}
            userId={user.id}
            canAssign={canAssign}
            onMessageUpdated={handleMessageUpdated}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
