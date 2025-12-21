#!/usr/bin/env node
// Quick test to verify frontend → backend connection

const BACKEND_URL = 'http://localhost:8000';

async function testConnection() {
  
  try {
    // Test 1: Health check
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthResponse.json();
    
    // Test 2: Root endpoint
    const rootResponse = await fetch(`${BACKEND_URL}/`);
    const rootData = await rootResponse.json();
    
    // Test 3: CORS check
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
    
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\nMake sure your backend is running on http://localhost:8000');
  }
}

testConnection();
