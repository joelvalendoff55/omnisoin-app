import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useOpeningHours } from '@/hooks/useStructureAdmin';
import { DAY_LABELS } from '@/lib/structureAdmin';
import { Clock, Save } from 'lucide-react';

interface DayHours {
  is_closed: boolean;
  open_time: string;
  close_time: string;
  break_start: string;
  break_end: string;
}

export function OpeningHoursSection() {
  const { hours, loading, saveHours } = useOpeningHours();
  const [localHours, setLocalHours] = useState<Record<number, DayHours>>({});
  const [saving, setSaving] = useState<number | null>(null);

  // Initialize local state from fetched hours
  useEffect(() => {
    const hoursMap: Record<number, DayHours> = {};
    
    // Initialize all days
    for (let i = 0; i < 7; i++) {
      hoursMap[i] = {
        is_closed: i === 0, // Sunday closed by default
        open_time: '08:00',
        close_time: '18:00',
        break_start: '12:00',
        break_end: '14:00',
      };
    }

    // Update with fetched data
    hours.forEach((h) => {
      hoursMap[h.day_of_week] = {
        is_closed: h.is_closed,
        open_time: h.open_time || '08:00',
        close_time: h.close_time || '18:00',
        break_start: h.break_start || '',
        break_end: h.break_end || '',
      };
    });

    setLocalHours(hoursMap);
  }, [hours]);

  const handleSaveDay = async (dayOfWeek: number) => {
    const dayHours = localHours[dayOfWeek];
    if (!dayHours) return;

    setSaving(dayOfWeek);
    try {
      await saveHours(dayOfWeek, {
        is_closed: dayHours.is_closed,
        open_time: dayHours.is_closed ? null : dayHours.open_time,
        close_time: dayHours.is_closed ? null : dayHours.close_time,
        break_start: dayHours.break_start || null,
        break_end: dayHours.break_end || null,
      });
    } finally {
      setSaving(null);
    }
  };

  const updateDayHours = (dayOfWeek: number, updates: Partial<DayHours>) => {
    setLocalHours((prev) => ({
      ...prev,
      [dayOfWeek]: { ...prev[dayOfWeek], ...updates },
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Reorder days: Monday first
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horaires d'ouverture
        </CardTitle>
        <CardDescription>Définissez les horaires d'ouverture de la structure</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orderedDays.map((dayOfWeek) => {
            const dayHours = localHours[dayOfWeek];
            if (!dayHours) return null;

            return (
              <div
                key={dayOfWeek}
                className="flex flex-wrap items-center gap-4 p-3 rounded-lg border bg-card"
              >
                <div className="w-24 font-medium">{DAY_LABELS[dayOfWeek]}</div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!dayHours.is_closed}
                    onCheckedChange={(checked) => updateDayHours(dayOfWeek, { is_closed: !checked })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {dayHours.is_closed ? 'Fermé' : 'Ouvert'}
                  </span>
                </div>

                {!dayHours.is_closed && (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={dayHours.open_time}
                        onChange={(e) => updateDayHours(dayOfWeek, { open_time: e.target.value })}
                        className="w-28"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={dayHours.close_time}
                        onChange={(e) => updateDayHours(dayOfWeek, { close_time: e.target.value })}
                        className="w-28"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Pause:</span>
                      <Input
                        type="time"
                        value={dayHours.break_start}
                        onChange={(e) => updateDayHours(dayOfWeek, { break_start: e.target.value })}
                        className="w-24"
                        placeholder="--:--"
                      />
                      <span>-</span>
                      <Input
                        type="time"
                        value={dayHours.break_end}
                        onChange={(e) => updateDayHours(dayOfWeek, { break_end: e.target.value })}
                        className="w-24"
                        placeholder="--:--"
                      />
                    </div>
                  </>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSaveDay(dayOfWeek)}
                  disabled={saving === dayOfWeek}
                  className="ml-auto"
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
