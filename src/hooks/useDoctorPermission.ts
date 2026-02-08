"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStructureId } from '@/hooks/useStructureId';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';

/**
 * Hook to check if the current user is a doctor (practitioner with specialty)
 * Only doctors (role='practitioner' AND specialty IS NOT NULL) can:
 * - Close patient files
 * - Prescribe medications
 * - Order examinations
 */
export function useDoctorPermission() {
  const { user } = useAuth();
  const { isPractitioner, loading: roleLoading } = useRole();
  const { structureId, loading: structureLoading } = useStructureId();
  const [hasSpecialty, setHasSpecialty] = useState(false);
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkDoctorStatus = async () => {
      if (!user || !structureId || structureLoading || roleLoading) {
        return;
      }

      if (!isPractitioner) {
        setHasSpecialty(false);
        setSpecialty(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('team_members')
          .select('specialty, job_title')
          .eq('user_id', user.id)
          .eq('structure_id', structureId)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error('Error checking doctor status:', error);
          setHasSpecialty(false);
          setSpecialty(null);
        } else if (data) {
          // Must be a "medecin" with a specialty
          const isDoctor = data.job_title === 'medecin' && data.specialty !== null;
          setHasSpecialty(isDoctor);
          setSpecialty(data.specialty);
        } else {
          setHasSpecialty(false);
          setSpecialty(null);
        }
      } catch (err) {
        console.error('Error in useDoctorPermission:', err);
        setHasSpecialty(false);
        setSpecialty(null);
      } finally {
        setLoading(false);
      }
    };

    checkDoctorStatus();
  }, [user, structureId, isPractitioner, structureLoading, roleLoading]);

  const isDoctor = useMemo(() => {
    return isPractitioner && hasSpecialty;
  }, [isPractitioner, hasSpecialty]);

  return {
    isDoctor,
    isPractitioner,
    specialty,
    loading: loading || roleLoading || structureLoading,
    // Specific permissions
    canClosePatientFile: isDoctor,
    canPrescribe: isDoctor,
    canOrderExams: isDoctor,
  };
}
