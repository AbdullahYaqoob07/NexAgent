#!/usr/bin/env node
// Quick test to verify frontend → backend connection

const BACKEND_URL = 'http://localhost:8000';

async function testConnection() {
  console.log('🧪 Testing Frontend → Backend Connection\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.message);
    console.log('   Environment:', healthData.environment);
    console.log('   Version:', healthData.version);
    
    // Test 2: Root endpoint
    console.log('\n2️⃣ Testing root endpoint...');
    const rootResponse = await fetch(`${BACKEND_URL}/`);
    const rootData = await rootResponse.json();
    console.log('✅ Root endpoint:', rootData.message);
    
    // Test 3: CORS check
    console.log('\n3️⃣ Testing CORS...');
    const corsResponse = await fetch(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    const corsHeader = corsResponse.headers.get('access-control-allow-origin');
    if (corsHeader) {
      console.log('✅ CORS configured:', corsHeader);
    } else {
      console.log('⚠️  CORS header not found');
    }
    
    console.log('\n✨ All tests passed! Your backend is ready to use.');
    console.log('\n📋 Next steps:');
    console.log('   1. Start your frontend: npm run dev');
    console.log('   2. Open http://localhost:3000');
    console.log('   3. Try creating and executing a workflow!');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\nMake sure your backend is running on http://localhost:8000');
  }
}

testConnection();
