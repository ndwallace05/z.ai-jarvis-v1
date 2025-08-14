import { db } from '@/lib/db';
import { AgentType, ExecutionStatus } from '@prisma/client';
import { BaseAgent, AgentCommand, AgentContext, AgentResponse, AgentExecution } from './types';

export abstract class BaseAgentImpl implements BaseAgent {
  abstract type: AgentType;

  protected async logExecution(
    userId: string,
    command: string,
    intent?: string,
    parameters?: Record<string, any>
  ): Promise<string> {
    try {
      const execution = await db.agentExecution.create({
        data: {
          userId,
          agentType: this.type,
          command,
          intent,
          parameters: parameters ? JSON.stringify(parameters) : null,
          status: ExecutionStatus.PENDING,
        },
      });
      return execution.id;
    } catch (error) {
      console.error(`Failed to log execution for ${this.type}:`, error);
      throw error;
    }
  }

  protected async updateExecution(
    executionId: string,
    status: ExecutionStatus,
    result?: any,
    error?: string
  ): Promise<void> {
    try {
      await db.agentExecution.update({
        where: { id: executionId },
        data: {
          status,
          result: result ? JSON.stringify(result) : null,
          error,
          completedAt: status === ExecutionStatus.COMPLETED || status === ExecutionStatus.FAILED ? new Date() : null,
        },
      });
    } catch (error) {
      console.error(`Failed to update execution ${executionId}:`, error);
    }
  }

  protected async startExecution(executionId: string): Promise<void> {
    try {
      await db.agentExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.RUNNING,
          startedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Failed to start execution ${executionId}:`, error);
    }
  }

  protected createSuccessResponse(
    content: string,
    type: AgentResponse['type'] = 'text',
    rawContent?: any,
    personality?: AgentResponse['personality']
  ): AgentResponse {
    return {
      status: 'success',
      type,
      data: {
        content,
        rawContent,
      },
      personality,
    };
  }

  protected createErrorResponse(
    message: string,
    error?: string
  ): AgentResponse {
    return {
      status: 'error',
      type: 'text',
      data: {
        content: message,
      },
      message: error || message,
    };
  }

  protected async withErrorHandling<T>(
    operation: () => Promise<T>,
    errorMessage: string,
    executionId?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      if (executionId) {
        await this.updateExecution(executionId, ExecutionStatus.FAILED, undefined, error instanceof Error ? error.message : String(error));
      }
      throw error;
    }
  }

  abstract execute(command: AgentCommand, context: AgentContext): Promise<AgentResponse>;

  protected getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  protected async getUserPreferences(userId: string) {
    try {
      const preferences = await db.userPreferences.findUnique({
        where: { userId },
      });
      return preferences;
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return null;
    }
  }
}