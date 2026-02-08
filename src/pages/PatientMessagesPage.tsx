import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Search,
  Send,
  ArrowLeft,
  User,
  Clock,
  CheckCheck,
  Filter,
  RefreshCw,
  Inbox,
  MessageCircle,
} from 'lucide-react';
import { usePractitionerMessages, PatientConversation, PractitionerMessage } from '@/hooks/usePractitionerMessages';
import { cn } from '@/lib/utils';

export default function PatientMessagesPage() {
  const {
    conversations,
    unreadCount,
    loading,
    sendReply,
    markConversationAsRead,
    refetch,
  } = usePractitionerMessages();

  const [selectedConversation, setSelectedConversation] = useState<PatientConversation | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread'>('all');
  const [sending, setSending] = useState(false);

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.patient_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || conv.unread_count > 0;
    return matchesSearch && matchesStatus;
  });

  // Handle conversation selection
  const handleSelectConversation = async (conv: PatientConversation) => {
    setSelectedConversation(conv);
    if (conv.unread_count > 0) {
      await markConversationAsRead(conv.patient_id);
    }
  };

  // Handle send reply
  const handleSendReply = async () => {
    if (!selectedConversation || !replyContent.trim()) return;

    setSending(true);
    await sendReply(selectedConversation.patient_id, replyContent.trim());
    setReplyContent('');
    setSending(false);
  };

  // Update selected conversation when data changes
  useEffect(() => {
    if (selectedConversation) {
      const updated = conversations.find(
        (c) => c.patient_id === selectedConversation.patient_id
      );
      if (updated) {
        setSelectedConversation(updated);
      }
    }
  }, [conversations, selectedConversation]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              Messagerie Patients
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les messages de vos patients
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-lg">Conversations</CardTitle>
                <Badge variant="secondary">{conversations.length}</Badge>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un patient..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as 'all' | 'unread')}
                >
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les messages</SelectItem>
                    <SelectItem value="unread">Non lus uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Chargement...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Aucune conversation</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations.map((conv) => (
                      <button
                        key={conv.patient_id}
                        onClick={() => handleSelectConversation(conv)}
                        className={cn(
                          'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                          selectedConversation?.patient_id === conv.patient_id &&
                            'bg-primary/5 border-l-2 border-primary'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(conv.patient_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">
                                {conv.patient_name}
                              </span>
                              {conv.unread_count > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {conv.unread_count}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {conv.last_message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(conv.last_message_date, {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Conversation Detail */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedConversation ? (
              <>
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(selectedConversation.patient_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {selectedConversation.patient_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedConversation.messages.length} message
                        {selectedConversation.messages.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 flex flex-col">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {selectedConversation.messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Reply Input */}
                  <div className="p-4 border-t bg-muted/30">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Écrivez votre réponse..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="min-h-[80px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            handleSendReply();
                          }
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-muted-foreground">
                        Ctrl/Cmd + Entrée pour envoyer
                      </p>
                      <Button
                        onClick={handleSendReply}
                        disabled={!replyContent.trim() || sending}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {sending ? 'Envoi...' : 'Envoyer'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">
                    Sélectionnez une conversation
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choisissez un patient pour voir les messages
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Message bubble component
function MessageBubble({ message }: { message: PractitionerMessage }) {
  const isFromPatient = message.direction === 'patient_to_practitioner';

  return (
    <div
      className={cn(
        'flex',
        isFromPatient ? 'justify-start' : 'justify-end'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg p-3',
          isFromPatient
            ? 'bg-muted text-foreground'
            : 'bg-primary text-primary-foreground'
        )}
      >
        {message.subject && (
          <p className={cn(
            'text-xs font-medium mb-1',
            isFromPatient ? 'text-muted-foreground' : 'text-primary-foreground/80'
          )}>
            {message.subject}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div
          className={cn(
            'flex items-center gap-2 mt-2 text-xs',
            isFromPatient ? 'text-muted-foreground' : 'text-primary-foreground/70'
          )}
        >
          <Clock className="h-3 w-3" />
          {format(new Date(message.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
          {!isFromPatient && message.is_read && (
            <CheckCheck className="h-3 w-3 ml-1" />
          )}
        </div>
      </div>
    </div>
  );
}
