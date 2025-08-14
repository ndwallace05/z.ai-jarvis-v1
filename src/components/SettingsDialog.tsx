'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Bot, Key, Mail, Calendar, Shield, Check, AlertCircle } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface ApiKeyConfig {
  serviceName: string;
  displayName: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
}

const API_KEY_CONFIGS: ApiKeyConfig[] = [
  {
    serviceName: 'Z_AI_GLM',
    displayName: 'Z.ai GLM 4.5 Flash',
    description: 'Used for JARVIS AI responses and processing',
    icon: <Bot className="h-4 w-4" />,
    required: true,
  },
  {
    serviceName: 'GOOGLE_CALENDAR',
    displayName: 'Google Calendar',
    description: 'For calendar integration and event management',
    icon: <Calendar className="h-4 w-4" />,
    required: false,
  },
  {
    serviceName: 'GOOGLE_EMAIL',
    displayName: 'Google Email',
    description: 'For email sending and management',
    icon: <Mail className="h-4 w-4" />,
    required: false,
  },
];

export function SettingsDialog({ open, onOpenChange, userId }: SettingsDialogProps) {
  const { settings, loading, error, updateApiKey, removeApiKey, updatePreferences } = useSettings(userId);
  
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});
  const [googleEmail, setGoogleEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings.apiKeys) {
      const values: Record<string, string> = {};
      settings.apiKeys.forEach(key => {
        values[key.serviceName] = key.encryptedKey;
      });
      setApiKeyValues(values);
    }
  }, [settings.apiKeys]);

  const handleSaveApiKey = async (serviceName: string) => {
    const value = apiKeyValues[serviceName];
    if (!value) return;

    setIsSaving(true);
    try {
      await updateApiKey(serviceName, value);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save API key:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveApiKey = async (serviceName: string) => {
    setIsSaving(true);
    try {
      await removeApiKey(serviceName);
      setApiKeyValues(prev => ({ ...prev, [serviceName]: '' }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to remove API key:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGoogleEmail = async () => {
    if (!googleEmail) return;

    setIsSaving(true);
    try {
      await updatePreferences({ googleEmail });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save Google email:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const isApiKeyConfigured = (serviceName: string) => {
    return apiKeyValues[serviceName] && apiKeyValues[serviceName].length > 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            JARVIS Settings
          </DialogTitle>
          <DialogDescription>
            Configure API keys and preferences for JARVIS functionality
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-green-800">Settings saved successfully!</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* API Keys Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Manage API keys for JARVIS services and integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {API_KEY_CONFIGS.map((config) => (
                <div key={config.serviceName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      {config.icon}
                      {config.displayName}
                      {config.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    </Label>
                    {isApiKeyConfigured(config.serviceName) && (
                      <Badge variant="secondary" className="text-xs">
                        Configured
                      </Badge>
                    )}
                  </div>
                  <Input
                    type="password"
                    placeholder={`Enter ${config.displayName} API key`}
                    value={apiKeyValues[config.serviceName] || ''}
                    onChange={(e) => setApiKeyValues(prev => ({
                      ...prev,
                      [config.serviceName]: e.target.value
                    }))}
                  />
                  <p className="text-xs text-slate-500">{config.description}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveApiKey(config.serviceName)}
                      disabled={isSaving || !apiKeyValues[config.serviceName]}
                    >
                      {isApiKeyConfigured(config.serviceName) ? 'Update' : 'Save'}
                    </Button>
                    {isApiKeyConfigured(config.serviceName) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveApiKey(config.serviceName)}
                        disabled={isSaving}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Google Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Google Account Settings
              </CardTitle>
              <CardDescription>
                Configure your Google account for calendar and email integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="google-email">Google Email Address</Label>
                <Input
                  id="google-email"
                  type="email"
                  placeholder="your-email@gmail.com"
                  value={googleEmail || (settings.preferences?.googleEmail || '')}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Associated with your Google account for calendar and email services
                </p>
              </div>
              <Button
                onClick={handleSaveGoogleEmail}
                disabled={isSaving || !googleEmail}
              >
                Save Email Address
              </Button>
            </CardContent>
          </Card>

          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Integration Status</CardTitle>
              <CardDescription>
                Overview of configured services and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {API_KEY_CONFIGS.map((config) => (
                  <div key={config.serviceName} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <span className="text-sm font-medium">{config.displayName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isApiKeyConfigured(config.serviceName) ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">Connected</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-600">
                            {config.required ? 'Required' : 'Not configured'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}