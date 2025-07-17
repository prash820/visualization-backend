const axios = require('axios');

async function testHelloWorldApp() {
  console.log('🧪 Testing Hello World App Generation...\n');

  const testPrompt = `Create a simple Hello World application with the following requirements:

Frontend (Next.js/React):
- A main App component that displays a greeting
- A Greeting component that shows "Hello World" with styling
- A Button component that can change the greeting text
- A simple form to input a custom name

Backend (Node.js/Express):
- A simple Express server with health check endpoint
- A greeting controller that returns "Hello World" message
- A user controller to handle custom name submissions
- Basic CORS configuration for frontend communication

The app should be minimal but functional, demonstrating frontend-backend communication.`;

  const testData = {
    prompt: testPrompt,
    projectId: 'test-hello-world-' + Date.now(),
    umlDiagrams: {
      components: [
        {
          name: 'App',
          type: 'frontend',
          category: 'components',
          responsibilities: ['Main application component', 'State management'],
          methods: ['render', 'handleNameChange'],
          interfaces: ['AppProps']
        },
        {
          name: 'Greeting',
          type: 'frontend',
          category: 'components',
          responsibilities: ['Display greeting message'],
          methods: ['render'],
          interfaces: ['GreetingProps']
        },
        {
          name: 'Button',
          type: 'frontend',
          category: 'components',
          responsibilities: ['Handle user interactions'],
          methods: ['handleClick', 'render'],
          interfaces: ['ButtonProps']
        },
        {
          name: 'GreetingController',
          type: 'backend',
          category: 'controllers',
          responsibilities: ['Handle greeting API requests'],
          methods: ['getGreeting', 'postCustomGreeting'],
          interfaces: ['GreetingRequest', 'GreetingResponse']
        },
        {
          name: 'UserController',
          type: 'backend',
          category: 'controllers',
          responsibilities: ['Handle user-related requests'],
          methods: ['getUser', 'createUser'],
          interfaces: ['UserRequest', 'UserResponse']
        },
        {
          name: 'GreetingService',
          type: 'backend',
          category: 'services',
          responsibilities: ['Business logic for greetings'],
          methods: ['generateGreeting', 'validateName'],
          interfaces: ['GreetingServiceInterface']
        }
      ],
      relationships: [
        { from: 'App', to: 'Greeting', type: 'uses', description: 'App renders Greeting component' },
        { from: 'App', to: 'Button', type: 'uses', description: 'App uses Button for interactions' },
        { from: 'GreetingController', to: 'GreetingService', type: 'uses', description: 'Controller uses service for business logic' },
        { from: 'UserController', to: 'GreetingService', type: 'uses', description: 'User controller uses greeting service' }
      ]
    }
  };

  try {
    console.log('📤 Sending test request to code generation endpoint...');
    
    const response = await axios.post('http://localhost:5001/api/code', testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minutes timeout
    });

    console.log('✅ Code generation started successfully!');
    console.log('\n📊 Generation Results:');
    console.log('- Job ID:', response.data.jobId);
    console.log('- Success:', response.data.success);
    console.log('- Message:', response.data.message);
    
    // Poll for job status
    console.log('\n🔄 Polling for job completion...');
    let jobCompleted = false;
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds with 500ms intervals
    
    while (!jobCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
      
      try {
        const statusResponse = await axios.get(`http://localhost:5001/api/code/logs/${response.data.jobId}`);
        const jobStatus = statusResponse.data;
        
        console.log(`\r📈 Progress: ${jobStatus.progress}% - ${jobStatus.currentStep}`);
        
        if (jobStatus.status === 'completed') {
          console.log('\n✅ Code generation completed successfully!');
          console.log('\n📋 Final Results:');
          console.log('- Status:', jobStatus.status);
          console.log('- Progress:', jobStatus.progress + '%');
          console.log('- Logs Count:', jobStatus.logs.length);
          console.log('- Has Result:', !!jobStatus.result);
          
          if (jobStatus.result) {
            console.log('- Frontend Components:', Object.keys(jobStatus.result.frontend?.components || {}).length);
            console.log('- Backend Controllers:', Object.keys(jobStatus.result.backend?.controllers || {}).length);
            console.log('- Backend Models:', Object.keys(jobStatus.result.backend?.models || {}).length);
          }
          
          jobCompleted = true;
        } else if (jobStatus.status === 'failed') {
          console.log('\n❌ Code generation failed!');
          console.log('- Error:', jobStatus.error);
          console.log('- Logs:', jobStatus.logs.slice(-5)); // Last 5 logs
          jobCompleted = true;
        }
      } catch (pollError) {
        console.log(`\r⚠️  Poll attempt ${attempts} failed:`, pollError.message);
      }
    }
    
    if (!jobCompleted) {
      console.log('\n⏰ Timeout: Job did not complete within expected time');
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the backend server is running on port 5001');
    }
  }
}

// Run the test
testHelloWorldApp(); 