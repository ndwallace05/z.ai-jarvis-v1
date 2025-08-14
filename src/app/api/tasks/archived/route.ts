import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const archivedTasks = await db.task.findMany({
      where: { 
        userId,
        isArchived: true,
        parentId: null // Only fetch top-level tasks
      },
      orderBy: [
        { archivedAt: 'desc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        subtasks: {
          orderBy: [
            { priority: 'desc' },
            { dueDate: 'asc' },
            { createdAt: 'desc' }
          ]
        }
      }
    });

    return NextResponse.json({ tasks: archivedTasks });
  } catch (error) {
    console.error('Failed to fetch archived tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch archived tasks' },
      { status: 500 }
    );
  }
}