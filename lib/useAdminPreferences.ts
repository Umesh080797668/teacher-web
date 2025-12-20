import { useState, useEffect, useCallback } from 'react';

export interface AdminPreferences {
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
  darkMode: boolean;
  notifications: boolean;
  sessionTimeout: number; // in minutes, -1 for never
}

const DEFAULT_PREFERENCES: AdminPreferences = {
  autoRefresh: true,
  refreshInterval: 3,
  darkMode: false,
  notifications: true,
  sessionTimeout: 30,
};

const STORAGE_KEY = 'admin_preferences';

export function useAdminPreferences() {
  const [preferences, setPreferencesState] = useState<AdminPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const loadedPrefs = { ...DEFAULT_PREFERENCES, ...parsed };
          setPreferencesState(loadedPrefs);
          
          // Immediately apply dark mode on load
          if (loadedPrefs.darkMode) {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
          }
        } else {
          // No saved preferences, ensure light mode by default
          document.documentElement.classList.remove('dark');
          document.documentElement.setAttribute('data-theme', 'light');
        }
      } catch (e) {
        console.error('Error loading preferences:', e);
        // On error, default to light mode
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      } finally {
        setIsLoaded(true);
      }
    };

    loadPreferences();
  }, []);

  // Apply dark mode whenever it changes
  useEffect(() => {
    if (isLoaded) {
      if (preferences.darkMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  }, [preferences.darkMode, isLoaded]);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: Partial<AdminPreferences>) => {
    setPreferencesState(prev => {
      const updated = { ...prev, ...newPreferences };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving preferences:', e);
      }
      return updated;
    });
  }, []);

  // Update a single preference
  const updatePreference = useCallback(<K extends keyof AdminPreferences>(
    key: K,
    value: AdminPreferences[K]
  ) => {
    savePreferences({ [key]: value });
  }, [savePreferences]);

  // Toggle boolean preferences
  const togglePreference = useCallback((key: keyof Pick<AdminPreferences, 'autoRefresh' | 'darkMode' | 'notifications'>) => {
    setPreferencesState(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving preferences:', e);
      }
      return updated;
    });
  }, []);

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    } catch (e) {
      console.error('Error resetting preferences:', e);
    }
  }, []);

  return {
    preferences,
    isLoaded,
    savePreferences,
    updatePreference,
    togglePreference,
    resetPreferences,
  };
}
