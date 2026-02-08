import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChatbotSettings, QuickQuestion } from '@/hooks/useChatbotSettings';
import { 
  Bot, 
  Save, 
  Eye, 
  Plus, 
  Trash2, 
  GripVertical, 
  RotateCcw,
  Loader2,
  MessageCircle,
  Calendar,
  FileText,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_OPTIONS = [
  { value: 'calendar', label: 'Calendrier', icon: Calendar },
  { value: 'file-text', label: 'Document', icon: FileText },
  { value: 'message-square', label: 'Message', icon: MessageSquare },
  { value: 'help-circle', label: 'Aide', icon: HelpCircle },
];

const getIconComponent = (iconName: string) => {
  const option = ICON_OPTIONS.find(o => o.value === iconName);
  return option?.icon || HelpCircle;
};

export function ChatbotSettingsTab() {
  const { 
    settings, 
    isLoading, 
    isSaving, 
    saveSettings,
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_WELCOME,
    DEFAULT_QUESTIONS
  } = useChatbotSettings();
  
  const [localSettings, setLocalSettings] = useState(settings);
  const [showPreview, setShowPreview] = useState(false);
  const [newQuestion, setNewQuestion] = useState<QuickQuestion>({ label: '', icon: 'help-circle', message: '' });
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  // Sync local state with loaded settings
  useState(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentSettings = localSettings || settings;
  if (!currentSettings) return null;

  const handleSave = async () => {
    if (localSettings) {
      await saveSettings(localSettings);
    }
  };

  const handleResetToDefaults = () => {
    setLocalSettings({
      ...currentSettings,
      system_prompt: null,
      welcome_message: DEFAULT_WELCOME,
      quick_questions: DEFAULT_QUESTIONS,
    });
  };

  const handleAddQuestion = () => {
    if (!newQuestion.label || !newQuestion.message) return;
    
    setLocalSettings(prev => prev ? {
      ...prev,
      quick_questions: [...prev.quick_questions, newQuestion]
    } : null);
    
    setNewQuestion({ label: '', icon: 'help-circle', message: '' });
    setShowAddQuestion(false);
  };

  const handleRemoveQuestion = (index: number) => {
    setLocalSettings(prev => prev ? {
      ...prev,
      quick_questions: prev.quick_questions.filter((_, i) => i !== index)
    } : null);
  };

  const handleUpdateQuestion = (index: number, field: keyof QuickQuestion, value: string) => {
    setLocalSettings(prev => prev ? {
      ...prev,
      quick_questions: prev.quick_questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    } : null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-teal-500" />
            Chatbot Patient
          </h2>
          <p className="text-muted-foreground">
            Personnalisez l'assistant virtuel du portail patient
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Prévisualiser
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Prévisualisation du chatbot</DialogTitle>
              </DialogHeader>
              <ChatbotPreview settings={localSettings || currentSettings} />
            </DialogContent>
          </Dialog>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activation</CardTitle>
          <CardDescription>
            Activer ou désactiver le chatbot sur le portail patient
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                localSettings?.is_enabled ? "bg-teal-100" : "bg-gray-100"
              )}>
                <MessageCircle className={cn(
                  "w-5 h-5",
                  localSettings?.is_enabled ? "text-teal-600" : "text-gray-400"
                )} />
              </div>
              <div>
                <p className="font-medium">Chatbot patient</p>
                <p className="text-sm text-muted-foreground">
                  {localSettings?.is_enabled ? 'Actif sur le portail' : 'Désactivé'}
                </p>
              </div>
            </div>
            <Switch
              checked={localSettings?.is_enabled ?? true}
              onCheckedChange={(checked) => setLocalSettings(prev => prev ? { ...prev, is_enabled: checked } : null)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Welcome Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Message d'accueil</CardTitle>
          <CardDescription>
            Le premier message affiché aux patients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={localSettings?.welcome_message || ''}
            onChange={(e) => setLocalSettings(prev => prev ? { ...prev, welcome_message: e.target.value } : null)}
            placeholder={DEFAULT_WELCOME}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Quick Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Questions rapides</CardTitle>
              <CardDescription>
                Boutons d'actions rapides proposés aux patients
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAddQuestion(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {localSettings?.quick_questions.map((question, index) => {
            const IconComponent = getIconComponent(question.icon);
            return (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <IconComponent className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Input
                    value={question.label}
                    onChange={(e) => handleUpdateQuestion(index, 'label', e.target.value)}
                    placeholder="Label"
                    className="text-sm"
                  />
                  <Select
                    value={question.icon}
                    onValueChange={(value) => handleUpdateQuestion(index, 'icon', value)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <opt.icon className="w-4 h-4" />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={question.message}
                    onChange={(e) => handleUpdateQuestion(index, 'message', e.target.value)}
                    placeholder="Message envoyé"
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveQuestion(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}

          {/* Add question dialog */}
          <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une question rapide</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Label du bouton</Label>
                  <Input
                    value={newQuestion.label}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Ex: Prendre RDV"
                  />
                </div>
                <div>
                  <Label>Icône</Label>
                  <Select
                    value={newQuestion.icon}
                    onValueChange={(value) => setNewQuestion(prev => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <opt.icon className="w-4 h-4" />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Message envoyé</Label>
                  <Input
                    value={newQuestion.message}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Ex: Comment puis-je prendre un rendez-vous ?"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddQuestion(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddQuestion} disabled={!newQuestion.label || !newQuestion.message}>
                    Ajouter
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Prompt système (avancé)</CardTitle>
              <CardDescription>
                Instructions données à l'IA pour guider ses réponses. Laissez vide pour utiliser le prompt par défaut.
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleResetToDefaults}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={localSettings?.system_prompt || ''}
            onChange={(e) => setLocalSettings(prev => prev ? { ...prev, system_prompt: e.target.value || null } : null)}
            placeholder={DEFAULT_SYSTEM_PROMPT}
            rows={12}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            💡 Le prompt par défaut interdit les conseils médicaux et redirige vers la messagerie sécurisée.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Preview component
function ChatbotPreview({ settings }: { settings: { welcome_message: string; quick_questions: QuickQuestion[] } }) {
  return (
    <div className="bg-white rounded-xl border shadow-lg overflow-hidden max-h-[400px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">OmniSoin Assist</h3>
          <p className="text-white/80 text-xs">Assistant virtuel</p>
        </div>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-teal-600" />
          </div>
          <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-3 py-2 text-sm max-w-[80%]">
            {settings.welcome_message}
          </div>
        </div>
      </div>

      {/* Quick questions */}
      <div className="px-4 py-2 border-t">
        <p className="text-xs text-muted-foreground mb-2">Questions fréquentes :</p>
        <div className="flex flex-wrap gap-1.5">
          {settings.quick_questions.slice(0, 4).map((q, i) => {
            const IconComponent = getIconComponent(q.icon);
            return (
              <Badge 
                key={i} 
                variant="secondary" 
                className="bg-teal-50 text-teal-700 hover:bg-teal-100 cursor-pointer"
              >
                <IconComponent className="w-3 h-3 mr-1" />
                {q.label}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}
