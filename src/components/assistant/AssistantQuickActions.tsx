import Link from "next/link";
import { UserPlus, Users, Calendar, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    label: 'File d\'attente',
    description: 'Gérer les arrivées',
    href: '/queue',
    icon: Users,
    variant: 'outline',
  },
  {
    label: 'Agenda',
    description: 'Voir les rendez-vous',
    href: '/agenda',
    icon: Calendar,
    variant: 'outline',
  },
];

export function AssistantQuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5" />
          Accès rapide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.href}
              variant={action.variant}
              className="h-auto py-4 flex-col items-center gap-2"
              asChild
            >
              <Link href={action.href}>
                <action.icon className="h-6 w-6" />
                <div className="text-center">
                  <span className="font-medium block">{action.label}</span>
                  <span className="text-xs text-muted-foreground font-normal hidden sm:block">
                    {action.description}
                  </span>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
