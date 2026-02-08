import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { patientSchema, PatientFormData, Patient, PATIENT_ORIGIN_VALUES, PatientOriginType } from '@/types/patient';
import { PATIENT_ORIGIN_OPTIONS } from '@/lib/patientStatus';
import { AlertCircle, Upload, FileText, Loader2 } from 'lucide-react';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { toast } from 'sonner';

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PatientFormData) => Promise<void>;
  patient?: Patient | null;
  isSubmitting: boolean;
  defaultPhone?: string;
  prefillData?: PatientFormData | null;
}

export function PatientFormDialog({
  open,
  onOpenChange,
  onSubmit,
  patient,
  isSubmitting,
  defaultPhone,
  prefillData,
}: PatientFormDialogProps) {
  const [formData, setFormData] = useState<PatientFormData>({
    first_name: prefillData?.first_name || patient?.first_name || '',
    last_name: prefillData?.last_name || patient?.last_name || '',
    dob: prefillData?.dob || patient?.dob || '',
    sex: prefillData?.sex || (patient?.sex as 'M' | 'F' | 'O') || null,
    phone: prefillData?.phone || patient?.phone || defaultPhone || '',
    email: prefillData?.email || patient?.email || '',
    primary_practitioner_user_id: prefillData?.primary_practitioner_user_id || patient?.primary_practitioner_user_id || null,
    note_admin: prefillData?.note_admin || patient?.note_admin || '',
    origin: (prefillData?.origin || patient?.origin || 'spontanee') as PatientOriginType,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form when prefillData changes
  useEffect(() => {
    if (prefillData) {
      setFormData({
        first_name: prefillData.first_name || '',
        last_name: prefillData.last_name || '',
        dob: prefillData.dob || '',
        sex: prefillData.sex || null,
        phone: prefillData.phone || '',
        email: prefillData.email || '',
        primary_practitioner_user_id: prefillData.primary_practitioner_user_id || null,
        note_admin: prefillData.note_admin || '',
        origin: (prefillData.origin || 'spontanee') as PatientOriginType,
      });
    }
  }, [prefillData]);

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez PDF, JPG, PNG ou WebP.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 10 Mo).');
      return;
    }

    setIsExtracting(true);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('extract-patient-from-pdf', {
        body: { pdfBase64: base64, mimeType: file.type },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      const extracted = data.data;

      // Update form with extracted data
      setFormData(prev => ({
        ...prev,
        first_name: extracted.firstName || prev.first_name,
        last_name: extracted.lastName || prev.last_name,
        dob: extracted.dateOfBirth || prev.dob,
        sex: extracted.gender as 'M' | 'F' | 'O' || prev.sex,
        phone: extracted.phone || prev.phone,
        email: extracted.email || prev.email,
      }));

      const fieldsExtracted = [
        extracted.firstName && 'prénom',
        extracted.lastName && 'nom',
        extracted.dateOfBirth && 'date de naissance',
        extracted.gender && 'sexe',
        extracted.phone && 'téléphone',
        extracted.email && 'email',
      ].filter(Boolean);

      if (fieldsExtracted.length > 0) {
        toast.success(`Données extraites : ${fieldsExtracted.join(', ')}`);
      } else {
        toast.warning('Aucune donnée patient trouvée dans le document.');
      }
    } catch (err) {
      console.error('PDF extraction error:', err);
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'extraction");
    } finally {
      setIsExtracting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Nettoyer les valeurs vides
    const cleanedData = {
      ...formData,
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
      dob: formData.dob || null,
      note_admin: formData.note_admin?.trim() || null,
    };

    const result = patientSchema.safeParse(cleanedData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    await onSubmit(result.data);
  };

  const updateField = (field: keyof PatientFormData, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const isEditing = !!patient;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier le patient' : 'Nouveau patient'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* PDF Import Button */}
          {!isEditing && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-dashed">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Importer depuis un document</p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG ou WebP - max 10 Mo</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={handlePdfUpload}
                className="hidden"
                disabled={isExtracting}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extraction...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importer
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                className={errors.first_name ? 'border-destructive' : ''}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.first_name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                className={errors.last_name ? 'border-destructive' : ''}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.last_name}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dob">Date de naissance</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob || ''}
                onChange={(e) => updateField('dob', e.target.value || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sex">Sexe</Label>
              <Select
                value={formData.sex || ''}
                onValueChange={(value) => updateField('sex', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculin</SelectItem>
                  <SelectItem value="F">Féminin</SelectItem>
                  <SelectItem value="O">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Origin field - required */}
          <div className="space-y-2">
            <Label htmlFor="origin">Origine du patient *</Label>
            <Select
              value={formData.origin || 'spontanee'}
              onValueChange={(value) => updateField('origin', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner l'origine" />
              </SelectTrigger>
              <SelectContent>
                {PATIENT_ORIGIN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note_admin">Note administrative</Label>
            <Textarea
              id="note_admin"
              value={formData.note_admin || ''}
              onChange={(e) => updateField('note_admin', e.target.value)}
              placeholder="Notes internes sur ce patient..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? 'Mise à jour...'
                  : 'Création...'
                : isEditing
                ? 'Mettre à jour'
                : 'Créer le patient'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
