import { Clock, Users, CheckCircle, Timer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface QueueStatsProps {
  waiting: number;
  inProgress: number;
  completedToday: number;
  averageWaitTime: number;
}

export function QueueStats({
  waiting,
  inProgress,
  completedToday,
  averageWaitTime,
}: QueueStatsProps) {
  const stats = [
    {
      label: 'En attente',
      value: waiting,
      icon: Users,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      label: 'En cours',
      value: inProgress,
      icon: Timer,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Terminés aujourd\'hui',
      value: completedToday,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Attente moyenne',
      value: `${averageWaitTime} min`,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
