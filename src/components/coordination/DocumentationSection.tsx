import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  ExternalLink,
  Search,
  Download,
  Scale,
  Building2,
  Euro,
  Users,
  Star,
  StarOff,
} from 'lucide-react';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';

interface DocumentLink {
  id: string;
  title: string;
  description: string;
  url: string;
  category: 'urssaf' | 'cpam' | 'convention' | 'juridique';
  is_favorite?: boolean;
}

interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
}

const MOCK_LINKS: DocumentLink[] = [
  {
    id: '1',
    title: 'URSSAF - Déclaration libérale',
    description: 'Portail de déclaration pour les professionnels de santé libéraux',
    url: 'https://www.urssaf.fr/portail/home/praticien-et-auxiliaire-medical.html',
    category: 'urssaf',
    is_favorite: true,
  },
  {
    id: '2',
    title: 'URSSAF - Cotisations',
    description: 'Calcul et simulation des cotisations sociales',
    url: 'https://www.urssaf.fr/portail/home/praticien-et-auxiliaire-medical/mes-cotisations.html',
    category: 'urssaf',
  },
  {
    id: '3',
    title: 'Ameli Pro - Espace professionnel',
    description: 'Accès aux services en ligne de l\'Assurance Maladie',
    url: 'https://espacepro.ameli.fr/',
    category: 'cpam',
    is_favorite: true,
  },
  {
    id: '4',
    title: 'CPAM - Convention médicale',
    description: 'Textes conventionnels et avenants en vigueur',
    url: 'https://www.ameli.fr/medecin/textes-reference/convention-medicale',
    category: 'cpam',
  },
  {
    id: '5',
    title: 'Guide de création MSP',
    description: 'Guide officiel pour la création d\'une Maison de Santé Pluriprofessionnelle',
    url: 'https://www.ars.sante.fr/creation-maisons-sante',
    category: 'convention',
    is_favorite: true,
  },
  {
    id: '6',
    title: 'Accord Conventionnel Interprofessionnel (ACI)',
    description: 'Modalités de rémunération collective des MSP',
    url: 'https://www.ameli.fr/medecin/exercice-liberal/vie-cabinet/maison-sante',
    category: 'convention',
  },
  {
    id: '7',
    title: 'Statuts types MSP/SISA',
    description: 'Modèles de statuts pour les sociétés interprofessionnelles',
    url: 'https://www.ffmps.fr/ressources/statuts-sisa',
    category: 'juridique',
  },
  {
    id: '8',
    title: 'Responsabilité professionnelle',
    description: 'Cadre juridique de la responsabilité en exercice coordonné',
    url: 'https://www.ordre-medecins.fr/responsabilite',
    category: 'juridique',
  },
];

const MOCK_TEMPLATES: DocumentTemplate[] = [
  {
    id: '1',
    title: 'Procès-verbal d\'AG',
    description: 'Modèle de PV pour assemblée générale ordinaire',
    category: 'gouvernance',
    content: `PROCÈS-VERBAL DE L'ASSEMBLÉE GÉNÉRALE ORDINAIRE

Date : [DATE]
Lieu : [ADRESSE MSP]

Membres présents : [LISTE]
Membres représentés : [LISTE]
Membres absents : [LISTE]

Ordre du jour :
1. Approbation du PV de la dernière AG
2. Rapport d'activité
3. Rapport financier
4. Questions diverses

[DÉVELOPPEMENT DES POINTS]

L'ordre du jour étant épuisé, la séance est levée à [HEURE].

Signature du Président          Signature du Secrétaire`,
  },
  {
    id: '2',
    title: 'Contrat de collaboration',
    description: 'Modèle de contrat entre professionnels',
    category: 'contrats',
    content: `CONTRAT DE COLLABORATION LIBÉRALE

Entre les soussignés :

Dr/M./Mme [NOM PRATICIEN TITULAIRE]
Exerçant à [ADRESSE]
Ci-après dénommé(e) « le Titulaire »

Et

Dr/M./Mme [NOM COLLABORATEUR]
Ci-après dénommé(e) « le Collaborateur »

Il a été convenu ce qui suit :

Article 1 - Objet
Le présent contrat a pour objet de définir les conditions de la collaboration libérale entre les parties.

Article 2 - Durée
[À COMPLÉTER]

Article 3 - Rétrocession
[À COMPLÉTER]

Article 4 - Obligations des parties
[À COMPLÉTER]

Fait en deux exemplaires, à [LIEU], le [DATE].

Signature Titulaire          Signature Collaborateur`,
  },
  {
    id: '3',
    title: 'Demande de subvention ARS',
    description: 'Lettre type pour demande de financement',
    category: 'financier',
    content: `[EN-TÊTE MSP]

À l'attention de Monsieur/Madame le Directeur Général
Agence Régionale de Santé [RÉGION]
[ADRESSE]

[LIEU], le [DATE]

Objet : Demande de subvention pour [PROJET]
Réf : [NUMÉRO DOSSIER SI EXISTANT]

Monsieur/Madame le Directeur Général,

La Maison de Santé Pluriprofessionnelle [NOM MSP], située à [ADRESSE], a l'honneur de solliciter votre bienveillance pour l'attribution d'une subvention dans le cadre de [PROGRAMME/DISPOSITIF].

Notre structure, composée de [NOMBRE] professionnels de santé, dessert un bassin de population de [NOMBRE] habitants.

Le projet pour lequel nous sollicitons ce financement vise à :
- [OBJECTIF 1]
- [OBJECTIF 2]
- [OBJECTIF 3]

Le montant de la subvention demandée s'élève à [MONTANT] euros.

Vous trouverez ci-joint le dossier complet de demande comprenant :
- Le formulaire CERFA complété
- Le budget prévisionnel
- Les devis correspondants
- [AUTRES PIÈCES]

Nous restons à votre disposition pour tout renseignement complémentaire.

Veuillez agréer, Monsieur/Madame le Directeur Général, l'expression de notre considération distinguée.

[SIGNATURE]
[NOM ET QUALITÉ DU SIGNATAIRE]`,
  },
  {
    id: '4',
    title: 'Convention de mise à disposition',
    description: 'Modèle pour partage de locaux/équipements',
    category: 'contrats',
    content: `CONVENTION DE MISE À DISPOSITION DE LOCAUX

Entre :
[BAILLEUR/PROPRIÉTAIRE]
Ci-après dénommé « le Propriétaire »

Et :
[MSP/SISA]
Ci-après dénommé « l'Utilisateur »

Article 1 - Objet
Le Propriétaire met à disposition de l'Utilisateur les locaux situés [ADRESSE] d'une surface de [X] m².

Article 2 - Durée
La présente convention est conclue pour une durée de [DURÉE] à compter du [DATE].

Article 3 - Contrepartie
En contrepartie de cette mise à disposition, l'Utilisateur versera une redevance mensuelle de [MONTANT] euros.

Article 4 - Charges et entretien
[À COMPLÉTER]

Fait à [LIEU], le [DATE].

Signature Propriétaire          Signature Utilisateur`,
  },
];

const CATEGORY_CONFIG = {
  urssaf: { label: 'URSSAF', icon: Euro, color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  cpam: { label: 'CPAM/ARS', icon: Building2, color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  convention: { label: 'Convention MSP', icon: Users, color: 'bg-purple-500/10 text-purple-700 border-purple-500/30' },
  juridique: { label: 'Juridique', icon: Scale, color: 'bg-orange-500/10 text-orange-700 border-orange-500/30' },
};

export default function DocumentationSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [links, setLinks] = useState<DocumentLink[]>(MOCK_LINKS);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const toggleFavorite = (id: string) => {
    setLinks(links.map((link) =>
      link.id === id ? { ...link, is_favorite: !link.is_favorite } : link
    ));
  };

  const filteredLinks = links.filter((link) => {
    const matchesSearch = searchQuery === '' ||
      link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' ||
      activeCategory === 'favorites' ? link.is_favorite : link.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const formatLinkForCopy = (link: DocumentLink) => {
    return `${link.title}\n${link.description}\nURL: ${link.url}`;
  };

  const favorites = links.filter((link) => link.is_favorite);

  return (
    <div className="space-y-6">
      {/* Quick Access */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const count = links.filter((l) => l.category === key).length;
          return (
            <Card
              key={key}
              className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                activeCategory === key ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveCategory(activeCategory === key ? 'all' : key)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{count} ressources</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="liens" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="liens" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Liens & Ressources
          </TabsTrigger>
          <TabsTrigger value="modeles" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Modèles de documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liens" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une ressource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={activeCategory === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActiveCategory('all')}
            >
              Tout
            </Badge>
            <Badge
              variant={activeCategory === 'favorites' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActiveCategory('favorites')}
            >
              <Star className="h-3 w-3 mr-1" />
              Favoris ({favorites.length})
            </Badge>
          </div>

          {/* Links list */}
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredLinks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune ressource trouvée
                    </p>
                  ) : (
                    filteredLinks.map((link) => {
                      const config = CATEGORY_CONFIG[link.category];
                      const Icon = config.icon;
                      
                      return (
                        <div
                          key={link.id}
                          className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={`text-xs ${config.color}`}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {config.label}
                                </Badge>
                                {link.is_favorite && (
                                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                )}
                              </div>
                              <h4 className="font-medium text-sm">{link.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {link.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleFavorite(link.id)}
                              >
                                {link.is_favorite ? (
                                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                ) : (
                                  <StarOff className="h-4 w-4" />
                                )}
                              </Button>
                              <CopyToClipboard
                                text={formatLinkForCopy(link)}
                                size="icon"
                                variant="ghost"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                asChild
                              >
                                <a href={link.url} target="_blank" rel="noopener noreferrer">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modeles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Modèles administratifs</CardTitle>
              <CardDescription>
                Templates pré-remplis pour vos documents de gestion MSP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px]">
                <div className="space-y-4">
                  {MOCK_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <h4 className="font-medium">{template.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {template.category}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <CopyToClipboard
                            text={template.content}
                            label="Copier"
                            size="sm"
                            variant="outline"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const blob = new Blob([template.content], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${template.title.replace(/\s+/g, '_')}.txt`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
