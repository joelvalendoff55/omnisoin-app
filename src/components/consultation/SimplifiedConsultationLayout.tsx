import { useState, ReactNode } from 'react';
import { 
  Plus, 
  X,
  Stethoscope, 
  Activity, 
  Brain, 
  Pill, 
  TestTube,
  FileText,
  ClipboardList,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SecondaryTool {
  id: string;
  label: string;
  icon: typeof Plus;
  content: ReactNode;
}

interface SimplifiedConsultationLayoutProps {
  // Column 1: Anamnesis (left)
  anamnesisContent: ReactNode;
  anamnesisHeader?: ReactNode;
  
  // Column 2: Vitals + Exam (center)
  vitalsContent: ReactNode;
  examContent?: ReactNode;
  
  // Column 3: Decision (right)
  decisionContent: ReactNode;
  alertsCount?: number;
  
  // Secondary tools (hidden by default)
  prescriptionContent?: ReactNode;
  examsContent?: ReactNode;
  documentsContent?: ReactNode;
  notesContent?: ReactNode;
  observationsContent?: ReactNode;
  
  // Callbacks
  onToolOpen?: (toolId: string) => void;
}

export function SimplifiedConsultationLayout({
  anamnesisContent,
  anamnesisHeader,
  vitalsContent,
  examContent,
  decisionContent,
  alertsCount = 0,
  prescriptionContent,
  examsContent,
  documentsContent,
  notesContent,
  observationsContent,
  onToolOpen,
}: SimplifiedConsultationLayoutProps) {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // Build secondary tools list
  const secondaryTools: SecondaryTool[] = [
    prescriptionContent && { id: 'prescription', label: 'Ordonnance', icon: Pill, content: prescriptionContent },
    examsContent && { id: 'exams', label: 'Examens complémentaires', icon: TestTube, content: examsContent },
    documentsContent && { id: 'documents', label: 'Documents', icon: FileText, content: documentsContent },
    notesContent && { id: 'notes', label: 'Notes additionnelles', icon: ClipboardList, content: notesContent },
    observationsContent && { id: 'observations', label: 'Observations libres', icon: MessageSquare, content: observationsContent },
  ].filter(Boolean) as SecondaryTool[];

  const handleToolClick = (toolId: string) => {
    if (activeTool === toolId) {
      setActiveTool(null);
    } else {
      setActiveTool(toolId);
      onToolOpen?.(toolId);
    }
  };

  const handleToggleTools = () => {
    if (isToolsOpen) {
      setIsToolsOpen(false);
      setActiveTool(null);
    } else {
      setIsToolsOpen(true);
    }
  };

  const activeToolData = secondaryTools.find(t => t.id === activeTool);

  return (
    <div className="flex flex-col h-full">
      {/* Header with + Outils toggle */}
      <div className="flex items-center justify-between pb-4 border-b mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Consultation simplifiée</h2>
          {alertsCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              {alertsCount} alerte{alertsCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        {/* + Outils toggle button */}
        {secondaryTools.length > 0 && (
          <Button
            variant={isToolsOpen ? 'secondary' : 'outline'}
            size="sm"
            onClick={handleToggleTools}
            className="gap-2"
          >
            {isToolsOpen ? (
              <>
                <X className="h-4 w-4" />
                Masquer outils
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Outils
              </>
            )}
          </Button>
        )}
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Anamnèse (Left) */}
        <div className="flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="py-3 px-4 border-b bg-muted/30">
              <CardTitle className="text-sm flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                Anamnèse
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-auto">
              {anamnesisHeader && (
                <div className="mb-3 pb-3 border-b">
                  {anamnesisHeader}
                </div>
              )}
              {anamnesisContent}
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Constantes + Examen (Center) */}
        <div className="flex flex-col min-h-0 gap-4">
          {/* Vitals Card */}
          <Card>
            <CardHeader className="py-3 px-4 border-b bg-muted/30">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-pink-500" />
                Constantes vitales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {vitalsContent}
            </CardContent>
          </Card>

          {/* Exam Card */}
          {examContent && (
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="py-3 px-4 border-b bg-muted/30">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-violet-500" />
                  Examen clinique
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-auto">
                {examContent}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Column 3: Décision (Right) */}
        <div className="flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="py-3 px-4 border-b bg-muted/30">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-amber-500" />
                  Décision clinique
                </div>
                {alertsCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {alertsCount}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-auto">
              {decisionContent}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Secondary Tools Panel (expanded when + Outils is clicked) */}
      {isToolsOpen && secondaryTools.length > 0 && (
        <div className="mt-4 pt-4 border-t animate-in slide-in-from-bottom-2 duration-200">
          {/* Tool selector tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            {secondaryTools.map((tool) => (
              <Button
                key={tool.id}
                variant={activeTool === tool.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleToolClick(tool.id)}
                className="gap-2 whitespace-nowrap"
              >
                <tool.icon className="h-4 w-4" />
                {tool.label}
              </Button>
            ))}
          </div>

          {/* Active tool content */}
          {activeToolData && (
            <Card className="animate-in fade-in-0 duration-150">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <activeToolData.icon className="h-4 w-4" />
                  {activeToolData.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {activeToolData.content}
              </CardContent>
            </Card>
          )}

          {/* No tool selected - show grid */}
          {!activeTool && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {secondaryTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/30 transition-colors text-left group"
                >
                  <div className="p-2 rounded-md bg-muted group-hover:bg-primary/10">
                    <tool.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tool.label}</p>
                    <p className="text-xs text-muted-foreground">Cliquer pour ouvrir</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
