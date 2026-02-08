import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Edit2, 
  Trash2, 
  User,
  Clock,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConsultationObservations } from '@/hooks/useConsultationObservations';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { cn } from '@/lib/utils';

interface ConsultationObservationsSectionProps {
  patientId: string;
  structureId: string;
  consultationId?: string;
  compact?: boolean;
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  coordinator: 'Coordinatrice',
  practitioner: 'Médecin',
  assistant: 'Assistante',
  nurse: 'Infirmière',
  ipa: 'IPA',
};

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  coordinator: 'bg-blue-100 text-blue-700 border-blue-200',
  practitioner: 'bg-green-100 text-green-700 border-green-200',
  assistant: 'bg-orange-100 text-orange-700 border-orange-200',
  nurse: 'bg-pink-100 text-pink-700 border-pink-200',
  ipa: 'bg-teal-100 text-teal-700 border-teal-200',
};

export function ConsultationObservationsSection({ 
  patientId, 
  structureId, 
  consultationId,
  compact = false 
}: ConsultationObservationsSectionProps) {
  const { user } = useAuth();
  const { isAdmin, isCoordinator, isPractitioner, isAssistant, hasRole } = useRole();
  const isNurse = hasRole('nurse');
  const isIPA = hasRole('ipa');

  const { observations, loading, saving, addObservation, editObservation, removeObservation } = 
    useConsultationObservations({ patientId, structureId, consultationId });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Determine user's role for the observation
  const getUserRole = (): string => {
    if (isPractitioner) return 'practitioner';
    if (isAdmin) return 'admin';
    if (isCoordinator) return 'coordinator';
    if (isIPA) return 'ipa';
    if (isNurse) return 'nurse';
    if (isAssistant) return 'assistant';
    return 'unknown';
  };

  // All roles can add observations
  const canAddObservation = isAdmin || isCoordinator || isPractitioner || isAssistant || isNurse || isIPA;

  const handleSubmit = async () => {
    if (!user || !newContent.trim()) return;

    await addObservation(user.id, getUserRole(), {
      content: newContent.trim(),
      consultation_id: consultationId,
    });
    setNewContent('');
    setIsFormOpen(false);
  };

  const handleEdit = async (id: string) => {
    if (!user || !editContent.trim()) return;
    await editObservation(id, user.id, editContent.trim());
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await removeObservation(id, user.id);
  };

  const startEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Observations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            Observations libres
            {observations.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {observations.length}
              </Badge>
            )}
          </CardTitle>
          {canAddObservation && !isFormOpen && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFormOpen(true)}
              className="h-7 px-2"
            >
              <Plus className="h-3 w-3 mr-1" /> Ajouter
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Add new observation form */}
        {isFormOpen && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
            <Textarea
              placeholder="Écrivez votre observation..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              className="text-sm"
              autoFocus
            />
            <div className="flex justify-between items-center">
              <Badge variant="outline" className={cn('text-xs', roleColors[getUserRole()])}>
                {roleLabels[getUserRole()] || getUserRole()}
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsFormOpen(false);
                    setNewContent('');
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={saving || !newContent.trim()}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Envoyer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Observations list */}
        {observations.length === 0 && !isFormOpen ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune observation pour le moment
          </p>
        ) : (
          <ScrollArea className={compact ? 'max-h-[200px]' : 'max-h-[400px]'}>
            <div className="space-y-3">
              {observations.map((obs) => (
                <div
                  key={obs.id}
                  className="p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                >
                  {editingId === obs.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="text-sm"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditContent('');
                          }}
                        >
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleEdit(obs.id)}
                          disabled={saving || !editContent.trim()}
                        >
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs', roleColors[obs.author_role] || 'bg-gray-100 text-gray-700')}
                          >
                            {roleLabels[obs.author_role] || obs.author_role}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {obs.author?.first_name} {obs.author?.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(obs.created_at), "dd/MM à HH:mm", { locale: fr })}
                          </span>
                        </div>
                        
                        {user?.id === obs.author_id && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(obs.id, obs.content)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(obs.id)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{obs.content}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
