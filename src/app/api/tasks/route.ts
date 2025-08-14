import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Priority, TaskStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import ZAI from 'z-ai-web-dev-sdk';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const tasks = await db.task.findMany({
      where: { 
        userId,
        isArchived: includeArchived ? undefined : false,
        parentId: null // Only fetch top-level tasks
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
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

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      title, 
      description, 
      priority = 'MEDIUM', 
      dueDate,
      estimatedTime,
      reminderTime,
      parentId
    } = await request.json();

    if (!userId || !title) {
      return NextResponse.json(
        { error: 'User ID and title are required' },
        { status: 400 }
      );
    }

    // Create the task
    const task = await db.task.create({
      data: {
        id: uuidv4(),
        userId,
        title,
        description,
        priority: priority as Priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedTime,
        reminderTime: reminderTime ? new Date(reminderTime) : null,
        parentId
      },
    });

    // Generate AI enhancements if it's a top-level task
    if (!parentId) {
      try {
        const zai = await ZAI.create();
        
        // Generate task breakdown
        const breakdownPrompt = `Break down this task into smaller, manageable subtasks: "${title}". ${description ? `Description: ${description}` : ''} Return a JSON array of subtask objects with "title" and "description" fields.`;
        
        const breakdownResponse = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a task management assistant. Return only valid JSON arrays.'
            },
            {
              role: 'user',
              content: breakdownPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        });

        // Generate time estimate
        const estimatePrompt = `Estimate the time needed to complete this task in minutes: "${title}". ${description ? `Description: ${description}` : ''} Consider complexity and return only a number.`;
        
        const estimateResponse = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a time estimation assistant. Return only a number representing minutes.'
            },
            {
              role: 'user',
              content: estimatePrompt
            }
          ],
          temperature: 0.2,
          max_tokens: 50
        });

        // Generate follow-up tasks
        const followupPrompt = `Suggest 2-3 follow-up tasks that would be logical after completing: "${title}". ${description ? `Description: ${description}` : ''} Return a JSON array of task objects with "title" and "description" fields.`;
        
        const followupResponse = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a task management assistant. Return only valid JSON arrays.'
            },
            {
              role: 'user',
              content: followupPrompt
            }
          ],
          temperature: 0.4,
          max_tokens: 1000
        });

        // Parse and save AI-generated data
        let aiBreakdown = null;
        let aiEstimate = null;
        let aiFollowups = null;

        try {
          aiBreakdown = breakdownResponse.choices[0]?.message?.content;
          aiEstimate = parseInt(estimateResponse.choices[0]?.message?.content || '0');
          aiFollowups = followupResponse.choices[0]?.message?.content;
        } catch (parseError) {
          console.error('Failed to parse AI responses:', parseError);
        }

        // Update task with AI-generated data
        await db.task.update({
          where: { id: task.id },
          data: {
            aiBreakdown,
            aiEstimate: aiEstimate && aiEstimate > 0 ? aiEstimate : null,
            aiFollowups
          }
        });

        // Return enhanced task
        const enhancedTask = await db.task.findUnique({
          where: { id: task.id },
          include: {
            subtasks: true
          }
        });

        return NextResponse.json({ task: enhancedTask }, { status: 201 });
      } catch (aiError) {
        console.error('Failed to generate AI enhancements:', aiError);
        // Return basic task if AI enhancement fails
        return NextResponse.json({ task }, { status: 201 });
      }
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}