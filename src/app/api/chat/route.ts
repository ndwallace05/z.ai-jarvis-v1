import { NextRequest, NextResponse } from 'next/server';
import { agentManager } from '@/lib/agents/AgentManager';

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json();

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and user ID are required' },
        { status: 400 }
      );
    }

    // Process the command through the agent manager
    const response = await agentManager.processUserCommand(message, {
      userId,
      preferences: {
        formalityLevel: 7,
        humorLevel: 6,
        britishAccent: true,
        temperature: 0.7,
        maxTokens: 1000
      }
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat processing failed:', error);
    return NextResponse.json(
      { 
        status: 'error',
        type: 'text',
        data: {
          content: 'I apologize, Sir/Madam. I encountered an error while processing your request.',
        },
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}