import { AgentType } from '@prisma/client';
import { BaseAgentImpl } from './BaseAgent';
import { AgentCommand, AgentContext, AgentResponse, WebSearchAgent } from './types';
import { v4 as uuidv4 } from 'uuid';
import ZAI from 'z-ai-web-dev-sdk';

export class WebSearchAgentImpl extends BaseAgentImpl implements WebSearchAgent {
  type = AgentType.WEB_SEARCH as const;

  async execute(command: AgentCommand, context: AgentContext): Promise<AgentResponse> {
    const executionId = await this.logExecution(context.userId, command.text, command.intent, command.parameters);
    
    return this.withErrorHandling(async () => {
      await this.startExecution(executionId);
      
      const { intent } = command;
      let response: AgentResponse;
      
      switch (intent) {
        case 'web_search':
          response = await this.performSearch(command.parameters?.query, context);
          break;
        case 'scrape_url':
          response = await this.scrapeUrl(command.parameters?.url, context);
          break;
        case 'summarize_web_page':
          response = await this.summarizeWebPage(command.parameters?.url, context);
          break;
        default:
          response = this.createErrorResponse('Unknown web search command');
      }
      
      await this.updateExecution(executionId, 'COMPLETED', response);
      return response;
    }, 'Web search agent execution failed', executionId);
  }

  async scrapeUrl(url: string, context: AgentContext): Promise<AgentResponse> {
    try {
      if (!url) {
        return this.createErrorResponse('URL is required');
      }
      
      // Validate URL format
      try {
        new URL(url);
      } catch {
        return this.createErrorResponse('Invalid URL format');
      }
      
      // In a real implementation, you would use a web scraping library
      // For now, we'll simulate the scraping
      const scrapedContent = await this.simulateWebScraping(url);
      
      // Save the search result
      const webSearch = await db.webSearch.create({
        data: {
          id: uuidv4(),
          userId: context.userId,
          query: `Scrape: ${url}`,
          results: JSON.stringify([{
            url,
            title: 'Scraped Content',
            snippet: scrapedContent.substring(0, 200) + '...',
            content: scrapedContent
          }]),
          urls: JSON.stringify([url]),
        },
      });
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      const humorLevel = preferences?.humorLevel || 6;
      
      let content = `Content from ${url} has been scraped successfully`;
      if (formalityLevel >= 7) {
        content = `I've successfully scraped the content from ${url} for you, Sir/Madam.`;
      }
      
      // Add humor occasionally
      if (humorLevel >= 6 && Math.random() < 0.3) {
        content += " Web scraping complete! I've extracted the digital essence for your analysis.";
      }
      
      return this.createSuccessResponse(
        content,
        'link',
        { url, content: scrapedContent, webSearch },
        {
          greeting: `${this.getGreeting()}, Sir/Madam.`,
          acknowledgment: 'Certainly, Sir/Madam.',
          completion: 'Web content scraped successfully.'
        }
      );
    } catch (error) {
      console.error('Failed to scrape URL:', error);
      return this.createErrorResponse('Failed to scrape URL', error instanceof Error ? error.message : String(error));
    }
  }

  async summarizeWebPage(url: string, context: AgentContext): Promise<AgentResponse> {
    try {
      if (!url) {
        return this.createErrorResponse('URL is required');
      }
      
      // First scrape the content
      const scrapedContent = await this.simulateWebScraping(url);
      
      // Generate summary using LLM
      const summary = await this.generateSummaryWithLLM(scrapedContent, context);
      
      // Save the search result with summary
      const webSearch = await db.webSearch.create({
        data: {
          id: uuidv4(),
          userId: context.userId,
          query: `Summarize: ${url}`,
          results: JSON.stringify([{
            url,
            title: 'Summarized Content',
            snippet: summary.substring(0, 200) + '...',
            summary
          }]),
          urls: JSON.stringify([url]),
          summary,
        },
      });
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      const humorLevel = preferences?.humorLevel || 6;
      
      let content = `Web page ${url} has been summarized successfully`;
      if (formalityLevel >= 7) {
        content = `I've generated a comprehensive summary of the web page ${url} for you, Sir/Madam.`;
      }
      
      // Add humor occasionally
      if (humorLevel >= 6 && Math.random() < 0.3) {
        content += " Summary complete! I've distilled the web page to its essential components.";
      }
      
      return this.createSuccessResponse(
        content,
        'link',
        { url, summary, webSearch },
        {
          greeting: `${this.getGreeting()}, Sir/Madam.`,
          acknowledgment: 'Certainly, Sir/Madam.',
          completion: 'Web page summarized successfully.'
        }
      );
    } catch (error) {
      console.error('Failed to summarize web page:', error);
      return this.createErrorResponse('Failed to summarize web page', error instanceof Error ? error.message : String(error));
    }
  }

  async performSearch(query: string, context: AgentContext): Promise<AgentResponse> {
    try {
      if (!query) {
        return this.createErrorResponse('Search query is required');
      }
      
      // Use ZAI SDK to perform web search
      const zai = await ZAI.create();
      
      const searchResult = await zai.functions.invoke("web_search", {
        query,
        num: 10
      });
      
      // Save the search results
      const webSearch = await db.webSearch.create({
        data: {
          id: uuidv4(),
          userId: context.userId,
          query,
          results: JSON.stringify(searchResult),
          urls: JSON.stringify(searchResult.map((item: any) => item.url)),
        },
      });
      
      const preferences = await this.getUserPreferences(context.userId);
      const formalityLevel = preferences?.formalityLevel || 7;
      const humorLevel = preferences?.humorLevel || 6;
      
      let content = `Found ${searchResult.length} result${searchResult.length !== 1 ? 's' : ''} for "${query}"`;
      if (formalityLevel >= 7) {
        content = `I've conducted a thorough search for "${query}" and found ${searchResult.length} result${searchResult.length !== 1 ? 's' : ''}, Sir/Madam.`;
      }
      
      // Add humor occasionally
      if (humorLevel >= 6 && Math.random() < 0.3) {
        content += " Search complete! The web has been combed for your information needs.";
      }
      
      return this.createSuccessResponse(
        content,
        'link',
        { query, results: searchResult, webSearch },
        {
          greeting: `${this.getGreeting()}, Sir/Madam.`,
          acknowledgment: 'Certainly, Sir/Madam.',
          completion: 'Web search completed successfully.'
        }
      );
    } catch (error) {
      console.error('Failed to perform web search:', error);
      return this.createErrorResponse('Failed to perform web search', error instanceof Error ? error.message : String(error));
    }
  }

  private async simulateWebScraping(url: string): Promise<string> {
    // Simulate web scraping - in a real implementation, use a proper scraping library
    return `This is simulated scraped content from ${url}. In a real implementation, this would contain the actual text content extracted from the web page. The content would include the main text, headings, and other relevant information from the page, excluding navigation elements, ads, and other non-content items.`;
  }

  private async generateSummaryWithLLM(content: string, context: AgentContext): Promise<string> {
    try {
      // Use ZAI SDK to generate summary
      const zai = await ZAI.create();
      
      const summaryPrompt = `Please provide a concise summary of the following content:\n\n${content.substring(0, 2000)}...`;
      
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise summaries of web content.'
          },
          {
            role: 'user',
            content: summaryPrompt
          }
        ],
        temperature: context.preferences?.temperature || 0.5,
        max_tokens: context.preferences?.maxTokens || 500,
      });
      
      return completion.choices[0]?.message?.content || 'Summary generation failed';
    } catch (error) {
      console.error('Failed to generate summary with LLM:', error);
      return 'Failed to generate summary';
    }
  }
}