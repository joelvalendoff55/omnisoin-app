"use client";

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut } from 'lucide-react';

export default function NoAccessPage() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-warning" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Accès non configuré</h1>
          <p className="text-muted-foreground">
            Votre compte n'est pas encore rattaché à une structure. 
            Veuillez contacter votre administrateur pour obtenir l'accès.
          </p>
        </div>
        <Button onClick={signOut} variant="outline" className="gap-2">
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
