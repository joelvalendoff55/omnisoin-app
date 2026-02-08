import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, FileText, Mic, Mail, Award, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface FABAction {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  color?: string;
}

interface MedecinFloatingActionButtonProps {
  onNewPrescription?: () => void;
  onStartDictation?: () => void;
  onNewLetter?: () => void;
  onNewCertificate?: () => void;
  onValidateConsultation?: () => void;
  onNewPatient?: () => void;
}

export function MedecinFloatingActionButton({
  onNewPrescription,
  onStartDictation,
  onNewLetter,
  onNewCertificate,
  onValidateConsultation,
  onNewPatient,
}: MedecinFloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions: FABAction[] = [
    {
      icon: <UserPlus className="h-5 w-5" />,
      label: 'Nouveau patient',
      shortcut: 'N',
      onClick: onNewPatient || (() => navigate('/patients?action=new')),
      color: 'text-purple-500',
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: 'Nouvelle ordonnance',
      shortcut: 'O',
      onClick: onNewPrescription || (() => navigate('/medecin?action=prescription')),
      color: 'text-primary',
    },
    {
      icon: <Mic className="h-5 w-5" />,
      label: 'Dictaphone',
      shortcut: 'D',
      onClick: onStartDictation || (() => navigate('/transcripts?action=record')),
      color: 'text-blue-500',
    },
    {
      icon: <Mail className="h-5 w-5" />,
      label: 'Nouveau courrier',
      shortcut: 'C',
      onClick: onNewLetter || (() => navigate('/medecin?action=letter')),
      color: 'text-green-500',
    },
    {
      icon: <Award className="h-5 w-5" />,
      label: 'Certificat médical',
      onClick: onNewCertificate || (() => navigate('/medecin?action=certificate')),
      color: 'text-amber-500',
    },
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input/textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = e.key.toUpperCase();
    
    // Handle Enter for validating consultation
    if (e.key === 'Enter' && onValidateConsultation) {
      e.preventDefault();
      onValidateConsultation();
      return;
    }

    const action = actions.find(a => a.shortcut === key);
    if (action) {
      e.preventDefault();
      action.onClick();
    }
  }, [actions, onValidateConsultation]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-center gap-3">
      {/* Action buttons - appear when FAB is open */}
      <div className={cn(
        "flex flex-col-reverse gap-3 transition-all duration-300",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {actions.map((action, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-full shadow-lg transition-all duration-300",
                  "hover:scale-110 hover:shadow-xl",
                  "bg-card border border-border",
                  action.color
                )}
                style={{
                  transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                }}
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
              >
                {action.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="flex items-center gap-2">
              <span>{action.label}</span>
              {action.shortcut && (
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">
                  {action.shortcut}
                </kbd>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Main FAB button */}
      <Button
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-all duration-300",
          "bg-primary hover:bg-primary/90 hover:scale-105",
          isOpen && "rotate-45 bg-muted text-foreground hover:bg-muted/90"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>

      {/* Backdrop when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/50 backdrop-blur-sm -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
