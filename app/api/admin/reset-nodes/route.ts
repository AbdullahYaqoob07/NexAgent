import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { seedAllNodes } from '@/lib/admin/seed-nodes';

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Clearing all existing nodes...');
    
    // Get all existing nodes
    const nodesCollection = collection(db, 'nodeDefinitions');
    const querySnapshot = await getDocs(nodesCollection);
    
    // Delete each node
    const deletePromises = querySnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'nodeDefinitions', docSnapshot.id))
    );
    
    await Promise.all(deletePromises);
    console.log(`🗑️ Deleted ${querySnapshot.docs.length} existing nodes`);
    
    // Seed with new comprehensive nodes
    console.log('🌱 Seeding comprehensive nodes...');
    await seedAllNodes();
    
    return NextResponse.json({
      success: true,
      message: 'Database reset and reseeded successfully',
      deletedCount: querySnapshot.docs.length
    });
  } catch (error) {
    console.error('❌ Error resetting nodes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset nodes',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}