import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Upload,
  FlaskConical,
  Activity,
  FileCheck,
  Heart,
  Users,
  Loader2,
  Eye,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';

interface AnalyzedDocument {
  id: string;
  name: string;
  type: 'imagerie' | 'biologie' | 'crh' | 'cro' | 'medico_social' | 'other';
  summary: string;
  uploadedAt: Date;
  rawContent?: string;
}

const TAG_CONFIG = {
  imagerie: { label: 'Imagerie', icon: Eye, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  biologie: { label: 'Biologie', icon: FlaskConical, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  crh: { label: 'CRH', icon: Activity, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  cro: { label: 'CRO', icon: FileCheck, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  medico_social: { label: 'Médico-social', icon: Users, color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300' },
  other: { label: 'Autre', icon: FileText, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
};

export function MedicalDocumentsSection() {
  const [documents, setDocuments] = useState<AnalyzedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Seuls les fichiers PDF sont acceptés');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
      
      const base64Data = await base64Promise;
      
      // Analyze with AI
      const { data, error } = await supabase.functions.invoke('multi-llm', {
        body: {
          prompt: `Analyse ce document médical et fournis:
1. Le type de document (imagerie, biologie, CRH, CRO, médico-social, autre)
2. Un résumé structuré des informations clés
3. Les valeurs anormales ou points d'attention

Document (base64): ${base64Data.substring(0, 2000)}... [document tronqué pour l'analyse]`,
          patientContext: `Analyse du document: ${selectedFile.name}`,
          mode: 'analysis',
        },
      });

      if (error) throw error;

      const analysisResult = data.geminiResponse || data.perplexityResponse || 'Analyse non disponible';
      
      // Detect document type from analysis
      const typeDetection = analysisResult.toLowerCase();
      let detectedType: AnalyzedDocument['type'] = 'other';
      if (typeDetection.includes('imagerie') || typeDetection.includes('radio') || typeDetection.includes('scanner') || typeDetection.includes('irm')) {
        detectedType = 'imagerie';
      } else if (typeDetection.includes('biologie') || typeDetection.includes('bilan') || typeDetection.includes('prise de sang')) {
        detectedType = 'biologie';
      } else if (typeDetection.includes('crh') || typeDetection.includes('compte rendu hospitalier') || typeDetection.includes('hospitalisation')) {
        detectedType = 'crh';
      } else if (typeDetection.includes('cro') || typeDetection.includes('opératoire') || typeDetection.includes('chirurgie')) {
        detectedType = 'cro';
      } else if (typeDetection.includes('social') || typeDetection.includes('apa') || typeDetection.includes('mdph')) {
        detectedType = 'medico_social';
      }

      const newDoc: AnalyzedDocument = {
        id: crypto.randomUUID(),
        name: selectedFile.name,
        type: detectedType,
        summary: analysisResult,
        uploadedAt: new Date(),
        rawContent: analysisResult,
      };

      setDocuments([newDoc, ...documents]);
      setSelectedFile(null);
      toast.success('Document analysé avec succès');
    } catch (err) {
      console.error('Error analyzing document:', err);
      toast.error('Erreur lors de l\'analyse du document');
    } finally {
      setIsUploading(false);
    }
  };

  const removeDocument = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
    if (expandedDoc === id) setExpandedDoc(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Documents médicaux</h2>
        <Badge variant="secondary">{documents.length}</Badge>
      </div>

      {/* Upload Section */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>
            {selectedFile && (
              <>
                <Button
                  onClick={handleUploadAndAnalyze}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyse...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Analyser
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          {selectedFile && (
            <p className="text-sm text-muted-foreground mt-2">
              Fichier sélectionné: {selectedFile.name}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      {documents.length > 0 ? (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {documents.map((doc) => {
              const config = TAG_CONFIG[doc.type];
              const Icon = config.icon;
              const isExpanded = expandedDoc === doc.id;

              return (
                <Card key={doc.id} className="overflow-hidden">
                  <CardHeader className="py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(doc.uploadedAt, 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={config.color}>{config.label}</Badge>
                        <CopyToClipboard text={doc.summary} variant="ghost" size="icon" />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDocument(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                    >
                      {isExpanded ? 'Masquer le résumé' : 'Voir le résumé'}
                    </Button>
                    {isExpanded && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                        {doc.summary}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <FileText className="h-8 w-8 opacity-50" />
              <p>Aucun document importé</p>
              <p className="text-xs">Importez un PDF pour l'analyser automatiquement</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TAG_CONFIG).map(([key, config]) => (
          <Badge key={key} variant="outline" className={`${config.color} opacity-70`}>
            {config.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
