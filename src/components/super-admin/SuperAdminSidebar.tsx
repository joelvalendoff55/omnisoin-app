"use client";

import Link from "next/link";
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  Building2, 
  UserCog, 
  Users, 
  Settings, 
  LogOut,
  Shield,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/super-admin', icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/super-admin/organizations', icon: Building2, label: 'Organisations' },
  { path: '/super-admin/administrators', icon: UserCog, label: 'Administrateurs' },
  { path: '/super-admin/teams', icon: Users, label: 'Équipes' },
  { path: '/super-admin/settings', icon: Settings, label: 'Paramètres globaux' },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === '/super-admin') {
      return pathname === '/super-admin';
    }
    return pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        'h-screen bg-card border-r flex flex-col transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-yellow-500" />
            <span className="font-bold text-lg">Super Admin</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(isCollapsed && 'mx-auto')}
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                isCollapsed && 'justify-center px-0'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10',
            isCollapsed ? 'justify-center px-0' : 'justify-start gap-3'
          )}
          title={isCollapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Déconnexion</span>}
        </Button>
      </div>
    </aside>
  );
}
