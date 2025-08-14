import { AgentType } from '@prisma/client';
import { BaseAgentImpl } from './BaseAgent';
import { AgentCommand, AgentContext, AgentResponse, CalendarAgent } from './types';
import { v4 as uuidv4 } from 'uuid';

export class CalendarAgentImpl extends BaseAgentImpl implements CalendarAgent {
  type = AgentType.CALENDAR as const;

  async execute(command: AgentCommand, context: AgentContext): Promise<AgentResponse> {
    const executionId = await this.logExecution(context.userId, command.text, command.intent, command.parameters);
    
    return this.withErrorHandling(async () => {
      await this.startExecution(executionId);
      
      const { intent } = command;
      let response: AgentResponse;
      
      switch (intent) {
        case 'create_event':
          response = await this.createEvent(command.parameters || {}, context);
          break;
        case 'list_events':
          response = await this.getEventsSummary(context);
          break;
        case 'find_slots':
          response = await this.findAvailableSlots(
            command.parameters?.startDate,
            command.parameters?.endDate,
            context
          );
          break;
        default:
          response = this.createErrorResponse('Unknown calendar command');
      }
      
      await this.updateExecution(executionId, 'COMPLETED', response);
      return response;
    }, 'Calendar agent execution failed', executionId);
  }

  async createEvent(eventData: any, context: AgentContext): Promise<AgentResponse> {
    try {
      const { title, description, startTime, endTime, location, attendees } = eventData;
      
      if (!title || !startTime || !endTime) {
        return this.createErrorResponse('Event title, start time, and end time are required');
      }
      
      const event = await db.calendarEvent.create({
        data: {
          id: uuidv4(),
          userId: context.userId,
          title,
          description,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          location,
          attendees: attendees ? JSON.stringify(attendees) : null,
        },
      });
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      const humorLevel = preferences?.humorLevel || 6;
      
      let content = `Event "${title}" has been scheduled successfully`;
      if (formalityLevel >= 7) {
        content = `I've taken the liberty of scheduling the event "${title}" for you, Sir/Madam.`;
      }
      
      // Add location if provided
      if (location) {
        content += ` at ${location}`;
      }
      
      // Add humor occasionally
      if (humorLevel >= 6 && Math.random() < 0.3) {
        content += " Time management is an art, and I'm your personal artist!";
      }
      
      return this.createSuccessResponse(
        content,
        'calendar_view',
        { event },
        {
          greeting: `${this.getGreeting()}, Sir/Madam.`,
          acknowledgment: 'With pleasure, Sir/Madam.',
          completion: 'Event scheduled successfully.'
        }
      );
    } catch (error) {
      console.error('Failed to create event:', error);
      return this.createErrorResponse('Failed to create event', error instanceof Error ? error.message : String(error));
    }
  }

  async findAvailableSlots(startDate: Date, endDate: Date, context: AgentContext): Promise<AgentResponse> {
    try {
      if (!startDate || !endDate) {
        return this.createErrorResponse('Start date and end date are required');
      }
      
      // Get existing events in the date range
      const existingEvents = await db.calendarEvent.findMany({
        where: {
          userId: context.userId,
          OR: [
            {
              startTime: {
                gte: new Date(startDate),
                lte: new Date(endDate)
              }
            },
            {
              endTime: {
                gte: new Date(startDate),
                lte: new Date(endDate)
              }
            }
          ]
        },
        orderBy: { startTime: 'asc' }
      });
      
      // Generate available slots (simplified logic)
      const availableSlots = this.generateAvailableSlots(existingEvents, startDate, endDate);
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      
      let content = `I found ${availableSlots.length} available time slot${availableSlots.length !== 1 ? 's' : ''}`;
      
      if (formalityLevel >= 7) {
        content = `I've analyzed your schedule and found ${availableSlots.length} available time slot${availableSlots.length !== 1 ? 's' : ''}, Sir/Madam.`;
      }
      
      if (availableSlots.length === 0) {
        content = formalityLevel >= 7 
          ? "I'm afraid your schedule is quite full during the requested time period, Sir/Madam."
          : "Your schedule appears to be full during this time.";
      }
      
      return this.createSuccessResponse(
        content,
        'calendar_view',
        { availableSlots, existingEvents }
      );
    } catch (error) {
      console.error('Failed to find available slots:', error);
      return this.createErrorResponse('Failed to find available slots', error instanceof Error ? error.message : String(error));
    }
  }

  async getEventsSummary(context: AgentContext): Promise<AgentResponse> {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      
      const todayEvents = await db.calendarEvent.findMany({
        where: {
          userId: context.userId,
          startTime: {
            gte: startOfToday,
            lt: endOfToday
          }
        },
        orderBy: { startTime: 'asc' }
      });
      
      const upcomingEvents = await db.calendarEvent.findMany({
        where: {
          userId: context.userId,
          startTime: {
            gte: now
          }
        },
        orderBy: { startTime: 'asc' },
        take: 10
      });
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      
      let content = `You have ${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''} today and ${upcomingEvents.length} upcoming event${upcomingEvents.length !== 1 ? 's' : ''}`;
      
      if (formalityLevel >= 7) {
        content = `You have ${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''} scheduled for today, Sir/Madam, with ${upcomingEvents.length} additional event${upcomingEvents.length !== 1 ? 's' : ''} upcoming.`;
      }
      
      if (todayEvents.length === 0 && upcomingEvents.length === 0) {
        content = formalityLevel >= 7 
          ? "Your calendar is clear, Sir/Madam. Would you like me to help you schedule something?"
          : "Your calendar is clear. Want to schedule something?";
      }
      
      return this.createSuccessResponse(
        content,
        'calendar_view',
        { todayEvents, upcomingEvents }
      );
    } catch (error) {
      console.error('Failed to get events summary:', error);
      return this.createErrorResponse('Failed to get events summary', error instanceof Error ? error.message : String(error));
    }
  }

  private generateAvailableSlots(existingEvents: any[], startDate: Date, endDate: Date): any[] {
    // Simplified slot generation - in a real implementation, this would be more sophisticated
    const slots = [];
    const slotDuration = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Convert to Date objects if they aren't already
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Generate slots from 9 AM to 5 PM
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      for (let hour = 9; hour < 17; hour++) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(slotStart.getTime() + slotDuration);
        
        // Check if slot conflicts with existing events
        const isAvailable = !existingEvents.some(event => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          
          return (slotStart < eventEnd && slotEnd > eventStart);
        });
        
        if (isAvailable) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            duration: slotDuration
          });
        }
      }
    }
    
    return slots;
  }
}