"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Search, 
  Copy,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Activity
} from 'lucide-react';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { ComplexCase, formatComplexCase, formatAllComplexCases } from '@/lib/ipaFormatter';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const complexityConfig = {
  1: { label: 'Niveau 1', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  2: { label: 'Niveau 2', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  3: { label: 'Niveau 3', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

const statusConfig = {
  actif: { label: 'Actif', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Activity },
  stable: { label: 'Stable', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  en_amelioration: { label: 'En amélioration', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  cloture: { label: 'Clôturé', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', icon: CheckCircle2 },
};

// Mock data
const mockCases: ComplexCase[] = [
  {
    id: '1',
    patient_name: 'Martin Jean',
    patient_dob: '1945-03-15',
    complexity_level: 3,
    pathologies: ['Diabète type 2', 'Insuffisance cardiaque', 'BPCO'],
    status: 'actif',
    last_intervention: format(addDays(new Date(), -3), 'yyyy-MM-dd'),
    next_rdv: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    notes: 'Surveillance glycémique renforcée, ajustement traitement en cours',
    interventions: [
      { id: '1', date: format(addDays(new Date(), -3), 'yyyy-MM-dd'), type: 'consultation', summary: 'Bilan trimestriel, HbA1c à 7.8%', practitioner_name: 'IPA Dupont' },
      { id: '2', date: format(addDays(new Date(), -10), 'yyyy-MM-dd'), type: 'education', summary: 'Séance éducation thérapeutique diabète', practitioner_name: 'IPA Dupont' },
      { id: '3', date: format(addDays(new Date(), -30), 'yyyy-MM-dd'), type: 'coordination', summary: 'Appel cardiologue pour ajustement diurétiques', practitioner_name: 'IPA Dupont' },
    ],
  },
  {
    id: '2',
    patient_name: 'Dupont Marie',
    patient_dob: '1952-07-22',
    complexity_level: 2,
    pathologies: ['Hypertension', 'Diabète type 2'],
    status: 'stable',
    last_intervention: format(addDays(new Date(), -7), 'yyyy-MM-dd'),
    next_rdv: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    notes: 'Équilibre tensionnel satisfaisant',
    interventions: [
      { id: '1', date: format(addDays(new Date(), -7), 'yyyy-MM-dd'), type: 'visite', summary: 'Visite à domicile, contrôle tensionnel', practitioner_name: 'IPA Dupont' },
    ],
  },
  {
    id: '3',
    patient_name: 'Bernard Paul',
    patient_dob: '1960-11-08',
    complexity_level: 2,
    pathologies: ['Asthme sévère', 'Obésité'],
    status: 'en_amelioration',
    last_intervention: format(addDays(new Date(), -14), 'yyyy-MM-dd'),
    next_rdv: format(addDays(new Date(), 21), 'yyyy-MM-dd'),
    interventions: [
      { id: '1', date: format(addDays(new Date(), -14), 'yyyy-MM-dd'), type: 'education', summary: 'Techniques inhalation, plan action asthme', practitioner_name: 'IPA Dupont' },
    ],
  },
  {
    id: '4',
    patient_name: 'Petit Sophie',
    patient_dob: '1968-02-28',
    complexity_level: 1,
    pathologies: ['Insuffisance rénale chronique stade 3'],
    status: 'stable',
    last_intervention: format(addDays(new Date(), -21), 'yyyy-MM-dd'),
    interventions: [],
  },
];

interface CaseCardProps {
  caseData: ComplexCase;
}

function CaseCard({ caseData }: CaseCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const complexity = complexityConfig[caseData.complexity_level];
  const status = statusConfig[caseData.status];
  const StatusIcon = status.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-muted">
                <span className="text-lg font-bold">{caseData.complexity_level}</span>
                <span className="text-[10px] text-muted-foreground">Niveau</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{caseData.patient_name}</p>
                  <Badge className={complexity.color}>{complexity.label}</Badge>
                  <Badge className={status.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {caseData.pathologies.join(' • ')}
                </p>
                {caseData.next_rdv && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    Prochain RDV: {format(new Date(caseData.next_rdv), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CopyToClipboard
                text={formatComplexCase(caseData)}
                label="Copier synthèse"
                variant="outline"
                size="sm"
              />
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t p-4 bg-muted/20">
            {caseData.notes && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground">{caseData.notes}</p>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium mb-2">Historique des interventions</h4>
              {caseData.interventions.length > 0 ? (
                <div className="space-y-2">
                  {caseData.interventions.map(intervention => (
                    <div key={intervention.id} className="flex items-start gap-3 text-sm">
                      <div className="flex items-center gap-2 min-w-[100px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(intervention.date), 'dd/MM/yyyy', { locale: fr })}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {intervention.type === 'consultation' ? 'Consultation' :
                         intervention.type === 'visite' ? 'Visite' :
                         intervention.type === 'coordination' ? 'Coordination' : 'Éducation'}
                      </Badge>
                      <p className="flex-1">{intervention.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Aucune intervention enregistrée</p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function ComplexCasesSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [complexityFilter, setComplexityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const cases = mockCases;

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.pathologies.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesComplexity = complexityFilter === 'all' || c.complexity_level === parseInt(complexityFilter);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    
    return matchesSearch && matchesComplexity && matchesStatus;
  });

  // Stats
  const level3Count = cases.filter(c => c.complexity_level === 3).length;
  const activeCount = cases.filter(c => c.status === 'actif').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Suivi des cas complexes
            </CardTitle>
            <CardDescription>
              {cases.length} patients suivis • {level3Count} niveau 3 • {activeCount} actifs
            </CardDescription>
          </div>
          <CopyToClipboard
            text={formatAllComplexCases(cases)}
            label="Copier tous les cas"
            variant="outline"
            icon={<Copy className="h-4 w-4" />}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher patient ou pathologie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={complexityFilter} onValueChange={setComplexityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Complexité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              <SelectItem value="3">Niveau 3</SelectItem>
              <SelectItem value="2">Niveau 2</SelectItem>
              <SelectItem value="1">Niveau 1</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="stable">Stable</SelectItem>
              <SelectItem value="en_amelioration">En amélioration</SelectItem>
              <SelectItem value="cloture">Clôturé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alert for high complexity cases */}
        {level3Count > 0 && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="text-sm text-orange-700 dark:text-orange-400">
              {level3Count} cas de niveau 3 nécessitant une surveillance renforcée
            </span>
          </div>
        )}

        {/* Cases list */}
        <div className="space-y-3">
          {filteredCases.length > 0 ? (
            filteredCases.map(caseData => (
              <CaseCard key={caseData.id} caseData={caseData} />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun cas trouvé</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
