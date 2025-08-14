import { AgentType } from '@prisma/client';
import { BaseAgentImpl } from './BaseAgent';
import { AgentCommand, AgentContext, AgentResponse, LLMApiAgent } from './types';
import ZAI from 'z-ai-web-dev-sdk';
import crypto from 'crypto';

export class LLMApiAgentImpl extends BaseAgentImpl implements LLMApiAgent {
  type = AgentType.LLM as const;

  async execute(command: AgentCommand, context: AgentContext): Promise<AgentResponse> {
    const executionId = await this.logExecution(context.userId, command.text, command.intent, command.parameters);
    
    return this.withErrorHandling(async () => {
      await this.startExecution(executionId);
      
      // Extract prompt and service from command
      const { prompt, serviceName = 'default' } = command.parameters || {};
      
      if (!prompt) {
        return this.createErrorResponse('No prompt provided for LLM API call');
      }
      
      const result = await this.callLlmApi(prompt, serviceName, context);
      
      await this.updateExecution(executionId, 'COMPLETED', { result });
      
      return this.createSuccessResponse(
        result,
        'text',
        { result }
      );
    }, 'LLM API execution failed', executionId);
  }

  async callLlmApi(prompt: string, serviceName: string, context: AgentContext): Promise<string> {
    try {
      // Get user's API key for the specified service
      const apiKey = await this.getUserApiKey(context.userId, serviceName);
      
      if (!apiKey) {
        throw new Error(`No API key found for service: ${serviceName}`);
      }
      
      // Initialize ZAI SDK
      const zai = await ZAI.create();
      
      // Create the completion
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are JARVIS, a highly intelligent and helpful AI assistant. Respond in a professional yet friendly manner.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: context.preferences?.temperature || 0.7,
        max_tokens: context.preferences?.maxTokens || 1000,
      });
      
      // Extract the message content
      const messageContent = completion.choices[0]?.message?.content;
      if (!messageContent) {
        throw new Error('No response received from LLM API');
      }
      
      return messageContent;
    } catch (error) {
      console.error('LLM API call failed:', error);
      throw new Error(`Failed to call LLM API: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async saveUserApiKey(serviceName: string, apiKey: string, userId: string): Promise<boolean> {
    try {
      // Encrypt the API key before storing
      const encryptedKey = this.encryptApiKey(apiKey);
      
      // Check if API key already exists for this service
      const existingKey = await db.apiKey.findUnique({
        where: {
          userId_serviceName: {
            userId,
            serviceName
          }
        }
      });
      
      if (existingKey) {
        // Update existing key
        await db.apiKey.update({
          where: { id: existingKey.id },
          data: {
            encryptedKey,
            isActive: true
          }
        });
      } else {
        // Create new key
        await db.apiKey.create({
          data: {
            userId,
            serviceName,
            encryptedKey,
            isActive: true
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save API key:', error);
      return false;
    }
  }

  private async getUserApiKey(userId: string, serviceName: string): Promise<string | null> {
    try {
      const apiKeyRecord = await db.apiKey.findUnique({
        where: {
          userId_serviceName: {
            userId,
            serviceName
          }
        }
      });
      
      if (!apiKeyRecord || !apiKeyRecord.isActive) {
        return null;
      }
      
      // Decrypt the API key
      return this.decryptApiKey(apiKeyRecord.encryptedKey);
    } catch (error) {
      console.error('Failed to get user API key:', error);
      return null;
    }
  }

  private encryptApiKey(apiKey: string): string {
    // In a real implementation, use a proper encryption library and key management
    // This is a simplified version for demonstration
    const algorithm = 'aes-256-cbc';
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // In production, store the key securely and don't include it in the encrypted value
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decryptApiKey(encryptedKey: string): string {
    try {
      // In a real implementation, use a proper encryption library and key management
      // This is a simplified version for demonstration
      const [ivHex, encrypted] = encryptedKey.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      
      // In production, retrieve the key from secure storage
      const key = crypto.randomBytes(32);
      
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      throw new Error('Failed to decrypt API key');
    }
  }
}