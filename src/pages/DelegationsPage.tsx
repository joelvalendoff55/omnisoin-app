"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  fetchDelegations,
  fetchUsersByRole,
  createDelegation,
  updateDelegation,
  deleteDelegation,
  Delegation,
  UserWithProfile,
} from '@/lib/delegations';
import { Plus, Trash2, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import NoAccessPage from '@/components/layout/NoAccessPage';

export default function DelegationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const { structureId, loading: structureLoading } = useStructureId();
  const router = useRouter();

  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [practitioners, setPractitioners] = useState<UserWithProfile[]>([]);
  const [assistants, setAssistants] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedPractitioner, setSelectedPractitioner] = useState<string>('');
  const [selectedAssistant, setSelectedAssistant] = useState<string>('');
  const [canEdit, setCanEdit] = useState(true);

  const loadData = useCallback(async () => {
    if (!structureId) return;

    try {
      setLoading(true);
      const [delegationsData, practitionersData, assistantsData] = await Promise.all([
        fetchDelegations(structureId),
        fetchUsersByRole(structureId, 'practitioner'),
        fetchUsersByRole(structureId, 'assistant'),
      ]);
      setDelegations(delegationsData);
      setPractitioners(practitionersData);
      setAssistants(assistantsData);
    } catch (error) {
      console.error('Error loading delegations:', error);
      toast.error('Erreur lors du chargement des délégations');
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (structureId) {
      loadData();
    }
  }, [structureId, loadData]);

  const handleCreate = async () => {
    if (!selectedPractitioner || !selectedAssistant || !structureId || !user) {
      toast.error('Veuillez sélectionner un praticien et un assistant');
      return;
    }

    // Check if delegation already exists
    const existing = delegations.find(
      (d) =>
        d.practitioner_user_id === selectedPractitioner &&
        d.assistant_user_id === selectedAssistant
    );
    if (existing) {
      toast.error('Cette délégation existe déjà');
      return;
    }

    setIsSubmitting(true);
    try {
      await createDelegation(
        structureId,
        selectedPractitioner,
        selectedAssistant,
        canEdit,
        user.id
      );
      toast.success('Délégation créée');
      setSelectedPractitioner('');
      setSelectedAssistant('');
      setCanEdit(true);
      loadData();
    } catch (error) {
      console.error('Error creating delegation:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCanEdit = async (delegation: Delegation) => {
    if (!structureId || !user) return;

    try {
      await updateDelegation(delegation.id, !delegation.can_edit, structureId, user.id);
      toast.success('Délégation mise à jour');
      loadData();
    } catch (error) {
      console.error('Error updating delegation:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (delegationId: string) => {
    if (!structureId || !user) return;

    try {
      await deleteDelegation(delegationId, structureId, user.id);
      toast.success('Délégation supprimée');
      loadData();
    } catch (error) {
      console.error('Error deleting delegation:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getUserName = (profile: { first_name: string | null; last_name: string | null } | undefined) => {
    if (!profile) return 'Utilisateur inconnu';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Sans nom';
  };

  const isLoading = authLoading || roleLoading || structureLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary text-lg">Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  if (!structureId) {
    return <NoAccessPage />;
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-16 w-16 text-warning mb-4" />
          <h1 className="text-2xl font-bold mb-2">Accès restreint</h1>
          <p className="text-muted-foreground">
            Seuls les administrateurs peuvent gérer les délégations.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Délégations</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les accès entre praticiens et assistants
          </p>
        </div>

        {/* Create Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nouvelle délégation
            </CardTitle>
            <CardDescription>
              Associez un assistant à un praticien pour lui donner accès à ses patients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Praticien</Label>
                <Select value={selectedPractitioner} onValueChange={setSelectedPractitioner}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {practitioners.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {getUserName(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assistant</Label>
                <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {assistants.map((a) => (
                      <SelectItem key={a.user_id} value={a.user_id}>
                        {getUserName(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch id="can-edit" checked={canEdit} onCheckedChange={setCanEdit} />
                <Label htmlFor="can-edit" className="text-sm">
                  Peut modifier
                </Label>
              </div>

              <Button onClick={handleCreate} disabled={isSubmitting || !selectedPractitioner || !selectedAssistant}>
                {isSubmitting ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delegations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Délégations actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Chargement...</div>
            ) : delegations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Aucune délégation configurée
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Praticien</TableHead>
                    <TableHead>Assistant</TableHead>
                    <TableHead>Peut modifier</TableHead>
                    <TableHead>Créée le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delegations.map((delegation) => (
                    <TableRow key={delegation.id}>
                      <TableCell className="font-medium">
                        {getUserName(delegation.practitioner)}
                      </TableCell>
                      <TableCell>{getUserName(delegation.assistant)}</TableCell>
                      <TableCell>
                        <Switch
                          checked={delegation.can_edit ?? false}
                          onCheckedChange={() => handleToggleCanEdit(delegation)}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(delegation.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette délégation ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                L'assistant n'aura plus accès aux patients de ce praticien.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(delegation.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
