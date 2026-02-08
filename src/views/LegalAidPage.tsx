"use client";

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Scale,
  Search,
  BookOpen,
  HelpCircle,
  Sparkles,
  Loader2,
  ExternalLink,
  FileText,
  AlertTriangle,
  Building2,
  Users,
  Shield,
  Euro,
  Handshake,
} from 'lucide-react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

// Regulatory texts database (mock data)
const REGULATORY_TEXTS = [
  {
    id: '1',
    category: 'ACI',
    title: 'Accord Conventionnel Interprofessionnel 2024',
    description: 'Dispositions relatives au financement des MSP et aux indicateurs de performance.',
    reference: 'Arrêté du 24 juillet 2017 modifié',
    keywords: ['financement', 'indicateurs', 'rémunération', 'qualité'],
  },
  {
    id: '2',
    category: 'CPAM',
    title: 'Convention Médicale 2024',
    description: 'Règles de facturation et de tarification des actes en exercice coordonné.',
    reference: 'Convention nationale du 25 août 2016 modifiée',
    keywords: ['tarification', 'facturation', 'NGAP', 'CCAM'],
  },
  {
    id: '3',
    category: 'ARS',
    title: 'Cahier des charges des MSP',
    description: 'Conditions d\'agrément et de fonctionnement des Maisons de Santé Pluriprofessionnelles.',
    reference: 'Instruction DGOS/PF3/2016/33',
    keywords: ['agrément', 'organisation', 'gouvernance', 'projet santé'],
  },
  {
    id: '4',
    category: 'ACI',
    title: 'Indicateurs socles ACI',
    description: 'Liste des indicateurs obligatoires pour le financement ACI : accès aux soins, travail en équipe, système d\'information.',
    reference: 'Annexe 2 de l\'ACI',
    keywords: ['indicateurs', 'socle', 'patientèle', 'accès soins'],
  },
  {
    id: '5',
    category: 'CPAM',
    title: 'Règlement Arbitral',
    description: 'Dispositions applicables en l\'absence de convention pour les médecins non signataires.',
    reference: 'Décision du 6 juillet 2023',
    keywords: ['arbitrage', 'non conventionné', 'tarifs'],
  },
  {
    id: '6',
    category: 'ARS',
    title: 'Contrat Pluriannuel d\'Objectifs et de Moyens (CPOM)',
    description: 'Cadre contractuel entre l\'ARS et les MSP pour le financement des missions de santé publique.',
    reference: 'Article L6323-4 CSP',
    keywords: ['CPOM', 'financement', 'missions', 'santé publique'],
  },
];

// FAQ data
const FAQ_ITEMS = [
  {
    category: 'Responsabilité',
    icon: Shield,
    questions: [
      {
        question: 'Quelle est la responsabilité civile d\'une MSP ?',
        answer: `La MSP, en tant que personne morale (généralement SISA), peut engager sa responsabilité civile pour les dommages causés du fait de son organisation ou de son fonctionnement. 
        
Chaque professionnel conserve sa responsabilité personnelle pour les actes qu'il pratique. Il est recommandé de souscrire :
- Une RCP collective pour la structure
- Une RCP individuelle pour chaque professionnel
- Une protection juridique professionnelle`,
      },
      {
        question: 'Comment se répartit la responsabilité en cas de délégation de tâches ?',
        answer: `En cas de délégation de tâches (protocole de coopération article 51) :

- Le délégant reste responsable de la définition du protocole
- Le délégataire est responsable de l'exécution des actes délégués
- La MSP peut être tenue responsable si la délégation était mal organisée

La traçabilité est essentielle : chaque acte délégué doit être documenté.`,
      },
    ],
  },
  {
    category: 'Délégation',
    icon: Users,
    questions: [
      {
        question: 'Quels actes peuvent être délégués en MSP ?',
        answer: `La délégation de tâches en MSP est encadrée par :

1. **Protocoles nationaux de coopération** (article 51 CSP) : vaccination, suivi de maladies chroniques...
2. **Pratique avancée** : IPA (Infirmiers en Pratique Avancée)
3. **Délégation administrative** : gestion des rendez-vous, coordination

Important : La délégation d'actes médicaux nécessite un protocole validé par l'ARS.`,
      },
      {
        question: 'Comment mettre en place un protocole de coopération ?',
        answer: `Étapes pour un protocole de coopération :

1. Identifier le besoin et les actes concernés
2. Rédiger le protocole selon le modèle HAS
3. Soumettre à l'ARS pour autorisation
4. Former les professionnels concernés
5. Enregistrer sur le portail dédié (demarches-simplifiees.fr)

Délai moyen d'instruction : 2 à 4 mois.`,
      },
    ],
  },
  {
    category: 'Conventions',
    icon: Handshake,
    questions: [
      {
        question: 'Quelles sont les obligations conventionnelles d\'une MSP ?',
        answer: `Une MSP conventionnée doit respecter :

**Vis-à-vis de l'Assurance Maladie :**
- Respecter les tarifs conventionnels
- Télétransmettre les FSE
- Participer aux objectifs de maîtrise médicalisée

**Vis-à-vis de l'ARS :**
- Maintenir le projet de santé à jour
- Transmettre le rapport d'activité annuel
- Respecter les engagements du CPOM le cas échéant`,
      },
      {
        question: 'Comment fonctionne le financement ACI ?',
        answer: `Le financement ACI comprend :

**Indicateurs socles (obligatoires) :**
- Accès aux soins (horaires d'ouverture, SAE)
- Travail en équipe (réunions de coordination, protocoles)
- Système d'information partagé

**Indicateurs optionnels :**
- Missions de santé publique
- Implication des patients
- Démarche qualité

Le montant dépend de la taille de la patientèle et du niveau de réalisation des indicateurs.`,
      },
    ],
  },
  {
    category: 'Financement',
    icon: Euro,
    questions: [
      {
        question: 'Quelles sont les sources de financement d\'une MSP ?',
        answer: `Sources de financement possibles :

1. **ACI** : Rémunération collective liée aux indicateurs
2. **CPOM** : Contrat avec l'ARS pour missions spécifiques
3. **FIR** : Fonds d'Intervention Régional (investissement)
4. **FNPEIS** : Actions de prévention
5. **Honoraires** : Activité libérale des professionnels

L'ACI représente généralement 50 000 à 150 000 €/an selon la taille.`,
      },
      {
        question: 'Comment créer une SISA pour la MSP ?',
        answer: `Création d'une SISA (Société Interprofessionnelle de Soins Ambulatoires) :

1. Rédiger les statuts (modèle disponible sur ameli.fr)
2. Réunir au minimum 2 professions différentes
3. Enregistrer au greffe du tribunal de commerce
4. Obtenir le numéro FINESS auprès de l'ARS
5. S'immatriculer à l'URSSAF

Capital social recommandé : minimum symbolique (souvent 100€ par associé).`,
      },
    ],
  },
];

interface MultiLLMResponse {
  perplexityResponse: string | null;
  geminiResponse: string | null;
  sources: string[];
  error?: string;
}

export default function LegalAidPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [legalQuestion, setLegalQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<MultiLLMResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Filter regulatory texts based on search
  const filteredTexts = REGULATORY_TEXTS.filter((text) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      text.title.toLowerCase().includes(query) ||
      text.description.toLowerCase().includes(query) ||
      text.category.toLowerCase().includes(query) ||
      text.keywords.some((k) => k.toLowerCase().includes(query))
    );
  });

  const handleAIQuery = async () => {
    if (!legalQuestion.trim()) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const { data, error } = await supabase.functions.invoke('multi-llm', {
        body: {
          prompt: legalQuestion,
          patientContext: 'Question juridique MSP (Maison de Santé Pluriprofessionnelle) - Droit de la santé français',
          mode: 'legal',
        },
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de l\'appel à l\'API');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAiResponse(data as MultiLLMResponse);
    } catch (err) {
      console.error('Legal AI error:', err);
      setAiError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setAiLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ACI':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'CPAM':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'ARS':
        return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Scale className="h-8 w-8 text-primary" />
            Aide Juridique MSP
          </h1>
          <p className="text-muted-foreground mt-1">
            Ressources réglementaires et assistance juridique pour les Maisons de Santé Pluriprofessionnelles
          </p>
        </div>

        {/* Disclaimer */}
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Ces informations sont fournies à titre indicatif et ne constituent pas un conseil juridique. 
            Pour toute question complexe, consultez un avocat spécialisé en droit de la santé.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Textes réglementaires
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              FAQ Juridique
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Assistant IA
            </TabsTrigger>
          </TabsList>

          {/* Regulatory Texts Search */}
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Base documentaire réglementaire
                </CardTitle>
                <CardDescription>
                  Recherchez dans les textes ACI, CPAM et ARS applicables aux MSP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par mot-clé (ex: financement, délégation, indicateurs...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category filters */}
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className={`cursor-pointer ${searchQuery === 'ACI' ? 'bg-blue-500/20' : ''}`}
                    onClick={() => setSearchQuery(searchQuery === 'ACI' ? '' : 'ACI')}
                  >
                    ACI
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`cursor-pointer ${searchQuery === 'CPAM' ? 'bg-green-500/20' : ''}`}
                    onClick={() => setSearchQuery(searchQuery === 'CPAM' ? '' : 'CPAM')}
                  >
                    CPAM
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`cursor-pointer ${searchQuery === 'ARS' ? 'bg-purple-500/20' : ''}`}
                    onClick={() => setSearchQuery(searchQuery === 'ARS' ? '' : 'ARS')}
                  >
                    ARS
                  </Badge>
                </div>

                {/* Results */}
                <div className="space-y-3">
                  {filteredTexts.map((text) => (
                    <Card key={text.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getCategoryColor(text.category)}>
                                {text.category}
                              </Badge>
                              <h3 className="font-medium">{text.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {text.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span>{text.reference}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {text.keywords.map((keyword) => (
                            <Badge key={keyword} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredTexts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun texte trouvé pour cette recherche.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="space-y-4">
            {FAQ_ITEMS.map((category) => (
              <Card key={category.category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <category.icon className="h-5 w-5 text-primary" />
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((item, idx) => (
                      <AccordionItem key={idx} value={`${category.category}-${idx}`}>
                        <AccordionTrigger className="text-left">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <div className="whitespace-pre-wrap text-muted-foreground">
                              {item.answer}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* AI Assistant */}
          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Assistant Juridique IA
                </CardTitle>
                <CardDescription>
                  Posez vos questions juridiques relatives aux MSP et obtenez des réponses basées sur la réglementation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Ex: Quelles sont les conditions pour bénéficier du financement ACI ? Comment mettre en place une délégation de vaccination ?"
                    value={legalQuestion}
                    onChange={(e) => setLegalQuestion(e.target.value)}
                    rows={4}
                  />
                  <Button
                    onClick={handleAIQuery}
                    disabled={aiLoading || !legalQuestion.trim()}
                    className="w-full"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Recherche en cours...
                      </>
                    ) : (
                      <>
                        <Scale className="h-4 w-4 mr-2" />
                        Interroger l'IA juridique
                      </>
                    )}
                  </Button>
                </div>

                {/* Error */}
                {aiError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{aiError}</AlertDescription>
                  </Alert>
                )}

                {/* Loading */}
                {aiLoading && (
                  <div className="space-y-3">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                )}

                {/* AI Response */}
                {aiResponse && !aiLoading && (
                  <div className="space-y-4 mt-6">
                    <Tabs defaultValue="perplexity">
                      <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="perplexity" className="flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          Recherche juridique
                        </TabsTrigger>
                        <TabsTrigger value="gemini" className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Analyse
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="perplexity" className="mt-4">
                        <Card className="border-blue-500/20 bg-blue-500/5">
                          <CardContent className="pt-4">
                            {aiResponse.perplexityResponse ? (
                              <div className="whitespace-pre-wrap text-sm">
                                {aiResponse.perplexityResponse}
                              </div>
                            ) : (
                              <p className="text-muted-foreground italic">
                                Aucune réponse disponible.
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="gemini" className="mt-4">
                        <Card className="border-purple-500/20 bg-purple-500/5">
                          <CardContent className="pt-4">
                            {aiResponse.geminiResponse ? (
                              <div className="whitespace-pre-wrap text-sm">
                                {aiResponse.geminiResponse}
                              </div>
                            ) : (
                              <p className="text-muted-foreground italic">
                                Aucune réponse disponible.
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>

                    {/* Sources */}
                    {aiResponse.sources && aiResponse.sources.length > 0 && (
                      <Card className="border-green-500/20 bg-green-500/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-green-600" />
                            Sources ({aiResponse.sources.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <ul className="space-y-1">
                            {aiResponse.sources.map((source, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-xs">
                                <Badge variant="outline" className="shrink-0">
                                  {idx + 1}
                                </Badge>
                                <a
                                  href={source}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate flex items-center gap-1"
                                >
                                  {source}
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Disclaimer */}
                <Alert className="mt-4">
                  <Building2 className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Les réponses de l'IA sont générées à partir de sources publiques et peuvent ne pas refléter 
                    les dernières évolutions réglementaires. Vérifiez toujours auprès des sources officielles 
                    (Légifrance, Ameli.fr, ARS).
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
