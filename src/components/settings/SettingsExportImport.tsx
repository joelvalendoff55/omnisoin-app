"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Upload, AlertCircle, CheckCircle, FileJson, History, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SettingsExportData {
  version: string;
  exportedAt: string;
  profile: Record<string, any>;
  preferences: Record<string, any>;
  notifications: Record<string, any>;
  consultationReasons?: any[];
}

interface SettingsExportImportProps {
  onExport: () => SettingsExportData;
  onImport: (data: SettingsExportData) => Promise<void>;
  lastSaved?: Date | null;
  autoSaveEnabled: boolean;
  onAutoSaveToggle: (enabled: boolean) => void;
}

interface BackupEntry {
  id: string;
  date: Date;
  label: string;
}

export function SettingsExportImport({
  onExport,
  onImport,
  lastSaved,
  autoSaveEnabled,
  onAutoSaveToggle,
}: SettingsExportImportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<SettingsExportData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Mock backup history (in a real app, this would come from localStorage or DB)
  const [backups] = useState<BackupEntry[]>([
    { id: '1', date: new Date(Date.now() - 86400000 * 2), label: 'Sauvegarde automatique' },
    { id: '2', date: new Date(Date.now() - 86400000 * 7), label: 'Avant mise à jour motifs' },
  ]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = onExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `omnisoin-settings-${format(new Date(), 'yyyy-MM-dd')}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Paramètres exportés avec succès');
    } catch {
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as SettingsExportData;
        
        // Validate structure
        if (!data.version || !data.exportedAt) {
          throw new Error('Format de fichier invalide');
        }

        setPendingImportData(data);
        setImportError(null);
        setImportDialogOpen(true);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Erreur de lecture du fichier');
        setImportDialogOpen(true);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!pendingImportData) return;
    
    setIsImporting(true);
    try {
      await onImport(pendingImportData);
      toast.success('Paramètres importés avec succès');
      setImportDialogOpen(false);
      setConfirmImportOpen(false);
      setPendingImportData(null);
    } catch {
      toast.error('Erreur lors de l\'import');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Auto-save status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Sauvegarde automatique
              </CardTitle>
              <CardDescription>
                Vos paramètres sont sauvegardés automatiquement
              </CardDescription>
            </div>
            {lastSaved && (
              <Badge variant="outline" className="gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                Sauvegardé {format(lastSaved, "'le' dd/MM à HH:mm", { locale: fr })}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Export/Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Export & Import
          </CardTitle>
          <CardDescription>
            Sauvegardez ou restaurez vos paramètres
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Download className="h-6 w-6" />
              )}
              <span className="font-medium">Exporter les paramètres</span>
              <span className="text-xs text-muted-foreground">
                Télécharger un fichier JSON
              </span>
            </Button>

            <label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2 w-full"
                asChild
              >
                <span>
                  <Upload className="h-6 w-6" />
                  <span className="font-medium">Importer des paramètres</span>
                  <span className="text-xs text-muted-foreground">
                    Restaurer depuis un fichier
                  </span>
                </span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      {backups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique des sauvegardes</CardTitle>
            <CardDescription>
              Dernières sauvegardes disponibles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[150px]">
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div>
                      <p className="text-sm font-medium">{backup.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(backup.date, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Restaurer
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Import Preview Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer les paramètres</DialogTitle>
            <DialogDescription>
              Vérifiez les données avant l'import
            </DialogDescription>
          </DialogHeader>

          {importError ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Erreur de lecture</p>
                <p className="text-sm">{importError}</p>
              </div>
            </div>
          ) : pendingImportData ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Version:</span>
                  <span className="font-mono">{pendingImportData.version}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exporté le:</span>
                  <span>{format(new Date(pendingImportData.exportedAt), "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profil:</span>
                  <Badge variant="outline">
                    {Object.keys(pendingImportData.profile || {}).length} champs
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Préférences:</span>
                  <Badge variant="outline">
                    {Object.keys(pendingImportData.preferences || {}).length} champs
                  </Badge>
                </div>
                {pendingImportData.consultationReasons && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Motifs de RDV:</span>
                    <Badge variant="outline">
                      {pendingImportData.consultationReasons.length} motifs
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning-foreground">
                <AlertCircle className="h-4 w-4 text-warning" />
                <p className="text-sm">
                  L'import remplacera vos paramètres actuels
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Annuler
            </Button>
            {pendingImportData && !importError && (
              <Button onClick={() => setConfirmImportOpen(true)}>
                Continuer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Import Dialog */}
      <AlertDialog open={confirmImportOpen} onOpenChange={setConfirmImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'import ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action remplacera tous vos paramètres actuels par ceux du fichier importé.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} disabled={isImporting}>
              {isImporting ? 'Import en cours...' : 'Confirmer l\'import'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
