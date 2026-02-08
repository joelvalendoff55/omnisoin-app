"use client";

import { useState } from 'react';
import Link from "next/link";
import { 
  Activity, 
  FileText, 
  History, 
  Pill, 
  User, 
  ExternalLink,
  AlertTriangle,
  Thermometer,
  Heart,
  Scale,
  Ruler
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { QueueEntry } from '@/lib/queue';

interface VitalsData {
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  weight_kg?: number;
  height_cm?: number;
  temperature?: number;
  bmi?: number;
}

interface PatientSummaryCardProps {
  entry: QueueEntry & { 
    assistant_notes?: string | null; 
    vitals_data?: VitalsData | null;
    ready_at?: string | null;
  };
  onPrescribe?: () => void;
  onExams?: () => void;
  onClose?: () => void;
  isDoctor?: boolean;
  compact?: boolean;
}

function VitalItem({ 
  icon: Icon, 
  label, 
  value, 
  unit, 
  status 
}: { 
  icon: typeof Activity; 
  label: string; 
  value?: number | null; 
  unit: string;
  status?: 'normal' | 'warning' | 'danger';
}) {
  if (value === undefined || value === null) return null;
  
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-md",
      status === 'danger' && "bg-destructive/10",
      status === 'warning' && "bg-warning/10",
      status === 'normal' && "bg-muted/50"
    )}>
      <Icon className={cn(
        "h-4 w-4",
        status === 'danger' && "text-destructive",
        status === 'warning' && "text-warning",
        status === 'normal' && "text-muted-foreground"
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm">{value} {unit}</p>
      </div>
    </div>
  );
}

function getTemperatureStatus(temp: number): 'normal' | 'warning' | 'danger' {
  if (temp < 36) return 'warning'; // Hypothermia
  if (temp > 38) return 'danger'; // Fever
  if (temp > 37.5) return 'warning'; // Subfever
  return 'normal';
}

function getBMIStatus(bmi: number): 'normal' | 'warning' | 'danger' {
  if (bmi < 18.5) return 'warning'; // Underweight
  if (bmi >= 30) return 'danger'; // Obese
  if (bmi >= 25) return 'warning'; // Overweight
  return 'normal';
}

export function PatientSummaryCard({
  entry,
  onPrescribe,
  onExams,
  onClose,
  isDoctor = false,
  compact = false,
}: PatientSummaryCardProps) {
  const [activeTab, setActiveTab] = useState('constantes');
  
  const patientName = entry.patient 
    ? `${entry.patient.first_name || ''} ${entry.patient.last_name || ''}`.trim() || 'Patient'
    : 'Patient';
  
  const vitals = entry.vitals_data || {};
  const hasVitals = Object.keys(vitals).some(k => vitals[k as keyof VitalsData] !== undefined && vitals[k as keyof VitalsData] !== null);

  if (compact) {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{patientName}</h3>
                <p className="text-sm text-muted-foreground">{entry.reason || 'Consultation'}</p>
              </div>
            </div>
            
            {hasVitals && (
              <div className="flex gap-3 text-sm">
                {vitals.systolic_bp && vitals.diastolic_bp && (
                  <span className="text-muted-foreground">
                    TA: <span className="font-medium text-foreground">{vitals.systolic_bp}/{vitals.diastolic_bp}</span>
                  </span>
                )}
                {vitals.heart_rate && (
                  <span className="text-muted-foreground">
                    FC: <span className="font-medium text-foreground">{vitals.heart_rate}</span>
                  </span>
                )}
                {vitals.temperature && (
                  <span className={cn(
                    "text-muted-foreground",
                    getTemperatureStatus(vitals.temperature) === 'danger' && "text-destructive",
                    getTemperatureStatus(vitals.temperature) === 'warning' && "text-warning"
                  )}>
                    T°: <span className="font-medium">{vitals.temperature}°C</span>
                  </span>
                )}
              </div>
            )}

            <Link href={`/patients/${entry.patient_id}`}>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                Dossier
              </Button>
            </Link>
          </div>
          
          {entry.assistant_notes && (
            <div className="mt-3 p-2 bg-muted/50 rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Notes assistante</p>
              <p className="text-sm">{entry.assistant_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{patientName}</CardTitle>
              <p className="text-sm text-muted-foreground">{entry.reason || 'Consultation'}</p>
            </div>
          </div>
          <Link href={`/patients/${entry.patient_id}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              Dossier complet
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Assistant notes banner */}
        {entry.assistant_notes && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-primary mb-1">Notes de l'assistante</p>
                <p className="text-sm">{entry.assistant_notes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="constantes" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Constantes
            </TabsTrigger>
            <TabsTrigger value="motif" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Motif
            </TabsTrigger>
            <TabsTrigger value="historique" className="text-xs">
              <History className="h-3 w-3 mr-1" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="ordonnances" className="text-xs">
              <Pill className="h-3 w-3 mr-1" />
              Traitements
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[200px] mt-3">
            <TabsContent value="constantes" className="mt-0">
              {hasVitals ? (
                <div className="grid grid-cols-2 gap-2">
                  {vitals.systolic_bp && vitals.diastolic_bp && (
                    <VitalItem 
                      icon={Heart} 
                      label="Tension artérielle" 
                      value={vitals.systolic_bp}
                      unit={`/${vitals.diastolic_bp} mmHg`}
                      status="normal"
                    />
                  )}
                  {vitals.heart_rate && (
                    <VitalItem 
                      icon={Activity} 
                      label="Fréquence cardiaque" 
                      value={vitals.heart_rate}
                      unit="bpm"
                      status="normal"
                    />
                  )}
                  {vitals.temperature && (
                    <VitalItem 
                      icon={Thermometer} 
                      label="Température" 
                      value={vitals.temperature}
                      unit="°C"
                      status={getTemperatureStatus(vitals.temperature)}
                    />
                  )}
                  {vitals.weight_kg && (
                    <VitalItem 
                      icon={Scale} 
                      label="Poids" 
                      value={vitals.weight_kg}
                      unit="kg"
                      status="normal"
                    />
                  )}
                  {vitals.height_cm && (
                    <VitalItem 
                      icon={Ruler} 
                      label="Taille" 
                      value={vitals.height_cm}
                      unit="cm"
                      status="normal"
                    />
                  )}
                  {vitals.bmi && (
                    <VitalItem 
                      icon={Scale} 
                      label="IMC" 
                      value={vitals.bmi}
                      unit=""
                      status={getBMIStatus(vitals.bmi)}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Aucune constante enregistrée
                </div>
              )}
            </TabsContent>

            <TabsContent value="motif" className="mt-0">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Motif de consultation</p>
                  <p className="text-sm font-medium">{entry.reason || 'Non spécifié'}</p>
                </div>
                {entry.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{entry.notes}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="historique" className="mt-0">
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Link href={`/patients/${entry.patient_id}`} className="text-primary hover:underline">
                  Voir l'historique complet
                </Link>
              </div>
            </TabsContent>

            <TabsContent value="ordonnances" className="mt-0">
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Link href={`/patients/${entry.patient_id}`} className="text-primary hover:underline">
                  Voir les traitements
                </Link>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Sticky action buttons for doctors */}
        {isDoctor && (
          <>
            <Separator />
            <div className="flex gap-2 pt-2">
              {onPrescribe && (
                <Button onClick={onPrescribe} className="flex-1">
                  <Pill className="h-4 w-4 mr-2" />
                  Prescrire
                </Button>
              )}
              {onExams && (
                <Button onClick={onExams} variant="outline" className="flex-1">
                  <Activity className="h-4 w-4 mr-2" />
                  Examens
                </Button>
              )}
              {onClose && (
                <Button onClick={onClose} variant="secondary">
                  Clôturer
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
