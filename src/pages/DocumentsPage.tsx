import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useDocuments } from '@/hooks/useDocuments';
import { useStructureId } from '@/hooks/useStructureId';
import { useDocumentPreferences } from '@/hooks/useUserPreferences';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { HealthDataGuard } from '@/components/shared/HealthDataGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, ScanLine, Search, Plus, Grid3X3, List, Upload } from 'lucide-react';
import { DocumentScanner } from '@/components/documents/DocumentScanner';
import { EnhancedDocumentCard } from '@/components/documents/EnhancedDocumentCard';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { DocumentCategoryFilter, DocumentCategory } from '@/components/documents/DocumentCategoryFilter';
import type { Document } from '@/lib/documents';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

export default function DocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const { structureId } = useStructureId();
  const { documents, loading, refetch, addDocument, removeDocument, triggerDocumentOCR } = useDocuments();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Persisted preferences
  const { viewMode, setViewMode, category: savedCategory, setCategory: setSavedCategory } = useDocumentPreferences();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | null>(
    savedCategory !== 'all' ? savedCategory as DocumentCategory : null
  );
  const [viewDocument, setViewDocument] = useState<Document | null>(null);

  // Sync category to preferences
  const handleCategoryChange = (cat: DocumentCategory | null) => {
    setSelectedCategory(cat);
    setSavedCategory(cat || 'all');
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch patients for scanner
  useEffect(() => {
    if (!structureId) return;

    const fetchPatients = async () => {
      const { data } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .eq('structure_id', structureId)
        .eq('is_archived', false)
        .order('last_name');

      if (data) {
        setPatients(data);
      }
    };

    fetchPatients();
  }, [structureId]);

  // Handle openDocument query param from GlobalSearch
  useEffect(() => {
    const openDocumentId = searchParams.get('openDocument');
    if (openDocumentId && !loading && documents.length > 0) {
      const found = documents.find((d) => d.id === openDocumentId);
      if (found) {
        setViewDocument(found);
      }
      // Clean URL
      setSearchParams((params) => {
        params.delete('openDocument');
        return params;
      }, { replace: true });
    }
  }, [searchParams, loading, documents, setSearchParams]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<DocumentCategory, number> = {
      ordonnance: 0,
      resultat: 0,
      certificat: 0,
      imagerie: 0,
      courrier: 0,
      autre: 0,
    };
    documents.forEach((doc) => {
      const cat = (doc.category as DocumentCategory) || 'autre';
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });
    return counts;
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Category filter
      if (selectedCategory && doc.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          doc.title.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query) ||
          doc.patient?.first_name.toLowerCase().includes(query) ||
          doc.patient?.last_name.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [documents, searchQuery, selectedCategory]);

  if (authLoading || !user) return null;

  return (
    <DashboardLayout>
      <HealthDataGuard resource="documents" action="read">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Documents</h1>
              <p className="text-muted-foreground mt-1">
                Gestion des fichiers, scans & OCR
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setScannerOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importer
              </Button>
              <Button onClick={() => setScannerOpen(true)}>
                <ScanLine className="h-4 w-4 mr-2" />
                Scanner
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex-1">
              <DocumentCategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
                counts={categoryCounts}
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{documents.length}</div>
                <div className="text-xs text-muted-foreground">Total documents</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{categoryCounts.ordonnance}</div>
                <div className="text-xs text-muted-foreground">Ordonnances</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{categoryCounts.resultat}</div>
                <div className="text-xs text-muted-foreground">Résultats</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{categoryCounts.certificat}</div>
                <div className="text-xs text-muted-foreground">Certificats</div>
              </CardContent>
            </Card>
          </div>

          {/* Documents Grid/List */}
          {loading ? (
            <div className={viewMode === 'grid' 
              ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "space-y-2"
            }>
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className={viewMode === 'grid' ? "h-48" : "h-20"} />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-center">
                  {searchQuery || selectedCategory ? 'Aucun document trouvé' : 'Aucun document'}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setScannerOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className={viewMode === 'grid' 
              ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "space-y-2"
            }>
              {filteredDocuments.map((doc) => (
                <EnhancedDocumentCard
                  key={doc.id}
                  document={doc}
                  onView={setViewDocument}
                  onDelete={removeDocument}
                  onTriggerOCR={triggerDocumentOCR}
                  canDelete={isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      </HealthDataGuard>

      {/* Scanner Dialog */}
      <DocumentScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        patients={patients}
        onScanComplete={addDocument}
      />

      {/* Document Viewer */}
      <DocumentViewer
        document={viewDocument}
        open={!!viewDocument}
        onOpenChange={(open) => !open && setViewDocument(null)}
        onTriggerOCR={triggerDocumentOCR}
      />
    </DashboardLayout>
  );
}
