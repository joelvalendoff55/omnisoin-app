"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  Search,
  Star,
  StarOff,
  ExternalLink,
  FileText,
  Pill,
  Hash,
  Globe,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { formatMedicalReference, MedicalReference } from '@/lib/medecinFormatter';
import { useMedicalResearch } from '@/hooks/useMedicalResearch';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { SourcesList } from './SourcesList';
import { MedicalDisclaimer } from './MedicalDisclaimer';

// Mock references data
const MOCK_REFERENCES: MedicalReference[] = [
  {
    id: '1',
    source: 'has',
    title: 'Recommandations sur l\'hypertension artérielle',
    description: 'Guide de prise en charge de l\'HTA chez l\'adulte - Mise à jour 2024',
    url: 'https://www.has-sante.fr/hta',
    is_favorite: true,
  },
  {
    id: '2',
    source: 'has',
    title: 'Dépistage du cancer colorectal',
    description: 'Modalités et recommandations pour le dépistage organisé',
    url: 'https://www.has-sante.fr/cancer-colorectal',
    is_favorite: false,
  },
  {
    id: '3',
    source: 'vidal',
    title: 'Metformine',
    description: 'Monographie complète - Antidiabétique biguanide',
    url: 'https://www.vidal.fr/medicaments/metformine',
    is_favorite: true,
  },
  {
    id: '4',
    source: 'vidal',
    title: 'Amoxicilline',
    description: 'Antibiotique de la famille des pénicillines',
    url: 'https://www.vidal.fr/medicaments/amoxicilline',
    is_favorite: false,
  },
  {
    id: '5',
    source: 'cim10',
    title: 'I10 - Hypertension essentielle',
    description: 'Code CIM-10 pour l\'hypertension artérielle essentielle',
    url: 'https://icd.who.int/browse10/2019/en#/I10',
    is_favorite: true,
  },
  {
    id: '6',
    source: 'cim10',
    title: 'E11 - Diabète de type 2',
    description: 'Code CIM-10 pour le diabète sucré de type 2',
    url: 'https://icd.who.int/browse10/2019/en#/E11',
    is_favorite: false,
  },
  {
    id: '7',
    source: 'has',
    title: 'Prescription des antibiotiques',
    description: 'Antibiothérapie et prévention de l\'antibiorésistance',
    url: 'https://www.has-sante.fr/antibiotiques',
    is_favorite: false,
  },
  {
    id: '8',
    source: 'autre',
    title: 'Collège des Enseignants de Cardiologie',
    description: 'Référentiel de cardiologie pour l\'ECN',
    url: 'https://sfcardio.fr/enseignement',
    is_favorite: true,
  },
];

const SOURCE_CONFIG = {
  has: { label: 'HAS', icon: FileText, color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  vidal: { label: 'Vidal', icon: Pill, color: 'bg-green-500/10 text-green-700 border-green-500/30' },
  cim10: { label: 'CIM-10', icon: Hash, color: 'bg-purple-500/10 text-purple-700 border-purple-500/30' },
  autre: { label: 'Autre', icon: Globe, color: 'bg-gray-500/10 text-gray-700 border-gray-500/30' },
};

const QUICK_LINKS = [
  { name: 'HAS', url: 'https://www.has-sante.fr', description: 'Haute Autorité de Santé' },
  { name: 'Vidal', url: 'https://www.vidal.fr', description: 'Base de données médicamenteuse' },
  { name: 'CIM-10', url: 'https://icd.who.int/browse10/2019/en', description: 'Classification internationale des maladies' },
  { name: 'ANSM', url: 'https://ansm.sante.fr', description: 'Agence du médicament' },
  { name: 'Prescrire', url: 'https://www.prescrire.org', description: 'Revue médicale indépendante' },
  { name: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov', description: 'Base de données scientifique' },
];

export default function MedicalReferencesSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [references, setReferences] = useState<MedicalReference[]>(MOCK_REFERENCES);
  const [activeSource, setActiveSource] = useState<string>('all');
  const [aiQuery, setAiQuery] = useState('');
  
  const { search, isLoading, result, reset } = useMedicalResearch({ mode: 'reference' });

  const toggleFavorite = (id: string) => {
    setReferences(references.map((ref) =>
      ref.id === id ? { ...ref, is_favorite: !ref.is_favorite } : ref
    ));
  };

  const filteredReferences = references.filter((ref) => {
    const matchesSearch = searchQuery === '' ||
      ref.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSource = activeSource === 'all' || 
      activeSource === 'favorites' ? ref.is_favorite : ref.source === activeSource;
    
    return matchesSearch && matchesSource;
  });

  const favorites = references.filter((ref) => ref.is_favorite);

  const handleAISearch = async () => {
    if (!aiQuery.trim()) return;
    await search(aiQuery);
  };

  return (
    <div className="space-y-6">
      {/* AI Research Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recherche IA (sources officielles)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MedicalDisclaimer variant="info" />
          
          <div className="flex gap-2">
            <Textarea
              placeholder="Posez une question médicale... (ex: Recommandations HAS pour l'HTA, indications du Metformine...)"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button 
              onClick={handleAISearch} 
              disabled={isLoading || !aiQuery.trim()}
              className="self-end"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* AI Result */}
          {result && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <ConfidenceIndicator 
                  level={result.confidenceLevel} 
                  reason={result.confidenceReason}
                />
                <CopyToClipboard
                  text={result.content}
                  label="Copier"
                  variant="outline"
                  size="sm"
                />
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm">{result.content}</div>
                </div>
              </div>

              {result.sources.length > 0 && (
                <SourcesList sources={result.sources} />
              )}

              <Button variant="ghost" size="sm" onClick={reset}>
                Nouvelle recherche
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Accès rapide aux bases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-center group"
              >
                <span className="font-medium text-sm group-hover:text-primary">
                  {link.name}
                </span>
                <span className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {link.description}
                </span>
                <ExternalLink className="h-3 w-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and References */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Bibliothèque de références
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une référence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Source Tabs */}
          <Tabs value={activeSource} onValueChange={setActiveSource}>
            <TabsList className="w-full grid grid-cols-6">
              <TabsTrigger value="all">Tout</TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                Favoris
              </TabsTrigger>
              <TabsTrigger value="has">HAS</TabsTrigger>
              <TabsTrigger value="vidal">Vidal</TabsTrigger>
              <TabsTrigger value="cim10">CIM-10</TabsTrigger>
              <TabsTrigger value="autre">Autre</TabsTrigger>
            </TabsList>

            <TabsContent value={activeSource} className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredReferences.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune référence trouvée
                    </p>
                  ) : (
                    filteredReferences.map((ref) => {
                      const sourceConfig = SOURCE_CONFIG[ref.source];
                      const SourceIcon = sourceConfig.icon;
                      
                      return (
                        <div
                          key={ref.id}
                          className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={`text-xs ${sourceConfig.color}`}>
                                  <SourceIcon className="h-3 w-3 mr-1" />
                                  {sourceConfig.label}
                                </Badge>
                                {ref.is_favorite && (
                                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                )}
                              </div>
                              <h4 className="font-medium text-sm">{ref.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {ref.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleFavorite(ref.id)}
                                className="h-8 w-8"
                              >
                                {ref.is_favorite ? (
                                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                ) : (
                                  <StarOff className="h-4 w-4" />
                                )}
                              </Button>
                              <CopyToClipboard
                                text={formatMedicalReference(ref)}
                                size="icon"
                                variant="ghost"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                asChild
                              >
                                <a href={ref.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Favorites Summary */}
      {favorites.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              Mes favoris ({favorites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {favorites.map((ref) => (
                <Badge
                  key={ref.id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => window.open(ref.url, '_blank')}
                >
                  {ref.title}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
