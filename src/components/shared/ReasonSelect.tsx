import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStructureId } from '@/hooks/useStructureId';
import { 
  ConsultationReason, 
  fetchConsultationReasons,
  getCategoryLabel,
} from '@/lib/consultationReasons';
import { Badge } from '@/components/ui/badge';

interface ReasonSelectProps {
  value?: string;
  onValueChange: (value: string, reason?: ConsultationReason) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showDuration?: boolean;
}

export default function ReasonSelect({
  value,
  onValueChange,
  placeholder = 'Sélectionner un motif',
  disabled = false,
  className,
  showDuration = false,
}: ReasonSelectProps) {
  const { structureId } = useStructureId();
  const [reasons, setReasons] = useState<ConsultationReason[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReasons = async () => {
      if (!structureId) return;

      setLoading(true);
      try {
        const data = await fetchConsultationReasons(structureId, true);
        setReasons(data);
      } catch (err) {
        console.error('Error loading consultation reasons:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReasons();
  }, [structureId]);

  const handleValueChange = (newValue: string) => {
    if (newValue === '__none__') {
      onValueChange('', undefined);
      return;
    }
    const selectedReason = reasons.find(r => r.id === newValue);
    onValueChange(newValue, selectedReason);
  };

  // Group reasons by category
  const reasonsByCategory = reasons.reduce((acc, reason) => {
    if (!acc[reason.category]) {
      acc[reason.category] = [];
    }
    acc[reason.category].push(reason);
    return acc;
  }, {} as Record<string, ConsultationReason[]>);

  const categories = Object.keys(reasonsByCategory);

  return (
    <Select 
      value={value || '__none__'} 
      onValueChange={handleValueChange}
      disabled={disabled || loading}
    >
      <SelectTrigger className={className} data-testid="reason-select">
        <SelectValue placeholder={loading ? 'Chargement...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Aucun motif</SelectItem>
        {categories.map((category) => (
          <div key={category}>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
              {getCategoryLabel(category as ConsultationReason['category'])}
            </div>
            {reasonsByCategory[category].map((reason) => (
              <SelectItem key={reason.id} value={reason.id}>
                <div className="flex items-center gap-2">
                  {reason.color && (
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: reason.color }}
                    />
                  )}
                  <span>{reason.label}</span>
                  {showDuration && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {reason.default_duration} min
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
