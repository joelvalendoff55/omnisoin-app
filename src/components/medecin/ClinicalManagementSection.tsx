import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Send,
  Loader2,
  FileText,
  ClipboardList,
  Calendar,
  Mail,
  Download,
  Copy,
  User,
  Bot,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { MedicalDisclaimer } from './MedicalDisclaimer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const LETTER_TEMPLATES = [
  {
    id: 'referral',
    title: 'Lettre d\'adressage',
    icon: Mail,
    prompt: 'Génère une lettre d\'adressage pour orienter le patient vers un spécialiste',
  },
  {
    id: 'follow-up',
    title: 'Plan de surveillance',
    icon: Calendar,
    prompt: 'Propose un plan de surveillance adapté pour ce patient',
  },
  {
    id: 'exams',
    title: 'Examens complémentaires',
    icon: ClipboardList,
    prompt: 'Suggère les examens complémentaires pertinents à prescrire',
  },
];

export function ClinicalManagementSection() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [patientContext, setPatientContext] = useState('');
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageContent?: string) => {
    const content = messageContent || inputMessage.trim();
    if (!content) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .map((m) => `${m.role === 'user' ? 'Médecin' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const { data, error } = await supabase.functions.invoke('multi-llm', {
        body: {
          prompt: `${conversationHistory ? `Historique de la conversation:\n${conversationHistory}\n\n` : ''}Médecin: ${content}`,
          patientContext: patientContext || 'Consultation médicale',
          mode: 'analysis',
        },
      });

      if (error) throw error;

      const assistantResponse = data.geminiResponse || data.perplexityResponse || 'Désolé, je n\'ai pas pu générer de réponse.';

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateClick = async (template: typeof LETTER_TEMPLATES[0]) => {
    setActiveTab('templates');
    setIsLoading(true);
    setGeneratedContent(null);

    try {
      const { data, error } = await supabase.functions.invoke('multi-llm', {
        body: {
          prompt: `${template.prompt}. ${patientContext ? `Contexte patient: ${patientContext}` : ''}`,
          patientContext: patientContext || 'Génération de document médical',
          mode: 'analysis',
        },
      });

      if (error) throw error;

      const content = data.geminiResponse || data.perplexityResponse || '';
      setGeneratedContent(content);
    } catch (err) {
      console.error('Error generating template:', err);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!generatedContent) return;

    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      doc.setFontSize(12);
      const lines = doc.splitTextToSize(generatedContent, 170);
      doc.text(lines, 20, 20);

      doc.save(`document-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
      toast.success('PDF généré');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const clearChat = () => {
    setMessages([]);
    setGeneratedContent(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Conduite à tenir</h2>
      </div>

      <MedicalDisclaimer variant="info" />

      {/* Patient Context */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Contexte patient</label>
            <Textarea
              placeholder="Résumez le cas clinique pour des suggestions plus pertinentes..."
              value={patientContext}
              onChange={(e) => setPatientContext(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat interactif
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Modèles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {/* Messages */}
              <ScrollArea className="h-[300px] p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Posez vos questions sur la conduite à tenir</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {format(msg.timestamp, 'HH:mm', { locale: fr })}
                          </p>
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground">Réflexion en cours...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Posez votre question..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={isLoading || !inputMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {messages.length > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={clearChat}
                    className="mt-2 p-0 h-auto"
                  >
                    Effacer la conversation
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4 space-y-4">
          {/* Template Buttons */}
          <div className="grid grid-cols-3 gap-3">
            {LETTER_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <Button
                  key={template.id}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => handleTemplateClick(template)}
                  disabled={isLoading}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{template.title}</span>
                </Button>
              );
            })}
          </div>

          {/* Generated Content */}
          {isLoading && (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-muted-foreground">Génération en cours...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {generatedContent && !isLoading && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Document généré</span>
                  <div className="flex gap-2">
                    <CopyToClipboard text={generatedContent} variant="ghost" size="sm" />
                    <Button variant="ghost" size="sm" onClick={handleGeneratePdf}>
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="whitespace-pre-wrap text-sm">{generatedContent}</div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
