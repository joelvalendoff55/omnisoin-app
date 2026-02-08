"use client";

import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface CopyToClipboardProps {
  text: string;
  label?: string;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
  showLabel?: boolean;
  icon?: React.ReactNode;
}

export function CopyToClipboard({
  text,
  label = 'Copier',
  variant = 'outline',
  size = 'sm',
  className = '',
  showLabel = true,
  icon,
}: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copié dans le presse-papier');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Erreur lors de la copie');
    }
  };

  if (size === 'icon') {
    return (
      <Button
        variant={variant}
        size="icon"
        className={className}
        onClick={handleCopy}
        title={label}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-2 ${className}`}
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        icon || <Copy className="h-4 w-4" />
      )}
      {showLabel && (copied ? 'Copié !' : label)}
    </Button>
  );
}
