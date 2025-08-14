import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TaskStatus } from '@prisma/client';
import ZAI from 'z-ai-web-dev-sdk';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { 
      userId, 
      title, 
      description, 
      priority, 
      status, 
      dueDate,
      estimatedTime,
      actualTime,
      reminderTime,
      action // Special actions: 'archive', 'unarchive', 'create_subtasks', 'create_followups'
    } = await request.json();

    // Verify task exists and belongs to user
    const existingTask = await db.task.findUnique({
      where: { id },
      include: {
        subtasks: true
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (existingTask.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (estimatedTime !== undefined) updateData.estimatedTime = estimatedTime;
    if (actualTime !== undefined) updateData.actualTime = actualTime;
    if (reminderTime !== undefined) updateData.reminderTime = reminderTime ? new Date(reminderTime) : null;
    
    if (status !== undefined) {
      updateData.status = status as TaskStatus;
      updateData.completedAt = status === TaskStatus.COMPLETED ? new Date() : null;
      
      // Auto-archive completed tasks
      if (status === TaskStatus.COMPLETED && !existingTask.isArchived) {
        updateData.isArchived = true;
        updateData.archivedAt = new Date();
      }
    }

    // Handle special actions
    if (action) {
      switch (action) {
        case 'archive':
          updateData.isArchived = true;
          updateData.archivedAt = new Date();
          break;
        case 'unarchive':
          updateData.isArchived = false;
          updateData.archivedAt = null;
          break;
        case 'create_subtasks':
          if (existingTask.aiBreakdown) {
            try {
              const subtasks = JSON.parse(existingTask.aiBreakdown);
              for (const subtask of subtasks) {
                await db.task.create({
                  data: {
                    userId,
                    title: subtask.title,
                    description: subtask.description,
                    parentId: id,
                    priority: existingTask.priority,
                    dueDate: existingTask.dueDate
                  }
                });
              }
            } catch (error) {
              console.error('Failed to create subtasks:', error);
            }
          }
          break;
        case 'create_followups':
          if (existingTask.aiFollowups) {
            try {
              const followups = JSON.parse(existingTask.aiFollowups);
              for (const followup of followups) {
                await db.task.create({
                  data: {
                    userId,
                    title: followup.title,
                    description: followup.description,
                    priority: existingTask.priority
                  }
                });
              }
            } catch (error) {
              console.error('Failed to create follow-up tasks:', error);
            }
          }
          break;
      }
    }

    const updatedTask = await db.task.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify task exists and belongs to user
    const existingTask = await db.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (existingTask.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete subtasks first
    await db.task.deleteMany({
      where: { parentId: id },
    });

    // Delete the task
    await db.task.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}