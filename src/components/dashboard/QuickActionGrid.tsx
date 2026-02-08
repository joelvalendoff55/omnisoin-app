"use client";

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface QuickActionGridProps {
  actions: QuickAction[];
  columns?: 2 | 3 | 4;
}

export function QuickActionGrid({ actions, columns = 4 }: QuickActionGridProps) {
  return (
    <div className={cn(
      "grid gap-3",
      columns === 2 && "grid-cols-2",
      columns === 3 && "grid-cols-3",
      columns === 4 && "grid-cols-2 md:grid-cols-4"
    )}>
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          disabled={action.disabled}
          className={cn(
            "quick-action",
            action.disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="quick-action-icon">
            {action.icon}
          </div>
          <span className="text-xs font-medium text-center">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
