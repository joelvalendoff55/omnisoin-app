import { useState, useCallback, ReactNode } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Stethoscope, 
  Activity, 
  Brain, 
  Plus, 
  FileText, 
  Pill, 
  ClipboardList,
  TestTube,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface StreamlinedConsultationLayoutProps {
  // Column 1: Anamnesis
  anamnesisContent: ReactNode;
  antecedentsContent?: ReactNode;
  
  // Column 2: Vitals + Exam
  vitalsContent: ReactNode;
  examContent?: ReactNode;
  
  // Column 3: Decision
  decisionContent: ReactNode;
  examRecommendationsContent?: ReactNode;
  
  // Secondary tools (expandable)
  prescriptionContent?: ReactNode;
  documentsContent?: ReactNode;
  managementContent?: ReactNode;
  statsContent?: ReactNode;
  
  // Red flags indicator
  redFlagsCount?: number;
}

export function StreamlinedConsultationLayout({
  anamnesisContent,
  antecedentsContent,
  vitalsContent,
  examContent,
  decisionContent,
  examRecommendationsContent,
  prescriptionContent,
  documentsContent,
  managementContent,
  statsContent,
  redFlagsCount = 0,
}: StreamlinedConsultationLayoutProps) {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [activeSecondaryTool, setActiveSecondaryTool] = useState<string | null>(null);

  const secondaryTools = [
    { id: 'prescription', label: 'Ordonnance', icon: Pill, content: prescriptionContent },
    { id: 'exams', label: 'Examens', icon: TestTube, content: examRecommendationsContent },
    { id: 'documents', label: 'Documents', icon: FileText, content: documentsContent },
    { id: 'management', label: 'Conduite', icon: ClipboardList, content: managementContent },
    { id: 'stats', label: 'Statistiques', icon: Settings, content: statsContent },
  ].filter(tool => tool.content);

  const handleToolClick = useCallback((toolId: string) => {
    if (activeSecondaryTool === toolId) {
      setActiveSecondaryTool(null);
    } else {
      setActiveSecondaryTool(toolId);
      if (!isToolsOpen) {
        setIsToolsOpen(true);
      }
    }
  }, [activeSecondaryTool, isToolsOpen]);

  const activeTool = secondaryTools.find(t => t.id === activeSecondaryTool);

  return (
    <div className="space-y-4">
      {/* Main 3-Column Layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Column 1: Anamnesis */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Stethoscope className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Anamnèse</h3>
          </div>
          
          {/* Antecedents (compact) */}
          {antecedentsContent && (
            <div className="mb-2">
              {antecedentsContent}
            </div>
          )}
          
          {/* Main anamnesis content */}
          {anamnesisContent}
        </div>

        {/* Column 2: Vitals + Exam */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Activity className="h-4 w-4 text-pink-500" />
            <h3 className="font-semibold text-sm">Constantes & Examen</h3>
          </div>
          
          {/* Vitals (always visible, inline) */}
          {vitalsContent}
          
          {/* Exam section */}
          {examContent && (
            <div className="mt-3">
              {examContent}
            </div>
          )}
        </div>

        {/* Column 3: Clinical Decision */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-500" />
              <h3 className="font-semibold text-sm">Décision Clinique</h3>
            </div>
            {redFlagsCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {redFlagsCount} alerte{redFlagsCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          {decisionContent}
        </div>
      </div>

      {/* Secondary Tools Toggle */}
      <div className="border-t pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* + Outils button */}
            <Button
              variant={isToolsOpen ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className="gap-1.5"
            >
              <Plus className={cn(
                "h-4 w-4 transition-transform",
                isToolsOpen && "rotate-45"
              )} />
              Outils
              {isToolsOpen ? (
                <ChevronUp className="h-3 w-3 ml-1" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-1" />
              )}
            </Button>

            {/* Quick tool buttons (visible when tools are open) */}
            {isToolsOpen && (
              <div className="flex items-center gap-1.5 animate-fade-in">
                {secondaryTools.map((tool) => (
                  <Button
                    key={tool.id}
                    variant={activeSecondaryTool === tool.id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleToolClick(tool.id)}
                    className="gap-1.5 h-8"
                  >
                    <tool.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tool.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Keyboard shortcut hints */}
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">O</kbd>
            <span>Ordonnance</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">D</kbd>
            <span>Dictée</span>
          </div>
        </div>

        {/* Active tool content */}
        {isToolsOpen && activeTool && (
          <div className="mt-4 animate-slide-in-from-top">
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <activeTool.icon className="h-4 w-4" />
                  {activeTool.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {activeTool.content}
              </CardContent>
            </Card>
          </div>
        )}

        {/* All tools grid (when expanded but no specific tool selected) */}
        {isToolsOpen && !activeSecondaryTool && secondaryTools.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
            {secondaryTools.map((tool) => (
              <Card 
                key={tool.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleToolClick(tool.id)}
              >
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <tool.icon className="h-4 w-4" />
                    {tool.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 text-sm text-muted-foreground">
                  Cliquez pour ouvrir
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
