"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Award,
  Download,
  Calendar,
  Shield,
  CheckCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useStructureId } from '@/hooks/useStructureId';
import { generateHASExport } from '@/lib/exports';
import type { Json } from '@/integrations/supabase/types';

interface HASExportData {
  certification_metadata: {
    export_type: string;
    generated_at: string;
    structure_id: string;
    structure_name: string | null;
    period_start: string;
    period_end: string;
    legal_basis: string;
  };
  audit_summary: {
    event_types: Array<{ event_type: string; count: number }>;
    data_access: Array<{ action_type: string; count: number }>;
  };
  consent_statistics: {
    total_consents: number;
    obtained: number;
    refused: number;
    revoked: number;
  };
  export_statistics: {
    total_exports: number;
    completed: number;
    failed: number;
  };
  compliance_indicators: {
    rls_enabled: boolean;
    audit_logs_immutable: boolean;
    hash_chain_verified: boolean;
    gdpr_exports_available: boolean;
  };
}

export function HASCertificationExport() {
  const { structureId } = useStructureId();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [dateStart, setDateStart] = useState(
    format(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [dateEnd, setDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exportData, setExportData] = useState<HASExportData | null>(null);

  const handleGenerateExport = async () => {
    if (!structureId) {
      toast({
        title: 'Erreur',
        description: 'Structure non identifiée.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const data = await generateHASExport(
        structureId,
        new Date(dateStart).toISOString(),
        new Date(dateEnd).toISOString()
      );

      if (data) {
        setExportData(data as unknown as HASExportData);
        toast({
          title: 'Export généré',
          description: 'Le rapport de certification HAS a été généré.',
        });
      }
    } catch (error) {
      console.error('Error generating HAS export:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer l\'export HAS.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!exportData) return;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `certification_has_${format(new Date(), 'yyyyMMdd')}.json`;
    link.click();

    toast({
      title: 'Téléchargement',
      description: 'Le fichier JSON a été téléchargé.',
    });
  };

  const complianceScore = exportData?.compliance_indicators
    ? Object.values(exportData.compliance_indicators).filter(Boolean).length * 25
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Award className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Export Certification HAS</h2>
          <p className="text-muted-foreground">
            Générez un rapport de conformité pour la Haute Autorité de Santé
          </p>
        </div>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Période d'audit
          </CardTitle>
          <CardDescription>
            Sélectionnez la période pour le rapport de certification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerateExport} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Générer le rapport
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Results */}
      {exportData && (
        <>
          {/* Compliance Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Score de conformité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Progress value={complianceScore} className="flex-1" />
                  <span className="text-2xl font-bold">{complianceScore}%</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(exportData.compliance_indicators).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <CheckCircle className={`h-5 w-5 ${value ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className="text-sm">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Summary */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Événements d'audit</CardTitle>
              </CardHeader>
              <CardContent>
                {exportData.audit_summary.event_types?.length > 0 ? (
                  <div className="space-y-2">
                    {exportData.audit_summary.event_types.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{item.event_type}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Aucun événement</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accès aux données</CardTitle>
              </CardHeader>
              <CardContent>
                {exportData.audit_summary.data_access?.length > 0 ? (
                  <div className="space-y-2">
                    {exportData.audit_summary.data_access.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{item.action_type}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Aucun accès enregistré</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Consent & Export Stats */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Statistiques des consentements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{exportData.consent_statistics.total_consents}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{exportData.consent_statistics.obtained}</p>
                    <p className="text-sm text-muted-foreground">Obtenus</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{exportData.consent_statistics.refused}</p>
                    <p className="text-sm text-muted-foreground">Refusés</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{exportData.consent_statistics.revoked}</p>
                    <p className="text-sm text-muted-foreground">Révoqués</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistiques des exports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{exportData.export_statistics.total_exports}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{exportData.export_statistics.completed}</p>
                    <p className="text-sm text-muted-foreground">Réussis</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{exportData.export_statistics.failed}</p>
                    <p className="text-sm text-muted-foreground">Échecs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Download Button */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Télécharger le rapport complet</p>
                  <p className="text-sm text-muted-foreground">
                    Généré le {format(new Date(exportData.certification_metadata.generated_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
                <Button onClick={handleDownloadJSON}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Info Alert */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Ce rapport est conforme aux exigences de la Haute Autorité de Santé (HAS) 
          pour la certification des établissements de santé. Il inclut les indicateurs 
          de conformité RGPD, les statistiques d'audit et les métriques de sécurité.
        </AlertDescription>
      </Alert>
    </div>
  );
}
