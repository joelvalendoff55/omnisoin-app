import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PatientFormDialog } from '@/components/patients/PatientFormDialog';
import { InboxMessage, assignMessageToPatient } from '@/lib/inbox';
import { fetchPatients, createPatient } from '@/lib/patients';
import { logActivity } from '@/lib/activity';
import { Patient, PatientFormData } from '@/types/patient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MessageSquare,
  Mic,
  Image,
  FileText,
  Phone,
  User,
  ExternalLink,
  UserPlus,
  Search,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface InboxMessageDrawerProps {
  message: InboxMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  structureId: string;
  userId: string;
  canAssign: boolean;
  onMessageUpdated: () => void;
}

export function InboxMessageDrawer({
  message,
  open,
  onOpenChange,
  structureId,
  userId,
  canAssign,
  onMessageUpdated,
}: InboxMessageDrawerProps) {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const loadPatients = useCallback(async () => {
    if (!structureId) return;
    setLoadingPatients(true);
    try {
      const data = await fetchPatients(false);
      setPatients(data);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoadingPatients(false);
    }
  }, [structureId]);

  useEffect(() => {
    if (open && canAssign && !message?.patient_id) {
      loadPatients();
    }
  }, [open, canAssign, message?.patient_id, loadPatients]);

  // Reset copied state when drawer closes
  useEffect(() => {
    if (!open) {
      setCopiedPhone(false);
    }
  }, [open]);

  const handleCopyPhone = async () => {
    if (!message?.sender_phone) return;
    try {
      await navigator.clipboard.writeText(message.sender_phone);
      setCopiedPhone(true);
      toast.success('Numéro copié');
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleAssignPatient = async (patientId: string) => {
    if (!message) return;
    setAssigning(true);
    try {
      await assignMessageToPatient(message.id, patientId, structureId, userId);
      toast.success('Message assigné au patient');
      onMessageUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning patient:', error);
      toast.error("Erreur lors de l'assignation");
    } finally {
      setAssigning(false);
    }
  };

  const handleCreatePatient = async (data: PatientFormData) => {
    if (!message) return;
    setIsCreatingPatient(true);
    try {
      // Use skipLog to avoid double logging
      const newPatient = await createPatient(data, userId, structureId, { skipLog: true });
      
      // Log specific action for patient created from inbox
      await logActivity({
        structureId,
        actorUserId: userId,
        action: 'PATIENT_CREATED_FROM_INBOX',
        patientId: newPatient.id,
        metadata: { 
          message_id: message.id,
          first_name: data.first_name,
          last_name: data.last_name,
        },
      });

      // Assign the message to the new patient
      await assignMessageToPatient(message.id, newPatient.id, structureId, userId);
      
      toast.success('Patient créé et message assigné');
      setShowPatientForm(false);
      onMessageUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'audio':
        return <Mic className="h-5 w-5" />;
      case 'image':
        return <Image className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      default:
        return <MessageSquare className="h-5 w-5" />;
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'ready':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch) return true;
    const query = patientSearch.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(query) ||
      p.last_name.toLowerCase().includes(query) ||
      p.phone?.includes(query)
    );
  });

  // Render media content based on message type
  const renderMediaContent = () => {
    if (!message) return null;

    switch (message.message_type) {
      case 'text':
        return (
          <p className="text-sm whitespace-pre-wrap">
            {message.text_body || 'Aucun contenu texte'}
          </p>
        );

      case 'audio':
        if (message.media_url) {
          return (
            <div className="space-y-2">
              <audio 
                controls 
                className="w-full" 
                src={message.media_url}
              >
                Votre navigateur ne supporte pas l'audio.
              </audio>
              {message.media_mime && (
                <p className="text-xs text-muted-foreground">
                  Format: {message.media_mime}
                </p>
              )}
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Média audio non disponible</span>
          </div>
        );

      case 'image':
        if (message.media_url) {
          return (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <img
                  src={message.media_url}
                  alt="Message image"
                  className="max-h-64 w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <span className="text-sm">Impossible de charger l'image</span>
                </div>
              </div>
              {message.media_mime && (
                <p className="text-xs text-muted-foreground">
                  Format: {message.media_mime}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(message.media_url!, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir en plein écran
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Image non disponible</span>
          </div>
        );

      case 'document':
        if (message.media_url) {
          return (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(message.media_url!, '_blank')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Ouvrir le document
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
              {message.media_mime && (
                <p className="text-xs text-muted-foreground">
                  Format: {message.media_mime}
                </p>
              )}
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Document non disponible</span>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            Type de contenu non supporté
          </p>
        );
    }
  };

  if (!message) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {getMessageTypeIcon(message.message_type)}
              Message {message.channel === 'whatsapp' ? 'WhatsApp' : 'Web'}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Message Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {format(new Date(message.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant={message.channel === 'whatsapp' ? 'default' : 'secondary'}>
                  {message.channel === 'whatsapp' ? 'WhatsApp' : 'Web'}
                </Badge>
                <Badge variant="outline">{message.message_type}</Badge>
                <Badge variant={getStatusBadgeVariant(message.status)}>
                  {message.status}
                </Badge>
                {/* Patient assignment badge */}
                {message.patient ? (
                  <Badge variant="default" className="bg-green-600">
                    Assigné
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    Non rattaché
                  </Badge>
                )}
              </div>

              {message.sender_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-mono">{message.sender_phone}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopyPhone}
                  >
                    {copiedPhone ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Message Content - Media Viewer */}
            <div className="space-y-2">
              <Label>Contenu</Label>
              <div className="p-4 rounded-lg bg-muted/50 border">
                {renderMediaContent()}
              </div>
            </div>

            {/* Patient Assignment */}
            <div className="space-y-4">
              <Label>Patient</Label>

              {message.patient ? (
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {message.patient.first_name} {message.patient.last_name}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/patients/${message.patient_id}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Ouvrir
                    </Button>
                  </div>
                </div>
              ) : canAssign ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowPatientForm(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Créer un patient
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Ou assigner à un patient existant :
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par nom ou téléphone..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <ScrollArea className="h-48 border rounded-lg">
                      {loadingPatients ? (
                        <div className="p-4 text-center text-muted-foreground">
                          Chargement...
                        </div>
                      ) : filteredPatients.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          Aucun patient trouvé
                        </div>
                      ) : (
                        <div className="p-2 space-y-1">
                          {filteredPatients.map((patient) => (
                            <button
                              key={patient.id}
                              className="w-full p-3 text-left rounded-lg hover:bg-muted transition-colors flex items-center justify-between group"
                              onClick={() => handleAssignPatient(patient.id)}
                              disabled={assigning}
                            >
                              <div>
                                <p className="font-medium">
                                  {patient.first_name} {patient.last_name}
                                </p>
                                {patient.phone && (
                                  <p className="text-sm text-muted-foreground">
                                    {patient.phone}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                Assigner →
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/50 border text-center text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Non assigné</p>
                  <p className="text-xs mt-1">
                    Vous n'avez pas les droits pour assigner ce message.
                  </p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Patient Form Dialog */}
      <PatientFormDialog
        open={showPatientForm}
        onOpenChange={setShowPatientForm}
        onSubmit={handleCreatePatient}
        patient={null}
        isSubmitting={isCreatingPatient}
        defaultPhone={message.sender_phone || undefined}
      />
    </>
  );
}
