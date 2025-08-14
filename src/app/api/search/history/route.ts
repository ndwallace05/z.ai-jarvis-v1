import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const searches = await db.webSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limit to last 20 searches
    });

    return NextResponse.json({ searches });
  } catch (error) {
    console.error('Failed to fetch search history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search history' },
      { status: 500 }
    );
  }
}