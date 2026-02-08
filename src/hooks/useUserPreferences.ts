"use client";

import { useState, useEffect, useCallback } from 'react';
import { AdvancedFilters, defaultAdvancedFilters } from '@/components/patients/AdvancedPatientFilters';
import { ViewMode } from '@/components/patients/PatientViewToggle';

const STORAGE_KEYS = {
  PATIENTS_FILTERS: 'omnisoin-patients-filters',
  PATIENTS_VIEW_MODE: 'omnisoin-patients-view-mode',
  PATIENTS_PAGE_SIZE: 'omnisoin-patients-page-size',
  DASHBOARD_KPI_ORDER: 'dashboard-kpi-order',
  DOCUMENTS_VIEW_MODE: 'omnisoin-documents-view-mode',
  DOCUMENTS_CATEGORY: 'omnisoin-documents-category',
  COTATION_CATEGORY: 'omnisoin-cotation-category',
} as const;

// Serializable version of AdvancedFilters (dates as ISO strings)
interface SerializableFilters {
  searchQuery: string;
  phone: string;
  email: string;
  practitionerId: string | null;
  activeFilters: string[];
  lastVisitFilter: string;
  dateRange: {
    from: string | null;
    to: string | null;
  };
  sortBy: string;
  sortDirection: string;
}

function serializeFilters(filters: AdvancedFilters): SerializableFilters {
  return {
    ...filters,
    dateRange: {
      from: filters.dateRange.from?.toISOString() || null,
      to: filters.dateRange.to?.toISOString() || null,
    },
  };
}

function deserializeFilters(serialized: SerializableFilters): AdvancedFilters {
  return {
    searchQuery: serialized.searchQuery || '',
    phone: serialized.phone || '',
    email: serialized.email || '',
    practitionerId: serialized.practitionerId || null,
    activeFilters: (serialized.activeFilters || []) as AdvancedFilters['activeFilters'],
    lastVisitFilter: (serialized.lastVisitFilter || 'all') as AdvancedFilters['lastVisitFilter'],
    dateRange: {
      from: serialized.dateRange?.from ? new Date(serialized.dateRange.from) : undefined,
      to: serialized.dateRange?.to ? new Date(serialized.dateRange.to) : undefined,
    },
    sortBy: (serialized.sortBy || 'name') as AdvancedFilters['sortBy'],
    sortDirection: (serialized.sortDirection || 'asc') as AdvancedFilters['sortDirection'],
  };
}

// Generic preference hook
function usePreference<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored) as T;
      }
    } catch (e) {
      console.warn(`Failed to parse preference ${key}:`, e);
    }
    return defaultValue;
  });

  const setAndPersist = useCallback((newValue: T) => {
    setValue(newValue);
    try {
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch (e) {
      console.warn(`Failed to save preference ${key}:`, e);
    }
  }, [key]);

  return [value, setAndPersist];
}

// Patient preferences hook
export function usePatientPreferences() {
  // Filters - special handling for dates
  const [storedFilters, setStoredFilters] = usePreference<SerializableFilters | null>(
    STORAGE_KEYS.PATIENTS_FILTERS,
    null
  );

  const filters = storedFilters ? deserializeFilters(storedFilters) : defaultAdvancedFilters;
  
  const setFilters = useCallback((newFilters: AdvancedFilters) => {
    setStoredFilters(serializeFilters(newFilters));
  }, [setStoredFilters]);

  // View mode
  const [viewMode, setViewMode] = usePreference<ViewMode>(
    STORAGE_KEYS.PATIENTS_VIEW_MODE,
    'grid'
  );

  // Page size
  const [pageSize, setPageSize] = usePreference<number>(
    STORAGE_KEYS.PATIENTS_PAGE_SIZE,
    25
  );

  // Reset all preferences
  const resetPreferences = useCallback(() => {
    setStoredFilters(null);
    setViewMode('grid');
    setPageSize(25);
    localStorage.removeItem(STORAGE_KEYS.PATIENTS_FILTERS);
    localStorage.removeItem(STORAGE_KEYS.PATIENTS_VIEW_MODE);
    localStorage.removeItem(STORAGE_KEYS.PATIENTS_PAGE_SIZE);
  }, [setStoredFilters, setViewMode, setPageSize]);

  return {
    filters,
    setFilters,
    viewMode,
    setViewMode,
    pageSize,
    setPageSize,
    resetPreferences,
    hasStoredPreferences: storedFilters !== null,
  };
}

// Documents preferences hook
export function useDocumentPreferences() {
  const [viewMode, setViewMode] = usePreference<'grid' | 'list'>(
    STORAGE_KEYS.DOCUMENTS_VIEW_MODE,
    'grid'
  );

  const [category, setCategory] = usePreference<string>(
    STORAGE_KEYS.DOCUMENTS_CATEGORY,
    'all'
  );

  return {
    viewMode,
    setViewMode,
    category,
    setCategory,
  };
}

// Cotation preferences hook
export function useCotationPreferences() {
  const [category, setCategory] = usePreference<string>(
    STORAGE_KEYS.COTATION_CATEGORY,
    'all'
  );

  return {
    category,
    setCategory,
  };
}

// Dashboard KPI order hook
export function useDashboardKPIPreferences() {
  const [widgetOrder, setWidgetOrder] = usePreference<string[]>(
    STORAGE_KEYS.DASHBOARD_KPI_ORDER,
    []
  );

  return {
    widgetOrder,
    setWidgetOrder,
  };
}

// Export storage keys for direct access if needed
export { STORAGE_KEYS };
