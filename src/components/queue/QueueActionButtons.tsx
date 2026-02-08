"use client";

import { Phone, Play, CheckCircle, XCircle, UserX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canTransition } from '@/lib/patientJourney';
import type { QueueEntry } from '@/lib/queue';

interface QueueActionButtonsProps {
  entry: QueueEntry;
  loading?: boolean;
  onCall: () => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onNoShow: () => void;
  onRequeue?: () => void;
  compact?: boolean;
}

export function QueueActionButtons({
  entry,
  loading = false,
  onCall,
  onStart,
  onComplete,
  onCancel,
  onNoShow,
  onRequeue,
  compact = false,
}: QueueActionButtonsProps) {
  const status = entry.status || 'waiting';

  return (
    <div className={`flex flex-wrap ${compact ? 'gap-1' : 'gap-2'}`}>
      {/* Call Patient - from waiting */}
      {canTransition(status, 'called') && (
        <Button
          size="sm"
          variant="outline"
          onClick={onCall}
          disabled={loading}
          className={`text-blue-600 border-blue-200 hover:bg-blue-50 ${compact ? 'h-8 px-2' : ''}`}
          data-testid="queue-action-call"
        >
          <Phone className={`h-4 w-4 ${compact ? '' : 'mr-1'}`} />
          {!compact && 'Appeler'}
        </Button>
      )}

      {/* Start Consultation - from called */}
      {canTransition(status, 'in_consultation') && (
        <Button
          size="sm"
          variant="outline"
          onClick={onStart}
          disabled={loading}
          className={`text-purple-600 border-purple-200 hover:bg-purple-50 ${compact ? 'h-8 px-2' : ''}`}
          data-testid="queue-action-start"
        >
          <Play className={`h-4 w-4 ${compact ? '' : 'mr-1'}`} />
          {!compact && 'Prendre en charge'}
        </Button>
      )}

      {/* Complete - from in_consultation */}
      {canTransition(status, 'completed') && (
        <Button
          size="sm"
          variant="outline"
          onClick={onComplete}
          disabled={loading}
          className={`text-green-600 border-green-200 hover:bg-green-50 ${compact ? 'h-8 px-2' : ''}`}
          data-testid="queue-action-complete"
        >
          <CheckCircle className={`h-4 w-4 ${compact ? '' : 'mr-1'}`} />
          {!compact && 'Terminer'}
        </Button>
      )}

      {/* No Show - from waiting or called */}
      {canTransition(status, 'no_show') && (
        <Button
          size="sm"
          variant="outline"
          onClick={onNoShow}
          disabled={loading}
          className={`text-red-600 border-red-200 hover:bg-red-50 ${compact ? 'h-8 px-2' : ''}`}
          data-testid="queue-action-noshow"
        >
          <UserX className={`h-4 w-4 ${compact ? '' : 'mr-1'}`} />
          {!compact && 'Absent'}
        </Button>
      )}

      {/* Cancel - from waiting, called, or in_consultation */}
      {canTransition(status, 'cancelled') && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
          className={`text-muted-foreground hover:text-destructive ${compact ? 'h-8 px-2' : ''}`}
          data-testid="queue-action-cancel"
        >
          <XCircle className={`h-4 w-4 ${compact ? '' : 'mr-1'}`} />
          {!compact && 'Annuler'}
        </Button>
      )}

      {/* Requeue - from no_show only */}
      {status === 'no_show' && onRequeue && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRequeue}
          disabled={loading}
          className={`text-orange-600 border-orange-200 hover:bg-orange-50 ${compact ? 'h-8 px-2' : ''}`}
          data-testid="queue-action-requeue"
        >
          <RotateCcw className={`h-4 w-4 ${compact ? '' : 'mr-1'}`} />
          {!compact && 'Remettre en file'}
        </Button>
      )}
    </div>
  );
}
