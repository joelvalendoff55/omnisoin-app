"use client";

import { useState, useEffect } from 'react';
import { Bell, BellOff, AlertTriangle, Check, RefreshCw, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  getThresholdConfig,
  saveThresholdConfig,
  calculateReversionRate,
  checkAndAlertReversionRate,
  OCRReversionAlertConfig,
} from '@/lib/ocrReversionAlerts';

interface OCRAlertConfigCardProps {
  structureId: string;
}

export function OCRAlertConfigCard({ structureId }: OCRAlertConfigCardProps) {
  const [config, setConfig] = useState<OCRReversionAlertConfig>({ threshold: 20, enabled: true });
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load config and current rate
  useEffect(() => {
    if (!structureId) return;
    
    const savedConfig = getThresholdConfig(structureId);
    setConfig(savedConfig);
    
    // Fetch current rate
    calculateReversionRate(structureId).then(({ rate }) => {
      setCurrentRate(rate);
    });
  }, [structureId]);

  const handleSave = () => {
    setSaving(true);
    saveThresholdConfig(structureId, config);
    
    setTimeout(() => {
      setSaving(false);
      toast.success('Configuration sauvegardée');
    }, 300);
  };

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      const result = await checkAndAlertReversionRate(structureId);
      setCurrentRate(result.rate);
      
      if (result.alertSent) {
        toast.warning('Alerte envoyée aux administrateurs', {
          description: `Taux actuel: ${result.rate.toFixed(1)}%`,
        });
      } else if (result.rate > config.threshold) {
        toast.info('Seuil dépassé mais alerte déjà envoyée récemment', {
          description: 'Les alertes sont limitées à une par jour.',
        });
      } else {
        toast.success('Taux d\'annulation dans les limites', {
          description: `Taux actuel: ${result.rate.toFixed(1)}% (seuil: ${config.threshold}%)`,
        });
      }
    } catch (err) {
      console.error('Check error:', err);
      toast.error('Erreur lors de la vérification');
    } finally {
      setChecking(false);
    }
  };

  const isOverThreshold = currentRate !== null && currentRate > config.threshold;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Alertes taux d'annulation
        </CardTitle>
        <CardDescription>
          Configurez les alertes automatiques pour le suivi qualité OCR
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Rate Display */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm font-medium">Taux actuel (30 jours)</p>
            <p className="text-xs text-muted-foreground">
              Imports annulés / Total imports
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentRate !== null ? (
              <>
                <span className={`text-2xl font-bold ${isOverThreshold ? 'text-destructive' : 'text-green-600'}`}>
                  {currentRate.toFixed(1)}%
                </span>
                {isOverThreshold ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <Check className="h-5 w-5 text-green-600" />
                )}
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>

        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.enabled ? (
              <Bell className="h-4 w-4 text-primary" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="alert-enabled" className="cursor-pointer">
              Alertes automatiques
            </Label>
          </div>
          <Switch
            id="alert-enabled"
            checked={config.enabled}
            onCheckedChange={(enabled) => setConfig(prev => ({ ...prev, enabled }))}
          />
        </div>

        {/* Threshold Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Seuil d'alerte</Label>
            <Badge variant={config.threshold <= 10 ? 'default' : config.threshold <= 25 ? 'secondary' : 'destructive'}>
              {config.threshold}%
            </Badge>
          </div>
          <Slider
            value={[config.threshold]}
            onValueChange={([value]) => setConfig(prev => ({ ...prev, threshold: value }))}
            min={5}
            max={50}
            step={5}
            disabled={!config.enabled}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Strict (5%)</span>
            <span>Tolérant (50%)</span>
          </div>
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          Une notification sera envoyée aux administrateurs si le taux d'annulation dépasse {config.threshold}% sur les 30 derniers jours. Maximum une alerte par jour.
        </p>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCheckNow}
            disabled={checking}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            Vérifier maintenant
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Sauvegarder
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
