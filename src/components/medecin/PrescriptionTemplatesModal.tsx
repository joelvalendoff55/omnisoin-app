"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Pill, 
  Clock, 
  AlertTriangle, 
  Heart, 
  Thermometer,
  Search,
  Plus,
  Check,
} from 'lucide-react';

interface PrescriptionTemplate {
  id: string;
  name: string;
  category: 'pain' | 'antibiotic' | 'chronic' | 'arrêt' | 'other';
  medications: Array<{
    name: string;
    dosage: string;
  }>;
  notes?: string;
}

const DEFAULT_TEMPLATES: PrescriptionTemplate[] = [
  {
    id: '1',
    name: 'Douleur légère',
    category: 'pain',
    medications: [
      { name: 'Paracétamol 1g', dosage: '1 cp x 3/jour pendant 5 jours' },
    ],
    notes: 'Maximum 4g/jour, espacer les prises de 6h minimum',
  },
  {
    id: '2',
    name: 'Douleur modérée',
    category: 'pain',
    medications: [
      { name: 'Paracétamol 1g', dosage: '1 cp x 3/jour' },
      { name: 'Ibuprofène 400mg', dosage: '1 cp x 3/jour au milieu des repas' },
    ],
    notes: 'AINS contre-indiqués si antécédent ulcère/IR',
  },
  {
    id: '3',
    name: 'Angine bactérienne',
    category: 'antibiotic',
    medications: [
      { name: 'Amoxicilline 1g', dosage: '1 cp x 2/jour pendant 6 jours' },
    ],
    notes: 'Vérifier absence allergie pénicilline',
  },
  {
    id: '4',
    name: 'Infection urinaire simple',
    category: 'antibiotic',
    medications: [
      { name: 'Fosfomycine 3g', dosage: '1 sachet en prise unique' },
    ],
    notes: 'Femme non enceinte, cystite non compliquée',
  },
  {
    id: '5',
    name: 'Otite moyenne aiguë',
    category: 'antibiotic',
    medications: [
      { name: 'Amoxicilline 80mg/kg/j', dosage: 'En 2 prises pendant 5 jours' },
      { name: 'Paracétamol', dosage: '15mg/kg x 4/jour si douleur' },
    ],
  },
  {
    id: '6',
    name: 'HTA - Initiation',
    category: 'chronic',
    medications: [
      { name: 'Ramipril 2.5mg', dosage: '1 cp/jour le matin' },
    ],
    notes: 'Contrôle kaliémie et créatinine à J15',
  },
  {
    id: '7',
    name: 'Diabète type 2 - Initiation',
    category: 'chronic',
    medications: [
      { name: 'Metformine 500mg', dosage: '1 cp x 2/jour au milieu des repas' },
    ],
    notes: 'Augmentation progressive, vérifier fonction rénale',
  },
  {
    id: '8',
    name: 'Arrêt de travail 3 jours',
    category: 'arrêt',
    medications: [],
    notes: 'Arrêt de travail initial de 3 jours',
  },
  {
    id: '9',
    name: 'Arrêt de travail 7 jours',
    category: 'arrêt',
    medications: [],
    notes: 'Arrêt de travail initial de 7 jours',
  },
  {
    id: '10',
    name: 'Syndrome grippal',
    category: 'other',
    medications: [
      { name: 'Paracétamol 1g', dosage: '1 cp x 3/jour si fièvre/douleurs' },
    ],
    notes: 'Repos, hydratation, consulter si aggravation',
  },
];

const CATEGORY_ICONS = {
  pain: <Thermometer className="h-4 w-4" />,
  antibiotic: <Pill className="h-4 w-4" />,
  chronic: <Heart className="h-4 w-4" />,
  arrêt: <Clock className="h-4 w-4" />,
  other: <FileText className="h-4 w-4" />,
};

const CATEGORY_LABELS = {
  pain: 'Douleur',
  antibiotic: 'Antibiotiques',
  chronic: 'Chronique',
  arrêt: 'Arrêt travail',
  other: 'Autres',
};

interface PrescriptionTemplatesModalProps {
  onSelectTemplate: (medications: Array<{ name: string; dosage: string }>, notes?: string) => void;
}

export function PrescriptionTemplatesModal({ onSelectTemplate }: PrescriptionTemplatesModalProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates = DEFAULT_TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.medications.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (template: PrescriptionTemplate) => {
    onSelectTemplate(template.medications, template.notes);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates de prescription
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un template pour pré-remplir la prescription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="all" className="text-xs">Tous</TabsTrigger>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <TabsTrigger key={key} value={key} className="text-xs gap-1">
                  {CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS]}
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Templates List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-4">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleSelect(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {CATEGORY_ICONS[template.category]}
                          <span className="font-medium">{template.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {CATEGORY_LABELS[template.category]}
                          </Badge>
                        </div>
                        
                        {template.medications.length > 0 && (
                          <div className="space-y-1">
                            {template.medications.map((med, idx) => (
                              <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                                <Pill className="h-3 w-3" />
                                <span className="font-medium">{med.name}</span>
                                <span className="text-xs">— {med.dosage}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {template.notes && (
                          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {template.notes}
                          </div>
                        )}
                      </div>
                      
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Aucun template trouvé</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
