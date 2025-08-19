const axios = require('axios');

async function testAIResponse() {
  console.log('🤖 Testing AI Response');
  
  try {
    const response = await axios.post('http://localhost:5001/api/automation/start', {
      userPrompt: 'Create a simple todo app',
      targetCustomers: 'General users',
      projectId: 'test-ai-response',
      autoDeploy: false,
      generateDocumentation: false
    });
    
    console.log('✅ Job started:', response.data);
    
    // Wait a bit and check status
    setTimeout(async () => {
      try {
        const statusResponse = await axios.get(`http://localhost:5001/api/automation/status/${response.data.jobId}`);
        console.log('📊 Job status:', statusResponse.data);
      } catch (error) {
        console.error('❌ Status check failed:', error.response?.data || error.message);
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAIResponse(); 