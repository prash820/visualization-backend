const fetch = require('node-fetch');

// Test the Terraform generation to ensure it creates valid HCL
async function testTerraformGeneration() {
  console.log("🧪 Testing Terraform generation...");
  
  try {
    // Test OpenAI Controller infrastructure generation
    const response = await fetch('http://localhost:5001/api/openai/generate-iac', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: "Create a simple meal planning app with user authentication and recipe storage",
        projectId: "test-terraform-validation",
        umlDiagrams: {}
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("✅ Successfully generated infrastructure job:", data.jobId);
    
    // Poll for completion
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`http://localhost:5001/api/openai/generate-iac/${data.jobId}`);
      const status = await statusResponse.json();
      
      console.log(`📊 Status: ${status.status} - Progress: ${status.progress}%`);
      
      if (status.status === 'completed') {
        console.log("✅ Infrastructure code generated successfully!");
        
        // Check for invalid "code" blocks
        const terraformCode = status.result.code;
        console.log("🔍 Validating Terraform code...");
        
        // Check for invalid syntax
        if (terraformCode.includes('code {')) {
          console.error("❌ FAIL: Found invalid 'code' blocks in Terraform code");
          console.error("Generated code snippet:", terraformCode.substring(0, 500));
          return false;
        }
        
        // Check for required valid syntax
        if (!terraformCode.includes('filename')) {
          console.error("❌ FAIL: Missing 'filename' parameter in Lambda functions");
          return false;
        }
        
        if (!terraformCode.includes('archive_file')) {
          console.error("❌ FAIL: Missing 'archive_file' data source");
          return false;
        }
        
        if (!terraformCode.includes('source_code_hash')) {
          console.error("❌ FAIL: Missing 'source_code_hash' parameter");
          return false;
        }
        
        console.log("✅ SUCCESS: Terraform code is valid and contains proper Lambda configuration");
        console.log("📄 Generated code length:", terraformCode.length, "characters");
        
        return true;
      }
      
      if (status.status === 'failed') {
        console.error("❌ FAIL: Infrastructure generation failed:", status.error);
        return false;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.error("❌ FAIL: Test timed out after 30 seconds");
    return false;
    
  } catch (error) {
    console.error("❌ FAIL: Test error:", error.message);
    return false;
  }
}

// Run the test
testTerraformGeneration().then(success => {
  if (success) {
    console.log("\n🎉 All tests passed! Terraform generation is working correctly.");
    process.exit(0);
  } else {
    console.log("\n💥 Tests failed! Please check the system prompts and fix the issues.");
    process.exit(1);
  }
}).catch(error => {
  console.error("💥 Test suite failed:", error);
  process.exit(1);
}); 