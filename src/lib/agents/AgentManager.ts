import { AgentType } from '@prisma/client';
import { OrchestratorAgentImpl } from './OrchestratorAgent';
import { CommandAgentImpl } from './CommandAgent';
import { LLMApiAgentImpl } from './LLMApiAgent';
import { TaskAgentImpl } from './TaskAgent';
import { CalendarAgentImpl } from './CalendarAgent';
import { EmailAgentImpl } from './EmailAgent';
import { DocAgentImpl } from './DocAgent';
import { WebSearchAgentImpl } from './WebSearchAgent';
import { AgentCommand, AgentContext, AgentResponse } from './types';

export class AgentManager {
  private agents: Map<AgentType, any> = new Map();

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents(): void {
    // Initialize all agents
    this.agents.set(AgentType.ORCHESTRATOR, new OrchestratorAgentImpl());
    this.agents.set(AgentType.COMMAND, new CommandAgentImpl());
    this.agents.set(AgentType.LLM, new LLMApiAgentImpl());
    this.agents.set(AgentType.TASK, new TaskAgentImpl());
    this.agents.set(AgentType.CALENDAR, new CalendarAgentImpl());
    this.agents.set(AgentType.EMAIL, new EmailAgentImpl());
    this.agents.set(AgentType.DOC, new DocAgentImpl());
    this.agents.set(AgentType.WEB_SEARCH, new WebSearchAgentImpl());
  }

  async processUserCommand(commandText: string, context: AgentContext): Promise<AgentResponse> {
    try {
      // Step 1: Command Processing - Use CommandAgent to parse the command
      const commandAgent = this.agents.get(AgentType.COMMAND);
      if (!commandAgent) {
        throw new Error('CommandAgent not available');
      }

      const processedCommand = await commandAgent.processUserCommand(commandText, context);

      // Step 2: Orchestration - Use OrchestratorAgent to coordinate the response
      const orchestratorAgent = this.agents.get(AgentType.ORCHESTRATOR);
      if (!orchestratorAgent) {
        throw new Error('OrchestratorAgent not available');
      }

      const response = await orchestratorAgent.execute(processedCommand, context);

      return response;
    } catch (error) {
      console.error('AgentManager failed to process command:', error);
      return {
        status: 'error',
        type: 'text',
        data: {
          content: 'I apologize, Sir/Madam. I encountered an error while processing your request.',
        },
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async executeTask(intent: string, params: Record<string, any>, context: AgentContext): Promise<AgentResponse> {
    try {
      const orchestratorAgent = this.agents.get(AgentType.ORCHESTRATOR);
      if (!orchestratorAgent) {
        throw new Error('OrchestratorAgent not available');
      }

      return await orchestratorAgent.executeTask(intent, params, context);
    } catch (error) {
      console.error('AgentManager failed to execute task:', error);
      return {
        status: 'error',
        type: 'text',
        data: {
          content: 'I apologize, Sir/Madam. I encountered an error while executing your task.',
        },
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async runResearchWorkflow(query: string, context: AgentContext): Promise<AgentResponse> {
    try {
      const orchestratorAgent = this.agents.get(AgentType.ORCHESTRATOR);
      if (!orchestratorAgent) {
        throw new Error('OrchestratorAgent not available');
      }

      return await orchestratorAgent.runResearchWorkflow(query, context);
    } catch (error) {
      console.error('AgentManager failed to run research workflow:', error);
      return {
        status: 'error',
        type: 'text',
        data: {
          content: 'I apologize, Sir/Madam. I encountered an error while conducting research.',
        },
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getAgent(agentType: AgentType): any {
    return this.agents.get(agentType);
  }

  async saveApiKey(serviceName: string, apiKey: string, userId: string): Promise<boolean> {
    try {
      const llmAgent = this.agents.get(AgentType.LLM);
      if (!llmAgent) {
        throw new Error('LLMApiAgent not available');
      }

      return await llmAgent.saveUserApiKey(serviceName, apiKey, userId);
    } catch (error) {
      console.error('Failed to save API key:', error);
      return false;
    }
  }
}

// Singleton instance
export const agentManager = new AgentManager();