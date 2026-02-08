import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FieldAuditEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_by_role: string;
  changed_at: string;
  is_medical_decision: boolean;
}

interface ConsultationFieldAuditProps {
  consultationId: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  coordinator: 'Coordinateur',
  practitioner: 'Médecin',
  assistant: 'Assistante',
  nurse: 'Infirmier(e)',
  ipa: 'IPA',
};

const FIELD_LABELS: Record<string, string> = {
  motif: 'Motif de consultation',
  notes_cliniques: 'Notes cliniques',
  examen_clinique: 'Examen clinique',
  conclusion: 'Conclusion médicale',
};

export function ConsultationFieldAudit({ consultationId }: ConsultationFieldAuditProps) {
  const { data: auditEntries, isLoading } = useQuery({
    queryKey: ['consultation-field-audit', consultationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultation_field_audit')
        .select(`
          id,
          field_name,
          old_value,
          new_value,
          changed_by,
          changed_by_role,
          changed_at,
          is_medical_decision
        `)
        .eq('consultation_id', consultationId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data as FieldAuditEntry[];
    },
    enabled: !!consultationId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!auditEntries?.length) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Aucune modification enregistrée</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3 pr-4">
        {auditEntries.map((entry) => (
          <div
            key={entry.id}
            className={`p-3 rounded-lg border ${
              entry.is_medical_decision 
                ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950' 
                : 'border-border bg-muted/30'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {FIELD_LABELS[entry.field_name] || entry.field_name}
                </Badge>
                {entry.is_medical_decision && (
                  <Badge variant="secondary" className="gap-1 text-xs bg-amber-100 text-amber-800">
                    <Shield className="h-3 w-3" />
                    Décision médicale
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(entry.changed_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <User className="h-3 w-3" />
              <span>
                Modifié par <strong>{ROLE_LABELS[entry.changed_by_role] || entry.changed_by_role}</strong>
              </span>
            </div>

            {entry.old_value && (
              <div className="text-xs mb-1">
                <span className="text-muted-foreground">Avant: </span>
                <span className="line-through text-muted-foreground/70">
                  {entry.old_value.substring(0, 100)}
                  {entry.old_value.length > 100 && '...'}
                </span>
              </div>
            )}
            
            {entry.new_value && (
              <div className="text-xs">
                <span className="text-muted-foreground">Après: </span>
                <span className="text-foreground">
                  {entry.new_value.substring(0, 100)}
                  {entry.new_value.length > 100 && '...'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
