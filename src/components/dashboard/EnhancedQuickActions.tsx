import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  CalendarPlus, 
  Mic, 
  Inbox, 
  CreditCard, 
  FileText, 
  Users, 
  ClipboardList,
  Phone,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickShortcut {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  shortcut?: string;
}

const DEFAULT_SHORTCUTS: QuickShortcut[] = [
  {
    id: 'new-patient',
    label: 'Nouveau patient',
    description: 'Créer une fiche',
    icon: <UserPlus className="h-5 w-5" />,
    href: '/patients?action=new',
    color: 'bg-blue-500 hover:bg-blue-600',
    shortcut: 'N',
  },
  {
    id: 'new-appointment',
    label: 'Nouveau RDV',
    description: 'Planifier',
    icon: <CalendarPlus className="h-5 w-5" />,
    href: '/agenda?action=new',
    color: 'bg-green-500 hover:bg-green-600',
    shortcut: 'R',
  },
  {
    id: 'add-queue',
    label: 'Ajouter file',
    description: 'Enregistrer arrivée',
    icon: <Users className="h-5 w-5" />,
    href: '/file-attente?action=add',
    color: 'bg-orange-500 hover:bg-orange-600',
    shortcut: 'F',
  },
  {
    id: 'transcription',
    label: 'Transcription',
    description: 'Dicter notes',
    icon: <Mic className="h-5 w-5" />,
    href: '/transcripts',
    color: 'bg-purple-500 hover:bg-purple-600',
    shortcut: 'T',
  },
  {
    id: 'inbox',
    label: 'Messagerie',
    description: 'Messages',
    icon: <Inbox className="h-5 w-5" />,
    href: '/inbox',
    color: 'bg-cyan-500 hover:bg-cyan-600',
    shortcut: 'M',
  },
  {
    id: 'billing',
    label: 'Cotation',
    description: 'Facturation',
    icon: <CreditCard className="h-5 w-5" />,
    href: '/cotation',
    color: 'bg-emerald-500 hover:bg-emerald-600',
    shortcut: 'C',
  },
];

interface EnhancedQuickActionsProps {
  shortcuts?: QuickShortcut[];
  compact?: boolean;
}

export default function EnhancedQuickActions({
  shortcuts = DEFAULT_SHORTCUTS,
  compact = false,
}: EnhancedQuickActionsProps) {
  const navigate = useNavigate();

  // Keyboard shortcuts
  if (typeof window !== 'undefined') {
    // Note: In a real app, this would be in a useEffect with proper cleanup
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((shortcut) => (
          <Button
            key={shortcut.id}
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate(shortcut.href)}
          >
            {shortcut.icon}
            <span className="hidden sm:inline">{shortcut.label}</span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Actions rapides</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {shortcuts.map((shortcut) => (
            <Button
              key={shortcut.id}
              variant="outline"
              className={cn(
                'h-auto py-4 flex-col items-center justify-center gap-2 relative group',
                'hover:border-primary/50 transition-all'
              )}
              onClick={() => navigate(shortcut.href)}
            >
              <div className={cn(
                'p-2 rounded-lg text-white transition-transform group-hover:scale-110',
                shortcut.color
              )}>
                {shortcut.icon}
              </div>
              <div className="text-center">
                <div className="font-medium text-sm">{shortcut.label}</div>
                <div className="text-xs text-muted-foreground">{shortcut.description}</div>
              </div>
              {shortcut.shortcut && (
                <kbd className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {shortcut.shortcut}
                </kbd>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
