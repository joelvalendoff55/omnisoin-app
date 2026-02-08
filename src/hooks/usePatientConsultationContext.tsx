import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Patient } from '@/types/patient';

interface ConsultationContext {
  patient: Patient | null;
  consultationId: string | null;
  consultationDate: string | null;
  startedAt: string | null;
}

interface PatientConsultationContextValue {
  context: ConsultationContext;
  setPatient: (patient: Patient | null) => void;
  startConsultation: (patient: Patient, consultationId?: string) => void;
  clearContext: () => void;
  isActive: boolean;
}

const STORAGE_KEY = 'omnisoin_patient_consultation_context';

const defaultContext: ConsultationContext = {
  patient: null,
  consultationId: null,
  consultationDate: null,
  startedAt: null,
};

const PatientConsultationContext = createContext<PatientConsultationContextValue | null>(null);

export function PatientConsultationProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<ConsultationContext>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading patient context from localStorage:', e);
    }
    return defaultContext;
  });

  // Persist to localStorage whenever context changes
  useEffect(() => {
    try {
      if (context.patient) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error saving patient context to localStorage:', e);
    }
  }, [context]);

  const setPatient = useCallback((patient: Patient | null) => {
    if (patient) {
      setContext(prev => ({
        ...prev,
        patient,
      }));
    } else {
      setContext(defaultContext);
    }
  }, []);

  const startConsultation = useCallback((patient: Patient, consultationId?: string) => {
    setContext({
      patient,
      consultationId: consultationId || null,
      consultationDate: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    });
  }, []);

  const clearContext = useCallback(() => {
    setContext(defaultContext);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isActive = context.patient !== null;

  return (
    <PatientConsultationContext.Provider
      value={{
        context,
        setPatient,
        startConsultation,
        clearContext,
        isActive,
      }}
    >
      {children}
    </PatientConsultationContext.Provider>
  );
}

export function usePatientConsultationContext() {
  const ctx = useContext(PatientConsultationContext);
  if (!ctx) {
    throw new Error('usePatientConsultationContext must be used within PatientConsultationProvider');
  }
  return ctx;
}
