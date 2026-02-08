"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FileCheck, 
  Copy,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  Calendar,
  User,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { CooperationProtocol, formatProtocols } from '@/lib/ipaFormatter';
import { format, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const statusConfig = {
  actif: { 
    label: 'Actif', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2 
  },
  en_revision: { 
    label: 'En révision', 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: AlertCircle 
  },
  suspendu: { 
    label: 'Suspendu', 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    icon: PauseCircle 
  },
};

// Mock data
const mockProtocols: CooperationProtocol[] = [
  {
    id: '1',
    title: 'Protocole suivi diabète type 2',
    delegating_doctor: 'Dr. Martin Pierre',
    status: 'actif',
    start_date: format(addMonths(new Date(), -12), 'yyyy-MM-dd'),
    end_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
    delegated_acts: [
      'Prescription et interprétation HbA1c',
      'Adaptation posologie antidiabétiques oraux',
      'Prescription et interprétation bilan rénal annuel',
      'Éducation thérapeutique diabète',
    ],
    acts_performed: 156,
  },
  {
    id: '2',
    title: 'Protocole suivi insuffisance cardiaque',
    delegating_doctor: 'Dr. Bernard Jean (Cardiologue)',
    status: 'actif',
    start_date: format(addMonths(new Date(), -6), 'yyyy-MM-dd'),
    delegated_acts: [
      'Suivi clinique et adaptation diurétiques',
      'Prescription NT-proBNP',
      'Titration bêtabloquants selon protocole',
      'Coordination parcours de soins',
    ],
    acts_performed: 48,
  },
  {
    id: '3',
    title: 'Protocole suivi BPCO',
    delegating_doctor: 'Dr. Dupont Marie',
    status: 'en_revision',
    start_date: format(addMonths(new Date(), -18), 'yyyy-MM-dd'),
    end_date: format(addMonths(new Date(), -1), 'yyyy-MM-dd'),
    delegated_acts: [
      'Adaptation traitement inhalé',
      'Prescription EFR de suivi',
      'Gestion des exacerbations légères',
    ],
    acts_performed: 89,
  },
  {
    id: '4',
    title: 'Protocole anticoagulation AVK',
    delegating_doctor: 'Dr. Martin Pierre',
    status: 'actif',
    start_date: format(addMonths(new Date(), -24), 'yyyy-MM-dd'),
    delegated_acts: [
      'Prescription et interprétation INR',
      'Adaptation posologie AVK',
      'Gestion des interactions médicamenteuses',
    ],
    acts_performed: 234,
  },
];

// Mock acts tracking
const mockActsTracking = [
  { protocol_id: '1', month: 'Janvier 2024', count: 15 },
  { protocol_id: '1', month: 'Février 2024', count: 18 },
  { protocol_id: '1', month: 'Mars 2024', count: 12 },
  { protocol_id: '2', month: 'Janvier 2024', count: 8 },
  { protocol_id: '2', month: 'Février 2024', count: 10 },
];

interface ProtocolCardProps {
  protocol: CooperationProtocol;
}

function ProtocolCard({ protocol }: ProtocolCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const status = statusConfig[protocol.status];
  const StatusIcon = status.icon;

  const protocolText = `${protocol.title}
Médecin délégant: ${protocol.delegating_doctor}
Statut: ${status.label}
Début: ${format(new Date(protocol.start_date), 'dd/MM/yyyy', { locale: fr })}${protocol.end_date ? `\nFin: ${format(new Date(protocol.end_date), 'dd/MM/yyyy', { locale: fr })}` : ''}
Actes délégués: ${protocol.delegated_acts.join(', ')}
Actes réalisés: ${protocol.acts_performed}`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-muted rounded-lg">
                <FileCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{protocol.title}</p>
                  <Badge className={status.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {protocol.delegating_doctor}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {protocol.acts_performed} actes réalisés
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CopyToClipboard
                text={protocolText}
                variant="ghost"
                size="icon"
              />
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t p-4 bg-muted/20 space-y-4">
            {/* Period */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                Du {format(new Date(protocol.start_date), 'dd/MM/yyyy', { locale: fr })}
                {protocol.end_date 
                  ? ` au ${format(new Date(protocol.end_date), 'dd/MM/yyyy', { locale: fr })}`
                  : ' - En cours'
                }
              </span>
            </div>

            {/* Delegated acts */}
            <div>
              <h4 className="text-sm font-medium mb-2">Actes délégués</h4>
              <div className="flex flex-wrap gap-2">
                {protocol.delegated_acts.map((act, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {act}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-xs text-muted-foreground">Actes réalisés</p>
                <p className="text-xl font-bold">{protocol.acts_performed}</p>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-xs text-muted-foreground">Types d'actes</p>
                <p className="text-xl font-bold">{protocol.delegated_acts.length}</p>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-xs text-muted-foreground">Moyenne/mois</p>
                <p className="text-xl font-bold">
                  {Math.round(protocol.acts_performed / 12)}
                </p>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function CooperationProtocolsSection() {
  const protocols = mockProtocols;

  const activeCount = protocols.filter(p => p.status === 'actif').length;
  const totalActs = protocols.reduce((acc, p) => acc + p.acts_performed, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Protocoles de coopération
            </CardTitle>
            <CardDescription>
              {protocols.length} protocoles • {activeCount} actifs • {totalActs} actes réalisés
            </CardDescription>
          </div>
          <CopyToClipboard
            text={formatProtocols(protocols)}
            label="Copier tous les protocoles"
            variant="outline"
            icon={<Copy className="h-4 w-4" />}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Protocoles actifs</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">En révision</p>
            <p className="text-2xl font-bold text-yellow-600">
              {protocols.filter(p => p.status === 'en_revision').length}
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Total actes</p>
            <p className="text-2xl font-bold">{totalActs}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Médecins délégants</p>
            <p className="text-2xl font-bold">
              {new Set(protocols.map(p => p.delegating_doctor)).size}
            </p>
          </div>
        </div>

        {/* Protocols list */}
        <div className="space-y-3">
          {protocols.map(protocol => (
            <ProtocolCard key={protocol.id} protocol={protocol} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
