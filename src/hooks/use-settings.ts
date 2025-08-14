import { useState, useEffect } from 'react';

interface UserPreferences {
  id?: string;
  userId: string;
  formalityLevel?: number;
  humorLevel?: number;
  intelligenceLevel?: number;
  empathyLevel?: number;
  efficiencyLevel?: number;
  creativityLevel?: number;
  britishAccent?: boolean;
  voiceEnabled?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

interface ApiKey {
  id?: string;
  userId: string;
  serviceName: string;
  encryptedKey: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface SettingsData {
  preferences?: UserPreferences;
  apiKeys?: ApiKey[];
}

export function useSettings(userId: string) {
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/settings?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: SettingsData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...newSettings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      // Refresh settings after saving
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateApiKey = async (serviceName: string, encryptedKey: string, isActive: boolean = true) => {
    const currentApiKeys = settings.apiKeys || [];
    const existingKeyIndex = currentApiKeys.findIndex(key => key.serviceName === serviceName);
    
    let updatedApiKeys;
    if (existingKeyIndex >= 0) {
      // Update existing key
      updatedApiKeys = [...currentApiKeys];
      updatedApiKeys[existingKeyIndex] = {
        ...updatedApiKeys[existingKeyIndex],
        encryptedKey,
        isActive,
      };
    } else {
      // Add new key
      updatedApiKeys = [
        ...currentApiKeys,
        {
          userId,
          serviceName,
          encryptedKey,
          isActive,
        },
      ];
    }

    await saveSettings({ apiKeys: updatedApiKeys });
  };

  const removeApiKey = async (serviceName: string) => {
    const currentApiKeys = settings.apiKeys || [];
    const updatedApiKeys = currentApiKeys.filter(key => key.serviceName !== serviceName);
    
    await saveSettings({ apiKeys: updatedApiKeys });
  };

  const updatePreferences = async (preferences: Partial<UserPreferences>) => {
    const currentPreferences = settings.preferences || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
    };

    await saveSettings({ preferences: updatedPreferences });
  };

  useEffect(() => {
    if (userId) {
      fetchSettings();
    }
  }, [userId]);

  return {
    settings,
    loading,
    error,
    saveSettings,
    updateApiKey,
    removeApiKey,
    updatePreferences,
    refreshSettings: fetchSettings,
  };
}