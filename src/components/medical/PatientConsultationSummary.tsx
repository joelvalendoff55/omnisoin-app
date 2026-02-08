import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, AlertTriangle, Pill, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Antecedent, ANTECEDENT_TYPE_LABELS, SEVERITY_COLORS } from '@/lib/antecedents';
import { Consultation } from '@/lib/consultations';

export interface PatientSummaryData {
  firstName: string;
  lastName: string;
  dob: string | null;
  sex: string | null;
}

interface PatientConsultationSummaryProps {
  patient: PatientSummaryData;
  antecedents: Antecedent[];
  lastConsultation: Consultation | null;
}

export function PatientConsultationSummary({
  patient,
  antecedents,
  lastConsultation,
}: PatientConsultationSummaryProps) {
  const calculateAge = (dob: string) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getSexLabel = (sex: string | null) => {
    switch (sex) {
      case 'M': return 'Homme';
      case 'F': return 'Femme';
      case 'O': return 'Autre';
      default: return null;
    }
  };

  // Get major antecedents (active, severe/moderate, or allergies)
  const majorAntecedents = antecedents
    .filter(a => a.actif && (a.severity === 'severe' || a.severity === 'modere' || a.type === 'allergique'))
    .slice(0, 5);

  // Get current treatments
  const currentTreatments = antecedents
    .filter(a => a.type === 'traitement_en_cours' && a.actif)
    .slice(0, 4);

  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="pt-4 pb-3">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {/* Patient info */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {patient.firstName} {patient.lastName}
            </span>
            {patient.dob && (
              <span className="text-muted-foreground">
                ({calculateAge(patient.dob)} ans)
              </span>
            )}
            {patient.sex && (
              <Badge variant="outline" className="text-xs">
                {getSexLabel(patient.sex)}
              </Badge>
            )}
          </div>

          <Separator orientation="vertical" className="h-5 hidden sm:block" />

          {/* Major antecedents */}
          <div className="flex items-center gap-2 flex-wrap">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium">ATCD:</span>
            {majorAntecedents.length === 0 ? (
              <span className="text-sm text-muted-foreground">Aucun ATCD majeur</span>
            ) : (
              majorAntecedents.map(a => (
                <Badge
                  key={a.id}
                  variant="outline"
                  className={`text-xs ${a.severity ? SEVERITY_COLORS[a.severity] : ''}`}
                >
                  {a.type === 'allergique' && '⚠️ '}
                  {a.description}
                </Badge>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
          {/* Current treatments */}
          <div className="flex items-center gap-2 flex-wrap">
            <Pill className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Traitements:</span>
            {currentTreatments.length === 0 ? (
              <span className="text-sm text-muted-foreground italic">Aucun traitement renseigné</span>
            ) : (
              currentTreatments.map(t => (
                <Badge key={t.id} variant="secondary" className="text-xs">
                  {t.description}
                </Badge>
              ))
            )}
          </div>

          <Separator orientation="vertical" className="h-5 hidden sm:block" />

          {/* Last consultation */}
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Dernière consultation:</span>
            {lastConsultation ? (
              <span className="text-sm text-muted-foreground">
                {format(new Date(lastConsultation.consultation_date), 'd MMM yyyy', { locale: fr })}
                {lastConsultation.motif && ` - ${lastConsultation.motif.slice(0, 40)}${lastConsultation.motif.length > 40 ? '...' : ''}`}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground italic">Aucune</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
