"use client";

import { useState } from 'react';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useConsultationReasons } from '@/hooks/useConsultationReasons';
import ConsultationReasonForm from './ConsultationReasonForm';
import {
  ConsultationReason,
  ConsultationReasonFormData,
  CATEGORY_OPTIONS,
  getCategoryLabel,
} from '@/lib/consultationReasons';

export default function ConsultationReasonsList() {
  const { reasons, loading, create, update, remove, toggleActive } = useConsultationReasons({
    activeOnly: false,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<ConsultationReason | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reasonToDelete, setReasonToDelete] = useState<ConsultationReason | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const handleCreate = () => {
    setEditingReason(null);
    setFormOpen(true);
  };

  const handleEdit = (reason: ConsultationReason) => {
    setEditingReason(reason);
    setFormOpen(true);
  };

  const handleDelete = (reason: ConsultationReason) => {
    setReasonToDelete(reason);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (reasonToDelete) {
      await remove(reasonToDelete.id);
      setDeleteDialogOpen(false);
      setReasonToDelete(null);
    }
  };

  const handleFormSubmit = async (formData: ConsultationReasonFormData) => {
    if (editingReason) {
      await update(editingReason.id, formData);
    } else {
      await create(formData);
    }
  };

  const filteredReasons =
    categoryFilter === 'all'
      ? reasons
      : reasons.filter((r) => r.category === categoryFilter);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Motifs de consultation</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les motifs de consultation disponibles pour votre structure
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau motif
        </Button>
      </div>

      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList data-testid="reason-category-filter">
          <TabsTrigger value="all">Tous</TabsTrigger>
          {CATEGORY_OPTIONS.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={categoryFilter} className="mt-4">
          {filteredReasons.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucun motif de consultation trouvé
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredReasons.map((reason) => (
                <Card
                  key={reason.id}
                  className={!reason.is_active ? 'opacity-60' : ''}
                  data-testid="reason-card"
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-3 h-10 rounded"
                          style={{ backgroundColor: reason.color || '#6B7280' }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{reason.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {reason.code}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryLabel(reason.category)}
                            </Badge>
                          </div>
                          {reason.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {reason.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {reason.default_duration} minutes
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Actif</span>
                          <Switch
                            checked={reason.is_active}
                            onCheckedChange={(checked) => toggleActive(reason.id, checked)}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(reason)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(reason)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConsultationReasonForm
        open={formOpen}
        onOpenChange={setFormOpen}
        reason={editingReason}
        onSubmit={handleFormSubmit}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le motif ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le motif "{reasonToDelete?.label}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
