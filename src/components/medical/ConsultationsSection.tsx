"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Plus, FileText, Calendar, User, Edit2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useConsultations } from '@/hooks/useConsultations';
import { ConsultationFormDialog } from './ConsultationFormDialog';
import { Consultation, ConsultationFormData } from '@/lib/consultations';
import { PatientTranscript } from '@/lib/transcripts';

interface ConsultationsSectionProps {
  patientId: string;
  structureId: string;
  userId: string;
  transcripts?: PatientTranscript[];
  onViewTranscript?: (transcriptId: string) => void;
  patient?: {
    firstName: string;
    lastName: string;
    dob: string | null;
    sex: string | null;
  } | null;
}

export function ConsultationsSection({ 
  patientId, 
  structureId, 
  userId,
  transcripts = [],
  onViewTranscript,
  patient,
}: ConsultationsSectionProps) {
  const { consultations, loading, create, update } = useConsultations(patientId);
  const [formOpen, setFormOpen] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null);
  const [detailConsultation, setDetailConsultation] = useState<Consultation | null>(null);

  const handleCreate = async (data: ConsultationFormData) => {
    await create(userId, structureId, userId, data);
  };

  const handleUpdate = async (data: ConsultationFormData) => {
    if (!editingConsultation) return;
    await update(editingConsultation.id, userId, structureId, data);
    setEditingConsultation(null);
  };

  const openEdit = (consultation: Consultation) => {
    setEditingConsultation(consultation);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditingConsultation(null);
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
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
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
              <FileText className="h-5 w-5" />
              Historique des consultations
            </CardTitle>
            <CardDescription>
              Consultations médicales enregistrées
            </CardDescription>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle consultation
          </Button>
        </CardHeader>
        <CardContent>
          {consultations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Aucune consultation enregistrée</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-2"
                onClick={openCreate}
              >
                <Plus className="h-4 w-4" />
                Créer une consultation
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {consultations.map((consultation) => (
                  <ConsultationCard 
                    key={consultation.id} 
                    consultation={consultation}
                    onView={() => setDetailConsultation(consultation)}
                    onEdit={() => openEdit(consultation)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <ConsultationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={editingConsultation ? handleUpdate : handleCreate}
        consultation={editingConsultation}
        transcripts={transcripts}
        patientId={patientId}
        patient={patient}
      />

      <ConsultationDetailSheet
        consultation={detailConsultation}
        open={!!detailConsultation}
        onOpenChange={(open) => !open && setDetailConsultation(null)}
        onViewTranscript={onViewTranscript}
      />
    </>
  );
}

function ConsultationCard({ 
  consultation, 
  onView, 
  onEdit 
}: { 
  consultation: Consultation; 
  onView: () => void;
  onEdit: () => void;
}) {
  const practitionerName = consultation.practitioner 
    ? `${consultation.practitioner.first_name || ''} ${consultation.practitioner.last_name || ''}`.trim() || 'Inconnu'
    : 'Inconnu';

  return (
    <div 
      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {format(new Date(consultation.consultation_date), 'EEEE d MMMM yyyy', { locale: fr })}
            </span>
            {consultation.transcript_id && (
              <Badge variant="outline" className="gap-1">
                <FileText className="h-3 w-3" />
                Transcription liée
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{practitionerName}</span>
          </div>

          {consultation.motif && (
            <p className="text-sm mt-2 font-medium">
              Motif: {consultation.motif}
            </p>
          )}

          {consultation.conclusion && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {consultation.conclusion}
            </p>
          )}
        </div>

        <Button 
          size="icon" 
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ConsultationDetailSheet({ 
  consultation, 
  open, 
  onOpenChange,
  onViewTranscript,
}: { 
  consultation: Consultation | null; 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewTranscript?: (transcriptId: string) => void;
}) {
  if (!consultation) return null;

  const practitionerName = consultation.practitioner 
    ? `${consultation.practitioner.first_name || ''} ${consultation.practitioner.last_name || ''}`.trim() || 'Inconnu'
    : 'Inconnu';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Consultation du {format(new Date(consultation.consultation_date), 'd MMMM yyyy', { locale: fr })}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Praticien: {practitionerName}</span>
          </div>

          {consultation.transcript_id && onViewTranscript && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => onViewTranscript(consultation.transcript_id!)}
            >
              <ExternalLink className="h-4 w-4" />
              Voir la transcription associée
            </Button>
          )}

          <Section title="Motif de consultation" content={consultation.motif} />
          <Section title="Notes cliniques" content={consultation.notes_cliniques} />
          <Section title="Examen clinique" content={consultation.examen_clinique} />
          <Section title="Conclusion" content={consultation.conclusion} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">{title}</h4>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>
    </div>
  );
}
