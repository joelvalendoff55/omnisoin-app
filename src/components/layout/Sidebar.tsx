import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useOrgRole } from '@/hooks/useOrgRole';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { usePractitionerMessages } from '@/hooks/usePractitionerMessages';
import {
  LayoutDashboard,
  Users,
  Inbox,
  LogOut,
  HeartPulse,
  ChevronLeft,
  Menu,
  UserCog,
  Settings,
  Calendar,
  Shield,
  ShieldCheck,
  ClipboardCheck,
  Stethoscope,
  Brain,
  Calculator,
  Mic,
  FileText,
  MessageSquareCode,
  MessageSquare,
  TestTube,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  adminOnly?: boolean;
  adminOrCoordinator?: boolean;
  superAdminOnly?: boolean;
  doctorOnly?: boolean;
  orgAdminOnly?: boolean; // Visible only for org_members with admin or owner role
  orgOwnerOnly?: boolean; // Visible only for org_members with owner role
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// Simplified 3-zone navigation
const navSections: NavSection[] = [
  {
    label: 'Flux Patient',
    items: [
      { path: '/file-attente', icon: ClipboardCheck, label: 'File d\'attente' },
      { path: '/patients', icon: Users, label: 'Patients' },
      { path: '/team', icon: UserCog, label: 'Équipe' },
    ],
  },
  {
    label: 'Organisation',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Consultations du jour' },
      { path: '/agenda', icon: Calendar, label: 'Agenda' },
      { path: '/exam-planning', icon: TestTube, label: 'Examens' },
    ],
  },
  {
    label: 'Métiers',
    items: [
      { path: '/assistant-dashboard', icon: HeartPulse, label: 'Assistante' },
      { path: '/medecin-dashboard', icon: Stethoscope, label: 'Consultations', doctorOnly: true },
      { path: '/medecin', icon: Brain, label: 'Outils cliniques' },
      { path: '/cotation', icon: Calculator, label: 'Cotation' },
      { path: '/ipa', icon: Stethoscope, label: 'IPA' },
      { path: '/coordinatrice', icon: Users, label: 'Coordinatrice', adminOrCoordinator: true },
    ],
  },
  {
    label: 'Communication',
    items: [
      { path: '/inbox', icon: Inbox, label: 'Messagerie' },
      { path: '/messagerie-patients', icon: MessageSquare, label: 'Messages Patients' },
      { path: '/transcripts', icon: Mic, label: 'Transcripts' },
      { path: '/documents', icon: FileText, label: 'Documents' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { path: '/super-admin', icon: Shield, label: 'Super Admin', orgOwnerOnly: true },
      { path: '/admin', icon: Settings, label: 'Admin', orgAdminOnly: true },
      { path: '/compliance', icon: Shield, label: 'Conformité', adminOrCoordinator: true },
      { path: '/security-monitoring', icon: ShieldCheck, label: 'Sécurité', adminOrCoordinator: true },
      { path: '/admin/prompts', icon: MessageSquareCode, label: 'Prompts', adminOnly: true },
      { path: '/settings', icon: Settings, label: 'Paramètres' },
    ],
  },
];

// Legacy routes hidden from navigation
const hiddenRoutes = [
  '/queue', '/activity', '/stats',
  '/gdpr-audit', '/legal-aid', '/tasks',
  '/team/delegations', '/settings?tab=integrations'
];

export default function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin, isCoordinator, isPractitioner, loading: roleLoading } = useRole();
  const { isOrgAdminOrOwner, isOrgOwner, loading: orgRoleLoading } = useOrgRole();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { unreadCount: patientMessagesUnread } = usePractitionerMessages();
  const [collapsed, setCollapsed] = useState(false);

  // Add dynamic badge for patient messages
  const getItemBadge = (path: string): number | undefined => {
    if (path === '/messagerie-patients' && patientMessagesUnread > 0) {
      return patientMessagesUnread;
    }
    return undefined;
  };

  const filterItem = (item: NavItem): boolean => {
    if (hiddenRoutes.includes(item.path)) return false;
    if (item.adminOnly && !isAdmin) return false;
    if (item.adminOrCoordinator && !isAdmin && !isCoordinator) return false;
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.doctorOnly && !isPractitioner && !isAdmin) return false;
    if (item.orgAdminOnly && !isOrgAdminOrOwner) return false;
    if (item.orgOwnerOnly && !isOrgOwner) return false;
    return true;
  };

  const isItemActive = (itemPath: string) => {
    const [path, query] = itemPath.split('?');
    const currentPath = location.pathname;
    const currentSearch = location.search;

    if (path !== currentPath) return false;

    if (query) {
      const itemParams = new URLSearchParams(query);
      const currentParams = new URLSearchParams(currentSearch);
      for (const [key, value] of itemParams.entries()) {
        if (currentParams.get(key) !== value) return false;
      }
      return true;
    }

    if (path === '/settings' && !query) {
      const currentParams = new URLSearchParams(currentSearch);
      return !currentParams.has('tab');
    }

    return true;
  };

  const isLoading = roleLoading || superAdminLoading || orgRoleLoading;

  return (
    <aside
      className={cn(
        'h-screen gradient-sidebar flex flex-col transition-all duration-200 sticky top-0',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="p-1.5 bg-sidebar-primary/20 rounded-lg flex-shrink-0">
              <HeartPulse className="h-5 w-5 text-sidebar-primary" />
            </div>
            {!collapsed && (
              <span className="text-sm font-bold text-sidebar-foreground">OmniSoin</span>
            )}
          </Link>
          <div className="flex items-center gap-0.5">
            {!collapsed && <NotificationBell />}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1 px-1.5">
        {!isLoading && navSections.map((section, idx) => {
          const visibleItems = section.items.filter(filterItem);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className={cn(idx > 0 && 'mt-4')}>
              {!collapsed && (
                <div className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-3 pb-1.5">
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = isItemActive(item.path);
                  const badgeCount = item.badge || getItemBadge(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-150',
                        'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                        isActive && 'bg-sidebar-primary/15 text-sidebar-primary font-medium border-l-2 border-sidebar-primary rounded-l-none',
                        collapsed && 'justify-center px-2'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && (
                        <span className="text-sm truncate flex-1">{item.label}</span>
                      )}
                      {!collapsed && badgeCount && badgeCount > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1">
                          {badgeCount}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-1.5 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className={cn(
            'flex items-center gap-2.5 w-full px-3 py-2 rounded-md transition-all duration-150',
            'text-destructive/60 hover:text-destructive hover:bg-destructive/10',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
