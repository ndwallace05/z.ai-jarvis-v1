import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EmailStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const emails = await db.email.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Failed to fetch emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, subject, body, recipients, cc, bcc } = await request.json();

    if (!userId || !subject || !body || !recipients) {
      return NextResponse.json(
        { error: 'User ID, subject, body, and recipients are required' },
        { status: 400 }
      );
    }

    const email = await db.email.create({
      data: {
        id: uuidv4(),
        userId,
        subject,
        body,
        recipients: Array.isArray(recipients) ? JSON.stringify(recipients) : JSON.stringify([recipients]),
        cc: cc ? (Array.isArray(cc) ? JSON.stringify(cc) : JSON.stringify([cc])) : null,
        bcc: bcc ? (Array.isArray(bcc) ? JSON.stringify(bcc) : JSON.stringify([bcc])) : null,
        status: EmailStatus.DRAFT,
      },
    });

    return NextResponse.json({ email }, { status: 201 });
  } catch (error) {
    console.error('Failed to create email:', error);
    return NextResponse.json(
      { error: 'Failed to create email' },
      { status: 500 }
    );
  }
}