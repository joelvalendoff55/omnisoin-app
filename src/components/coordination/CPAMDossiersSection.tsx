import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Plus, 
  Search, 
  Upload, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Copy,
  Building2
} from 'lucide-react';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { CPAMDossier, formatCPAMDossiers } from '@/lib/coordinateurFormatter';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusConfig = {
  en_attente: { 
    label: 'En attente', 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock 
  },
  en_cours: { 
    label: 'En cours', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: AlertCircle 
  },
  valide: { 
    label: 'Validé', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2 
  },
  rejete: { 
    label: 'Rejeté', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle 
  },
};

const dossierTypeLabels = {
  demande_ald: 'Demande ALD',
  reclamation: 'Réclamation',
  accord_prealable: 'Accord préalable',
  autre: 'Autre',
};

// Mock data for demonstration
const mockDossiers: CPAMDossier[] = [
  {
    id: '1',
    title: 'Demande ALD - Diabète type 2',
    dossier_type: 'demande_ald',
    status: 'en_attente',
    organisme: 'cpam',
    patient_name: 'Martin Jean',
    date_depot: '2024-01-15',
    notes: 'Dossier complet, en attente de réponse',
  },
  {
    id: '2',
    title: 'Accord préalable - Kinésithérapie',
    dossier_type: 'accord_prealable',
    status: 'valide',
    organisme: 'cpam',
    patient_name: 'Dupont Marie',
    date_depot: '2024-01-10',
    date_reponse: '2024-01-20',
  },
  {
    id: '3',
    title: 'Réclamation remboursement',
    dossier_type: 'reclamation',
    status: 'en_cours',
    organisme: 'cpam',
    patient_name: 'Bernard Paul',
    date_depot: '2024-01-18',
  },
  {
    id: '4',
    title: 'Autorisation transport sanitaire',
    dossier_type: 'accord_prealable',
    status: 'rejete',
    organisme: 'ars',
    patient_name: 'Petit Sophie',
    date_depot: '2024-01-05',
    date_reponse: '2024-01-12',
    notes: 'Motif: pièces manquantes',
  },
];

interface DossierCardProps {
  dossier: CPAMDossier;
}

function DossierCard({ dossier }: DossierCardProps) {
  const status = statusConfig[dossier.status];
  const StatusIcon = status.icon;

  return (
    <div className="flex items-start justify-between p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium">{dossier.title}</p>
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{dossierTypeLabels[dossier.dossier_type]}</span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {dossier.organisme.toUpperCase()}
            </span>
          </div>
          {dossier.patient_name && (
            <p className="text-sm text-muted-foreground mt-1">
              Patient: {dossier.patient_name}
            </p>
          )}
          {dossier.date_depot && (
            <p className="text-xs text-muted-foreground mt-1">
              Déposé le {format(new Date(dossier.date_depot), 'dd/MM/yyyy', { locale: fr })}
              {dossier.date_reponse && (
                <> • Réponse le {format(new Date(dossier.date_reponse), 'dd/MM/yyyy', { locale: fr })}</>
              )}
            </p>
          )}
          {dossier.notes && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              {dossier.notes}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <CopyToClipboard
          text={`${dossier.title}\nType: ${dossierTypeLabels[dossier.dossier_type]}\nStatut: ${status.label}\nOrganisme: ${dossier.organisme.toUpperCase()}${dossier.patient_name ? `\nPatient: ${dossier.patient_name}` : ''}${dossier.notes ? `\nNotes: ${dossier.notes}` : ''}`}
          variant="ghost"
          size="icon"
        />
      </div>
    </div>
  );
}

interface CPAMDossiersSectionProps {
  onUploadDocument?: () => void;
}

export function CPAMDossiersSection({ onUploadDocument }: CPAMDossiersSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  // In production, this would come from a hook/API
  const dossiers = mockDossiers;

  const filteredDossiers = dossiers.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.patient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && d.status === activeTab;
  });

  const countByStatus = {
    all: dossiers.length,
    en_attente: dossiers.filter(d => d.status === 'en_attente').length,
    en_cours: dossiers.filter(d => d.status === 'en_cours').length,
    valide: dossiers.filter(d => d.status === 'valide').length,
    rejete: dossiers.filter(d => d.status === 'rejete').length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Gestion CPAM / ARS
            </CardTitle>
            <CardDescription>
              Suivi des dossiers administratifs et échanges
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <CopyToClipboard
              text={formatCPAMDossiers(dossiers)}
              label="Copier liste"
              variant="outline"
              icon={<Copy className="h-4 w-4" />}
            />
            <Button onClick={onUploadDocument} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Document
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau dossier
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un dossier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              Tous ({countByStatus.all})
            </TabsTrigger>
            <TabsTrigger value="en_attente">
              En attente ({countByStatus.en_attente})
            </TabsTrigger>
            <TabsTrigger value="en_cours">
              En cours ({countByStatus.en_cours})
            </TabsTrigger>
            <TabsTrigger value="valide">
              Validés ({countByStatus.valide})
            </TabsTrigger>
            <TabsTrigger value="rejete">
              Rejetés ({countByStatus.rejete})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="space-y-3">
              {filteredDossiers.length > 0 ? (
                filteredDossiers.map(dossier => (
                  <DossierCard key={dossier.id} dossier={dossier} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun dossier trouvé</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
