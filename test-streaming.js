// Test script to demonstrate the streaming functionality
const EventSource = require('eventsource');

async function testStreaming() {
  console.log('🚀 Testing Code Generation Streaming...\n');

  // Step 1: Start a code generation job
  console.log('1. Starting code generation job...');
  const startResponse = await fetch('http://localhost:3001/openai/generate-app-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'Create a simple todo app with React frontend and Node.js backend',
      projectId: 'test-project-123',
      umlDiagrams: {
        classDiagram: 'Sample class diagram',
        sequenceDiagram: 'Sample sequence diagram'
      }
    })
  });

  const startData = await startResponse.json();
  const jobId = startData.jobId;
  
  console.log(`✅ Job started with ID: ${jobId}\n`);

  // Step 2: Connect to the streaming endpoint
  console.log('2. Connecting to streaming endpoint...');
  const eventSource = new EventSource(`http://localhost:3001/openai/code-generation-stream/${jobId}`);

  let messageCount = 0;
  let isCompleted = false;

  eventSource.onmessage = (event) => {
    messageCount++;
    const data = JSON.parse(event.data);
    
    console.log(`📡 Message #${messageCount}:`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Progress: ${data.progress}%`);
    console.log(`   Current Step: ${data.currentStep}`);
    console.log(`   Logs: ${data.logs.length} total`);
    
    // Show the latest log entry
    if (data.logs.length > 0) {
      const latestLog = data.logs[data.logs.length - 1];
      console.log(`   Latest: ${latestLog}`);
    }
    
    if (data.result) {
      console.log(`   ✅ Result available!`);
    }
    
    if (data.error) {
      console.log(`   ❌ Error: ${data.error}`);
    }
    
    console.log('');

    // Check if completed
    if (data.status === 'completed' || data.status === 'failed') {
      isCompleted = true;
      eventSource.close();
      console.log('🎉 Streaming completed!');
    }
  };

  eventSource.onerror = (error) => {
    console.error('❌ EventSource error:', error);
    eventSource.close();
  };

  // Wait for completion or timeout
  const timeout = setTimeout(() => {
    if (!isCompleted) {
      console.log('⏰ Test timeout reached');
      eventSource.close();
    }
  }, 30000); // 30 second timeout

  eventSource.onclose = () => {
    clearTimeout(timeout);
    console.log('🔚 EventSource connection closed');
  };
}

// Run the test
testStreaming().catch(console.error); 