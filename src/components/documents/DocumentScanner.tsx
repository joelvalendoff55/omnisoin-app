import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useDocumentOCR } from '@/hooks/useDocumentOCR';
import { OCRResult } from './OCRResult';
import { Document } from '@/lib/documents';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

interface DocumentScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  onScanComplete: (
    file: File,
    patientId: string,
    title: string,
    description?: string
  ) => Promise<Document | null>;
}

export function DocumentScanner({
  open,
  onOpenChange,
  patients,
  onScanComplete,
}: DocumentScannerProps) {
  const [step, setStep] = useState<'capture' | 'details' | 'ocr'>('capture');
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedDocument, setSavedDocument] = useState<Document | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const { processing, result: ocrResult, processOCR } = useDocumentOCR();

  const resetState = useCallback(() => {
    setStep('capture');
    setImageData(null);
    setImageFile(null);
    setSelectedPatient('');
    setTitle('');
    setDescription('');
    setSaving(false);
    setSavedDocument(null);
  }, []);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageData(e.target?.result as string);
        setStep('details');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAndAnalyze = async () => {
    if (!imageFile || !selectedPatient || !title) return;

    setSaving(true);
    try {
      const doc = await onScanComplete(imageFile, selectedPatient, title, description);
      if (doc) {
        setSavedDocument(doc);
        setStep('ocr');
        
        // Start OCR processing
        if (imageData) {
          await processOCR(doc.id, imageData);
        }
      }
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipOCR = () => {
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Scanner un document
          </DialogTitle>
          <DialogDescription>
            {step === 'capture' && 'Capturez ou sélectionnez une image de document'}
            {step === 'details' && 'Renseignez les informations du document'}
            {step === 'ocr' && 'Extraction de texte (OCR)'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Capture */}
        {step === 'capture' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-8 w-8" />
                <span>Prendre une photo</span>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8" />
                <span>Importer un fichier</span>
              </Button>
            </div>
            
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileSelect}
            />

            <p className="text-xs text-muted-foreground text-center">
              Formats acceptés: JPG, PNG, PDF
            </p>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 'details' && (
          <div className="space-y-4">
            {/* Image preview */}
            {imageData && (
              <div className="relative">
                <img
                  src={imageData}
                  alt="Preview"
                  className="w-full max-h-48 object-contain rounded-lg border"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 bg-background/80"
                  onClick={() => {
                    setImageData(null);
                    setImageFile(null);
                    setStep('capture');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Patient selection */}
            <div className="space-y-2">
              <Label htmlFor="patient">Patient *</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre du document *</Label>
              <Input
                id="title"
                placeholder="Ex: Ordonnance, Résultat d'analyse..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                placeholder="Notes ou remarques..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('capture')}>
                Retour
              </Button>
              <Button
                onClick={handleSaveAndAnalyze}
                disabled={!selectedPatient || !title || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer et analyser'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: OCR */}
        {step === 'ocr' && (
          <div className="space-y-4">
            {processing ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analyse en cours...
                </p>
              </div>
            ) : ocrResult ? (
              <OCRResult 
                ocr={ocrResult} 
                patientId={selectedPatient}
                documentId={savedDocument?.id}
                documentTitle={title}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Document enregistré avec succès.</p>
                <p className="text-sm mt-2">L'OCR n'a pas pu être traité.</p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button onClick={handleClose}>
                Terminer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
