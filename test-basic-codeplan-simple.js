// Simple test for basic CodePlan generation
function testBasicCodePlanStructure() {
  console.log('🧪 Testing Basic CodePlan Structure...\n');
  
  // Simulate the basic CodePlan structure
  const basicCodePlan = {
    frontendComponents: [
      {
        name: 'UIComponents',
        children: ['App', 'Header', 'Main', 'Footer'],
        description: 'Basic UI structure components'
      }
    ],
    backendComponents: [
      {
        name: 'APIServices',
        children: ['Server', 'Router', 'Controller'],
        description: 'Basic API structure components'
      }
    ],
    frontendModels: [
      {
        name: 'User',
        properties: ['id: string', 'name: string', 'email: string'],
        methods: ['getName(): string', 'getEmail(): string'],
        description: 'Basic user model'
      }
    ],
    backendModels: [
      {
        name: 'User',
        properties: ['id: string', 'name: string', 'email: string', 'createdAt: Date'],
        methods: ['save(): Promise<User>', 'findById(id: string): Promise<User>'],
        description: 'Basic user model with database operations'
      }
    ],
    frontendDependencies: [
      {
        from: 'App',
        to: 'Header',
        type: 'imports',
        description: 'App imports Header component'
      },
      {
        from: 'App',
        to: 'Main',
        type: 'imports',
        description: 'App imports Main component'
      }
    ],
    backendDependencies: [
      {
        from: 'Controller',
        to: 'Server',
        type: 'uses',
        description: 'Controller uses Server for routing'
      }
    ],
    fileStructure: {
      frontend: [
        {
          path: 'src/components/App.tsx',
          content: '// App component content',
          dependencies: ['./Header', './Main', './Footer'],
          description: 'Main application component',
          type: 'frontend'
        },
        {
          path: 'src/components/Header.tsx',
          content: '// Header component content',
          dependencies: [],
          description: 'Application header component',
          type: 'frontend'
        }
      ],
      backend: [
        {
          path: 'src/server.ts',
          content: '// Server content',
          dependencies: ['./routes'],
          description: 'Main server file',
          type: 'backend'
        },
        {
          path: 'src/routes/index.ts',
          content: '// Router content',
          dependencies: ['../controllers'],
          description: 'Main router file',
          type: 'backend'
        }
      ]
    },
    integration: {
      apiEndpoints: [
        {
          path: '/api/health',
          method: 'GET',
          frontendComponent: 'App',
          backendService: 'Server',
          description: 'Health check endpoint'
        }
      ],
      dataFlow: [
        {
          from: 'App',
          to: 'Server',
          data: 'Health check request/response',
          description: 'Basic health check data flow'
        }
      ]
    }
  };
  
  // Test the structure
  console.log('✅ Basic CodePlan structure created successfully!');
  console.log(`📊 Frontend components: ${basicCodePlan.frontendComponents.length}`);
  console.log(`📊 Backend components: ${basicCodePlan.backendComponents.length}`);
  console.log(`📊 Frontend files: ${basicCodePlan.fileStructure.frontend.length}`);
  console.log(`📊 Backend files: ${basicCodePlan.fileStructure.backend.length}`);
  
  // Verify structure
  console.log('\n📁 Frontend Components:');
  basicCodePlan.frontendComponents.forEach(comp => {
    console.log(`  - ${comp.name}: ${comp.children.join(', ')}`);
  });
  
  console.log('\n📁 Backend Components:');
  basicCodePlan.backendComponents.forEach(comp => {
    console.log(`  - ${comp.name}: ${comp.children.join(', ')}`);
  });
  
  console.log('\n📁 Frontend Files:');
  basicCodePlan.fileStructure.frontend.forEach(file => {
    console.log(`  - ${file.path} (type: ${file.type})`);
  });
  
  console.log('\n📁 Backend Files:');
  basicCodePlan.fileStructure.backend.forEach(file => {
    console.log(`  - ${file.path} (type: ${file.type})`);
  });
  
  // Verify all files have type field
  const frontendFilesWithType = basicCodePlan.fileStructure.frontend.filter(f => f.type === 'frontend');
  const backendFilesWithType = basicCodePlan.fileStructure.backend.filter(f => f.type === 'backend');
  
  console.log(`\n✅ Frontend files with correct type: ${frontendFilesWithType.length}/${basicCodePlan.fileStructure.frontend.length}`);
  console.log(`✅ Backend files with correct type: ${backendFilesWithType.length}/${basicCodePlan.fileStructure.backend.length}`);
  
  if (frontendFilesWithType.length === basicCodePlan.fileStructure.frontend.length &&
      backendFilesWithType.length === basicCodePlan.fileStructure.backend.length) {
    console.log('🎉 All files have correct type field!');
  } else {
    console.log('⚠️  Some files are missing type field');
  }
  
  // Test file paths for proper structure
  console.log('\n📁 File Path Analysis:');
  const frontendPaths = basicCodePlan.fileStructure.frontend.map(f => f.path);
  const backendPaths = basicCodePlan.fileStructure.backend.map(f => f.path);
  
  console.log('Frontend paths:');
  frontendPaths.forEach(path => {
    console.log(`  - ${path}`);
  });
  
  console.log('Backend paths:');
  backendPaths.forEach(path => {
    console.log(`  - ${path}`);
  });
  
  // Check if paths follow expected patterns
  const frontendPathPattern = /^src\//;
  const backendPathPattern = /^src\//;
  
  const frontendPathsValid = frontendPaths.every(path => frontendPathPattern.test(path));
  const backendPathsValid = backendPaths.every(path => backendPathPattern.test(path));
  
  console.log(`\n✅ Frontend paths valid: ${frontendPathsValid}`);
  console.log(`✅ Backend paths valid: ${backendPathsValid}`);
  
  console.log('\n🎉 Basic CodePlan structure test completed successfully!');
  console.log('📝 This structure will be used when no UML diagrams are provided.');
}

// Run the test
testBasicCodePlanStructure(); 