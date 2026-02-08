import { useState, useEffect, useCallback } from 'react';
import { useStructureId } from '@/hooks/useStructureId';
import {
  StructureSettings,
  OpeningHours,
  PractitionerSchedule,
  PractitionerAbsence,
  QueuePriorityLevel,
  AdminDashboardStats,
  fetchStructureSettings,
  upsertStructureSettings,
  fetchOpeningHours,
  upsertOpeningHours,
  fetchPriorityLevels,
  updatePriorityLevel,
  fetchPractitionerSchedules,
  createPractitionerSchedule,
  deletePractitionerSchedule,
  fetchPractitionerAbsences,
  createPractitionerAbsence,
  deletePractitionerAbsence,
  fetchAdminDashboardStats,
  uploadStructureLogo,
  notifyPatientsForAbsence,
} from '@/lib/structureAdmin';
import { toast } from 'sonner';
import { useTeamMembers } from '@/hooks/useTeamMembers';

export function useStructureSettings() {
  const { structureId, loading: structureLoading } = useStructureId();
  const [settings, setSettings] = useState<StructureSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!structureId) return;
    setLoading(true);
    try {
      const data = await fetchStructureSettings(structureId);
      setSettings(data);
    } catch (error) {
      console.error('Error fetching structure settings:', error);
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => {
    if (!structureLoading && structureId) {
      refetch();
    }
  }, [structureId, structureLoading, refetch]);

  const saveSettings = useCallback(
    async (updates: Partial<StructureSettings>) => {
      if (!structureId) return;
      try {
        const updated = await upsertStructureSettings(structureId, updates);
        setSettings(updated);
        toast.success('Paramètres enregistrés');
      } catch (error) {
        console.error('Error saving structure settings:', error);
        toast.error('Erreur lors de l\'enregistrement');
        throw error;
      }
    },
    [structureId]
  );

  const uploadLogo = useCallback(
    async (file: File) => {
      if (!structureId) return;
      try {
        const logoUrl = await uploadStructureLogo(structureId, file);
        await saveSettings({ logo_url: logoUrl });
        toast.success('Logo téléchargé');
        return logoUrl;
      } catch (error) {
        console.error('Error uploading logo:', error);
        toast.error('Erreur lors du téléchargement du logo');
        throw error;
      }
    },
    [structureId, saveSettings]
  );

  return {
    settings,
    loading: loading || structureLoading,
    saveSettings,
    uploadLogo,
    refetch,
  };
}

export function useOpeningHours() {
  const { structureId, loading: structureLoading } = useStructureId();
  const [hours, setHours] = useState<OpeningHours[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!structureId) return;
    setLoading(true);
    try {
      const data = await fetchOpeningHours(structureId);
      setHours(data);
    } catch (error) {
      console.error('Error fetching opening hours:', error);
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => {
    if (!structureLoading && structureId) {
      refetch();
    }
  }, [structureId, structureLoading, refetch]);

  const saveHours = useCallback(
    async (dayOfWeek: number, updates: Partial<OpeningHours>) => {
      if (!structureId) return;
      try {
        await upsertOpeningHours(structureId, dayOfWeek, updates);
        await refetch();
        toast.success('Horaires enregistrés');
      } catch (error) {
        console.error('Error saving opening hours:', error);
        toast.error('Erreur lors de l\'enregistrement');
        throw error;
      }
    },
    [structureId, refetch]
  );

  return {
    hours,
    loading: loading || structureLoading,
    saveHours,
    refetch,
  };
}

export function usePriorityLevels() {
  const { structureId, loading: structureLoading } = useStructureId();
  const [levels, setLevels] = useState<QueuePriorityLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!structureId) return;
    setLoading(true);
    try {
      const data = await fetchPriorityLevels(structureId);
      setLevels(data);
    } catch (error) {
      console.error('Error fetching priority levels:', error);
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => {
    if (!structureLoading && structureId) {
      refetch();
    }
  }, [structureId, structureLoading, refetch]);

  const updateLevel = useCallback(
    async (id: string, updates: Partial<QueuePriorityLevel>) => {
      try {
        await updatePriorityLevel(id, updates);
        await refetch();
        toast.success('Niveau de priorité mis à jour');
      } catch (error) {
        console.error('Error updating priority level:', error);
        toast.error('Erreur lors de la mise à jour');
        throw error;
      }
    },
    [refetch]
  );

  return {
    levels,
    loading: loading || structureLoading,
    updateLevel,
    refetch,
  };
}

export function usePractitionerSchedules() {
  const { structureId, loading: structureLoading } = useStructureId();
  const [schedules, setSchedules] = useState<PractitionerSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!structureId) return;
    setLoading(true);
    try {
      const data = await fetchPractitionerSchedules(structureId);
      setSchedules(data);
    } catch (error) {
      console.error('Error fetching practitioner schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => {
    if (!structureLoading && structureId) {
      refetch();
    }
  }, [structureId, structureLoading, refetch]);

  const addSchedule = useCallback(
    async (schedule: Omit<PractitionerSchedule, 'id' | 'structure_id' | 'is_active'>) => {
      if (!structureId) return;
      try {
        await createPractitionerSchedule(structureId, schedule);
        await refetch();
        toast.success('Créneau ajouté');
      } catch (error) {
        console.error('Error adding schedule:', error);
        toast.error('Erreur lors de l\'ajout');
        throw error;
      }
    },
    [structureId, refetch]
  );

  const removeSchedule = useCallback(
    async (id: string) => {
      try {
        await deletePractitionerSchedule(id);
        await refetch();
        toast.success('Créneau supprimé');
      } catch (error) {
        console.error('Error removing schedule:', error);
        toast.error('Erreur lors de la suppression');
        throw error;
      }
    },
    [refetch]
  );

  return {
    schedules,
    loading: loading || structureLoading,
    addSchedule,
    removeSchedule,
    refetch,
  };
}

export function usePractitionerAbsences() {
  const { structureId, loading: structureLoading } = useStructureId();
  const [absences, setAbsences] = useState<PractitionerAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const { teamMembers } = useTeamMembers();

  const refetch = useCallback(async () => {
    if (!structureId) return;
    setLoading(true);
    try {
      const data = await fetchPractitionerAbsences(structureId);
      setAbsences(data);
    } catch (error) {
      console.error('Error fetching practitioner absences:', error);
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => {
    if (!structureLoading && structureId) {
      refetch();
    }
  }, [structureId, structureLoading, refetch]);

  const addAbsence = useCallback(
    async (absence: Omit<PractitionerAbsence, 'id' | 'structure_id' | 'created_at' | 'created_by'>) => {
      if (!structureId) return;
      try {
        await createPractitionerAbsence(structureId, absence);
        await refetch();
        
        // Find practitioner name for notification
        const practitioner = teamMembers.find(m => m.id === absence.team_member_id);
        const practitionerName = practitioner?.profile 
          ? `${practitioner.profile.first_name || ''} ${practitioner.profile.last_name || ''}`.trim()
          : 'Un praticien';
        
        // Notify affected patients
        const notifiedCount = await notifyPatientsForAbsence(
          structureId,
          absence.team_member_id,
          absence.start_date,
          absence.end_date,
          practitionerName
        );
        
        if (notifiedCount > 0) {
          toast.success(`Absence enregistrée - ${notifiedCount} patient(s) notifié(s)`);
        } else {
          toast.success('Absence enregistrée');
        }
      } catch (error) {
        console.error('Error adding absence:', error);
        toast.error('Erreur lors de l\'enregistrement');
        throw error;
      }
    },
    [structureId, refetch, teamMembers]
  );

  const removeAbsence = useCallback(
    async (id: string) => {
      try {
        await deletePractitionerAbsence(id);
        await refetch();
        toast.success('Absence supprimée');
      } catch (error) {
        console.error('Error removing absence:', error);
        toast.error('Erreur lors de la suppression');
        throw error;
      }
    },
    [refetch]
  );

  return {
    absences,
    loading: loading || structureLoading,
    addAbsence,
    removeAbsence,
    refetch,
  };
}

export function useAdminDashboardStats() {
  const { structureId, loading: structureLoading } = useStructureId();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!structureId) return;
    setLoading(true);
    try {
      const data = await fetchAdminDashboardStats(structureId);
      setStats(data);
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => {
    if (!structureLoading && structureId) {
      refetch();
    }
  }, [structureId, structureLoading, refetch]);

  return {
    stats,
    loading: loading || structureLoading,
    refetch,
  };
}
