'use client';

import { useState, useEffect } from 'react';

interface Email {
  id: string;
  subject: string;
  body: string;
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  status: 'DRAFT' | 'SENT' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

interface UseEmailsReturn {
  emails: Email[];
  loading: boolean;
  error: string | null;
  addEmail: (email: Omit<Email, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEmail: (id: string, updates: Partial<Email>) => Promise<void>;
  deleteEmail: (id: string) => Promise<void>;
  sendEmail: (id: string) => Promise<void>;
  refreshEmails: () => Promise<void>;
}

export function useEmails(userId: string): UseEmailsReturn {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/emails?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }
      
      const data = await response.json();
      const processedEmails = (data.emails || []).map((email: any) => ({
        ...email,
        recipients: JSON.parse(email.recipients),
        cc: email.cc ? JSON.parse(email.cc) : undefined,
        bcc: email.bcc ? JSON.parse(email.bcc) : undefined,
      }));
      setEmails(processedEmails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const addEmail = async (emailData: Omit<Email, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...emailData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create email');
      }

      const data = await response.json();
      const processedEmail = {
        ...data.email,
        recipients: JSON.parse(data.email.recipients),
        cc: data.email.cc ? JSON.parse(data.email.cc) : undefined,
        bcc: data.email.bcc ? JSON.parse(data.email.bcc) : undefined,
      };
      setEmails(prev => [processedEmail, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateEmail = async (id: string, updates: Partial<Email>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/emails/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update email');
      }

      const data = await response.json();
      const processedEmail = {
        ...data.email,
        recipients: JSON.parse(data.email.recipients),
        cc: data.email.cc ? JSON.parse(data.email.cc) : undefined,
        bcc: data.email.bcc ? JSON.parse(data.email.bcc) : undefined,
      };
      setEmails(prev => prev.map(email => 
        email.id === id ? processedEmail : email
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteEmail = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/emails/${id}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete email');
      }

      setEmails(prev => prev.filter(email => email.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, this would integrate with an email service
      // For now, we'll just update the status to SENT
      await updateEmail(id, { status: 'SENT' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchEmails();
    }
  }, [userId]);

  return {
    emails,
    loading,
    error,
    addEmail,
    updateEmail,
    deleteEmail,
    sendEmail,
    refreshEmails: fetchEmails,
  };
}