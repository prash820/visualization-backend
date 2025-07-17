#!/usr/bin/env node

const BASE_URL = 'https://chartai-backend-697f80778bd2.herokuapp.com';

async function testMagicWorkflow() {
  console.log('🧪 Testing Magic Workflow Endpoints...\n');

  try {
    // Test 1: Health endpoint
    console.log('1️⃣  Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/api/magic/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health endpoint working');
      console.log(`   Concept jobs: ${healthData.conceptJobs.total}`);
      console.log(`   Build jobs: ${healthData.buildJobs.total}\n`);
    } else {
      console.log('❌ Health endpoint failed');
      console.log(`   Status: ${healthResponse.status}`);
      console.log(`   Response: ${await healthResponse.text()}\n`);
    }

    // Test 2: Start magic flow (new endpoint)
    console.log('2️⃣  Testing new /start endpoint...');
    const startResponse = await fetch(`${BASE_URL}/api/magic/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A simple task management app for small teams',
        targetCustomers: 'Small business owners and team leads who need to organize their daily tasks and track progress'
      })
    });

    if (startResponse.ok) {
      const startData = await startResponse.json();
      console.log('✅ /start endpoint working');
      console.log(`   Job ID: ${startData.jobId}`);
      console.log(`   Status: ${startData.status}`);
      console.log(`   Phase: ${startData.phase}\n`);
      
      // Test 3: Check concept status
      console.log('3️⃣  Testing concept status...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const statusResponse = await fetch(`${BASE_URL}/api/magic/concept-status/${startData.jobId}`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('✅ Concept status endpoint working');
        console.log(`   Status: ${statusData.status}`);
        console.log(`   Phase: ${statusData.phase}`);
        console.log(`   Progress: ${statusData.progress}%\n`);
      } else {
        console.log('❌ Concept status endpoint failed');
        console.log(`   Status: ${statusResponse.status}\n`);
      }
      
    } else {
      console.log('❌ /start endpoint failed');
      console.log(`   Status: ${startResponse.status}`);
      console.log(`   Response: ${await startResponse.text()}\n`);
    }

    // Test 4: Test backward compatibility endpoint
    console.log('4️⃣  Testing backward compatibility /generate-concept endpoint...');
    const compatResponse = await fetch(`${BASE_URL}/api/magic/generate-concept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A simple note-taking app',
        targetCustomers: 'Students and professionals who need to organize their thoughts'
      })
    });

    if (compatResponse.ok) {
      const compatData = await compatResponse.json();
      console.log('✅ Backward compatibility endpoint working');
      console.log(`   Job ID: ${compatData.jobId}`);
      console.log(`   Status: ${compatData.status}`);
      console.log(`   Phase: ${compatData.phase}\n`);
    } else {
      console.log('❌ Backward compatibility endpoint failed');
      console.log(`   Status: ${compatResponse.status}`);
      console.log(`   Response: ${await compatResponse.text()}\n`);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }

  console.log('🏁 Magic Workflow test completed!');
}

// Run the test
testMagicWorkflow(); 