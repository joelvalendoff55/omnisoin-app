"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePriorityLevels } from '@/hooks/useStructureAdmin';
import { Flag, Save } from 'lucide-react';

export function PriorityLevelsSection() {
  const { levels, loading, updateLevel } = usePriorityLevels();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ label: '', description: '', color: '' });
  const [saving, setSaving] = useState(false);

  const handleEdit = (level: typeof levels[0]) => {
    setEditingId(level.id);
    setEditData({
      label: level.label,
      description: level.description || '',
      color: level.color || '#6B7280',
    });
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      await updateLevel(id, editData);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateLevel(id, { is_active: isActive });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Niveaux de priorité
        </CardTitle>
        <CardDescription>Personnalisez les niveaux de priorité de la file d'attente</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {levels.map((level) => (
            <div
              key={level.id}
              className="flex flex-wrap items-center gap-4 p-4 rounded-lg border bg-card"
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: level.color || '#6B7280' }}
              />

              {editingId === level.id ? (
                <>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={editData.label}
                        onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                        placeholder="Libellé"
                        className="flex-1"
                      />
                      <Input
                        type="color"
                        value={editData.color}
                        onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                        className="w-16"
                      />
                    </div>
                    <Input
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      placeholder="Description"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(level.id)} disabled={saving}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Annuler
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Niveau {level.level}</Badge>
                      <span className="font-medium">{level.label}</span>
                    </div>
                    {level.description && (
                      <p className="text-sm text-muted-foreground mt-1">{level.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={level.is_active}
                        onCheckedChange={(checked) => handleToggleActive(level.id, checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {level.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(level)}>
                      Modifier
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
