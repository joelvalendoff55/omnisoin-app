"use client";

import { useState, useEffect } from 'react';
import { usePatientAuth } from '@/hooks/usePatientAuth';
import { useAdminPatientContext } from '@/hooks/useAdminPatientContext';
import { PatientLayout } from '@/components/patient-portal/PatientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Send, 
  Plus,
  Search,
  Paperclip,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  getPatientMessages, 
  sendPatientMessage,
  groupMessagesIntoConversations,
  PatientMessage,
} from '@/lib/patientPortal';

interface Conversation {
  id: string;
  practitioner: string;
  practitionerRole: string;
  lastMessage: string;
  lastMessageDate: Date;
  unreadCount: number;
  messages: PatientMessage[];
}

export default function PatientMessages() {
  const { patient } = usePatientAuth();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newConversationSubject, setNewConversationSubject] = useState('');
  const [newConversationMessage, setNewConversationMessage] = useState('');

  useEffect(() => {
    if (!patient?.patientId) return;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const messages = await getPatientMessages(patient.patientId);
        const grouped = groupMessagesIntoConversations(messages);
        setConversations(grouped);
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Erreur lors du chargement des messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [patient?.patientId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !patient?.patientId || !patient?.structureId) return;
    
    setSending(true);
    try {
      const messageId = await sendPatientMessage(
        patient.patientId,
        selectedConversation?.practitioner || 'Nouveau message',
        newMessage,
        patient.structureId
      );
      
      if (messageId) {
        // Add message to local state
        const newMsg: PatientMessage = {
          id: messageId,
          patient_id: patient.patientId,
          practitioner_id: null,
          practitioner_name: 'Vous',
          subject: null,
          content: newMessage,
          is_read: false,
          direction: 'patient_to_practitioner',
          created_at: new Date().toISOString(),
          read_at: null,
          structure_id: patient.structureId,
        };

        if (selectedConversation) {
          setSelectedConversation({
            ...selectedConversation,
            messages: [...selectedConversation.messages, newMsg],
            lastMessage: newMessage,
            lastMessageDate: new Date(),
          });
          
          setConversations(conversations.map(c => 
            c.id === selectedConversation.id 
              ? { ...c, messages: [...c.messages, newMsg], lastMessage: newMessage, lastMessageDate: new Date() }
              : c
          ));
        }
        
        setNewMessage('');
        toast.success('Message envoyé');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = async () => {
    if (!newConversationMessage.trim() || !patient?.patientId || !patient?.structureId) return;
    
    try {
      const messageId = await sendPatientMessage(
        patient.patientId,
        newConversationSubject || 'Nouveau message',
        newConversationMessage,
        patient.structureId
      );
      
      if (messageId) {
        toast.success('Message envoyé');
        setNewConversationOpen(false);
        setNewConversationSubject('');
        setNewConversationMessage('');
        
        // Reload messages
        const messages = await getPatientMessages(patient.patientId);
        const grouped = groupMessagesIntoConversations(messages);
        setConversations(grouped);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.practitioner.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <PatientLayout>
      <div className="h-[calc(100vh-200px)] flex gap-6">
        {/* Conversations List */}
        <Card className={cn(
          "w-full lg:w-96 flex flex-col",
          selectedConversation && "hidden lg:flex"
        )}>
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Messages
                  {totalUnread > 0 && (
                    <Badge variant="destructive">{totalUnread}</Badge>
                  )}
                </CardTitle>
                <CardDescription>Échangez avec votre équipe médicale</CardDescription>
              </div>
              <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouveau message</DialogTitle>
                    <DialogDescription>
                      Envoyez un message à votre équipe médicale
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Sujet</Label>
                      <Input 
                        placeholder="Objet de votre message"
                        value={newConversationSubject}
                        onChange={(e) => setNewConversationSubject(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea 
                        placeholder="Votre message..."
                        rows={4}
                        value={newConversationMessage}
                        onChange={(e) => setNewConversationMessage(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewConversationOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleNewConversation} disabled={!newConversationMessage.trim()}>
                      Envoyer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {loading ? (
                  <>
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Aucune conversation</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setNewConversationOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nouveau message
                    </Button>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={cn(
                        "w-full p-4 rounded-xl border text-left transition-all hover:shadow-md",
                        conv.unreadCount > 0 
                          ? "bg-primary/5 border-primary/20" 
                          : "bg-background hover:bg-accent",
                        selectedConversation?.id === conv.id && "ring-2 ring-primary"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {conv.practitioner.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn(
                              "font-medium truncate",
                              conv.unreadCount > 0 && "text-foreground"
                            )}>
                              {conv.practitioner}
                            </p>
                            {conv.unreadCount > 0 && (
                              <Badge variant="destructive" className="flex-shrink-0">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{conv.practitionerRole}</p>
                          <p className={cn(
                            "text-sm truncate mt-1",
                            conv.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {conv.lastMessage}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(conv.lastMessageDate, { addSuffix: true, locale: fr })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Conversation Detail */}
        <Card className={cn(
          "flex-1 flex flex-col",
          !selectedConversation && "hidden lg:flex"
        )}>
          {selectedConversation ? (
            <>
              <CardHeader className="flex-shrink-0 border-b">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="lg:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedConversation.practitioner.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedConversation.practitioner}</CardTitle>
                    <CardDescription>{selectedConversation.practitionerRole}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {selectedConversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.direction === 'patient_to_practitioner' ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className={cn(
                          "max-w-[80%] rounded-2xl p-4",
                          msg.direction === 'patient_to_practitioner'
                            ? "bg-primary text-primary-foreground rounded-br-md" 
                            : "bg-accent rounded-bl-md"
                        )}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={cn(
                            "text-xs mt-2",
                            msg.direction === 'patient_to_practitioner' ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
              
              <div className="flex-shrink-0 p-4 border-t">
                <div className="flex items-end gap-2">
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Textarea
                    placeholder="Écrivez votre message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={1}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    size="icon"
                    className="flex-shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Sélectionnez une conversation</p>
                <p className="text-sm">Ou créez-en une nouvelle</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PatientLayout>
  );
}
