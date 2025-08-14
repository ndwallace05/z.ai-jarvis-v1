import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { userId, query } = await request.json();

    if (!userId || !query) {
      return NextResponse.json(
        { error: 'User ID and query are required' },
        { status: 400 }
      );
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
        userId,
        query,
        results: JSON.stringify(searchResult),
        urls: JSON.stringify(searchResult.map((item: any) => item.url)),
      },
    });

    return NextResponse.json({ 
      search: webSearch,
      results: searchResult 
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to perform web search:', error);
    return NextResponse.json(
      { error: 'Failed to perform web search' },
      { status: 500 }
    );
  }
}