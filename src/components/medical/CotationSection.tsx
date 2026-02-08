import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Receipt, Lightbulb } from 'lucide-react';

export interface CotationCode {
  id: string;
  code: string;
  libelle: string;
  type: 'NGAP' | 'CCAM';
}

interface CotationSectionProps {
  codes: CotationCode[];
  onRemoveCode: (id: string) => void;
  onOpenSuggestions: () => void;
}

export function CotationSection({
  codes,
  onRemoveCode,
  onOpenSuggestions,
}: CotationSectionProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Cotation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected codes */}
        <div>
          <p className="text-sm font-medium mb-2">Codes sélectionnés</p>
          {codes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Aucun code sélectionné
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {codes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center gap-2 bg-secondary/50 border rounded-lg px-3 py-1.5"
                >
                  <Badge
                    variant={code.type === 'CCAM' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {code.type}
                  </Badge>
                  <span className="font-mono text-sm font-medium">{code.code}</span>
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    - {code.libelle}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveCode(code.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suggestions button */}
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={onOpenSuggestions}
        >
          <Lightbulb className="h-4 w-4" />
          Voir suggestions de cotation
        </Button>
      </CardContent>
    </Card>
  );
}
