import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EmailStatus } from '@prisma/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { userId, subject, body, recipients, cc, bcc, status } = await request.json();

    // Verify email exists and belongs to user
    const existingEmail = await db.email.findUnique({
      where: { id },
    });

    if (!existingEmail) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    if (existingEmail.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: any = {};
    if (subject !== undefined) updateData.subject = subject;
    if (body !== undefined) updateData.body = body;
    if (recipients !== undefined) updateData.recipients = Array.isArray(recipients) ? JSON.stringify(recipients) : JSON.stringify([recipients]);
    if (cc !== undefined) updateData.cc = cc ? (Array.isArray(cc) ? JSON.stringify(cc) : JSON.stringify([cc])) : null;
    if (bcc !== undefined) updateData.bcc = bcc ? (Array.isArray(bcc) ? JSON.stringify(bcc) : JSON.stringify([bcc])) : null;
    if (status !== undefined) updateData.status = status as EmailStatus;

    const updatedEmail = await db.email.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ email: updatedEmail });
  } catch (error) {
    console.error('Failed to update email:', error);
    return NextResponse.json(
      { error: 'Failed to update email' },
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

    // Verify email exists and belongs to user
    const existingEmail = await db.email.findUnique({
      where: { id },
    });

    if (!existingEmail) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    if (existingEmail.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.email.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Email deleted successfully' });
  } catch (error) {
    console.error('Failed to delete email:', error);
    return NextResponse.json(
      { error: 'Failed to delete email' },
      { status: 500 }
    );
  }
}