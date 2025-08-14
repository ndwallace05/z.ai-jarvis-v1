import { AgentType, Priority, TaskStatus } from '@prisma/client';
import { BaseAgentImpl } from './BaseAgent';
import { AgentCommand, AgentContext, AgentResponse, TaskAgent } from './types';
import { v4 as uuidv4 } from 'uuid';

export class TaskAgentImpl extends BaseAgentImpl implements TaskAgent {
  type = AgentType.TASK as const;

  async execute(command: AgentCommand, context: AgentContext): Promise<AgentResponse> {
    const executionId = await this.logExecution(context.userId, command.text, command.intent, command.parameters);
    
    return this.withErrorHandling(async () => {
      await this.startExecution(executionId);
      
      const { intent } = command;
      let response: AgentResponse;
      
      switch (intent) {
        case 'create_task':
          response = await this.addTask(command.parameters || {}, context);
          break;
        case 'list_tasks':
          response = await this.getTasks(context);
          break;
        case 'update_task':
          response = await this.updateTaskStatus(
            command.parameters?.taskId,
            command.parameters?.status,
            context
          );
          break;
        default:
          response = this.createErrorResponse('Unknown task command');
      }
      
      await this.updateExecution(executionId, 'COMPLETED', response);
      return response;
    }, 'Task agent execution failed', executionId);
  }

  async addTask(taskData: any, context: AgentContext): Promise<AgentResponse> {
    try {
      const { title, description, priority = 'MEDIUM', dueDate } = taskData;
      
      if (!title) {
        return this.createErrorResponse('Task title is required');
      }
      
      const task = await db.task.create({
        data: {
          id: uuidv4(),
          userId: context.userId,
          title,
          description,
          priority: priority as Priority,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      const humorLevel = preferences?.humorLevel || 6;
      
      let content = `Task "${title}" has been created successfully`;
      if (formalityLevel >= 7) {
        content = `I've taken the liberty of creating the task "${title}" for you, Sir/Madam.`;
      }
      
      // Add humor occasionally
      if (humorLevel >= 6 && Math.random() < 0.3) {
        content += " Another task conquered, or at least identified. Progress!";
      }
      
      return this.createSuccessResponse(
        content,
        'task_list',
        { task },
        {
          greeting: `${this.getGreeting()}, Sir/Madam.`,
          acknowledgment: 'Certainly, Sir/Madam.',
          completion: 'Task created successfully.'
        }
      );
    } catch (error) {
      console.error('Failed to create task:', error);
      return this.createErrorResponse('Failed to create task', error instanceof Error ? error.message : String(error));
    }
  }

  async getTasks(context: AgentContext): Promise<AgentResponse> {
    try {
      const tasks = await db.task.findMany({
        where: { userId: context.userId },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' }
        ],
      });
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      
      let content = `You have ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
      
      if (tasks.length === 0) {
        content = formalityLevel >= 7 
          ? "You have no tasks at the moment, Sir/Madam. Would you like me to help you create some?"
          : "You have no tasks. Want to add some?";
      } else {
        const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
        const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
        const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
        
        if (formalityLevel >= 7) {
          content = `You have ${pendingTasks.length} pending task${pendingTasks.length !== 1 ? 's' : ''}, ${inProgressTasks.length} in progress, and ${completedTasks.length} completed task${completedTasks.length !== 1 ? 's' : ''}.`;
        }
      }
      
      return this.createSuccessResponse(
        content,
        'task_list',
        { tasks }
      );
    } catch (error) {
      console.error('Failed to get tasks:', error);
      return this.createErrorResponse('Failed to retrieve tasks', error instanceof Error ? error.message : String(error));
    }
  }

  async updateTaskStatus(taskId: string, status: string, context: AgentContext): Promise<AgentResponse> {
    try {
      if (!taskId || !status) {
        return this.createErrorResponse('Task ID and status are required');
      }
      
      const task = await db.task.findUnique({
        where: { id: taskId },
      });
      
      if (!task) {
        return this.createErrorResponse('Task not found');
      }
      
      if (task.userId !== context.userId) {
        return this.createErrorResponse('Unauthorized to update this task');
      }
      
      const updatedTask = await db.task.update({
        where: { id: taskId },
        data: {
          status: status as TaskStatus,
          completedAt: status === TaskStatus.COMPLETED ? new Date() : null,
        },
      });
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      const humorLevel = preferences?.humorLevel || 6;
      
      let content = `Task "${updatedTask.title}" status updated to ${status}`;
      
      if (formalityLevel >= 7) {
        content = `I've updated the task "${updatedTask.title}" to ${status.toLowerCase()}, Sir/Madam.`;
      }
      
      // Add appropriate humor based on status
      if (humorLevel >= 6 && Math.random() < 0.3) {
        if (status === TaskStatus.COMPLETED) {
          content += " Excellent work! Another victory for productivity.";
        } else if (status === TaskStatus.IN_PROGRESS) {
          content += " The journey of a thousand miles begins with a single step... or in this case, a status update.";
        }
      }
      
      return this.createSuccessResponse(
        content,
        'task_list',
        { task: updatedTask },
        {
          greeting: `${this.getGreeting()}, Sir/Madam.`,
          acknowledgment: 'Certainly, Sir/Madam.',
          completion: 'Task status updated successfully.'
        }
      );
    } catch (error) {
      console.error('Failed to update task status:', error);
      return this.createErrorResponse('Failed to update task status', error instanceof Error ? error.message : String(error));
    }
  }
}