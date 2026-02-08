"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Calendar, MessageSquare, FileText, HelpCircle, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { usePatientAuth } from '@/hooks/usePatientAuth';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  label: string;
  icon: string;
  message: string;
}

interface ChatbotSettings {
  system_prompt: string | null;
  welcome_message: string;
  quick_questions: QuickAction[];
  is_enabled: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'calendar': <Calendar className="w-3 h-3" />,
  'file-text': <FileText className="w-3 h-3" />,
  'message-square': <MessageSquare className="w-3 h-3" />,
  'help-circle': <HelpCircle className="w-3 h-3" />,
};

const DEFAULT_SETTINGS: ChatbotSettings = {
  system_prompt: null,
  welcome_message: "Bonjour ! 👋 Je suis OmniSoin Assist, votre assistant virtuel. Comment puis-je vous aider aujourd'hui ?",
  quick_questions: [
    { label: 'Prendre RDV', icon: 'calendar', message: 'Comment puis-je prendre un rendez-vous ?' },
    { label: 'Mes documents', icon: 'file-text', message: 'Comment accéder à mes documents médicaux ?' },
    { label: 'Contacter équipe', icon: 'message-square', message: 'Comment contacter mon médecin ?' },
    { label: 'Horaires', icon: 'help-circle', message: "Quels sont les horaires d'ouverture ?" },
  ],
  is_enabled: true,
};

// Check if Web Speech API is supported
const isSpeechRecognitionSupported = typeof window !== 'undefined' && 
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

const isSpeechSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function PatientChatbot() {
  const { patient } = usePatientAuth();
  const [settings, setSettings] = useState<ChatbotSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // STT state
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // TTS state
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (isSpeechRecognitionSupported) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        
        if (final) {
          setInput(prev => prev + final);
          setInterimTranscript('');
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        if (isRecording) {
          // Restart if still recording
          try {
            recognition.start();
          } catch (e) {
            setIsRecording(false);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [isRecording]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setInterimTranscript('');
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Failed to start recording:', e);
      }
    }
  }, [isRecording]);

  // TTS - Speak message
  const speakMessage = useCallback((messageId: string, text: string) => {
    if (!isSpeechSynthesisSupported) return;

    // Stop current speech if any
    window.speechSynthesis.cancel();

    if (speakingMessageId === messageId) {
      setSpeakingMessageId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1;
    utterance.pitch = 1;

    // Try to find a French voice
    const voices = window.speechSynthesis.getVoices();
    const frenchVoice = voices.find(v => v.lang.startsWith('fr'));
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    utteranceRef.current = utterance;
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  }, [speakingMessageId]);

  // Stop TTS when component unmounts or chat closes
  useEffect(() => {
    return () => {
      if (isSpeechSynthesisSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen && isSpeechSynthesisSupported) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
  }, [isOpen]);

  // Load chatbot settings for patient's structure
  useEffect(() => {
    const loadSettings = async () => {
      if (!patient?.patientId) {
        setSettingsLoaded(true);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_patient_chatbot_settings', {
          _patient_id: patient.patientId
        });

        if (error) throw error;

        if (data && data.length > 0) {
          const row = data[0];
          if (!row.is_enabled) {
            setSettings({ ...DEFAULT_SETTINGS, is_enabled: false });
          } else {
            setSettings({
              system_prompt: row.system_prompt,
              welcome_message: row.welcome_message || DEFAULT_SETTINGS.welcome_message,
              quick_questions: Array.isArray(row.quick_questions) 
                ? (row.quick_questions as unknown as QuickAction[])
                : DEFAULT_SETTINGS.quick_questions,
              is_enabled: row.is_enabled,
            });
          }
        }
      } catch (error) {
        console.error('Error loading chatbot settings:', error);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadSettings();
  }, [patient?.patientId]);

  // Initialize welcome message when settings are loaded
  useEffect(() => {
    if (settingsLoaded && settings.is_enabled && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: settings.welcome_message,
        timestamp: new Date(),
      }]);
    }
  }, [settingsLoaded, settings.welcome_message, settings.is_enabled, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const streamChat = useCallback(async (userMessage: string) => {
    const CHAT_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/patient-chatbot`;
    
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages.filter(m => m.id !== 'welcome'), userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
          patientId: patient?.patientId,
          customPrompt: settings.system_prompt,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Erreur de connexion');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      const assistantId = crypto.randomUUID();

      // Add empty assistant message
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      let streamDone = false;
      while (!streamDone) {
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
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => prev.map(m => 
                m.id === assistantId ? { ...m, content: assistantContent } : m
              ));
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Désolé, je rencontre des difficultés techniques. Veuillez réessayer ou utiliser la messagerie pour contacter l\'équipe soignante.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, patient?.patientId, settings.system_prompt]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput('');
    setInterimTranscript('');
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }
    streamChat(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (isLoading) return;
    streamChat(action.message);
  };

  // Don't render if chatbot is disabled or not loaded
  if (!settingsLoaded || !settings.is_enabled) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center group",
          "bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500",
          "hover:scale-110 hover:shadow-xl",
          isOpen && "scale-0 opacity-0"
        )}
        aria-label="Ouvrir l'assistant"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-6rem)]",
          "bg-white rounded-2xl shadow-2xl border border-border/50 overflow-hidden",
          "flex flex-col transition-all duration-300 origin-bottom-right",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm">OmniSoin Assist</h3>
            <p className="text-white/80 text-xs">Assistant virtuel</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-teal-600" />
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div
                    className={cn(
                      "px-3 py-2 rounded-2xl text-sm",
                      message.role === 'user'
                        ? "bg-teal-500 text-white rounded-br-md"
                        : "bg-gray-100 text-gray-800 rounded-bl-md"
                    )}
                  >
                    {message.content || (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </div>
                  {/* TTS button for assistant messages */}
                  {message.role === 'assistant' && message.content && isSpeechSynthesisSupported && (
                    <button
                      onClick={() => speakMessage(message.id, message.content)}
                      className={cn(
                        "self-start flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors",
                        speakingMessageId === message.id
                          ? "bg-teal-100 text-teal-700"
                          : "text-gray-400 hover:text-teal-600 hover:bg-teal-50"
                      )}
                      title={speakingMessageId === message.id ? "Arrêter la lecture" : "Écouter"}
                    >
                      {speakingMessageId === message.id ? (
                        <>
                          <VolumeX className="w-3 h-3" />
                          <span className="animate-pulse">Lecture...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3" />
                          <span>Écouter</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-teal-600" />
                </div>
                <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Questions fréquentes :</p>
            <div className="flex flex-wrap gap-1.5">
              {settings.quick_questions.slice(0, 4).map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action)}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-teal-50 text-teal-700 rounded-full hover:bg-teal-100 transition-colors disabled:opacity-50"
                >
                  {ICON_MAP[action.icon] || <HelpCircle className="w-3 h-3" />}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-xs text-red-600 font-medium">Enregistrement en cours...</span>
            {interimTranscript && (
              <span className="text-xs text-red-500 italic truncate flex-1">{interimTranscript}</span>
            )}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-border/50 bg-gray-50">
          <div className="flex items-end gap-2">
            {/* Mic button for STT */}
            {isSpeechRecognitionSupported && (
              <Button
                onClick={toggleRecording}
                disabled={isLoading}
                size="icon"
                variant={isRecording ? "destructive" : "outline"}
                className={cn(
                  "h-9 w-9 rounded-xl flex-shrink-0 transition-all",
                  isRecording && "animate-pulse"
                )}
                title={isRecording ? "Arrêter la dictée" : "Dicter un message"}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            )}
            <textarea
              ref={inputRef}
              value={input + (interimTranscript ? ` ${interimTranscript}` : '')}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écrivez ou dictez votre message..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              style={{ maxHeight: '100px' }}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-9 w-9 rounded-xl bg-teal-500 hover:bg-teal-600 flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Pour questions médicales, utilisez la messagerie sécurisée
          </p>
        </div>
      </div>
    </>
  );
}
