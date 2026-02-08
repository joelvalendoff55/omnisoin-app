import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Copy,
  Download,
  Edit3,
  Mail,
  FileCheck,
  FilePlus,
  Loader2
} from 'lucide-react';
import { CopyToClipboard } from '@/components/shared/CopyToClipboard';
import { MedicalTemplate, formatMedicalDocument } from '@/lib/ipaFormatter';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const categoryConfig = {
  courrier: { label: 'Courrier', icon: Mail },
  compte_rendu: { label: 'Compte-rendu', icon: FileCheck },
  ordonnance: { label: 'Ordonnance', icon: FilePlus },
  certificat: { label: 'Certificat', icon: FileText },
};

// Mock templates
const mockTemplates: MedicalTemplate[] = [
  {
    id: '1',
    title: 'Courrier au médecin traitant',
    category: 'courrier',
    content: `Objet : Compte-rendu de consultation IPA

Cher Confrère,

J'ai reçu en consultation ce jour votre patient(e) {{patient_name}} pour {{motif}}.

Examen clinique :
{{examen}}

Conclusion :
{{conclusion}}

Je reste à votre disposition pour tout complément d'information.

Confraternellement,
{{praticien_name}}
Infirmier(e) en Pratique Avancée`,
  },
  {
    id: '2',
    title: 'Courrier au spécialiste',
    category: 'courrier',
    content: `Objet : Demande d'avis spécialisé

Cher Confrère,

Je vous adresse mon patient(e) {{patient_name}}, né(e) le {{patient_dob}}, pour {{motif}}.

Antécédents notables :
{{antecedents}}

Traitement actuel :
{{traitement}}

Je vous remercie de bien vouloir prendre en charge ce(tte) patient(e).

Confraternellement,
{{praticien_name}}
Infirmier(e) en Pratique Avancée`,
  },
  {
    id: '3',
    title: 'Compte-rendu éducation thérapeutique',
    category: 'compte_rendu',
    content: `COMPTE-RENDU DE SÉANCE D'ÉDUCATION THÉRAPEUTIQUE

Patient : {{patient_name}}
Date : ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}

Thème abordé : {{theme}}

Objectifs de la séance :
{{objectifs}}

Contenu de la séance :
{{contenu}}

Évaluation des acquis :
{{evaluation}}

Prochaine séance prévue : {{prochaine_seance}}

{{praticien_name}}
Infirmier(e) en Pratique Avancée`,
  },
  {
    id: '4',
    title: 'Compte-rendu suivi chronic',
    category: 'compte_rendu',
    content: `COMPTE-RENDU DE SUIVI - PATHOLOGIE CHRONIQUE

Patient : {{patient_name}}
Date : ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}
Pathologie suivie : {{pathologie}}

État clinique actuel :
{{etat_clinique}}

Résultats biologiques récents :
{{biologie}}

Ajustements thérapeutiques :
{{ajustements}}

Plan de suivi :
{{plan_suivi}}

{{praticien_name}}
Infirmier(e) en Pratique Avancée`,
  },
];

interface TemplateCardProps {
  template: MedicalTemplate;
  onSelect: (template: MedicalTemplate) => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const config = categoryConfig[template.category];
  const Icon = config.icon;

  return (
    <div 
      className="flex items-center justify-between p-4 border rounded-lg bg-card hover:shadow-sm hover:border-primary/50 transition-all cursor-pointer"
      onClick={() => onSelect(template)}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">{template.title}</p>
          <Badge variant="secondary" className="mt-1">{config.label}</Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <CopyToClipboard
          text={template.content}
          variant="ghost"
          size="icon"
        />
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onSelect(template); }}>
          <Edit3 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function WritingAidSection() {
  const [selectedTemplate, setSelectedTemplate] = useState<MedicalTemplate | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const templates = mockTemplates;

  const handleSelectTemplate = (template: MedicalTemplate) => {
    setSelectedTemplate(template);
    setEditedContent(template.content);
  };

  const handleGeneratePdf = async () => {
    if (!editedContent) return;
    
    setIsGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(editedContent, 170);
      doc.text(lines, 20, 20);
      
      doc.save(`document-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
      toast.success('PDF généré avec succès');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const courriers = templates.filter(t => t.category === 'courrier');
  const comptesRendus = templates.filter(t => t.category === 'compte_rendu');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aide à la rédaction
            </CardTitle>
            <CardDescription>
              Modèles de courriers et génération de comptes-rendus
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Templates list */}
          <div>
            <Tabs defaultValue="courriers">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="courriers">
                  <Mail className="h-4 w-4 mr-2" />
                  Courriers ({courriers.length})
                </TabsTrigger>
                <TabsTrigger value="comptes-rendus">
                  <FileCheck className="h-4 w-4 mr-2" />
                  Comptes-rendus ({comptesRendus.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="courriers" className="mt-4 space-y-3">
                {courriers.map(template => (
                  <TemplateCard 
                    key={template.id} 
                    template={template} 
                    onSelect={handleSelectTemplate}
                  />
                ))}
              </TabsContent>

              <TabsContent value="comptes-rendus" className="mt-4 space-y-3">
                {comptesRendus.map(template => (
                  <TemplateCard 
                    key={template.id} 
                    template={template} 
                    onSelect={handleSelectTemplate}
                  />
                ))}
              </TabsContent>
            </Tabs>
          </div>

          {/* Editor */}
          <div className="border rounded-lg p-4 bg-muted/20">
            {selectedTemplate ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{selectedTemplate.title}</h4>
                  <div className="flex items-center gap-2">
                    <CopyToClipboard
                      text={editedContent}
                      label="Copier"
                      variant="outline"
                      size="sm"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleGeneratePdf}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      PDF
                    </Button>
                  </div>
                </div>
                
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Contenu du document..."
                />
                
                <p className="text-xs text-muted-foreground">
                  Remplacez les champs entre {'{{'}...{'}}' } par les informations du patient
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-50" />
                <p>Sélectionnez un modèle pour commencer</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
