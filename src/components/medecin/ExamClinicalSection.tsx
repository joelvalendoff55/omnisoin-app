import { useState } from 'react';
import { Stethoscope, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ExamClinicalSectionProps {
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  compact?: boolean;
}

const QUICK_EXAM_TEMPLATES = [
  { id: 'normal', label: 'Normal', text: 'Examen clinique sans particularité.' },
  { id: 'cardio', label: 'Cardio', text: 'BDC réguliers, pas de souffle. TA normale. Pouls périphériques présents.' },
  { id: 'pulmo', label: 'Pulmo', text: 'MV bilatéral et symétrique. Pas de râles. FR normale.' },
  { id: 'abdo', label: 'Abdo', text: 'Abdomen souple, dépressible, indolore. Pas de défense ni contracture. BHA présents.' },
  { id: 'neuro', label: 'Neuro', text: 'Patient conscient, orienté. Pas de déficit sensitivo-moteur. ROT présents et symétriques.' },
  { id: 'orl', label: 'ORL', text: 'Oropharynx normal. Tympans normaux. Pas d\'adénopathie cervicale.' },
];

export function ExamClinicalSection({ 
  value = '', 
  onChange, 
  readOnly = false,
  compact = false 
}: ExamClinicalSectionProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [examText, setExamText] = useState(value);

  const handleChange = (newValue: string) => {
    setExamText(newValue);
    onChange?.(newValue);
  };

  const handleTemplateClick = (template: typeof QUICK_EXAM_TEMPLATES[0]) => {
    const newValue = examText 
      ? `${examText}\n${template.text}` 
      : template.text;
    handleChange(newValue);
  };

  const hasContent = examText.trim().length > 0;

  if (compact) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between h-8 px-2"
          >
            <div className="flex items-center gap-2">
              <Stethoscope className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Examen clinique</span>
              {hasContent && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  Renseigné
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <ExamContent 
            value={examText}
            onChange={handleChange}
            onTemplateClick={handleTemplateClick}
            readOnly={readOnly}
          />
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-primary" />
          Examen clinique
          {hasContent && (
            <Badge variant="secondary" className="text-xs">
              Renseigné
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ExamContent 
          value={examText}
          onChange={handleChange}
          onTemplateClick={handleTemplateClick}
          readOnly={readOnly}
        />
      </CardContent>
    </Card>
  );
}

interface ExamContentProps {
  value: string;
  onChange: (value: string) => void;
  onTemplateClick: (template: typeof QUICK_EXAM_TEMPLATES[0]) => void;
  readOnly?: boolean;
}

function ExamContent({ value, onChange, onTemplateClick, readOnly }: ExamContentProps) {
  return (
    <div className="space-y-3">
      {/* Quick templates */}
      {!readOnly && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_EXAM_TEMPLATES.map((template) => (
            <Button
              key={template.id}
              variant="outline"
              size="sm"
              onClick={() => onTemplateClick(template)}
              className="h-6 text-xs px-2"
            >
              {template.label}
            </Button>
          ))}
        </div>
      )}

      {/* Exam textarea */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          Notes d'examen
        </Label>
        <Textarea
          placeholder="Décrivez les résultats de l'examen clinique..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          readOnly={readOnly}
          className="text-sm"
        />
      </div>
    </div>
  );
}
