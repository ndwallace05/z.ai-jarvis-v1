'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface EmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email?: {
    id: string;
    subject: string;
    body: string;
    recipients: string[];
    cc?: string[];
    bcc?: string[];
    status: 'DRAFT' | 'SENT' | 'FAILED';
  };
  onSave: (emailData: any) => void;
  onSend?: (id: string) => void;
  isEditing?: boolean;
}

export function EmailDialog({
  open,
  onOpenChange,
  email,
  onSave,
  onSend,
  isEditing = false,
}: EmailDialogProps) {
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    recipients: [] as string[],
    cc: [] as string[],
    bcc: [] as string[],
  });

  const [recipientInput, setRecipientInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');

  React.useEffect(() => {
    if (open) {
      setFormData({
        subject: email?.subject || '',
        body: email?.body || '',
        recipients: email?.recipients || [],
        cc: email?.cc || [],
        bcc: email?.bcc || [],
      });
    }
  }, [open, email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.body.trim() || formData.recipients.length === 0) {
      return;
    }

    onSave({
      subject: formData.subject.trim(),
      body: formData.body.trim(),
      recipients: formData.recipients,
      cc: formData.cc.length > 0 ? formData.cc : undefined,
      bcc: formData.bcc.length > 0 ? formData.bcc : undefined,
      status: email?.status || 'DRAFT',
    });

    onOpenChange(false);
  };

  const handleSend = () => {
    if (email && onSend) {
      onSend(email.id);
      onOpenChange(false);
    }
  };

  const addRecipient = (email: string, type: 'recipients' | 'cc' | 'bcc') => {
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormData(prev => ({
        ...prev,
        [type]: [...prev[type], email]
      }));
    }
  };

  const removeRecipient = (email: string, type: 'recipients' | 'cc' | 'bcc') => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(e => e !== email)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: 'recipients' | 'cc' | 'bcc', input: string, setInput: (value: string) => void) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient(input, type);
      setInput('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Email' : 'Compose New Email'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the email details below.'
              : 'Create a new email message.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Enter email subject..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>To *</Label>
            <Input
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, 'recipients', recipientInput, setRecipientInput)}
              placeholder="Enter recipient email and press Enter..."
            />
            {formData.recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.recipients.map((recipient) => (
                  <Badge key={recipient} variant="secondary" className="flex items-center gap-1">
                    {recipient}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeRecipient(recipient, 'recipients')}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>CC</Label>
            <Input
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, 'cc', ccInput, setCcInput)}
              placeholder="Enter CC email and press Enter..."
            />
            {formData.cc.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.cc.map((cc) => (
                  <Badge key={cc} variant="secondary" className="flex items-center gap-1">
                    {cc}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeRecipient(cc, 'cc')}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>BCC</Label>
            <Input
              value={bccInput}
              onChange={(e) => setBccInput(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, 'bcc', bccInput, setBccInput)}
              placeholder="Enter BCC email and press Enter..."
            />
            {formData.bcc.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.bcc.map((bcc) => (
                  <Badge key={bcc} variant="secondary" className="flex items-center gap-1">
                    {bcc}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeRecipient(bcc, 'bcc')}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message *</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Enter your message here..."
              rows={8}
              required
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {isEditing && email?.status === 'DRAFT' && onSend && (
              <Button type="button" onClick={handleSend}>
                Send Email
              </Button>
            )}
            <Button type="submit" disabled={!formData.subject.trim() || !formData.body.trim() || formData.recipients.length === 0}>
              {isEditing ? 'Update Email' : 'Save Draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}