import { AgentType, EmailStatus } from '@prisma/client';
import { BaseAgentImpl } from './BaseAgent';
import { AgentCommand, AgentContext, AgentResponse, EmailAgent } from './types';
import { v4 as uuidv4 } from 'uuid';

export class EmailAgentImpl extends BaseAgentImpl implements EmailAgent {
  type = AgentType.EMAIL as const;

  async execute(command: AgentCommand, context: AgentContext): Promise<AgentResponse> {
    const executionId = await this.logExecution(context.userId, command.text, command.intent, command.parameters);
    
    return this.withErrorHandling(async () => {
      await this.startExecution(executionId);
      
      const { intent } = command;
      let response: AgentResponse;
      
      switch (intent) {
        case 'draft_email':
          response = await this.draftEmail(command.parameters || {}, context);
          break;
        case 'send_email':
          response = await this.sendEmail(command.parameters?.emailId, context);
          break;
        case 'summarize_inbox':
          response = await this.summarizeInbox(context);
          break;
        default:
          response = this.createErrorResponse('Unknown email command');
      }
      
      await this.updateExecution(executionId, 'COMPLETED', response);
      return response;
    }, 'Email agent execution failed', executionId);
  }

  async draftEmail(emailData: any, context: AgentContext): Promise<AgentResponse> {
    try {
      const { subject, body, recipients, cc, bcc } = emailData;
      
      if (!subject || !body || !recipients) {
        return this.createErrorResponse('Email subject, body, and recipients are required');
      }
      
      const email = await db.email.create({
        data: {
          id: uuidv4(),
          userId: context.userId,
          subject,
          body,
          recipients: Array.isArray(recipients) ? JSON.stringify(recipients) : JSON.stringify([recipients]),
          cc: cc ? (Array.isArray(cc) ? JSON.stringify(cc) : JSON.stringify([cc])) : null,
          bcc: bcc ? (Array.isArray(bcc) ? JSON.stringify(bcc) : JSON.stringify([bcc])) : null,
          status: EmailStatus.DRAFT,
        },
      });
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      const humorLevel = preferences?.humorLevel || 6;
      
      let content = `Email draft "${subject}" has been created successfully`;
      if (formalityLevel >= 7) {
        content = `I've taken the liberty of drafting the email "${subject}" for you, Sir/Madam.`;
      }
      
      // Add humor occasionally
      if (humorLevel >= 6 && Math.random() < 0.3) {
        content += " Email composition is an art form, and I'm your digital wordsmith!";
      }
      
      return this.createSuccessResponse(
        content,
        'email_view',
        { email },
        {
          greeting: `${this.getGreeting()}, Sir/Madam.`,
          acknowledgment: 'Certainly, Sir/Madam.',
          completion: 'Email draft created successfully.'
        }
      );
    } catch (error) {
      console.error('Failed to draft email:', error);
      return this.createErrorResponse('Failed to draft email', error instanceof Error ? error.message : String(error));
    }
  }

  async sendEmail(emailId: string, context: AgentContext): Promise<AgentResponse> {
    try {
      if (!emailId) {
        return this.createErrorResponse('Email ID is required');
      }
      
      const email = await db.email.findUnique({
        where: { id: emailId },
      });
      
      if (!email) {
        return this.createErrorResponse('Email not found');
      }
      
      if (email.userId !== context.userId) {
        return this.createErrorResponse('Unauthorized to send this email');
      }
      
      // In a real implementation, you would integrate with an email service here
      // For now, we'll just mark it as sent
      const updatedEmail = await db.email.update({
        where: { id: emailId },
        data: {
          status: EmailStatus.SENT,
        },
      });
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      const humorLevel = preferences?.humorLevel || 6;
      
      let content = `Email "${updatedEmail.subject}" has been sent successfully`;
      if (formalityLevel >= 7) {
        content = `I've successfully sent the email "${updatedEmail.subject}" for you, Sir/Madam.`;
      }
      
      // Add humor occasionally
      if (humorLevel >= 6 && Math.random() < 0.3) {
        content += " Message delivered! The digital pigeons have found their destination.";
      }
      
      return this.createSuccessResponse(
        content,
        'email_view',
        { email: updatedEmail },
        {
          greeting: `${this.getGreeting()}, Sir/Madam.`,
          acknowledgment: 'With pleasure, Sir/Madam.',
          completion: 'Email sent successfully.'
        }
      );
    } catch (error) {
      console.error('Failed to send email:', error);
      return this.createErrorResponse('Failed to send email', error instanceof Error ? error.message : String(error));
    }
  }

  async summarizeInbox(context: AgentContext): Promise<AgentResponse> {
    try {
      // Get all emails for the user
      const emails = await db.email.findMany({
        where: { userId: context.userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      
      const draftEmails = emails.filter(e => e.status === EmailStatus.DRAFT);
      const sentEmails = emails.filter(e => e.status === EmailStatus.SENT);
      const failedEmails = emails.filter(e => e.status === EmailStatus.FAILED);
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      
      let content = `You have ${draftEmails.length} draft${draftEmails.length !== 1 ? 's' : ''}, ${sentEmails.length} sent email${sentEmails.length !== 1 ? 's' : ''}`;
      
      if (failedEmails.length > 0) {
        content += `, and ${failedEmails.length} failed email${failedEmails.length !== 1 ? 's' : ''}`;
      }
      
      if (formalityLevel >= 7) {
        content = `Your email summary shows ${draftEmails.length} draft${draftEmails.length !== 1 ? 's' : ''} awaiting your attention, Sir/Madam, with ${sentEmails.length} email${sentEmails.length !== 1 ? 's' : ''} successfully sent.`;
        
        if (failedEmails.length > 0) {
          content += ` I regret to inform you that ${failedEmails.length} email${failedEmails.length !== 1 ? 's' : ''} failed to send.`;
        }
      }
      
      if (emails.length === 0) {
        content = formalityLevel >= 7 
          ? "Your email inbox is empty, Sir/Madam. Would you like me to help you compose a message?"
          : "No emails found. Want to draft something?";
      }
      
      return this.createSuccessResponse(
        content,
        'email_view',
        { emails, summary: { drafts: draftEmails.length, sent: sentEmails.length, failed: failedEmails.length } }
      );
    } catch (error) {
      console.error('Failed to summarize inbox:', error);
      return this.createErrorResponse('Failed to summarize inbox', error instanceof Error ? error.message : String(error));
    }
  }
}