"use client";

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import {
  CalendarIcon,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Users,
  ClipboardList,
  Lock,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateCertificationReport, type CertificationReport } from '@/lib/systemHealth';
import { useStructureId } from '@/hooks/useStructureId';

export function ComplianceReportGenerator() {
  const { structureId } = useStructureId();
  const [dateStart, setDateStart] = useState<Date>(startOfMonth(subMonths(new Date(), 1)));
  const [dateEnd, setDateEnd] = useState<Date>(endOfMonth(subMonths(new Date(), 1)));
  const [report, setReport] = useState<CertificationReport | null>(null);

  const generateMutation = useMutation({
    mutationFn: () => generateCertificationReport(structureId!, dateStart, dateEnd),
    onSuccess: (data) => {
      setReport(data);
      toast.success('Rapport généré avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const downloadPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapport de Certification HAS', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Structure: ${report.report_metadata.structure_name}`, margin, y);
    y += 6;
    doc.text(
      `Période: ${format(new Date(report.report_metadata.period_start), 'dd/MM/yyyy')} - ${format(new Date(report.report_metadata.period_end), 'dd/MM/yyyy')}`,
      margin,
      y
    );
    y += 6;
    doc.text(
      `Généré le: ${format(new Date(report.report_metadata.generated_at), 'dd/MM/yyyy HH:mm')}`,
      margin,
      y
    );
    y += 15;

    // Compliance Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Résumé de Conformité', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const compliance = report.compliance_summary;
    doc.text(`Statut global: ${compliance.overall_status}`, margin, y);
    y += 6;
    doc.text(`RLS activé: ${compliance.rls_enabled ? 'Oui' : 'Non'}`, margin, y);
    y += 6;
    doc.text(`Audit immuable: ${compliance.audit_immutable ? 'Oui' : 'Non'}`, margin, y);
    y += 6;
    doc.text(`Hash chain valide: ${compliance.hash_chain_valid ? 'Oui' : 'Non'}`, margin, y);
    y += 6;
    doc.text(`Exports RGPD disponibles: ${compliance.gdpr_exports_available ? 'Oui' : 'Non'}`, margin, y);
    y += 15;

    // Patient Statistics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Statistiques Patients', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const patients = report.patient_statistics;
    doc.text(`Total patients: ${patients.total_patients || 0}`, margin, y);
    y += 6;
    doc.text(`Patients actifs: ${patients.active_patients || 0}`, margin, y);
    y += 6;
    doc.text(`Nouveaux sur la période: ${patients.new_in_period || 0}`, margin, y);
    y += 15;

    // Consent Statistics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Statistiques Consentements', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const consents = report.consent_statistics;
    doc.text(`Total consentements: ${consents.total_consents || 0}`, margin, y);
    y += 6;
    doc.text(`Obtenus: ${consents.obtained || 0}`, margin, y);
    y += 6;
    doc.text(`Refusés: ${consents.refused || 0}`, margin, y);
    y += 6;
    doc.text(`Taux de couverture: ${consents.coverage_rate || 0}%`, margin, y);
    y += 15;

    // Audit Statistics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Statistiques Audit', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const audit = report.audit_statistics;
    doc.text(`Logs immuables: ${audit.immutable_logs || 0}`, margin, y);
    y += 6;
    doc.text(`Logs d'accès: ${audit.data_access_logs || 0}`, margin, y);
    y += 6;
    doc.text(`Logs d'activité: ${audit.activity_logs || 0}`, margin, y);
    y += 15;

    // Security Statistics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Statistiques Sécurité', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const security = report.security_statistics;
    doc.text(`Tentatives cross-structure: ${security.cross_structure_attempts || 0}`, margin, y);
    y += 6;
    doc.text(`Violations RBAC: ${security.rbac_violations || 0}`, margin, y);
    y += 6;
    doc.text(`Suppressions bloquées: ${security.deletion_attempts_blocked || 0}`, margin, y);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Document généré automatiquement - Version ${report.report_metadata.version}`,
      margin,
      285
    );

    doc.save(`rapport-certification-has-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF téléchargé');
  };

  if (!structureId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucune structure associée
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generator Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Générateur de Rapport de Certification
          </CardTitle>
          <CardDescription>
            Générez un rapport complet pour la certification HAS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de début</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-[200px] justify-start text-left')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateStart, 'dd MMMM yyyy', { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateStart}
                    onSelect={(date) => date && setDateStart(date)}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date de fin</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-[200px] justify-start text-left')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateEnd, 'dd MMMM yyyy', { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateEnd}
                    onSelect={(date) => date && setDateEnd(date)}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? 'Génération...' : 'Générer le rapport'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Display */}
      {report && (
        <div className="space-y-4">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{report.report_metadata.report_type}</CardTitle>
                  <CardDescription>
                    Période: {format(new Date(report.report_metadata.period_start), 'dd/MM/yyyy')} -{' '}
                    {format(new Date(report.report_metadata.period_end), 'dd/MM/yyyy')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      report.compliance_summary.overall_status === 'COMPLIANT'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    )}
                  >
                    {report.compliance_summary.overall_status === 'COMPLIANT' ? (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    {report.compliance_summary.overall_status}
                  </Badge>
                  <Button variant="outline" onClick={downloadPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Compliance Checks */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ComplianceCheckCard
              icon={Shield}
              label="RLS Activé"
              passed={report.compliance_summary.rls_enabled}
            />
            <ComplianceCheckCard
              icon={FileCheck}
              label="Audit Immuable"
              passed={report.compliance_summary.audit_immutable}
            />
            <ComplianceCheckCard
              icon={Lock}
              label="Hash Chain Valide"
              passed={report.compliance_summary.hash_chain_valid}
            />
            <ComplianceCheckCard
              icon={FileText}
              label="Exports RGPD"
              passed={report.compliance_summary.gdpr_exports_available}
            />
          </div>

          {/* Statistics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatisticsCard
              icon={Users}
              title="Patients"
              stats={report.patient_statistics}
            />
            <StatisticsCard
              icon={ClipboardList}
              title="Consultations"
              stats={report.consultation_statistics}
            />
            <StatisticsCard
              icon={CheckCircle2}
              title="Consentements"
              stats={report.consent_statistics}
            />
          </div>

          {/* Security Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Statistiques Sécurité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <SecurityMetric
                  label="Tentatives cross-structure"
                  value={report.security_statistics.cross_structure_attempts || 0}
                  isGood={(report.security_statistics.cross_structure_attempts || 0) === 0}
                />
                <SecurityMetric
                  label="Violations RBAC"
                  value={report.security_statistics.rbac_violations || 0}
                  isGood={(report.security_statistics.rbac_violations || 0) === 0}
                />
                <SecurityMetric
                  label="Suppressions bloquées"
                  value={report.security_statistics.deletion_attempts_blocked || 0}
                  isGood={true}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ComplianceCheckCard({
  icon: Icon,
  label,
  passed,
}: {
  icon: React.ElementType;
  label: string;
  passed: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{label}</span>
          </div>
          {passed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatisticsCard({
  icon: Icon,
  title,
  stats,
}: {
  icon: React.ElementType;
  title: string;
  stats: Record<string, number>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted-foreground capitalize">
                {key.replace(/_/g, ' ')}
              </span>
              <span className="font-medium">{typeof value === 'number' ? value : '-'}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityMetric({
  label,
  value,
  isGood,
}: {
  label: string;
  value: number;
  isGood: boolean;
}) {
  return (
    <div className="text-center p-4 rounded-lg bg-muted/50">
      <div
        className={cn(
          'text-3xl font-bold',
          isGood ? 'text-green-600' : 'text-red-600'
        )}
      >
        {value}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
