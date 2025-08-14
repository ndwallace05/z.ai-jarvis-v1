import { AgentType, ExecutionStatus } from '@prisma/client';

export interface AgentResponse {
  status: 'success' | 'error';
  type: 'text' | 'link' | 'task_list' | 'calendar_view' | 'other';
  data: {
    content: string;
    rawContent?: any;
  };
  personality?: {
    greeting?: string;
    acknowledgment?: string;
    completion?: string;
    humor?: string;
  };
  message?: string;
}

export interface AgentContext {
  userId: string;
  preferences?: {
    formalityLevel: number;
    humorLevel: number;
    britishAccent: boolean;
    temperature: number;
    maxTokens: number;
  };
}

export interface AgentCommand {
  text: string;
  intent?: string;
  parameters?: Record<string, any>;
}

export interface AgentExecution {
  id: string;
  agentType: AgentType;
  command: string;
  intent?: string;
  parameters?: string;
  result?: string;
  status: ExecutionStatus;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface BaseAgent {
  type: AgentType;
  execute(command: AgentCommand, context: AgentContext): Promise<AgentResponse>;
}

export interface OrchestratorAgent extends BaseAgent {
  executeTask(intent: string, params: Record<string, any>, context: AgentContext): Promise<AgentResponse>;
  runResearchWorkflow(query: string, context: AgentContext): Promise<AgentResponse>;
}

export interface CommandAgent extends BaseAgent {
  processUserCommand(commandText: string, context: AgentContext): Promise<AgentCommand>;
}

export interface LLMApiAgent extends BaseAgent {
  callLlmApi(prompt: string, serviceName: string, context: AgentContext): Promise<string>;
  saveUserApiKey(serviceName: string, apiKey: string, userId: string): Promise<boolean>;
}

export interface CalendarAgent extends BaseAgent {
  createEvent(eventData: any, context: AgentContext): Promise<AgentResponse>;
  findAvailableSlots(startDate: Date, endDate: Date, context: AgentContext): Promise<AgentResponse>;
  getEventsSummary(context: AgentContext): Promise<AgentResponse>;
}

export interface EmailAgent extends BaseAgent {
  draftEmail(emailData: any, context: AgentContext): Promise<AgentResponse>;
  sendEmail(emailId: string, context: AgentContext): Promise<AgentResponse>;
  summarizeInbox(context: AgentContext): Promise<AgentResponse>;
}

export interface DocAgent extends BaseAgent {
  createReport(title: string, content: string, context: AgentContext): Promise<AgentResponse>;
  summarizeDoc(documentId: string, context: AgentContext): Promise<AgentResponse>;
}

export interface TaskAgent extends BaseAgent {
  addTask(taskData: any, context: AgentContext): Promise<AgentResponse>;
  getTasks(context: AgentContext): Promise<AgentResponse>;
  updateTaskStatus(taskId: string, status: string, context: AgentContext): Promise<AgentResponse>;
}

export interface WebSearchAgent extends BaseAgent {
  scrapeUrl(url: string, context: AgentContext): Promise<AgentResponse>;
  summarizeWebPage(url: string, context: AgentContext): Promise<AgentResponse>;
  performSearch(query: string, context: AgentContext): Promise<AgentResponse>;
}