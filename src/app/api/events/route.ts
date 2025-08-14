import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const events = await db.calendarEvent.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, title, description, startTime, endTime, location, attendees } = await request.json();

    if (!userId || !title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'User ID, title, start time, and end time are required' },
        { status: 400 }
      );
    }

    const event = await db.calendarEvent.create({
      data: {
        id: uuidv4(),
        userId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        attendees: attendees ? JSON.stringify(attendees) : null,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}