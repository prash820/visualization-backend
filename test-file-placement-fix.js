const path = require('path');

// Mock the sanitizeGeneratedCode function
function sanitizeGeneratedCode(code) {
  return code;
}

// Test the file placement logic
function testFilePlacement() {
  console.log('🧪 Testing File Placement Fix...\n');
  
  const testCases = [
    // Test cases with explicit type
    { path: 'src/components/Button.tsx', type: 'frontend', expected: 'frontend/src/components/Button.tsx' },
    { path: 'src/controllers/UserController.ts', type: 'backend', expected: 'backend/src/controllers/UserController.ts' },
    { path: 'src/services/AuthService.ts', type: 'backend', expected: 'backend/src/services/AuthService.ts' },
    { path: 'src/hooks/useAuth.ts', type: 'frontend', expected: 'frontend/src/hooks/useAuth.ts' },
    
    // Test cases without type (should use fallback)
    { path: 'src/components/Header.tsx', type: null, expected: 'frontend/src/components/Header.tsx' },
    { path: 'src/models/User.ts', type: null, expected: 'backend/src/models/User.ts' },
    { path: 'src/store/reducers/authReducer.ts', type: null, expected: 'frontend/src/store/reducers/authReducer.ts' },
    { path: 'src/routes/api.ts', type: null, expected: 'backend/src/routes/api.ts' },
    
    // Test cases that already have correct prefix
    { path: 'frontend/src/components/Button.tsx', type: 'frontend', expected: 'frontend/src/components/Button.tsx' },
    { path: 'backend/src/controllers/UserController.ts', type: 'backend', expected: 'backend/src/controllers/UserController.ts' },
    
    // Test ambiguous cases (should default to backend)
    { path: 'src/utils/helpers.ts', type: null, expected: 'backend/src/utils/helpers.ts' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const result = simulateFilePlacement(testCase.path, testCase.type);
    const success = result === testCase.expected;
    
    console.log(`📁 Test: ${testCase.path} (type: ${testCase.type || 'null'})`);
    console.log(`   Expected: ${testCase.expected}`);
    console.log(`   Got:      ${result}`);
    console.log(`   Status:   ${success ? '✅ PASS' : '❌ FAIL'}\n`);
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! File placement fix is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the logic.');
  }
}

// Simulate the file placement logic from the generator
function simulateFilePlacement(originalPath, fileType) {
  let filePath = originalPath;
  let fallbackUsed = false;
  
  // Determine file type if not present
  if (!fileType) {
    // Infer from path as fallback
    if (/src[\\\/]components|src[\\\/]pages|src[\\\/]hooks|src[\\\/]types|src[\\\/]store/.test(filePath)) {
      fileType = 'frontend';
      fallbackUsed = true;
    } else if (/src[\\\/]controllers|src[\\\/]models|src[\\\/]services|src[\\\/]routes|src[\\\/]middleware/.test(filePath)) {
      fileType = 'backend';
      fallbackUsed = true;
    } else {
      // Default to backend if unclear
      fileType = 'backend';
      fallbackUsed = true;
    }
  }
  
  // CRITICAL FIX: Always ensure file is under frontend/ or backend/
  // If path doesn't start with frontend/ or backend/, prepend the correct prefix
  if (!filePath.startsWith('frontend/') && !filePath.startsWith('backend/')) {
    if (fileType === 'frontend') {
      filePath = 'frontend/' + filePath.replace(/^\/?/, '');
    } else if (fileType === 'backend') {
      filePath = 'backend/' + filePath.replace(/^\/?/, '');
    } else {
      // Fallback to backend if type is still unclear
      filePath = 'backend/' + filePath.replace(/^\/?/, '');
    }
  }
  
  return filePath;
}

// Run the test
testFilePlacement(); 