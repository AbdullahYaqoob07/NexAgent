import { NextRequest, NextResponse } from 'next/server';
import { seedAllNodes } from '@/lib/admin/seed-nodes';

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Manual seeding triggered...');
    await seedAllNodes();
    
    return NextResponse.json({
      success: true,
      message: 'Nodes seeded successfully'
    });
  } catch (error) {
    console.error('❌ Error seeding nodes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to seed nodes',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}