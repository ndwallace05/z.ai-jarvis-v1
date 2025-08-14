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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: {
    id: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    attendees?: string[];
  };
  onSave: (eventData: any) => void;
  isEditing?: boolean;
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  onSave,
  isEditing = false,
}: EventDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: undefined as Date | undefined,
    endTime: undefined as Date | undefined,
    location: '',
    attendees: '',
  });

  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);

  React.useEffect(() => {
    if (open) {
      setFormData({
        title: event?.title || '',
        description: event?.description || '',
        startTime: event?.startTime ? new Date(event.startTime) : undefined,
        endTime: event?.endTime ? new Date(event.endTime) : undefined,
        location: event?.location || '',
        attendees: event?.attendees ? event.attendees.join(', ') : '',
      });
    }
  }, [open, event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.startTime || !formData.endTime) {
      return;
    }

    if (formData.startTime >= formData.endTime!) {
      alert('End time must be after start time');
      return;
    }

    const attendeesArray = formData.attendees
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    onSave({
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      startTime: formData.startTime.toISOString(),
      endTime: formData.endTime.toISOString(),
      location: formData.location.trim() || undefined,
      attendees: attendeesArray.length > 0 ? attendeesArray : undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Event' : 'Add New Event'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the event details below.'
              : 'Create a new event to add to your calendar.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter event title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter event description..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.startTime && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startTime ? (
                      format(formData.startTime, "PPP p")
                    ) : (
                      <span>Pick date & time</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.startTime}
                    onSelect={(date) => {
                      if (date) {
                        const newDate = new Date(date);
                        if (formData.startTime) {
                          newDate.setHours(formData.startTime.getHours());
                          newDate.setMinutes(formData.startTime.getMinutes());
                        }
                        setFormData(prev => ({ ...prev, startTime: newDate }));
                      }
                      setStartCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Time *</Label>
              <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.endTime && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endTime ? (
                      format(formData.endTime, "PPP p")
                    ) : (
                      <span>Pick date & time</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.endTime}
                    onSelect={(date) => {
                      if (date) {
                        const newDate = new Date(date);
                        if (formData.endTime) {
                          newDate.setHours(formData.endTime.getHours());
                          newDate.setMinutes(formData.endTime.getMinutes());
                        }
                        setFormData(prev => ({ ...prev, endTime: newDate }));
                      }
                      setEndCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Enter event location..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendees">Attendees</Label>
            <Input
              id="attendees"
              value={formData.attendees}
              onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
              placeholder="Enter email addresses separated by commas..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title.trim() || !formData.startTime || !formData.endTime}>
              {isEditing ? 'Update Event' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}