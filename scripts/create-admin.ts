/**
 * Script to create admin@gmail.com user
 * Run with: npx tsx scripts/create-admin.ts
 */

import { auth } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

async function createAdmin() {
  const email = 'admin@gmail.com';
  const password = 'Admin@123'; // Change this to a secure password
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ Admin user created successfully!');
    console.log('Email:', userCredential.user.email);
    console.log('UID:', userCredential.user.uid);
    console.log('\nYou can now login with:');
    console.log('Email:', email);
    console.log('Password:', password);
    process.exit(0);
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('✅ Admin user already exists!');
      console.log('Email:', email);
      console.log('Try logging in with your existing password.');
    } else {
      console.error('❌ Error creating admin user:', error.message);
      console.error('Error code:', error.code);
    }
    process.exit(1);
  }
}

createAdmin();
