/**
 * Backend script to sync all Clerk users to Firestore
 * Run with: npx tsx scripts/syncUsers.ts
 */

import { clerkClient } from '@clerk/nextjs/server';
import { userSyncService } from '../lib/userSync';

async function syncAllUsers() {
  try {
    console.log('🔄 Starting bulk user sync from Clerk to Firestore...');
    
    // Get all users from Clerk
    const users = await clerkClient.users.getUserList({
      limit: 100, // Adjust based on your user count
      orderBy: '-created_at'
    });

    console.log(`📊 Found ${users.data.length} users in Clerk`);

    const results = {
      total: users.data.length,
      synced: 0,
      errors: 0,
      errors_list: [] as string[]
    };

    // Sync each user to Firestore
    for (const user of users.data) {
      try {
        await userSyncService.syncUser(user);
        results.synced++;
        console.log(`✅ Synced user: ${user.emailAddresses[0]?.emailAddress || user.id}`);
      } catch (error) {
        results.errors++;
        const errorMsg = `Failed to sync user ${user.id}: ${error}`;
        results.errors_list.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log('🎉 Bulk user sync completed!');
    console.log(`📈 Results: ${results.synced}/${results.total} users synced successfully`);
    
    if (results.errors > 0) {
      console.log(`⚠️ ${results.errors} errors occurred:`);
      results.errors_list.forEach(error => console.log(`  - ${error}`));
    }

    return results;

  } catch (error) {
    console.error('❌ Error in bulk user sync:', error);
    throw error;
  }
}

// Run the sync if this script is executed directly
if (require.main === module) {
  syncAllUsers()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { syncAllUsers };
