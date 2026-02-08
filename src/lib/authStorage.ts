/**
 * Custom storage adapter for Supabase Auth
 * Switches between localStorage and sessionStorage based on "remember me" preference
 */

const REMEMBER_ME_KEY = 'omnisoin_remember_me';

export function getRememberMe(): boolean {
  const value = localStorage.getItem(REMEMBER_ME_KEY);
  // Default to true if not set
  return value !== '0';
}

export function setRememberMe(value: boolean): void {
  localStorage.setItem(REMEMBER_ME_KEY, value ? '1' : '0');
}

/**
 * Custom storage that routes to localStorage or sessionStorage
 * based on the remember me preference
 */
export const customAuthStorage = {
  getItem: (key: string): string | null => {
    // Try sessionStorage first (for non-remember sessions)
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue !== null) {
      return sessionValue;
    }
    // Fall back to localStorage
    return localStorage.getItem(key);
  },
  
  setItem: (key: string, value: string): void => {
    if (getRememberMe()) {
      // Remember me: use localStorage (persistent)
      localStorage.setItem(key, value);
      // Clean up sessionStorage if exists
      sessionStorage.removeItem(key);
    } else {
      // Don't remember: use sessionStorage (session-only)
      sessionStorage.setItem(key, value);
      // Clean up localStorage if exists
      localStorage.removeItem(key);
    }
  },
  
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

/**
 * Transfer session from localStorage to sessionStorage
 * Called after login when remember_me is false
 */
export function transferSessionToSessionStorage(): void {
  const supabaseKeys = Object.keys(localStorage).filter(
    key => key.startsWith('sb-') || key.includes('supabase')
  );
  
  for (const key of supabaseKeys) {
    const value = localStorage.getItem(key);
    if (value) {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  }
}

/**
 * Clear all auth tokens from both storages
 */
export function clearAuthTokens(): void {
  const localKeys = Object.keys(localStorage).filter(
    key => key.startsWith('sb-') || key.includes('supabase')
  );
  const sessionKeys = Object.keys(sessionStorage).filter(
    key => key.startsWith('sb-') || key.includes('supabase')
  );
  
  for (const key of localKeys) {
    localStorage.removeItem(key);
  }
  for (const key of sessionKeys) {
    sessionStorage.removeItem(key);
  }
}
