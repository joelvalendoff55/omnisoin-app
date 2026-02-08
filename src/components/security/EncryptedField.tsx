"use client";

import React, { useState, useCallback } from 'react';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataAccessJustification } from './DataAccessJustification';
import { logDataAccess, SensitivityLevel, DataAccessAction, SENSITIVITY_COLORS, SENSITIVITY_LABELS } from '@/lib/dataAccess';
import { cn } from '@/lib/utils';

interface EncryptedFieldProps {
  value: string | null | undefined;
  tableName: string;
  fieldName: string;
  resourceId: string;
  sensitivityLevel?: SensitivityLevel;
  requiresJustification?: boolean;
  actionType?: DataAccessAction;
  showSensitivityBadge?: boolean;
  className?: string;
  children?: React.ReactNode;
  onAccess?: () => void;
}

export function EncryptedField({
  value,
  tableName,
  fieldName,
  resourceId,
  sensitivityLevel = 'high',
  requiresJustification = true,
  actionType = 'read',
  showSensitivityBadge = true,
  className,
  children,
  onAccess,
}: EncryptedFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showJustificationDialog, setShowJustificationDialog] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);

  const handleRevealClick = useCallback(() => {
    if (!requiresJustification || accessGranted) {
      setIsRevealed(!isRevealed);
      return;
    }
    
    setShowJustificationDialog(true);
  }, [requiresJustification, accessGranted, isRevealed]);

  const handleJustificationConfirm = useCallback(async (reason: string, category: string) => {
    // Log the access
    await logDataAccess(
      tableName,
      resourceId,
      actionType,
      [fieldName],
      reason,
      category
    );
    
    setAccessGranted(true);
    setIsRevealed(true);
    onAccess?.();
  }, [tableName, resourceId, actionType, fieldName, onAccess]);

  const displayValue = value ?? '—';
  const maskedValue = '••••••••••••';

  return (
    <TooltipProvider>
      <div className={cn('relative group', className)}>
        {/* Field content */}
        <div className="flex items-center gap-2">
          {/* Lock icon */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="shrink-0">
                <Shield 
                  className={cn(
                    'h-4 w-4',
                    accessGranted ? 'text-green-500' : 'text-amber-500'
                  )} 
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {accessGranted 
                  ? 'Accès autorisé et enregistré' 
                  : 'Champ protégé - justification requise'}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Value or children */}
          <div className="flex-1 min-w-0">
            {isRevealed ? (
              children ?? <span className="break-words">{displayValue}</span>
            ) : (
              <span className="text-muted-foreground font-mono text-sm">
                {maskedValue}
              </span>
            )}
          </div>

          {/* Sensitivity badge */}
          {showSensitivityBadge && !isRevealed && (
            <Badge 
              variant="outline" 
              className={cn('shrink-0 text-xs', SENSITIVITY_COLORS[sensitivityLevel])}
            >
              <Lock className="h-3 w-3 mr-1" />
              {SENSITIVITY_LABELS[sensitivityLevel]}
            </Badge>
          )}

          {/* Reveal button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={handleRevealClick}
          >
            {isRevealed ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Justification dialog */}
        <DataAccessJustification
          open={showJustificationDialog}
          onOpenChange={setShowJustificationDialog}
          onConfirm={handleJustificationConfirm}
          resourceType={tableName}
          fieldName={fieldName}
          sensitivityLevel={sensitivityLevel}
          actionType={actionType}
        />
      </div>
    </TooltipProvider>
  );
}
