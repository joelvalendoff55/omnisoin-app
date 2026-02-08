import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCotationPreferences } from '@/hooks/useUserPreferences';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calculator,
  Search,
  Plus,
  Trash2,
  History,
  FileText,
  Euro,
  Tag,
  AlertCircle,
  Clock,
  Stethoscope,
  Activity,
  Heart,
  Bone,
  Eye,
} from 'lucide-react';
import { SensitivePageBanner } from '@/components/shared/LegalBanner';
import { DraftBadge } from '@/components/shared/DraftBadge';
import { RestrictedButton } from '@/components/shared/RoleRestrictedAction';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import {
  CotationActe,
  CotationEntry,
  Modificateur,
  formatCotationForCopy,
  formatCotationHistoryForExport,
  calculateTarifWithModificateurs,
} from '@/lib/cotationFormatter';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Tarifs NGAP mis à jour le 22/12/2024
const TARIFS_UPDATE_DATE = '22/12/2024';
const TARIFS_SOURCE = 'ameli.fr - Convention médicale 2024-2029';

// Categories for filtering
const CATEGORIES = [
  { id: 'all', label: 'Tous', icon: Tag },
  { id: 'consultation', label: 'Consultation', icon: Stethoscope },
  { id: 'technique', label: 'Technique', icon: Activity },
  { id: 'echographie', label: 'Échographie', icon: Heart },
  { id: 'chirurgie', label: 'Chirurgie', icon: Bone },
  { id: 'exploration', label: 'Exploration', icon: Eye },
];

// Mock CCAM/NGAP database with categories
const MOCK_ACTES_DB: (Omit<CotationActe, 'id' | 'modificateurs' | 'tarif_final'> & { category: string })[] = [
  // NGAP - Consultations
  { code: 'G', type: 'ngap', label: 'Consultation médecin généraliste', tarif_base: 30.00, category: 'consultation' },
  { code: 'V', type: 'ngap', label: 'Visite à domicile', tarif_base: 26.50, category: 'consultation' },
  { code: 'VG', type: 'ngap', label: 'Visite médecin généraliste', tarif_base: 30.00, category: 'consultation' },
  { code: 'VL', type: 'ngap', label: 'Visite longue et complexe', tarif_base: 60.00, category: 'consultation' },
  { code: 'TCG', type: 'ngap', label: 'Téléconsultation généraliste', tarif_base: 25.00, category: 'consultation' },
  { code: 'APC', type: 'ngap', label: 'Avis ponctuel de consultant', tarif_base: 60.00, category: 'consultation' },
  // CCAM - Actes techniques
  { code: 'DEQP003', type: 'ccam', label: 'ECG standard 12 dérivations', tarif_base: 14.26, category: 'technique' },
  { code: 'YYYY010', type: 'ccam', label: 'Injection intramusculaire', tarif_base: 4.73, category: 'technique' },
  { code: 'QZGA002', type: 'ccam', label: 'Ablation de points de suture', tarif_base: 7.67, category: 'technique' },
  { code: 'JKHD001', type: 'ccam', label: 'Infiltration articulaire', tarif_base: 27.35, category: 'technique' },
  { code: 'GLQP007', type: 'ccam', label: 'Spirométrie avec mesure VEMS', tarif_base: 40.28, category: 'exploration' },
  // CCAM - Petite chirurgie
  { code: 'QZFA008', type: 'ccam', label: 'Suture simple', tarif_base: 39.48, category: 'chirurgie' },
  { code: 'QZJA002', type: 'ccam', label: 'Extraction corps étranger superficiel', tarif_base: 27.35, category: 'chirurgie' },
  { code: 'PZLB001', type: 'ccam', label: 'Contention souple', tarif_base: 9.70, category: 'chirurgie' },
  { code: 'MZMP003', type: 'ccam', label: 'Réduction fracture simple', tarif_base: 67.20, category: 'chirurgie' },
  { code: 'NZEP001', type: 'ccam', label: 'Immobilisation membre par orthèse', tarif_base: 25.52, category: 'chirurgie' },
  { code: 'QZNP001', type: 'ccam', label: 'Cryothérapie cutanée', tarif_base: 20.90, category: 'chirurgie' },
  // CCAM - Échographie
  { code: 'EQQM004', type: 'ccam', label: 'Écho abdominale', tarif_base: 55.17, category: 'echographie' },
  { code: 'EQQK001', type: 'ccam', label: 'Écho ostéoarticulaire', tarif_base: 38.40, category: 'echographie' },
  { code: 'ZZQM006', type: 'ccam', label: 'Échographie diagnostique', tarif_base: 56.70, category: 'echographie' },
  // CCAM - Ponction / Infiltration
  { code: 'JKHD002', type: 'ccam', label: 'Ponction articulaire', tarif_base: 27.35, category: 'technique' },
  { code: 'LBLD001', type: 'ccam', label: 'Infiltration rachidienne', tarif_base: 44.30, category: 'technique' },
  // CCAM - Explorations fonctionnelles
  { code: 'GLQP012', type: 'ccam', label: 'Polygraphie ventilatoire nocturne', tarif_base: 113.52, category: 'exploration' },
  { code: 'DEQP005', type: 'ccam', label: 'Holter ECG 24h', tarif_base: 76.80, category: 'exploration' },
];

// Mock modifiers
const MOCK_MODIFICATEURS: Modificateur[] = [
  { code: 'N', label: 'Nuit (20h-8h)', type: 'majoration', value: 35.00, is_percentage: false },
  { code: 'F', label: 'Férié/Dimanche', type: 'majoration', value: 19.06, is_percentage: false },
  { code: 'U', label: 'Urgence', type: 'majoration', value: 22.60, is_percentage: false },
  { code: 'MD', label: 'Majoration déplacement', type: 'supplement', value: 10.00, is_percentage: false },
  { code: 'MN', label: 'Nuit profonde (0h-6h)', type: 'majoration', value: 40.00, is_percentage: false },
  { code: 'MEG', label: 'Enfant < 6 ans', type: 'majoration', value: 5.00, is_percentage: false },
  { code: 'MPC', label: 'Personne complexe', type: 'majoration', value: 5.00, is_percentage: false },
];

// Mock history
const MOCK_HISTORY: CotationEntry[] = [
  {
    id: '1',
    patient_name: 'Marie Dupont',
    practitioner_name: 'Dr. Martin',
    date: '2024-12-23T10:30:00',
    actes: [
      { id: '1', code: 'G', type: 'ngap', label: 'Consultation', tarif_base: 30.00, tarif_final: 30.00 },
      { id: '2', code: 'DEQP003', type: 'ccam', label: 'ECG', tarif_base: 14.26, tarif_final: 14.26 },
    ],
    total: 44.26,
  },
  {
    id: '2',
    patient_name: 'Jean Martin',
    date: '2024-12-22T16:00:00',
    actes: [
      { id: '1', code: 'VG', type: 'ngap', label: 'Visite généraliste', tarif_base: 30.00, modificateurs: ['MD'], tarif_final: 40.00 },
    ],
    total: 40.00,
    notes: 'Visite à domicile pour personne âgée',
  },
  {
    id: '3',
    patient_name: 'Sophie Bernard',
    date: '2024-12-22T09:15:00',
    actes: [
      { id: '1', code: 'APC', type: 'ngap', label: 'Avis ponctuel consultant', tarif_base: 60.00, tarif_final: 60.00 },
      { id: '2', code: 'JKHD001', type: 'ccam', label: 'Infiltration', tarif_base: 27.35, tarif_final: 27.35 },
    ],
    total: 87.35,
  },
];

export default function CotationPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  // Persisted preferences
  const { category: savedCategory, setCategory: setSavedCategory } = useCotationPreferences();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(savedCategory || 'all');
  const [selectedActes, setSelectedActes] = useState<CotationActe[]>([]);
  const [selectedModificateurs, setSelectedModificateurs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('search');

  // Sync category to preferences
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSavedCategory(cat);
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const filteredActes = MOCK_ACTES_DB.filter((acte) => {
    const matchesSearch = searchQuery === '' ||
      acte.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acte.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || acte.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addActe = (acte: typeof MOCK_ACTES_DB[0]) => {
    const newActe: CotationActe = {
      id: crypto.randomUUID(),
      code: acte.code,
      type: acte.type,
      label: acte.label,
      tarif_base: acte.tarif_base,
      coefficient: acte.coefficient,
      modificateurs: [],
      tarif_final: acte.tarif_base * (acte.coefficient || 1),
    };
    setSelectedActes([...selectedActes, newActe]);
  };

  const removeActe = (id: string) => {
    setSelectedActes(selectedActes.filter((a) => a.id !== id));
  };

  const toggleModificateur = (code: string) => {
    setSelectedModificateurs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const getSelectedModificateurs = () => {
    return MOCK_MODIFICATEURS.filter((m) => selectedModificateurs.includes(m.code));
  };

  const calculateTotal = () => {
    const actesTotal = selectedActes.reduce((sum, a) => sum + a.tarif_final, 0);
    const modsTotal = getSelectedModificateurs().reduce((sum, m) => sum + m.value, 0);
    return actesTotal + modsTotal;
  };

  const currentEntry: CotationEntry = {
    id: 'new',
    date: new Date().toISOString(),
    actes: selectedActes.map((a) => ({
      ...a,
      modificateurs: selectedModificateurs,
    })),
    total: calculateTotal(),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Legal Banner */}
        <SensitivePageBanner />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Aide à la Cotation</h1>
                <p className="text-sm text-muted-foreground">
                  Recherche d'actes CCAM/NGAP et calcul automatique
                </p>
              </div>
              <DraftBadge status="draft" />
            </div>
          </div>
          {selectedActes.length > 0 && (
            <div className="flex items-center gap-2">
              <CopyToClipboard
                text={formatCotationForCopy(currentEntry)}
                label="Copier"
                variant="outline"
              />
              <RestrictedButton
                allowedRoles={['practitioner', 'admin']}
                blockedMessage="La validation de cotation est réservée au médecin"
                variant="default"
                size="sm"
              >
                Valider cotation
              </RestrictedButton>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Search & Select (8 cols) */}
          <div className="xl:col-span-8 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Recherche d'actes
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historique
                </TabsTrigger>
              </TabsList>

              <TabsContent value="search" className="space-y-4 mt-4">
                {/* Search & Category Filter */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par code ou libellé..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category Chips */}
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const count = cat.id === 'all' 
                      ? MOCK_ACTES_DB.length 
                      : MOCK_ACTES_DB.filter(a => a.category === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                          selectedCategory === cat.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-border'
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {cat.label}
                        <Badge variant="secondary" className="h-4 min-w-4 text-[10px] px-1">
                          {count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>

                {/* Results Grid */}
                <div className="grid gap-2 md:grid-cols-2">
                  {filteredActes.map((acte) => (
                    <Card
                      key={acte.code}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group",
                        selectedActes.some(a => a.code === acte.code) && "border-primary bg-primary/5"
                      )}
                      onClick={() => addActe(acte)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={acte.type === 'ccam' ? 'default' : 'secondary'} className="text-[10px]">
                                {acte.type.toUpperCase()}
                              </Badge>
                              <code className="font-mono text-sm font-bold text-primary">
                                {acte.code}
                              </code>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {acte.label}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">
                              {acte.tarif_base.toFixed(2)}€
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); addActe(acte); }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredActes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun acte trouvé</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Dernières cotations effectuées
                  </p>
                  <CopyToClipboard
                    text={formatCotationHistoryForExport(MOCK_HISTORY)}
                    label="Exporter"
                    variant="outline"
                    size="sm"
                  />
                </div>
                
                <div className="space-y-3">
                  {MOCK_HISTORY.map((entry) => (
                    <Card key={entry.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entry.patient_name}</span>
                              {entry.practitioner_name && (
                                <Badge variant="outline" className="text-[10px]">
                                  {entry.practitioner_name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(entry.date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-primary">
                              {entry.total.toFixed(2)}€
                            </span>
                            <CopyToClipboard
                              text={formatCotationForCopy(entry)}
                              size="icon"
                              variant="ghost"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {entry.actes.map((acte) => (
                            <Badge key={acte.id} variant="secondary" className="font-mono text-xs">
                              {acte.code} • {acte.tarif_final.toFixed(2)}€
                            </Badge>
                          ))}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-muted pl-2">
                            {entry.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Calculator (4 cols) */}
          <div className="xl:col-span-4 space-y-4">
            {/* Selected Acts */}
            <Card className="border-2 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Actes sélectionnés ({selectedActes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedActes.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Plus className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Cliquez sur un acte pour l'ajouter</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-2">
                      {selectedActes.map((acte) => (
                        <div
                          key={acte.id}
                          className="flex items-center justify-between p-2 rounded-lg border bg-background group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={acte.type === 'ccam' ? 'default' : 'secondary'} className="text-[10px]">
                                {acte.type.toUpperCase()}
                              </Badge>
                              <code className="text-xs font-mono font-bold">{acte.code}</code>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{acte.label}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium tabular-nums">
                              {acte.tarif_final.toFixed(2)}€
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeActe(acte.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Modifiers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Majorations</CardTitle>
                <CardDescription className="text-xs">
                  Sélectionnez les modificateurs applicables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {MOCK_MODIFICATEURS.map((mod) => (
                    <label
                      key={mod.code}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                        selectedModificateurs.includes(mod.code)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={selectedModificateurs.includes(mod.code)}
                        onCheckedChange={() => toggleModificateur(mod.code)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-xs font-bold">{mod.code}</span>
                          <span className="text-xs text-primary font-medium">+{mod.value}€</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{mod.label}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Total */}
            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Euro className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold">Total</span>
                  </div>
                  <span className="text-3xl font-bold text-primary">
                    {calculateTotal().toFixed(2)}€
                  </span>
                </div>
                
                <Separator className="my-3" />
                
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Actes ({selectedActes.length})</span>
                    <span className="font-mono">{selectedActes.reduce((s, a) => s + a.tarif_final, 0).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Majorations ({selectedModificateurs.length})</span>
                    <span className="font-mono">+{getSelectedModificateurs().reduce((s, m) => s + m.value, 0).toFixed(2)}€</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tariff Info */}
            <div className="p-3 rounded-lg bg-muted/50 border border-muted">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Tarifs mis à jour le {TARIFS_UPDATE_DATE}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    Source: {TARIFS_SOURCE}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
