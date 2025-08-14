import { AgentType } from '@prisma/client';
import { BaseAgentImpl } from './BaseAgent';
import { AgentCommand, AgentContext, AgentResponse, DocAgent } from './types';
import { v4 as uuidv4 } from 'uuid';

export class DocAgentImpl extends BaseAgentImpl implements DocAgent {
  type = AgentType.DOC as const;

  async execute(command: AgentCommand, context: AgentContext): Promise<AgentResponse> {
    const executionId = await this.logExecution(context.userId, command.text, command.intent, command.parameters);
    
    return this.withErrorHandling(async () => {
      await this.startExecution(executionId);
      
      const { intent } = command;
      let response: AgentResponse;
      
      switch (intent) {
        case 'create_document':
        case 'create_report':
          response = await this.createReport(
            command.parameters?.title,
            command.parameters?.content,
            context
          );
          break;
        case 'summarize_document':
          response = await this.summarizeDoc(command.parameters?.documentId, context);
          break;
        default:
          response = this.createErrorResponse('Unknown document command');
      }
      
      await this.updateExecution(executionId, 'COMPLETED', response);
      return response;
    }, 'Document agent execution failed', executionId);
  }

  async createReport(title: string, content: string, context: AgentContext): Promise<AgentResponse> {
    try {
      if (!title || !content) {
        return this.createErrorResponse('Document title and content are required');
      }
      
      const document = await db.document.create({
        data: {
          id: uuidv4(),
          userId: context.userId,
          title,
          content,
          type: 'REPORT',
        },
      });
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      const humorLevel = preferences?.humorLevel || 6;
      
      let responseContent = `Document "${title}" has been created successfully`;
      if (formalityLevel >= 7) {
        responseContent = `I've taken the liberty of creating the document "${title}" for you, Sir/Madam.`;
      }
      
      // Add humor occasionally
      if (humorLevel >= 6 && Math.random() < 0.3) {
        responseContent += " Document creation complete! Another masterpiece added to your collection.";
      }
      
      return this.createSuccessResponse(
        responseContent,
        'document_view',
        { document },
        {
          greeting: `${this.getGreeting()}, Sir/Madam.`,
          acknowledgment: 'Certainly, Sir/Madam.',
          completion: 'Document created successfully.'
        }
      );
    } catch (error) {
      console.error('Failed to create document:', error);
      return this.createErrorResponse('Failed to create document', error instanceof Error ? error.message : String(error));
    }
  }

  async summarizeDoc(documentId: string, context: AgentContext): Promise<AgentResponse> {
    try {
      if (!documentId) {
        return this.createErrorResponse('Document ID is required');
      }
      
      const document = await db.document.findUnique({
        where: { id: documentId },
      });
      
      if (!document) {
        return this.createErrorResponse('Document not found');
      }
      
      if (document.userId !== context.userId) {
        return this.createErrorResponse('Unauthorized to access this document');
      }
      
      // Generate a simple summary (in a real implementation, you would use LLM for this)
      const summary = this.generateSimpleSummary(document.content);
      
      // Update the document with the summary
      const updatedDocument = await db.document.update({
        where: { id: documentId },
        data: { summary },
      });
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      const humorLevel = preferences?.humorLevel || 6;
      
      let content = `Document "${document.title}" has been summarized successfully`;
      if (formalityLevel >= 7) {
        content = `I've generated a summary for the document "${document.title}", Sir/Madam.`;
      }
      
      // Add humor occasionally
      if (humorLevel >= 6 && Math.random() < 0.3) {
        content += " Summarization complete! I've distilled the essence into something more digestible.";
      }
      
      return this.createSuccessResponse(
        content,
        'document_view',
        { document: updatedDocument, summary },
        {
          greeting: `${this.getGreeting()}, Sir/Madam.`,
          acknowledgment: 'Certainly, Sir/Madam.',
          completion: 'Document summarized successfully.'
        }
      );
    } catch (error) {
      console.error('Failed to summarize document:', error);
      return this.createErrorResponse('Failed to summarize document', error instanceof Error ? error.message : String(error));
    }
  }

  private generateSimpleSummary(content: string): string {
    // Simple summarization logic - in a real implementation, use LLM
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const wordCount = content.split(/\s+/).length;
    
    if (sentences.length <= 3) {
      return content; // Already short enough
    }
    
    // Take first and last sentences, plus a middle one
    const firstSentence = sentences[0].trim();
    const middleSentence = sentences[Math.floor(sentences.length / 2)].trim();
    const lastSentence = sentences[sentences.length - 1].trim();
    
    return `${firstSentence}. ${middleSentence}. ${lastSentence}. (Summary: ${wordCount} words condensed)`;
  }
}