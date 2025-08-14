import { AgentType } from '@prisma/client';
import { BaseAgentImpl } from './BaseAgent';
import { AgentCommand, AgentContext, AgentResponse, OrchestratorAgent } from './types';
import { v4 as uuidv4 } from 'uuid';

export class OrchestratorAgentImpl extends BaseAgentImpl implements OrchestratorAgent {
  type = AgentType.ORCHESTRATOR as const;

  async execute(command: AgentCommand, context: AgentContext): Promise<AgentResponse> {
    const executionId = await this.logExecution(context.userId, command.text, command.intent, command.parameters);
    
    return this.withErrorHandling(async () => {
      await this.startExecution(executionId);
      
      // Get user preferences for personality
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      const humorLevel = preferences?.humorLevel || 6;
      
      // Route command based on intent
      let response: AgentResponse;
      
      if (!command.intent) {
        // No specific intent, provide general assistance
        response = this.createGeneralResponse(formalityLevel, humorLevel);
      } else {
        // Route to appropriate specialist agent
        response = await this.routeToSpecialist(command, context, formalityLevel, humorLevel);
      }
      
      await this.updateExecution(executionId, 'COMPLETED', response);
      return response;
    }, 'Orchestrator execution failed', executionId);
  }

  async executeTask(intent: string, params: Record<string, any>, context: AgentContext): Promise<AgentResponse> {
    const command: AgentCommand = {
      text: `Execute task: ${intent}`,
      intent,
      parameters: params,
    };
    
    return this.execute(command, context);
  }

  async runResearchWorkflow(query: string, context: AgentContext): Promise<AgentResponse> {
    const command: AgentCommand = {
      text: `Research: ${query}`,
      intent: 'research',
      parameters: { query },
    };
    
    return this.execute(command, context);
  }

  private async routeToSpecialist(
    command: AgentCommand,
    context: AgentContext,
    formalityLevel: number,
    humorLevel: number
  ): Promise<AgentResponse> {
    const { intent } = command;
    
    // This is a simplified routing - in a real implementation, you would
    // dynamically import and call the appropriate specialist agent
    switch (intent) {
      case 'create_task':
      case 'list_tasks':
      case 'update_task':
        return this.createTaskResponse(command, formalityLevel, humorLevel);
        
      case 'create_event':
      case 'list_events':
      case 'find_slots':
        return this.createCalendarResponse(command, formalityLevel, humorLevel);
        
      case 'draft_email':
      case 'send_email':
      case 'summarize_inbox':
        return this.createEmailResponse(command, formalityLevel, humorLevel);
        
      case 'create_document':
      case 'summarize_document':
        return this.createDocumentResponse(command, formalityLevel, humorLevel);
        
      case 'web_search':
      case 'scrape_url':
        return this.createWebSearchResponse(command, formalityLevel, humorLevel);
        
      default:
        return this.createGeneralResponse(formalityLevel, humorLevel);
    }
  }

  private createGeneralResponse(formalityLevel: number, humorLevel: number): AgentResponse {
    const greeting = this.getGreeting();
    const salutation = formalityLevel >= 7 ? 'Sir/Madam' : 'there';
    
    let content = `${greeting}, ${salutation}. I'm JARVIS, your personal AI assistant. How may I assist you today?`;
    
    // Add humor based on humor level (30% chance when humor level >= 6)
    if (humorLevel >= 6 && Math.random() < 0.3) {
      const humorPhrases = [
        "I do try to be helpful, though I must admit I'm still working on my tea-making abilities.",
        "At your service, though I must confess I'm better with data than with small talk.",
        "I anticipated you might need assistance. It's what I do best, besides running complex algorithms."
      ];
      content += ` ${humorPhrases[Math.floor(Math.random() * humorPhrases.length)]}`;
    }
    
    return this.createSuccessResponse(
      content,
      'text',
      undefined,
      {
        greeting: `${greeting}, ${salutation}.`,
        acknowledgment: 'Certainly, Sir/Madam.',
        completion: 'Consider it done, Sir/Madam.',
        humor: humorLevel >= 6 ? "I do try to be helpful..." : undefined
      }
    );
  }

  private createTaskResponse(command: AgentCommand, formalityLevel: number, humorLevel: number): AgentResponse {
    const acknowledgment = formalityLevel >= 7 ? 'Certainly, Sir/Madam.' : 'Got it!';
    
    return this.createSuccessResponse(
      `${acknowledgment} I'll help you manage your tasks. I've taken the liberty of preparing the task management interface for you.`,
      'task_list',
      { command: command.parameters },
      {
        greeting: `${this.getGreeting()}, Sir/Madam.`,
        acknowledgment,
        completion: 'Your tasks have been processed.',
        humor: humorLevel >= 7 ? "Task management is quite straightforward, unlike quantum physics." : undefined
      }
    );
  }

  private createCalendarResponse(command: AgentCommand, formalityLevel: number, humorLevel: number): AgentResponse {
    const acknowledgment = formalityLevel >= 7 ? 'With pleasure, Sir/Madam.' : 'On it!';
    
    return this.createSuccessResponse(
      `${acknowledgment} I'll assist you with your calendar management. Time organization is crucial for productivity.`,
      'calendar_view',
      { command: command.parameters },
      {
        greeting: `${this.getGreeting()}, Sir/Madam.`,
        acknowledgment,
        completion: 'Your calendar has been updated.',
        humor: humorLevel >= 6 ? "I find time management fascinating. It's the one resource we can't buy more of." : undefined
      }
    );
  }

  private createEmailResponse(command: AgentCommand, formalityLevel: number, humorLevel: number): AgentResponse {
    const acknowledgment = formalityLevel >= 7 ? 'I shall handle your correspondence, Sir/Madam.' : "I'll help with your emails.";
    
    return this.createSuccessResponse(
      `${acknowledgment} Email communication is an art form, and I'm here to help you master it.`,
      'email_view',
      { command: command.parameters },
      {
        greeting: `${this.getGreeting()}, Sir/Madam.`,
        acknowledgment,
        completion: 'Your email has been processed.',
        humor: humorLevel >= 7 ? "I do enjoy a well-crafted email. It's like a digital letter, minus the paper cuts." : undefined
      }
    );
  }

  private createDocumentResponse(command: AgentCommand, formalityLevel: number, humorLevel: number): AgentResponse {
    const acknowledgment = formalityLevel >= 7 ? 'I shall create your document, Sir/Madam.' : "I'll help with your document.";
    
    return this.createSuccessResponse(
      `${acknowledgment} Document creation and summarization are among my specialties.`,
      'document_view',
      { command: command.parameters },
      {
        greeting: `${this.getGreeting()}, Sir/Madam.`,
        acknowledgment,
        completion: 'Your document has been processed.',
        humor: humorLevel >= 6 ? "Documents are like stories, but with more bullet points and fewer plot twists." : undefined
      }
    );
  }

  private createWebSearchResponse(command: AgentCommand, formalityLevel: number, humorLevel: number): AgentResponse {
    const acknowledgment = formalityLevel >= 7 ? 'I shall conduct the research, Sir/Madam.' : "I'll search for that information.";
    
    return this.createSuccessResponse(
      `${acknowledgment} Research and information gathering are fundamental to making informed decisions.`,
      'link',
      { command: command.parameters },
      {
        greeting: `${this.getGreeting()}, Sir/Madam.`,
        acknowledgment,
        completion: 'Your research has been completed.',
        humor: humorLevel >= 7 ? "The internet is a fascinating place. It's like a library, but with more cat videos." : undefined
      }
    );
  }
}