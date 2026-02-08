import Link from "next/link";
import { UserPlus, Users, Calendar, CheckSquare, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  variant: 'default' | 'outline';
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Nouveau patient',
    description: 'Créer une fiche patient',
    href: '/patients?action=new',
    icon: UserPlus,
    variant: 'default',
  },
  {
    label: 'Ajouter à la file',
    description: 'Enregistrer une arrivée',
    href: '/queue?action=add',
    icon: Users,
    variant: 'outline',
  },
  {
    label: 'Nouveau RDV',
    description: 'Planifier un rendez-vous',
    href: '/agenda?action=new',
    icon: Calendar,
    variant: 'outline',
  },
  {
    label: 'Nouvelle tâche',
    description: 'Créer une tâche',
    href: '/tasks?action=new',
    icon: CheckSquare,
    variant: 'outline',
  },
];

export function QuickActions() {
  return (
    <Card data-testid="dashboard-quick-actions">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Actions rapides
        </CardTitle>
        <CardDescription>Accès direct aux fonctions courantes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map(action => (
            <Button
              key={action.href}
              variant={action.variant}
              className="h-auto py-4 flex-col items-start text-left gap-1"
              asChild
              data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Link href={action.href}>
                <div className="flex items-center gap-2 w-full">
                  <action.icon className="h-4 w-4" />
                  <span className="font-medium">{action.label}</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal">
                  {action.description}
                </span>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
