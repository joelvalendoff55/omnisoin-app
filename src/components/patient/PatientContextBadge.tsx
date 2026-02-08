import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { User, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { usePatientConsultationContext } from '@/hooks/usePatientConsultationContext';
import { useAntecedents } from '@/hooks/useAntecedents';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Pages where the badge should be visible
const VISIBLE_ROUTES = [
  '/medecin',
  '/medecin-dashboard',
  '/assistant-dashboard',
  '/ipa',
  '/coordinatrice',
];

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getSexLabel(sex: string | null): string {
  switch (sex) {
    case 'M': return 'Homme';
    case 'F': return 'Femme';
    case 'O': return 'Autre';
    default: return 'Non spécifié';
  }
}

export function PatientContextBadge() {
  const location = useLocation();
  const { context, isActive } = usePatientConsultationContext();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const patient = context.patient;
  const { antecedents, loading: antecedentsLoading } = useAntecedents(patient?.id);

  // Check if current route should show the badge
  const shouldShow = useMemo(() => {
    const path = location.pathname;
    // Check exact matches or encounter routes
    if (path.startsWith('/encounter/')) return true;
    return VISIBLE_ROUTES.some(route => path === route || path.startsWith(route + '/'));
  }, [location.pathname]);

  // Get allergies (type = 'allergique')
  const allergies = useMemo(() => {
    return antecedents.filter(a => a.type === 'allergique');
  }, [antecedents]);

  // Get important antecedents (medical, surgical, family)
  const importantAntecedents = useMemo(() => {
    return antecedents.filter(a => 
      ['medical', 'chirurgical', 'familial'].includes(a.type)
    ).slice(0, 3); // Limit to 3 for compact display
  }, [antecedents]);

  // Don't render if no patient or not on visible route
  if (!isActive || !patient || !shouldShow) {
    return null;
  }

  const age = calculateAge(patient.dob);
  const fullName = `${patient.first_name} ${patient.last_name}`;
  const hasAllergies = allergies.length > 0;

  if (!isExpanded) {
    // Minimized state - just show an icon with patient initials
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsExpanded(true)}
              className="fixed top-20 right-8 z-50 flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
              </span>
              {hasAllergies && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Afficher les détails du patient</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="fixed top-20 right-8 z-50 w-72 bg-card border border-border rounded-lg shadow-lg animate-fade-in">
      {/* Header with patient name and collapse button */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground leading-tight">
              {fullName}
            </h4>
            <p className="text-xs text-muted-foreground">
              {age !== null ? `${age} ans` : 'Âge inconnu'} • {getSexLabel(patient.sex)}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 rounded hover:bg-muted transition-colors"
          aria-label="Réduire"
        >
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Allergies Section */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Allergies</p>
          {antecedentsLoading ? (
            <p className="text-xs text-muted-foreground italic">Chargement...</p>
          ) : hasAllergies ? (
            <div className="flex flex-wrap gap-1">
              {allergies.map((allergy) => (
                <Badge
                  key={allergy.id}
                  variant="destructive"
                  className="text-xs"
                >
                  {allergy.description}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Aucune allergie connue</p>
          )}
        </div>

        {/* Important Antecedents Section */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Antécédents importants</p>
          {antecedentsLoading ? (
            <p className="text-xs text-muted-foreground italic">Chargement...</p>
          ) : importantAntecedents.length > 0 ? (
            <div className="space-y-1">
              {importantAntecedents.map((ant) => (
                <HoverCard key={ant.id}>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-pointer">
                      <Badge variant="secondary" className="text-xs">
                        {ant.type === 'medical' ? 'Méd' : ant.type === 'chirurgical' ? 'Chir' : 'Fam'}
                      </Badge>
                      <span className="text-xs text-foreground truncate max-w-[180px]">
                        {ant.description}
                      </span>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent side="left" className="w-64">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{ant.description}</p>
                      {ant.notes && (
                        <p className="text-xs text-muted-foreground">{ant.notes}</p>
                      )}
                      {ant.date_debut && (
                        <p className="text-xs text-muted-foreground">
                          Depuis: {new Date(ant.date_debut).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
              {antecedents.filter(a => ['medical', 'chirurgical', 'familial'].includes(a.type)).length > 3 && (
                <p className="text-xs text-muted-foreground italic">
                  +{antecedents.filter(a => ['medical', 'chirurgical', 'familial'].includes(a.type)).length - 3} autres
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Aucun antécédent enregistré</p>
          )}
        </div>
      </div>
    </div>
  );
}
