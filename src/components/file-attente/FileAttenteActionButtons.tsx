import { Phone, Play, CheckCircle, UserX, Loader2, Clock, RotateCcw, AlertTriangle, Stethoscope, FlaskConical, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

interface FileAttenteActionButtonsProps {
  status: string;
  priority: number;
  loading?: boolean;
  patientId?: string;
  queueEntryId?: string;
  onCall: () => void;
  onStart: () => void;
  onSendToExam: () => void;
  onReturnFromExam: () => void;
  onComplete: () => void;
  onNoShow: () => void;
  onSetPriority: (priority: number) => void;
  onOpenEncounter?: () => void;
}

export function FileAttenteActionButtons({
  status,
  priority,
  loading = false,
  patientId,
  queueEntryId,
  onCall,
  onStart,
  onSendToExam,
  onReturnFromExam,
  onComplete,
  onNoShow,
  onSetPriority,
  onOpenEncounter,
}: FileAttenteActionButtonsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isUrgent = priority === 2;
  const isCritique = priority === 1;
  const isTerminal = ['completed', 'cancelled', 'no_show'].includes(status);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Présent ou En attente → Appeler en consultation */}
        {(status === 'waiting' || status === 'present') && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCall();
                  }}
                  className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Stethoscope className="h-4 w-4 mr-1" />
                  Consultation
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Appeler en consultation</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendToExam();
                  }}
                  className="h-8 px-2 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                >
                  <FlaskConical className="h-4 w-4 mr-1" />
                  Examen
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Envoyer en examen</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* Appelé → Commencer consultation */}
        {status === 'called' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onStart();
                }}
                className="h-8 px-2 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
              >
                <Play className="h-4 w-4 mr-1" />
                Démarrer
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Démarrer la consultation</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* En consultation → Attente examen ou Terminer */}
        {status === 'in_consultation' && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendToExam();
                  }}
                  className="h-8 px-2 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Examen
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Envoyer pour examen complémentaire</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete();
                  }}
                  className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Terminer
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Terminer la consultation</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* En attente examen → Reprendre consultation ou Terminer */}
        {status === 'awaiting_exam' && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReturnFromExam();
                  }}
                  className="h-8 px-2 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reprendre
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reprendre la consultation après examen</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete();
                  }}
                  className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Terminer
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Terminer la consultation</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* Terminé */}
        {status === 'completed' && (
          <span className="text-xs text-muted-foreground italic">Terminé</span>
        )}

        {/* Absent */}
        {status === 'no_show' && (
          <span className="text-xs text-red-500 italic">Absent</span>
        )}

        {/* Annulé */}
        {status === 'cancelled' && (
          <span className="text-xs text-muted-foreground italic">Annulé</span>
        )}

        {/* Menu d'actions supplémentaires - visible pour les patients actifs */}
        {!isTerminal && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {/* Ouvrir l'épisode */}
              {onOpenEncounter && (
                <>
                  <DropdownMenuItem onClick={onOpenEncounter} className="text-primary font-medium">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Ouvrir l'épisode
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {/* Priority toggles */}
              <DropdownMenuItem
                onClick={() => onSetPriority(isCritique ? 3 : 1)}
                className={isCritique ? 'text-red-600 font-medium' : ''}
              >
                <AlertTriangle className={`h-4 w-4 mr-2 ${isCritique ? 'text-red-600' : ''}`} />
                {isCritique ? '✓ Critique' : 'Marquer critique'}
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => onSetPriority(isUrgent ? 3 : 2)}
                className={isUrgent ? 'text-orange-600 font-medium' : ''}
              >
                <AlertTriangle className={`h-4 w-4 mr-2 ${isUrgent ? 'text-orange-600' : ''}`} />
                {isUrgent ? '✓ Urgent' : 'Marquer urgent'}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* No show */}
              <DropdownMenuItem
                onClick={onNoShow}
                className="text-red-500"
              >
                <UserX className="h-4 w-4 mr-2" />
                Patient absent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </TooltipProvider>
  );
}
