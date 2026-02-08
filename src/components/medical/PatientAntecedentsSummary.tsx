import { useState } from 'react';
import { 
  HeartPulse, 
  Scissors, 
  AlertTriangle, 
  Pill, 
  Users,
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useAntecedents } from '@/hooks/useAntecedents';
import { 
  ANTECEDENT_TYPE_LABELS, 
  SEVERITY_COLORS,
  AntecedentType 
} from '@/lib/antecedents';
import { cn } from '@/lib/utils';

interface PatientAntecedentsSummaryProps {
  patientId: string;
}

const TYPE_ICONS: Record<AntecedentType, React.ReactNode> = {
  medical: <HeartPulse className="h-4 w-4" />,
  chirurgical: <Scissors className="h-4 w-4" />,
  allergique: <AlertTriangle className="h-4 w-4" />,
  traitement_en_cours: <Pill className="h-4 w-4" />,
  familial: <Users className="h-4 w-4" />,
};

const TYPE_COLORS: Record<AntecedentType, string> = {
  medical: 'text-blue-600',
  chirurgical: 'text-purple-600',
  allergique: 'text-red-600',
  traitement_en_cours: 'text-green-600',
  familial: 'text-amber-600',
};

export function PatientAntecedentsSummary({ patientId }: PatientAntecedentsSummaryProps) {
  const { antecedents, loading, getByType } = useAntecedents(patientId);
  const [isOpen, setIsOpen] = useState(true);

  // Get active antecedents grouped by type
  const activeAntecedents = antecedents.filter(a => a.actif);
  const medicalHistory = getByType('medical').filter(a => a.actif);
  const surgicalHistory = getByType('chirurgical').filter(a => a.actif);
  const allergies = getByType('allergique').filter(a => a.actif);
  const currentTreatments = getByType('traitement_en_cours').filter(a => a.actif);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Antécédents du patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeAntecedents.length === 0) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-muted-foreground" />
            Antécédents du patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun antécédent enregistré</p>
        </CardContent>
      </Card>
    );
  }

  // Highlight allergies and severe conditions
  const hasAllergies = allergies.length > 0;
  const hasSevereConditions = activeAntecedents.some(a => a.severity === 'severe');

  return (
    <Card className={cn(
      'transition-colors',
      hasAllergies && 'border-red-200 bg-red-50/30',
      hasSevereConditions && !hasAllergies && 'border-orange-200 bg-orange-50/30'
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" />
                Antécédents du patient
                <Badge variant="secondary" className="ml-2">
                  {activeAntecedents.length}
                </Badge>
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Allergies - Always visible first if present */}
            {allergies.length > 0 && (
              <div className="p-2 bg-red-100 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Allergies ({allergies.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {allergies.map(allergy => (
                    <Badge 
                      key={allergy.id} 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        allergy.severity && SEVERITY_COLORS[allergy.severity]
                      )}
                    >
                      {allergy.description}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Current Treatments */}
            {currentTreatments.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                  <Pill className="h-4 w-4" />
                  Traitements en cours ({currentTreatments.length})
                </div>
                <div className="flex flex-wrap gap-1 pl-6">
                  {currentTreatments.map(treatment => (
                    <Badge 
                      key={treatment.id} 
                      variant="outline" 
                      className="text-xs bg-green-50 text-green-700 border-green-200"
                    >
                      {treatment.description}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Medical History */}
            {medicalHistory.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                  <HeartPulse className="h-4 w-4" />
                  Antécédents médicaux ({medicalHistory.length})
                </div>
                <div className="flex flex-wrap gap-1 pl-6">
                  {medicalHistory.map(item => (
                    <Badge 
                      key={item.id} 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        item.severity ? SEVERITY_COLORS[item.severity] : 'bg-blue-50 text-blue-700 border-blue-200'
                      )}
                    >
                      {item.description}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Surgical History */}
            {surgicalHistory.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-purple-700 font-medium text-sm">
                  <Scissors className="h-4 w-4" />
                  Antécédents chirurgicaux ({surgicalHistory.length})
                </div>
                <div className="flex flex-wrap gap-1 pl-6">
                  {surgicalHistory.map(item => (
                    <Badge 
                      key={item.id} 
                      variant="outline" 
                      className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                    >
                      {item.description}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}