"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Building2, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useHospitalPassages } from '@/hooks/useHospitalPassages';
import { HospitalPassageFormDialog } from './HospitalPassageFormDialog';
import { HospitalPassageDrawer } from './HospitalPassageDrawer';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { formatHospitalPassageForCopy, formatHospitalPassagesReport } from '@/lib/hospitalFormatter';
import {
  HospitalPassage,
  HospitalPassageFormData,
  TacheVille,
  PASSAGE_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
} from '@/lib/hospitalPassages';

interface HospitalPassagesSectionProps {
  patientId: string;
  structureId: string;
  userId: string;
  isAdmin?: boolean;
  patientName?: string;
}

export function HospitalPassagesSection({
  patientId,
  structureId,
  userId,
  isAdmin = false,
  patientName,
}: HospitalPassagesSectionProps) {
  const { passages, loading, create, update, updateTaches, remove } = useHospitalPassages(patientId);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPassage, setEditingPassage] = useState<HospitalPassage | null>(null);
  const [selectedPassage, setSelectedPassage] = useState<HospitalPassage | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = async (data: HospitalPassageFormData) => {
    await create(structureId, userId, data);
  };

  const handleUpdate = async (data: HospitalPassageFormData) => {
    if (!editingPassage) return;
    await update(editingPassage.id, userId, structureId, data);
    setEditingPassage(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await remove(deleteConfirmId, userId, structureId);
    setDeleteConfirmId(null);
  };

  const handleUpdateTaches = async (taches: TacheVille[]) => {
    if (!selectedPassage) return;
    await updateTaches(selectedPassage.id, taches);
  };

  const openCreate = () => {
    setEditingPassage(null);
    setFormOpen(true);
  };

  const openEdit = (passage: HospitalPassage, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPassage(passage);
    setFormOpen(true);
  };

  const openDrawer = (passage: HospitalPassage) => {
    setSelectedPassage(passage);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Passages Hôpital / Urgences
            </CardTitle>
            <CardDescription>
              Historique des hospitalisations et passages aux urgences
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {passages.length > 0 && (
              <CopyToClipboard
                text={formatHospitalPassagesReport(passages, patientName)}
                label="Exporter"
                variant="outline"
                size="sm"
              />
            )}
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {passages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Aucun passage enregistré</p>
            </div>
          ) : (
            <div className="space-y-3">
              {passages.map(passage => (
                <div
                  key={passage.id}
                  onClick={() => openDrawer(passage)}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(passage.passage_date), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                        <Badge variant="outline">
                          {PASSAGE_TYPE_LABELS[passage.passage_type]}
                        </Badge>
                        <Badge className={RISK_LEVEL_COLORS[passage.risk_level]}>
                          {RISK_LEVEL_LABELS[passage.risk_level]}
                        </Badge>
                      </div>
                      
                      <p className="font-medium">{passage.etablissement}</p>
                      
                      {passage.motif && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {passage.motif}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <CopyToClipboard
                        text={formatHospitalPassageForCopy(passage, patientName)}
                        size="icon"
                        variant="ghost"
                        label="Copier passage"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => openEdit(passage, e)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(passage.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <HospitalPassageFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={editingPassage ? handleUpdate : handleCreate}
        passage={editingPassage}
      />

      <HospitalPassageDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        passage={selectedPassage}
        onUpdateTaches={handleUpdateTaches}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le passage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
