import Link from "next/link";
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface DashboardKPICardProps {
  testId: string;
  title: string;
  value: number;
  icon: LucideIcon;
  href: string;
  loading?: boolean;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'destructive';
}

const colorClasses = {
  primary: 'text-primary bg-primary/10',
  accent: 'text-accent bg-accent/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  destructive: 'text-destructive bg-destructive/10',
};

export default function DashboardKPICard({
  testId,
  title,
  value,
  icon: Icon,
  href,
  loading,
  color = 'primary',
}: DashboardKPICardProps) {
  return (
    <Link href={href}>
      <Card
        data-testid={testId}
        className="hover:shadow-md transition-all cursor-pointer hover:border-primary/30 group"
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {value}
                </p>
              )}
            </div>
            <div className={cn('p-3 rounded-xl', colorClasses[color])}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
