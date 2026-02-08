import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrgRole } from '@/hooks/useOrgRole';
import { useStructureId } from '@/hooks/useStructureId';
import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { Patient } from '@/types/patient';

interface AdminPatientContextType {
  isAdminMode: boolean;
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  patients: Patient[];
  loading: boolean;
  effectivePatientId: string | null;
  effectivePatientName: string | null;
  canAccessPortal: boolean;
}

const AdminPatientContext = createContext<AdminPatientContextType | undefined>(undefined);

export function AdminPatientProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isOrgAdminOrOwner, isOrgOwner, loading: roleLoading } = useOrgRole();
  const { structureId, loading: structureLoading } = useStructureId();
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  // Admin mode is active when a practitioner with admin/owner role is logged in
  const isAdminMode = !!(user && (isOrgAdminOrOwner || isOrgOwner));

  // Load patients for the structure when in admin mode
  const loadPatients = useCallback(async () => {
    if (!isAdminMode || !structureId) {
      setPatients([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('structure_id', structureId)
        .eq('is_archived', false)
        .order('last_name', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients for admin:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [isAdminMode, structureId]);

  useEffect(() => {
    if (!roleLoading && !structureLoading) {
      loadPatients();
    }
  }, [loadPatients, roleLoading, structureLoading]);

  // Determine if admin can access portal (must have selected a patient)
  const canAccessPortal = isAdminMode && !!selectedPatient;

  // Effective patient info for data fetching
  const effectivePatientId = selectedPatient?.id || null;
  const effectivePatientName = selectedPatient 
    ? `${selectedPatient.first_name} ${selectedPatient.last_name}` 
    : null;

  return (
    <AdminPatientContext.Provider value={{
      isAdminMode,
      selectedPatient,
      setSelectedPatient,
      patients,
      loading: loading || roleLoading || structureLoading,
      effectivePatientId,
      effectivePatientName,
      canAccessPortal,
    }}>
      {children}
    </AdminPatientContext.Provider>
  );
}

export function useAdminPatientContext() {
  const context = useContext(AdminPatientContext);
  if (context === undefined) {
    // Return a default context to prevent crash during initial render
    return {
      isAdminMode: false,
      selectedPatient: null,
      setSelectedPatient: () => {},
      patients: [],
      loading: false,
      effectivePatientId: null,
      effectivePatientName: null,
      canAccessPortal: false,
    };
  }
  return context;
}

/**
 * Hook to get the effective patient ID for data fetching
 * Works in both patient auth mode and admin mode
 */
export function useEffectivePatientId(): {
  patientId: string | null;
  patientName: string | null;
  isAdminMode: boolean;
  loading: boolean;
} {
  const { patient, loading: patientLoading } = usePatientAuth();
  const adminContext = useAdminPatientContext();

  // Priority: Admin mode > Patient auth mode
  if (adminContext.isAdminMode) {
    return {
      patientId: adminContext.effectivePatientId,
      patientName: adminContext.effectivePatientName,
      isAdminMode: true,
      loading: adminContext.loading,
    };
  }

  return {
    patientId: patient?.patientId || null,
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : null,
    isAdminMode: false,
    loading: patientLoading,
  };
}

// Import usePatientAuth here to avoid circular dependency issues
import { usePatientAuth } from '@/hooks/usePatientAuth';
