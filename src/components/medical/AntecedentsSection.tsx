"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Edit2, Trash2, AlertTriangle, Pill, Heart, Users, Syringe, Scissors } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAntecedents } from '@/hooks/useAntecedents';
import { AntecedentFormDialog } from './AntecedentFormDialog';
import { 
  Antecedent, 
  AntecedentType, 
  AntecedentFormData,
  ANTECEDENT_TYPE_LABELS, 
  SEVERITY_LABELS, 
  SEVERITY_COLORS 
} from '@/lib/antecedents';

const TYPE_ICONS: Record<AntecedentType, React.ReactNode> = {
  medical: <Heart className="h-4 w-4" />,
  chirurgical: <Scissors className="h-4 w-4" />,
  familial: <Users className="h-4 w-4" />,
  allergique: <AlertTriangle className="h-4 w-4" />,
  traitement_en_cours: <Pill className="h-4 w-4" />,
};

interface AntecedentsSectionProps {
  patientId: string;
  structureId: string;
  userId: string;
  isAdmin?: boolean;
}

export function AntecedentsSection({ 
  patientId, 
  structureId, 
  userId,
  isAdmin = false 
}: AntecedentsSectionProps) {
  const { antecedents, loading, getByType, create, update, remove } = useAntecedents(patientId);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAntecedent, setEditingAntecedent] = useState<Antecedent | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<AntecedentType>('medical');

  const handleCreate = async (data: AntecedentFormData) => {
    await create(structureId, userId, data);
  };

  const handleUpdate = async (data: AntecedentFormData) => {
    if (!editingAntecedent) return;
    await update(editingAntecedent.id, userId, structureId, data);
    setEditingAntecedent(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await remove(deleteConfirmId, userId, structureId);
    setDeleteConfirmId(null);
  };

  const openEdit = (antecedent: Antecedent) => {
    setEditingAntecedent(antecedent);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditingAntecedent(null);
    setFormOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const tabs: AntecedentType[] = ['medical', 'chirurgical', 'familial', 'allergique', 'traitement_en_cours'];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Syringe className="h-5 w-5" />
              Antécédents
            </CardTitle>
            <CardDescription>
              Historique médical du patient
            </CardDescription>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as AntecedentType)}>
            <TabsList className="grid w-full grid-cols-5 mb-4">
              {tabs.map(type => (
                <TabsTrigger key={type} value={type} className="gap-1 text-xs">
                  {TYPE_ICONS[type]}
                  <span className="hidden sm:inline">{ANTECEDENT_TYPE_LABELS[type]}</span>
                  {getByType(type).length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                      {getByType(type).length}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map(type => (
              <TabsContent key={type} value={type}>
                <AntecedentList
                  antecedents={getByType(type)}
                  onEdit={openEdit}
                  onDelete={(id) => setDeleteConfirmId(id)}
                  isAdmin={isAdmin}
                  type={type}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <AntecedentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={editingAntecedent ? handleUpdate : handleCreate}
        antecedent={editingAntecedent}
        defaultType={selectedTab}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'antécédent ?</AlertDialogTitle>
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

function AntecedentList({ 
  antecedents, 
  onEdit, 
  onDelete,
  isAdmin,
  type 
}: { 
  antecedents: Antecedent[]; 
  onEdit: (a: Antecedent) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  type: AntecedentType;
}) {
  if (antecedents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {TYPE_ICONS[type]}
        <p className="mt-2">Aucun antécédent {ANTECEDENT_TYPE_LABELS[type].toLowerCase()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {antecedents.map(antecedent => (
        <div
          key={antecedent.id}
          className={`p-4 border rounded-lg ${antecedent.actif ? 'bg-card' : 'bg-muted/50 opacity-75'}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium">{antecedent.description}</p>
                {!antecedent.actif && (
                  <Badge variant="outline" className="text-xs">Inactif</Badge>
                )}
                {antecedent.severity && (
                  <Badge className={`${SEVERITY_COLORS[antecedent.severity]} text-xs`}>
                    {SEVERITY_LABELS[antecedent.severity]}
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {antecedent.date_debut && (
                  <span>
                    Depuis: {format(new Date(antecedent.date_debut), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                )}
                {antecedent.date_fin && (
                  <span>
                    Jusqu'au: {format(new Date(antecedent.date_fin), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                )}
              </div>
              
              {antecedent.notes && (
                <p className="text-sm text-muted-foreground italic mt-1">
                  {antecedent.notes}
                </p>
              )}
            </div>

            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => onEdit(antecedent)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-destructive"
                  onClick={() => onDelete(antecedent.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
