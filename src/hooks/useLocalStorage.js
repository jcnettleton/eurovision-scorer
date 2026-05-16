import { useState, useEffect } from 'react';

/**
 * useState that syncs to localStorage.
 * @param {string} key   - localStorage key
 * @param {*} initialValue - default value if key not found
 */
export function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Quota exceeded or private browsing — silently ignore
    }
  }, [key, state]);

  return [state, setState];
}
