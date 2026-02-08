import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  FileText, 
  Copy, 
  Download, 
  RotateCcw, 
  Loader2, 
  Bot, 
  User,
  FileDown,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: 'lettre' | 'protocole' | 'rapport' | 'autre';
}

const TEMPLATES: DocumentTemplate[] = [
  {
    id: 'lettre-adressage',
    title: 'Lettre d\'adressage',
    description: 'Courrier pour orienter un patient vers un spécialiste',
    prompt: 'Génère une lettre d\'adressage professionnelle pour orienter un patient vers un spécialiste. Inclus les sections : objet, contexte clinique, motif d\'adressage, antécédents pertinents, examens réalisés, et conclusion.',
    category: 'lettre'
  },
  {
    id: 'protocole-soins',
    title: 'Protocole de soins',
    description: 'Document décrivant un protocole de prise en charge',
    prompt: 'Génère un protocole de soins structuré avec : objectifs, critères d\'inclusion, étapes de prise en charge, suivi, et indicateurs de qualité.',
    category: 'protocole'
  },
  {
    id: 'rapport-activite',
    title: 'Rapport d\'activité',
    description: 'Rapport mensuel ou annuel d\'activité MSP',
    prompt: 'Génère un rapport d\'activité pour une MSP avec : synthèse, indicateurs clés (nombre de patients, consultations, RCP), faits marquants, difficultés rencontrées, et perspectives.',
    category: 'rapport'
  },
  {
    id: 'compte-rendu-rcp',
    title: 'Compte-rendu RCP',
    description: 'Compte-rendu de réunion de concertation pluridisciplinaire',
    prompt: 'Génère un compte-rendu de RCP avec : participants, cas discutés (anonymisés), décisions prises, actions à mener, et prochaine réunion.',
    category: 'rapport'
  },
  {
    id: 'convention-partenariat',
    title: 'Convention de partenariat',
    description: 'Accord de collaboration avec un partenaire externe',
    prompt: 'Génère une convention de partenariat entre une MSP et un partenaire (hôpital, CPTS, etc.) avec : parties, objet, engagements réciproques, modalités, durée, et signatures.',
    category: 'protocole'
  },
  {
    id: 'note-interne',
    title: 'Note interne',
    description: 'Communication interne à l\'équipe',
    prompt: 'Génère une note interne professionnelle pour l\'équipe MSP avec : objet, contexte, informations clés, actions attendues, et échéances.',
    category: 'autre'
  }
];

const CATEGORY_CONFIG = {
  lettre: { label: 'Lettres', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  protocole: { label: 'Protocoles', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  rapport: { label: 'Rapports', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  autre: { label: 'Autres', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' }
};

export default function WritingAssistantSection() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const streamChat = useCallback(async (userMessage: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coordination-writing-assistant`;
    
    const allMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage }
    ];

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: allMessages }),
    });

    if (resp.status === 429) {
      throw new Error('Limite de requêtes atteinte, veuillez réessayer plus tard.');
    }
    if (resp.status === 402) {
      throw new Error('Crédits épuisés, veuillez recharger votre compte.');
    }
    if (!resp.ok || !resp.body) {
      throw new Error('Erreur de connexion au service IA');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            // Update the last assistant message
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant') {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: 'assistant', content: assistantContent, timestamp: new Date() }];
            });
            // Also update the document preview
            setGeneratedDocument(assistantContent);
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    return assistantContent;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      await streamChat(userMessage);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la génération');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateClick = (template: DocumentTemplate) => {
    setInput(template.prompt);
    textareaRef.current?.focus();
  };

  const handleReset = () => {
    setMessages([]);
    setGeneratedDocument('');
    setInput('');
    toast.success('Conversation réinitialisée');
  };

  const handleDownloadPdf = async () => {
    if (!generatedDocument) {
      toast.error('Aucun document à télécharger');
      return;
    }

    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - 2 * margin;
      
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(generatedDocument, maxWidth);
      
      let y = margin;
      const lineHeight = 7;
      const pageHeight = doc.internal.pageSize.getHeight();

      for (const line of lines) {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }

      doc.save(`document-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Document PDF téléchargé');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const handleDownloadDocx = () => {
    if (!generatedDocument) {
      toast.error('Aucun document à télécharger');
      return;
    }

    // Create a simple text file as DOCX alternative
    const blob = new Blob([generatedDocument], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Document texte téléchargé');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="h-[700px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Assistant de rédaction</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-[calc(100%-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Left Panel - Chat */}
          <div className="flex flex-col h-full border rounded-lg">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="mx-2 mt-2 grid grid-cols-2">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="templates">Modèles</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chat" className="flex-1 flex flex-col m-0 p-2 overflow-hidden">
                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Démarrez une conversation ou choisissez un modèle</p>
                      </div>
                    )}
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-2 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-lg p-3 text-sm ${
                            message.role === 'assistant'
                              ? 'bg-muted'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                        {message.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === 'user' && (
                      <div className="flex gap-2 justify-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                <div className="flex gap-2 mt-2 pt-2 border-t">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Décrivez le document à générer..."
                    className="min-h-[60px] max-h-[120px] resize-none"
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={handleSend} 
                    disabled={!input.trim() || isLoading}
                    className="self-end"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="templates" className="flex-1 m-0 p-2 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
                      const categoryTemplates = TEMPLATES.filter(t => t.category === category);
                      if (categoryTemplates.length === 0) return null;
                      
                      return (
                        <div key={category} className="space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {config.label}
                          </h4>
                          {categoryTemplates.map(template => (
                            <button
                              key={template.id}
                              onClick={() => handleTemplateClick(template)}
                              className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{template.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {template.description}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Document Preview (Artifact) */}
          <div className="flex flex-col h-full border rounded-lg">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Aperçu du document</span>
                {generatedDocument && (
                  <Badge variant="secondary" className="text-xs">
                    {generatedDocument.length} caractères
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {generatedDocument && (
                  <CopyToClipboard 
                    text={generatedDocument}
                    variant="ghost"
                    size="icon"
                  />
                )}
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={!generatedDocument}
                  title="Télécharger en PDF"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleDownloadDocx}
                  disabled={!generatedDocument}
                  title="Télécharger en texte"
                >
                  <FileDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {generatedDocument ? (
                <Textarea
                  value={generatedDocument}
                  onChange={(e) => setGeneratedDocument(e.target.value)}
                  className="h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm"
                  placeholder="Le document généré apparaîtra ici..."
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Le document généré apparaîtra ici</p>
                    <p className="text-xs mt-1">Utilisez le chat pour commencer</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
