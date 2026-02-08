"use client";

import { ReactNode, useState } from 'react';
import { useRouter } from "next/navigation";
import { usePatientAuth } from '@/hooks/usePatientAuth';
import { useAdminPatientContext } from '@/hooks/useAdminPatientContext';
import { AdminPatientSelector } from './AdminPatientSelector';
import { 
  Home, 
  Calendar, 
  MessageSquare, 
  FileText, 
  User, 
  LogOut, 
  Menu, 
  X,
  Heart,
  Bell,
  ArrowLeft
} from 'lucide-react';
import { PatientChatbot } from './PatientChatbot';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PatientLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/patient-portal/dashboard', icon: Home, label: 'Tableau de bord' },
  { path: '/patient-portal/appointments', icon: Calendar, label: 'Rendez-vous' },
  { path: '/patient-portal/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/patient-portal/documents', icon: FileText, label: 'Documents' },
  { path: '/patient-portal/profile', icon: User, label: 'Mon profil' },
];

export function PatientLayout({ children }: PatientLayoutProps) {
  const { patient, signOut } = usePatientAuth();
  const { isAdminMode, selectedPatient } = useAdminPatientContext();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    if (isAdminMode) {
      // Admin mode: go back to practitioner dashboard
      navigate('/');
    } else {
      signOut();
      navigate('/patient-portal/login');
    }
  };

  // Determine display info based on mode
  const displayFirstName = isAdminMode 
    ? selectedPatient?.first_name || 'Patient' 
    : patient?.firstName || 'Patient';
  const displayLastName = isAdminMode 
    ? selectedPatient?.last_name || '' 
    : patient?.lastName || '';
  const displayEmail = isAdminMode 
    ? selectedPatient?.email 
    : patient?.email;

  const initials = `${displayFirstName.charAt(0)}${displayLastName.charAt(0) || ''}`.toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Admin Patient Selector */}
      {isAdminMode && <AdminPatientSelector />}
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo with back button for admin */}
            <div className="flex items-center gap-3">
              {isAdminMode && (
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="Retour au tableau de bord">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <Link href="/patient-portal/dashboard" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-lg font-bold text-foreground">OmniSoin</span>
                  <span className="text-xs text-muted-foreground block -mt-1">Espace Patient</span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  2
                </span>
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium">
                      {displayFirstName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{displayFirstName} {displayLastName}</p>
                    <p className="text-xs text-muted-foreground">{displayEmail}</p>
                    {isAdminMode && (
                      <p className="text-xs text-amber-600 mt-1">Mode administrateur</p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  {!isAdminMode && (
                    <DropdownMenuItem asChild>
                      <Link href="/patient-portal/profile" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Mon profil
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    {isAdminMode ? 'Quitter le mode patient' : 'Déconnexion'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-white/95 backdrop-blur-lg">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full"
              >
                <LogOut className="w-5 h-5" />
                Déconnexion
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-white/50 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>© 2024 OmniSoin - Espace Patient Sécurisé</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Confidentialité</Link>
              <Link href="/legal" className="hover:text-foreground transition-colors">Mentions légales</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* AI Chatbot */}
      <PatientChatbot />
    </div>
  );
}
