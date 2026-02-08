"use client";

import { useState } from 'react';
import {
  FileText,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePatientConsents } from '@/hooks/usePatientConsents';
import { ConsentDialog } from './ConsentDialog';
import { ConsentHistory } from './ConsentHistory';
import {
  ConsentTemplate,
  PatientConsentType,
  CONSENT_TYPE_CONFIG,
} from '@/lib/patientConsents';

interface ConsentManagerProps {
  patientId: string;
  patientName: string;
}

export function ConsentManager({ patientId, patientName }: ConsentManagerProps) {
  const {
    consents,
    templates,
    loading,
    obtainConsent,
    refuse,
    revoke,
    refresh,
    getConsentForType,
    getMissingRequiredConsents,
  } = usePatientConsents(patientId);

  const [selectedTemplate, setSelectedTemplate] = useState<ConsentTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const missingRequired = getMissingRequiredConsents();

  const handleObtainConsent = async (params: {
    template_id: string;
    consent_type: string;
    signature_data?: string;
    scroll_completed: boolean;
    checkbox_confirmed: boolean;
  }) => {
    await obtainConsent({
      patient_id: patientId,
      template_id: params.template_id,
      consent_type: params.consent_type as PatientConsentType,
      signature_data: params.signature_data,
      scroll_completed: params.scroll_completed,
      checkbox_confirmed: params.checkbox_confirmed,
    });
  };

  const handleRefuse = async (reason: string) => {
    if (!selectedTemplate) return;
    await refuse(selectedTemplate.id, selectedTemplate.consent_type, reason);
  };

  const openConsentDialog = (template: ConsentTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Consentements du patient
            </CardTitle>
            <CardDescription>
              Gestion des consentements éclairés pour {patientName}
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Missing required consents alert */}
        {missingRequired.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{missingRequired.length} consentement(s) requis manquant(s) :</strong>
              <ul className="mt-2 space-y-1">
                {missingRequired.map((template) => (
                  <li key={template.id} className="flex items-center gap-2">
                    <span>• {template.title}</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-destructive underline"
                      onClick={() => openConsentDialog(template)}
                    >
                      Obtenir
                    </Button>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="status">
          <TabsList>
            <TabsTrigger value="status">État des consentements</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4 mt-4">
            {/* Consent status grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => {
                const consent = getConsentForType(template.consent_type);
                const typeConfig = CONSENT_TYPE_CONFIG[template.consent_type];
                const hasConsent = !!consent;

                return (
                  <Card
                    key={template.id}
                    className={cn(
                      'border-l-4 transition-all',
                      hasConsent && 'border-l-green-500 bg-green-50/30',
                      !hasConsent && template.required_for_care && 'border-l-red-500 bg-red-50/30',
                      !hasConsent && !template.required_for_care && 'border-l-amber-500 bg-amber-50/30'
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn('text-xs', typeConfig.color)}>
                              {typeConfig.label}
                            </Badge>
                            {template.required_for_care && (
                              <Badge variant="destructive" className="text-xs">Requis</Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium">{template.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Version {template.version}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {hasConsent ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-xs font-medium">Obtenu</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-600">
                              <Clock className="h-4 w-4" />
                              <span className="text-xs font-medium">En attente</span>
                            </div>
                          )}
                          
                          {!hasConsent && (
                            <Button
                              size="sm"
                              onClick={() => openConsentDialog(template)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Obtenir
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {templates.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Aucun modèle de consentement configuré pour cette structure.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ConsentHistory
              consents={consents}
              loading={loading}
              onRevoke={revoke}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Consent dialog */}
      <ConsentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={selectedTemplate}
        patientName={patientName}
        onConsent={handleObtainConsent}
        onRefuse={handleRefuse}
      />
    </Card>
  );
}
