import { useState } from 'react';
import { Copy, Check, Calendar, Phone, Mail, CreditCard, Pill, FlaskConical, Stethoscope, FileText, Activity, User, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { DocumentOCR } from '@/lib/documents';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ExtractedMedicalData } from '@/hooks/useDocumentOCR';
import { OCRImportButton } from './OCRImportButton';

interface OCRResultProps {
  ocr: DocumentOCR;
  patientId?: string;
  documentId?: string;
  documentTitle?: string;
  onImportComplete?: () => void;
}

function getLabResultStatusIcon(status?: string) {
  switch (status) {
    case 'normal':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'high':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case 'low':
      return <AlertCircle className="h-4 w-4 text-blue-500" />;
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
}

function getLabResultStatusBadge(status?: string) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    normal: 'default',
    high: 'secondary',
    low: 'secondary',
    critical: 'destructive',
  };

  const labels: Record<string, string> = {
    normal: 'Normal',
    high: 'Élevé',
    low: 'Bas',
    critical: 'Critique',
  };

  if (!status || !labels[status]) return null;

  return (
    <Badge variant={variants[status] || 'outline'} className="ml-2">
      {labels[status]}
    </Badge>
  );
}

export function OCRResult({ ocr, patientId, documentId, documentTitle, onImportComplete }: OCRResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyText = async () => {
    if (!ocr.raw_text) return;
    
    try {
      await navigator.clipboard.writeText(ocr.raw_text);
      setCopied(true);
      toast.success('Texte copié');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Impossible de copier le texte');
    }
  };

  // Parse the extracted data with new medical structure
  const extractedData = ocr.extracted_data as unknown as ExtractedMedicalData & {
    dates?: Array<{ value: string; context?: string } | string>;
    phoneNumbers?: string[];
    emails?: string[];
    amounts?: string[];
  };

  // Normalize dates to the new format
  const normalizedDates = extractedData?.dates?.map((d) => 
    typeof d === 'string' ? { value: d } : d
  ) || [];

  const hasMedications = (extractedData?.medications?.length ?? 0) > 0;
  const hasLabResults = (extractedData?.labResults?.length ?? 0) > 0;
  const hasDiagnoses = (extractedData?.diagnoses?.length ?? 0) > 0;
  const hasProcedures = (extractedData?.procedures?.length ?? 0) > 0;
  const hasDates = normalizedDates.length > 0;
  const hasPatientInfo = extractedData?.patientInfo && Object.values(extractedData.patientInfo).some(Boolean);

  const hasLegacyData =
    (extractedData?.phoneNumbers?.length ?? 0) > 0 ||
    (extractedData?.emails?.length ?? 0) > 0 ||
    (extractedData?.amounts?.length ?? 0) > 0;

  const hasMedicalData = hasMedications || hasLabResults || hasDiagnoses || hasProcedures || hasPatientInfo;

  return (
    <div className="space-y-4">
      {/* Header with confidence, document type, and import button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {extractedData?.documentType && (
            <Badge variant="outline" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {extractedData.documentType}
            </Badge>
          )}
          {ocr.confidence !== null && (
            <Badge variant={ocr.confidence > 0.8 ? 'default' : ocr.confidence > 0.5 ? 'secondary' : 'destructive'}>
              Confiance: {Math.round(ocr.confidence * 100)}%
            </Badge>
          )}
        </div>
        
        {/* Import button - only show if patient context is available */}
        {patientId && (hasMedications || hasDiagnoses || hasProcedures) && (
          <OCRImportButton
            patientId={patientId}
            documentId={documentId}
            documentTitle={documentTitle}
            medications={extractedData?.medications}
            diagnoses={extractedData?.diagnoses}
            procedures={extractedData?.procedures}
            onImportComplete={onImportComplete}
          />
        )}
      </div>

      {/* Summary */}
      {extractedData?.summary && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm">{extractedData.summary}</p>
        </div>
      )}

      {/* Tabs for different data types */}
      {hasMedicalData ? (
        <Tabs defaultValue="medications" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="medications" className="text-xs">
              <Pill className="h-3 w-3 mr-1" />
              Médicaments
              {hasMedications && <Badge variant="secondary" className="ml-1 h-4 px-1">{extractedData.medications?.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="results" className="text-xs">
              <FlaskConical className="h-3 w-3 mr-1" />
              Résultats
              {hasLabResults && <Badge variant="secondary" className="ml-1 h-4 px-1">{extractedData.labResults?.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="diagnoses" className="text-xs">
              <Stethoscope className="h-3 w-3 mr-1" />
              Diagnostics
              {hasDiagnoses && <Badge variant="secondary" className="ml-1 h-4 px-1">{extractedData.diagnoses?.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="info" className="text-xs">
              <User className="h-3 w-3 mr-1" />
              Infos
            </TabsTrigger>
          </TabsList>

          {/* Medications Tab */}
          <TabsContent value="medications" className="space-y-2 mt-3">
            {hasMedications ? (
              <div className="space-y-2">
                {extractedData.medications?.map((med, i) => (
                  <Card key={i} className="p-3">
                    <div className="flex items-start gap-2">
                      <Pill className="h-4 w-4 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{med.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {med.dosage && (
                            <Badge variant="outline" className="text-xs">
                              {med.dosage}
                            </Badge>
                          )}
                          {med.frequency && (
                            <Badge variant="outline" className="text-xs">
                              {med.frequency}
                            </Badge>
                          )}
                          {med.duration && (
                            <Badge variant="outline" className="text-xs">
                              {med.duration}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun médicament détecté
              </p>
            )}
          </TabsContent>

          {/* Lab Results Tab */}
          <TabsContent value="results" className="space-y-2 mt-3">
            {hasLabResults ? (
              <div className="space-y-2">
                {extractedData.labResults?.map((result, i) => (
                  <Card key={i} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Activity className="h-4 w-4 text-primary mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{result.name}</p>
                            {getLabResultStatusIcon(result.status)}
                          </div>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-semibold">
                              {result.value}
                            </span>
                            {result.unit && (
                              <span className="text-sm text-muted-foreground">
                                {result.unit}
                              </span>
                            )}
                            {getLabResultStatusBadge(result.status)}
                          </div>
                          {result.reference && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Réf: {result.reference}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun résultat de laboratoire détecté
              </p>
            )}
          </TabsContent>

          {/* Diagnoses Tab */}
          <TabsContent value="diagnoses" className="space-y-2 mt-3">
            {hasDiagnoses && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Diagnostics
                </h4>
                <div className="flex flex-wrap gap-2">
                  {extractedData.diagnoses?.map((diagnosis, i) => (
                    <Badge key={i} variant="secondary" className="text-sm">
                      {diagnosis}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {hasProcedures && (
              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Procédures / Actes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {extractedData.procedures?.map((procedure, i) => (
                    <Badge key={i} variant="outline" className="text-sm">
                      {procedure}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {!hasDiagnoses && !hasProcedures && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun diagnostic ou procédure détecté
              </p>
            )}
          </TabsContent>

          {/* Patient Info Tab */}
          <TabsContent value="info" className="space-y-3 mt-3">
            {hasPatientInfo && (
              <Card className="p-3">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Informations patient
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-1">
                  {extractedData.patientInfo?.name && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Nom:</span> {extractedData.patientInfo.name}
                    </p>
                  )}
                  {extractedData.patientInfo?.birthDate && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Date de naissance:</span> {extractedData.patientInfo.birthDate}
                    </p>
                  )}
                  {extractedData.patientInfo?.socialSecurityNumber && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">N° SS:</span> {extractedData.patientInfo.socialSecurityNumber}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {hasDates && (
              <Card className="p-3">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Dates importantes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    {normalizedDates.slice(0, 5).map((date, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <Badge variant="outline">{date.value}</Badge>
                        {date.context && (
                          <span className="text-muted-foreground text-xs">{date.context}</span>
                        )}
                      </div>
                    ))}
                    {normalizedDates.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{normalizedDates.length - 5} autres dates
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!hasPatientInfo && !hasDates && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune information supplémentaire détectée
              </p>
            )}
          </TabsContent>
        </Tabs>
      ) : hasLegacyData ? (
        /* Legacy data display for older OCR results */
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Données extraites</h4>
          
          <div className="grid grid-cols-2 gap-2">
            {hasDates && (
              <div className="p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Dates
                </div>
                <div className="flex flex-wrap gap-1">
                  {normalizedDates.slice(0, 3).map((date, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {date.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {extractedData.phoneNumbers && extractedData.phoneNumbers.length > 0 && (
              <div className="p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Phone className="h-3 w-3" />
                  Téléphones
                </div>
                <div className="flex flex-wrap gap-1">
                  {extractedData.phoneNumbers.slice(0, 2).map((phone, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {phone}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {extractedData.emails && extractedData.emails.length > 0 && (
              <div className="p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Mail className="h-3 w-3" />
                  Emails
                </div>
                <div className="flex flex-wrap gap-1">
                  {extractedData.emails.slice(0, 2).map((email, i) => (
                    <Badge key={i} variant="outline" className="text-xs truncate max-w-full">
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {extractedData.amounts && extractedData.amounts.length > 0 && (
              <div className="p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <CreditCard className="h-3 w-3" />
                  Montants
                </div>
                <div className="flex flex-wrap gap-1">
                  {extractedData.amounts.slice(0, 3).map((amount, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {amount}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <Separator />

      {/* Raw text */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Texte extrait</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyText}
            disabled={!ocr.raw_text}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copié
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copier
              </>
            )}
          </Button>
        </div>

        <ScrollArea className="h-48 rounded-md border p-3">
          {ocr.raw_text ? (
            <pre className="text-sm whitespace-pre-wrap font-sans">
              {ocr.raw_text}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Aucun texte extrait
            </p>
          )}
        </ScrollArea>
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground">
        Traité le {format(new Date(ocr.processed_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
      </div>
    </div>
  );
}
