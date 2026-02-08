"use client";

import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Settings, Shield, Bell, Database, Lock, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminSettings() {
  const handleSave = () => {
    toast.success('Paramètres enregistrés (fonctionnalité à venir)');
  };

  return (
    <SuperAdminLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Paramètres globaux</h1>
          <p className="text-muted-foreground mt-1">
            Configuration de la plateforme
          </p>
        </div>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Sécurité
            </CardTitle>
            <CardDescription>
              Paramètres de sécurité de la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>MFA obligatoire</Label>
                <p className="text-sm text-muted-foreground">
                  Exiger l'authentification à deux facteurs pour tous les utilisateurs
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Expiration de session</Label>
                <p className="text-sm text-muted-foreground">
                  Déconnexion automatique après inactivité (minutes)
                </p>
              </div>
              <Input type="number" className="w-24" defaultValue="30" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Verrouillage de compte</Label>
                <p className="text-sm text-muted-foreground">
                  Verrouiller après X tentatives de connexion échouées
                </p>
              </div>
              <Input type="number" className="w-24" defaultValue="5" />
            </div>
          </CardContent>
        </Card>

        {/* Data Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Données
            </CardTitle>
            <CardDescription>
              Gestion des données de la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Rétention des logs</Label>
                <p className="text-sm text-muted-foreground">
                  Durée de conservation des logs d'activité (jours)
                </p>
              </div>
              <Input type="number" className="w-24" defaultValue="365" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sauvegarde automatique</Label>
                <p className="text-sm text-muted-foreground">
                  Activer les sauvegardes quotidiennes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configuration des notifications système
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertes de sécurité</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir les alertes de sécurité par email
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Rapports hebdomadaires</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir un rapport d'activité chaque semaine
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Platform Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Plateforme
            </CardTitle>
            <CardDescription>
              Paramètres généraux de la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mode maintenance</Label>
                <p className="text-sm text-muted-foreground">
                  Activer le mode maintenance (bloque l'accès aux utilisateurs)
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Nouvelles inscriptions</Label>
                <p className="text-sm text-muted-foreground">
                  Autoriser les nouvelles inscriptions d'organisations
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave}>
            <Settings className="h-4 w-4 mr-2" />
            Enregistrer les paramètres
          </Button>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
