import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user preferences
    const preferences = await db.userPreferences.findUnique({
      where: { userId },
    });

    // Get API keys
    const apiKeys = await db.apiKey.findMany({
      where: { userId },
    });

    return NextResponse.json({
      data: {
        preferences,
        apiKeys,
      },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, preferences, apiKeys } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update or create user preferences
    if (preferences) {
      await db.userPreferences.upsert({
        where: { userId },
        update: preferences,
        create: {
          userId,
          ...preferences,
        },
      });
    }

    // Update API keys
    if (apiKeys && Array.isArray(apiKeys)) {
      for (const apiKey of apiKeys) {
        if (apiKey.id) {
          // Update existing API key
          await db.apiKey.update({
            where: { id: apiKey.id },
            data: {
              serviceName: apiKey.serviceName,
              encryptedKey: apiKey.encryptedKey,
              isActive: apiKey.isActive,
            },
          });
        } else {
          // Create new API key
          await db.apiKey.create({
            data: {
              userId,
              serviceName: apiKey.serviceName,
              encryptedKey: apiKey.encryptedKey,
              isActive: apiKey.isActive,
            },
          });
        }
      }
    }

    return NextResponse.json({
      data: { message: 'Settings saved successfully' },
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}