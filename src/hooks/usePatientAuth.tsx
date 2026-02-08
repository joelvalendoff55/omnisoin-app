import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { verifyPatientAccess, getPatientStructureId } from '@/lib/patientPortal';

interface PatientSession {
  patientId: string;
  email: string;
  firstName: string;
  lastName: string;
  structureId: string | null;
  expiresAt: number;
}

interface PatientAuthContextType {
  patient: PatientSession | null;
  loading: boolean;
  signIn: (email: string, patientCode: string) => Promise<{ error: string | null }>;
  signOut: () => void;
  isAuthenticated: boolean;
  refreshStructureId: () => Promise<void>;
}

const PatientAuthContext = createContext<PatientAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'patient_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function PatientAuthProvider({ children }: { children: ReactNode }) {
  const [patient, setPatient] = useState<PatientSession | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const storedSession = localStorage.getItem(STORAGE_KEY);
    if (storedSession) {
      try {
        const session: PatientSession = JSON.parse(storedSession);
        if (session.expiresAt > Date.now()) {
          // Refresh structure ID if not present
          if (!session.structureId) {
            const structureId = await getPatientStructureId(session.patientId);
            session.structureId = structureId;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
          }
          setPatient(session);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const signIn = async (email: string, patientCode: string): Promise<{ error: string | null }> => {
    try {
      const result = await verifyPatientAccess(email, patientCode);

      if (!result) {
        return { error: 'Email ou code patient incorrect' };
      }

      // Get structure ID
      const structureId = await getPatientStructureId(result.patientId);

      const session: PatientSession = {
        patientId: result.patientId,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        structureId,
        expiresAt: Date.now() + SESSION_DURATION,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setPatient(session);

      return { error: null };
    } catch (err) {
      console.error('Patient sign in error:', err);
      return { error: 'Une erreur est survenue. Veuillez réessayer.' };
    }
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPatient(null);
  };

  const refreshStructureId = async () => {
    if (patient) {
      const structureId = await getPatientStructureId(patient.patientId);
      const updatedSession = { ...patient, structureId };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
      setPatient(updatedSession);
    }
  };

  return (
    <PatientAuthContext.Provider value={{
      patient,
      loading,
      signIn,
      signOut,
      isAuthenticated: !!patient,
      refreshStructureId,
    }}>
      {children}
    </PatientAuthContext.Provider>
  );
}

export function usePatientAuth() {
  const context = useContext(PatientAuthContext);
  if (context === undefined) {
    console.error('PatientAuthContext is undefined - PatientAuthProvider may not be mounted');
    // Return a default context to prevent crash during initial render
    return {
      patient: null,
      loading: true,
      signIn: async () => ({ error: 'Provider not initialized' }),
      signOut: () => {},
      isAuthenticated: false,
      refreshStructureId: async () => {},
    };
  }
  return context;
}
