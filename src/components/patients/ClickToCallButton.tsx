import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Phone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ClickToCallButtonProps {
  phoneNumber: string;
  patientName?: string;
  patientId?: string;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export function ClickToCallButton({
  phoneNumber,
  patientName,
  patientId,
  size = 'icon',
  variant = 'ghost',
  className = '',
}: ClickToCallButtonProps) {
  const [calling, setCalling] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!phoneNumber) {
      toast.error('Aucun numéro de téléphone');
      return;
    }

    setCalling(true);
    try {
      // Call the 3CX edge function to initiate the call
      const { data, error } = await supabase.functions.invoke('initiate-3cx-call', {
        body: {
          phoneNumber: phoneNumber.replace(/\s/g, ''),
          patientId,
          patientName,
        },
      });

      if (error) {
        // Check if function doesn't exist
        if (error.message?.includes('not found') || error.message?.includes('404')) {
          // Fallback to tel: protocol
          window.location.href = `tel:${phoneNumber.replace(/\s/g, '')}`;
          toast.info('Click-to-call', {
            description: '3CX non configuré - Utilisation du protocole tel:',
          });
          return;
        }
        throw error;
      }

      if (data?.success) {
        toast.success('Appel initié', {
          description: `Appel vers ${patientName || phoneNumber}`,
        });
      } else {
        // Fallback to tel: protocol
        window.location.href = `tel:${phoneNumber.replace(/\s/g, '')}`;
        toast.info('Click-to-call', {
          description: data?.message || '3CX non disponible - Utilisation du protocole tel:',
        });
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      // Fallback to tel: protocol
      window.location.href = `tel:${phoneNumber.replace(/\s/g, '')}`;
      toast.info('Click-to-call', {
        description: 'Utilisation du protocole tel:',
      });
    } finally {
      setCalling(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format French phone numbers nicely
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={calling}
            className={`text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 ${className}`}
          >
            {calling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Appeler {formatPhoneNumber(phoneNumber)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
