"use client";

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Building2,
  Users,
  CalendarClock,
  Bell,
  Plug,
  Shield,
  FileText,
  ChevronRight,
  Settings2,
  Bot,
} from 'lucide-react';

export type SettingsSection = 
  | 'profile' 
  | 'structure' 
  | 'practitioners' 
  | 'teams'
  | 'motifs' 
  | 'notifications' 
  | 'integrations' 
  | 'security' 
  | 'gdpr'
  | 'chatbot';

interface SettingsSidebarProps {
  currentSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  isAdmin: boolean;
  hasUnsavedChanges?: boolean;
}

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  adminOnly?: boolean;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'profile',
    label: 'Profil',
    icon: User,
    description: 'Informations personnelles',
  },
  {
    id: 'structure',
    label: 'Structure',
    icon: Building2,
    description: 'Organisation et horaires',
    adminOnly: true,
  },
  {
    id: 'practitioners',
    label: 'Praticiens',
    icon: Users,
    description: 'Équipe et couleurs',
    adminOnly: true,
  },
  {
    id: 'teams',
    label: 'Équipes',
    icon: Users,
    description: 'Groupes et ciblage',
    adminOnly: true,
  },
  {
    id: 'motifs',
    label: 'Motifs de RDV',
    icon: CalendarClock,
    description: 'Types de consultations',
    adminOnly: true,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Alertes et rappels',
  },
  {
    id: 'integrations',
    label: 'Intégrations',
    icon: Plug,
    description: 'Services externes',
    adminOnly: true,
  },
  {
    id: 'chatbot',
    label: 'Chatbot Patient',
    icon: Bot,
    description: 'Assistant IA portail',
    adminOnly: true,
  },
  {
    id: 'security',
    label: 'Sécurité',
    icon: Shield,
    description: 'Mots de passe et MFA',
  },
  {
    id: 'gdpr',
    label: 'RGPD',
    icon: FileText,
    description: 'Données personnelles',
  },
];

export function SettingsSidebar({
  currentSection,
  onSectionChange,
  isAdmin,
  hasUnsavedChanges = false,
}: SettingsSidebarProps) {
  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="w-64 flex-shrink-0 hidden lg:block">
      <div className="sticky top-6">
        <div className="flex items-center gap-2 mb-4 px-2">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Paramètres</h2>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="ml-auto text-warning border-warning">
              Non sauvegardé
            </Badge>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;

              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-auto py-3 px-3",
                    isActive 
                      ? "bg-primary/10 text-primary hover:bg-primary/15" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => onSectionChange(item.id)}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium",
                        isActive && "text-primary"
                      )}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs h-5">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-normal">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 flex-shrink-0 transition-transform",
                    isActive ? "text-primary" : "text-muted-foreground/50",
                    isActive && "translate-x-0.5"
                  )} />
                </Button>
              );
            })}
          </nav>
        </ScrollArea>
      </div>
    </div>
  );
}

// Mobile navigation as tabs
export function SettingsMobileNav({
  currentSection,
  onSectionChange,
  isAdmin,
}: Omit<SettingsSidebarProps, 'hasUnsavedChanges'>) {
  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="lg:hidden overflow-x-auto pb-2 -mx-4 px-4">
      <div className="flex gap-2 min-w-max">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;

          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => onSectionChange(item.id)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
