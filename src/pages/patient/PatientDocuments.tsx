import { useState, useEffect } from 'react';
import { usePatientAuth } from '@/hooks/usePatientAuth';
import { useAdminPatientContext } from '@/hooks/useAdminPatientContext';
import { PatientLayout } from '@/components/patient-portal/PatientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Download, 
  Search,
  File,
  Eye,
  Calendar,
  User,
  Filter,
  Pill,
  TestTube,
  Stethoscope,
  FileCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { getPatientDocuments, PatientDocument } from '@/lib/patientPortal';

const documentTypeConfig = {
  ordonnance: { icon: Pill, label: 'Ordonnance', color: 'bg-blue-100 text-blue-700' },
  resultat: { icon: TestTube, label: 'Résultat', color: 'bg-green-100 text-green-700' },
  certificat: { icon: FileCheck, label: 'Certificat', color: 'bg-purple-100 text-purple-700' },
  compte_rendu: { icon: Stethoscope, label: 'Compte-rendu', color: 'bg-orange-100 text-orange-700' },
  autre: { icon: File, label: 'Autre', color: 'bg-gray-100 text-gray-700' },
};

export default function PatientDocuments() {
  const { patient } = usePatientAuth();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    if (!patient?.patientId) return;

    const loadDocuments = async () => {
      setLoading(true);
      try {
        const docs = await getPatientDocuments(patient.patientId);
        setDocuments(docs);
      } catch (error) {
        console.error('Error loading documents:', error);
        toast.error('Erreur lors du chargement des documents');
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [patient?.patientId]);

  const handleDownload = (doc: PatientDocument) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
      toast.success('Téléchargement démarré', {
        description: doc.title,
      });
    } else {
      toast.error('Document non disponible');
    }
  };

  const handleView = (doc: PatientDocument) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
    } else {
      toast.info('Aperçu non disponible', {
        description: doc.title,
      });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.uploaded_by_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.category?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  const documentsByType = {
    ordonnance: documents.filter(d => d.type === 'ordonnance').length,
    resultat: documents.filter(d => d.type === 'resultat').length,
    certificat: documents.filter(d => d.type === 'certificat').length,
    compte_rendu: documents.filter(d => d.type === 'compte_rendu').length,
    autre: documents.filter(d => d.type === 'autre').length,
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <PatientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mes documents</h1>
            <p className="text-muted-foreground">Consultez et téléchargez vos documents médicaux</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {Object.entries(documentTypeConfig).map(([type, config]) => {
            const Icon = config.icon;
            const count = documentsByType[type as keyof typeof documentsByType];
            return (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
                className={`p-4 rounded-xl border transition-all ${
                  selectedType === type 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'bg-background hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}s</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher un document..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {selectedType !== 'all' && (
                <Button variant="outline" onClick={() => setSelectedType('all')}>
                  <Filter className="w-4 h-4 mr-2" />
                  Effacer le filtre
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Documents
              <Badge variant="secondary" className="ml-2">
                {filteredDocuments.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              {selectedType !== 'all' 
                ? `Filtré par : ${documentTypeConfig[selectedType as keyof typeof documentTypeConfig].label}`
                : 'Tous vos documents médicaux'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Aucun document trouvé</p>
                <p className="text-sm">
                  {documents.length === 0 
                    ? 'Vos documents apparaîtront ici une fois ajoutés par votre équipe médicale'
                    : 'Essayez de modifier vos critères de recherche'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocuments.map((doc) => {
                  const typeConfig = documentTypeConfig[doc.type] || documentTypeConfig.autre;
                  const Icon = typeConfig.icon;
                  
                  return (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border bg-background hover:bg-accent/50 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium truncate">{doc.title}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {doc.uploaded_by_name}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(doc.created_at), 'd MMMM yyyy', { locale: fr })}
                              </span>
                              <span>•</span>
                              <span>{formatFileSize(doc.file_size)}</span>
                            </div>
                          </div>
                          <Badge variant="secondary" className={typeConfig.color}>
                            {typeConfig.label}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:flex-shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleView(doc)}
                        >
                          <Eye className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Voir</span>
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Télécharger</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PatientLayout>
  );
}
