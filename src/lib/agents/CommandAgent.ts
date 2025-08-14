import { AgentType } from '@prisma/client';
import { BaseAgentImpl } from './BaseAgent';
import { AgentCommand, AgentContext, AgentResponse, CommandAgent } from './types';

export class CommandAgentImpl extends BaseAgentImpl implements CommandAgent {
  type = AgentType.COMMAND as const;

  async execute(command: AgentCommand, context: AgentContext): Promise<AgentResponse> {
    const executionId = await this.logExecution(context.userId, command.text, command.intent, command.parameters);
    
    return this.withErrorHandling(async () => {
      await this.startExecution(executionId);
      
      // Process the command to extract intent and parameters
      const processedCommand = await this.processUserCommand(command.text, context);
      
      await this.updateExecution(executionId, 'COMPLETED', processedCommand);
      
      return this.createSuccessResponse(
        `Command processed. Intent: ${processedCommand.intent || 'general'}`,
        'text',
        processedCommand
      );
    }, 'Command processing failed', executionId);
  }

  async processUserCommand(commandText: string, context: AgentContext): Promise<AgentCommand> {
    // Normalize the command text
    const normalizedText = commandText.toLowerCase().trim();
    
    // Define intent patterns
    const intentPatterns = {
      create_task: [
        /create.*task/i,
        /add.*task/i,
        /new.*task/i,
        /todo/i,
        /remind.*me/i
      ],
      list_tasks: [
        /show.*tasks/i,
        /list.*tasks/i,
        /my.*tasks/i,
        /what.*tasks/i,
        /tasks.*list/i
      ],
      update_task: [
        /update.*task/i,
        /complete.*task/i,
        /mark.*task/i,
        /task.*done/i
      ],
      create_event: [
        /create.*event/i,
        /schedule.*event/i,
        /add.*event/i,
        /new.*event/i,
        /meeting/i,
        /appointment/i
      ],
      list_events: [
        /show.*events/i,
        /list.*events/i,
        /my.*events/i,
        /calendar/i,
        /schedule/i
      ],
      find_slots: [
        /find.*time/i,
        /available.*slots/i,
        /when.*free/i,
        /schedule.*time/i
      ],
      draft_email: [
        /draft.*email/i,
        /write.*email/i,
        /compose.*email/i,
        /new.*email/i
      ],
      send_email: [
        /send.*email/i,
        /email.*send/i,
        /dispatch.*email/i
      ],
      summarize_inbox: [
        /summarize.*inbox/i,
        /inbox.*summary/i,
        /emails.*summary/i,
        /what.*emails/i
      ],
      create_document: [
        /create.*document/i,
        /write.*document/i,
        /new.*document/i,
        /generate.*report/i
      ],
      summarize_document: [
        /summarize.*document/i,
        /document.*summary/i,
        /analyze.*document/i
      ],
      web_search: [
        /search.*web/i,
        /look.*up/i,
        /find.*information/i,
        /research/i,
        /google/i
      ],
      scrape_url: [
        /scrape.*url/i,
        /extract.*from/i,
        /analyze.*website/i,
        /read.*page/i
      ]
    };

    // Extract intent
    let detectedIntent: string | undefined;
    
    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedText)) {
          detectedIntent = intent;
          break;
        }
      }
      if (detectedIntent) break;
    }

    // Extract parameters based on intent
    const parameters = this.extractParameters(commandText, detectedIntent);

    return {
      text: commandText,
      intent: detectedIntent,
      parameters
    };
  }

  private extractParameters(commandText: string, intent?: string): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    if (!intent) return parameters;

    switch (intent) {
      case 'create_task':
        // Extract task title and description
        const taskMatch = commandText.match(/(?:create|add|new)\s+(?:task|todo)[:\s]*(.+?)(?:\s*for\s*|\s*due\s*|\s*$)/i);
        if (taskMatch) {
          parameters.title = taskMatch[1].trim();
        }
        
        // Extract due date
        const dueDateMatch = commandText.match(/(?:due|for)\s+([^.!?]+)/i);
        if (dueDateMatch) {
          parameters.dueDate = dueDateMatch[1].trim();
        }
        
        // Extract priority
        if (commandText.toLowerCase().includes('high')) parameters.priority = 'HIGH';
        else if (commandText.toLowerCase().includes('low')) parameters.priority = 'LOW';
        else parameters.priority = 'MEDIUM';
        break;

      case 'create_event':
        // Extract event title
        const eventMatch = commandText.match(/(?:create|schedule|add)\s+(?:event|meeting|appointment)[:\s]*(.+?)(?:\s*at\s*|\s*on\s*|\s*$)/i);
        if (eventMatch) {
          parameters.title = eventMatch[1].trim();
        }
        
        // Extract date/time
        const dateTimeMatch = commandText.match(/(?:at|on)\s+([^.!?]+)/i);
        if (dateTimeMatch) {
          parameters.dateTime = dateTimeMatch[1].trim();
        }
        
        // Extract location
        const locationMatch = commandText.match(/(?:at|in)\s+([^.!?]+)/i);
        if (locationMatch) {
          parameters.location = locationMatch[1].trim();
        }
        break;

      case 'draft_email':
        // Extract recipient
        const recipientMatch = commandText.match(/(?:to|for)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (recipientMatch) {
          parameters.recipient = recipientMatch[1];
        }
        
        // Extract subject
        const subjectMatch = commandText.match(/(?:subject|about)\s*[:\s]*(.+?)(?:\s*saying\s*|\s*content\s*|\s*$)/i);
        if (subjectMatch) {
          parameters.subject = subjectMatch[1].trim();
        }
        break;

      case 'web_search':
        // Extract search query
        const searchMatch = commandText.match(/(?:search|find|look up|research)\s+(.+)/i);
        if (searchMatch) {
          parameters.query = searchMatch[1].trim();
        }
        break;

      case 'scrape_url':
        // Extract URL
        const urlMatch = commandText.match(/(https?:\/\/[^\s]+)/i);
        if (urlMatch) {
          parameters.url = urlMatch[1];
        }
        break;
    }

    return parameters;
  }
}