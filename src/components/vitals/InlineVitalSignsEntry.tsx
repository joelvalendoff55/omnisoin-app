import { useState, useEffect, useCallback } from 'react';
import { Activity, Heart, Thermometer, Droplets, Check, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getTemperatureStatus } from '@/lib/vitalSigns';

export interface InlineVitalSignsData {
  temperature_celsius: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  heart_rate: number | null;
  spo2: number | null;
}

interface InlineVitalSignsEntryProps {
  initialData?: Partial<InlineVitalSignsData>;
  onChange: (data: InlineVitalSignsData) => void;
  onSave?: () => void;
  readOnly?: boolean;
  compact?: boolean;
}

function getSpO2Status(spo2: number | null): { color: string; label: string } | null {
  if (spo2 === null) return null;
  if (spo2 >= 95) return { color: 'text-green-600', label: 'Normal' };
  if (spo2 >= 90) return { color: 'text-orange-600', label: 'Hypoxie légère' };
  return { color: 'text-red-600', label: 'Hypoxie sévère' };
}

function getBPStatus(systolic: number | null, diastolic: number | null): { color: string; label: string } | null {
  if (systolic === null || diastolic === null) return null;
  if (systolic < 90 || diastolic < 60) return { color: 'text-blue-600', label: 'Hypotension' };
  if (systolic <= 120 && diastolic <= 80) return { color: 'text-green-600', label: 'Normal' };
  if (systolic <= 139 || diastolic <= 89) return { color: 'text-orange-600', label: 'Pré-HTA' };
  return { color: 'text-red-600', label: 'HTA' };
}

function getHRStatus(hr: number | null): { color: string; label: string } | null {
  if (hr === null) return null;
  if (hr < 60) return { color: 'text-blue-600', label: 'Bradycardie' };
  if (hr <= 100) return { color: 'text-green-600', label: 'Normal' };
  return { color: 'text-red-600', label: 'Tachycardie' };
}

export function InlineVitalSignsEntry({
  initialData,
  onChange,
  onSave,
  readOnly = false,
  compact = false,
}: InlineVitalSignsEntryProps) {
  const [temperature, setTemperature] = useState<string>(
    initialData?.temperature_celsius?.toString() || ''
  );
  const [systolic, setSystolic] = useState<string>(
    initialData?.systolic_bp?.toString() || ''
  );
  const [diastolic, setDiastolic] = useState<string>(
    initialData?.diastolic_bp?.toString() || ''
  );
  const [heartRate, setHeartRate] = useState<string>(
    initialData?.heart_rate?.toString() || ''
  );
  const [spo2, setSpo2] = useState<string>(
    initialData?.spo2?.toString() || ''
  );

  const hasAnyValue = temperature || systolic || diastolic || heartRate || spo2;

  const buildData = useCallback((): InlineVitalSignsData => ({
    temperature_celsius: temperature ? parseFloat(temperature) : null,
    systolic_bp: systolic ? parseInt(systolic, 10) : null,
    diastolic_bp: diastolic ? parseInt(diastolic, 10) : null,
    heart_rate: heartRate ? parseInt(heartRate, 10) : null,
    spo2: spo2 ? parseInt(spo2, 10) : null,
  }), [temperature, systolic, diastolic, heartRate, spo2]);

  useEffect(() => {
    onChange(buildData());
  }, [buildData, onChange]);

  // Status calculations
  const tempValue = temperature ? parseFloat(temperature) : null;
  const tempStatus = getTemperatureStatus(tempValue);
  const bpStatus = getBPStatus(
    systolic ? parseInt(systolic) : null,
    diastolic ? parseInt(diastolic) : null
  );
  const hrStatus = getHRStatus(heartRate ? parseInt(heartRate) : null);
  const spo2Status = getSpO2Status(spo2 ? parseInt(spo2) : null);

  if (readOnly) {
    return (
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
        {!hasAnyValue ? (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            Non renseignées
          </Badge>
        ) : (
          <>
            {tempValue && (
              <div className="flex items-center gap-1.5">
                <Thermometer className="h-4 w-4 text-amber-500" />
                <span className={cn('font-medium text-sm', tempStatus?.color?.split(' ')[0])}>
                  {tempValue}°C
                </span>
              </div>
            )}
            {systolic && diastolic && (
              <div className="flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-red-500" />
                <span className={cn('font-medium text-sm', bpStatus?.color)}>
                  {systolic}/{diastolic}
                </span>
              </div>
            )}
            {heartRate && (
              <div className="flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-pink-500" />
                <span className={cn('font-medium text-sm', hrStatus?.color)}>
                  {heartRate} bpm
                </span>
              </div>
            )}
            {spo2 && (
              <div className="flex items-center gap-1.5">
                <Droplets className="h-4 w-4 text-sky-500" />
                <span className={cn('font-medium text-sm', spo2Status?.color)}>
                  {spo2}%
                </span>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg border",
      compact && "p-2 gap-1.5"
    )}>
      {/* Badge when empty */}
      {!hasAnyValue && (
        <Badge variant="outline" className="gap-1 text-muted-foreground mr-2">
          <AlertCircle className="h-3 w-3" />
          Non renseignées
        </Badge>
      )}

      {/* Temperature */}
      <div className="flex items-center gap-1">
        <Thermometer className={cn(
          "h-4 w-4",
          tempStatus?.category === 'fever' ? 'text-red-500' :
          tempStatus?.category === 'subfever' ? 'text-orange-500' :
          tempStatus?.category === 'hypothermia' ? 'text-blue-500' :
          'text-amber-500'
        )} />
        <Input
          type="number"
          step="0.1"
          min="32"
          max="43"
          placeholder="T°"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          className={cn(
            "w-16 h-8 text-sm text-center px-1",
            tempStatus?.category === 'fever' && 'border-red-300 bg-red-50',
            tempStatus?.category === 'subfever' && 'border-orange-300 bg-orange-50',
            tempStatus?.category === 'hypothermia' && 'border-blue-300 bg-blue-50'
          )}
        />
        <span className="text-xs text-muted-foreground">°C</span>
      </div>

      <span className="text-muted-foreground/30">|</span>

      {/* Blood Pressure */}
      <div className="flex items-center gap-1">
        <Heart className={cn(
          "h-4 w-4",
          bpStatus?.color?.includes('red') ? 'text-red-500' :
          bpStatus?.color?.includes('orange') ? 'text-orange-500' :
          bpStatus?.color?.includes('blue') ? 'text-blue-500' :
          'text-red-500'
        )} />
        <Input
          type="number"
          min="60"
          max="250"
          placeholder="Sys"
          value={systolic}
          onChange={(e) => setSystolic(e.target.value)}
          className={cn(
            "w-14 h-8 text-sm text-center px-1",
            bpStatus?.label === 'HTA' && 'border-red-300 bg-red-50',
            bpStatus?.label === 'Hypotension' && 'border-blue-300 bg-blue-50'
          )}
        />
        <span className="text-muted-foreground">/</span>
        <Input
          type="number"
          min="40"
          max="150"
          placeholder="Dia"
          value={diastolic}
          onChange={(e) => setDiastolic(e.target.value)}
          className={cn(
            "w-14 h-8 text-sm text-center px-1",
            bpStatus?.label === 'HTA' && 'border-red-300 bg-red-50',
            bpStatus?.label === 'Hypotension' && 'border-blue-300 bg-blue-50'
          )}
        />
      </div>

      <span className="text-muted-foreground/30">|</span>

      {/* Heart Rate */}
      <div className="flex items-center gap-1">
        <Activity className={cn(
          "h-4 w-4",
          hrStatus?.color?.includes('red') ? 'text-red-500' :
          hrStatus?.color?.includes('blue') ? 'text-blue-500' :
          'text-pink-500'
        )} />
        <Input
          type="number"
          min="30"
          max="250"
          placeholder="FC"
          value={heartRate}
          onChange={(e) => setHeartRate(e.target.value)}
          className={cn(
            "w-14 h-8 text-sm text-center px-1",
            hrStatus?.label === 'Tachycardie' && 'border-red-300 bg-red-50',
            hrStatus?.label === 'Bradycardie' && 'border-blue-300 bg-blue-50'
          )}
        />
        <span className="text-xs text-muted-foreground">bpm</span>
      </div>

      <span className="text-muted-foreground/30">|</span>

      {/* SpO2 */}
      <div className="flex items-center gap-1">
        <Droplets className={cn(
          "h-4 w-4",
          spo2Status?.color?.includes('red') ? 'text-red-500' :
          spo2Status?.color?.includes('orange') ? 'text-orange-500' :
          'text-sky-500'
        )} />
        <Input
          type="number"
          min="70"
          max="100"
          placeholder="SpO₂"
          value={spo2}
          onChange={(e) => setSpo2(e.target.value)}
          className={cn(
            "w-14 h-8 text-sm text-center px-1",
            spo2Status?.label === 'Hypoxie sévère' && 'border-red-300 bg-red-50',
            spo2Status?.label === 'Hypoxie légère' && 'border-orange-300 bg-orange-50'
          )}
        />
        <span className="text-xs text-muted-foreground">%</span>
      </div>

      {/* Save button */}
      {onSave && hasAnyValue && (
        <>
          <span className="text-muted-foreground/30">|</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onSave}
            className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Check className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
