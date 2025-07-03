const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5001';

function formatBytes(bytes) {
  return Math.round(bytes / 1024 / 1024 * 100) / 100;
}

function formatMemory(memory) {
  return {
    used: formatBytes(memory.heapUsed),
    total: formatBytes(memory.heapTotal),
    rss: formatBytes(memory.rss),
    external: formatBytes(memory.external)
  };
}

async function checkMemory() {
  try {
    const response = await fetch(`${API_BASE}/memory`);
    const data = await response.json();
    
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Memory Usage:`, data.memory);
    
    // Check if memory usage is getting high
    const rssValue = parseFloat(data.memory.rss.replace(' MB', ''));
    const heapUsed = parseFloat(data.memory.heapUsed.replace(' MB', ''));
    
    if (rssValue > 400) {
      console.log(`⚠️  WARNING: High RSS memory usage: ${rssValue}MB`);
    }
    
    if (heapUsed > 300) {
      console.log(`⚠️  WARNING: High heap usage: ${heapUsed}MB`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error checking memory:`, error.message);
    return null;
  }
}

async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    const timestamp = new Date().toLocaleTimeString();
    const formatted = formatMemory(data.memory);
    
    console.log(`[${timestamp}] Health Check:`, {
      status: data.status,
      memory: formatted,
      uptime: Math.round(data.uptime) + 's'
    });
    
    // Alert on high memory
    if (formatted.rss > 500) {
      console.log(`🚨 CRITICAL: Memory usage exceeding 500MB (RSS: ${formatted.rss}MB)`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error checking health:`, error.message);
    return null;
  }
}

async function stressTest() {
  console.log("🧪 Starting memory stress test...");
  
  const jobs = [];
  const testPrompt = "Create a simple web application with user authentication";
  
  // Create multiple jobs to test memory management
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(`${API_BASE}/api/generate/iac`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: testPrompt + ` (test ${i})`,
          projectId: `stress-test-${Date.now()}-${i}`,
          umlDiagrams: {}
        })
      });
      
      const data = await response.json();
      jobs.push(data.jobId);
      console.log(`✅ Created test job ${i + 1}: ${data.jobId}`);
      
      // Check memory after each job
      await checkMemory();
      
    } catch (error) {
      console.error(`❌ Failed to create test job ${i}:`, error.message);
    }
  }
  
  console.log(`📊 Created ${jobs.length} test jobs. Monitoring memory for 2 minutes...`);
  
  // Monitor for 2 minutes
  const monitorInterval = setInterval(async () => {
    await checkHealth();
  }, 10000); // Every 10 seconds
  
  setTimeout(() => {
    clearInterval(monitorInterval);
    console.log("✅ Stress test completed");
    process.exit(0);
  }, 120000); // 2 minutes
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'health':
    checkHealth();
    break;
  case 'memory':
    checkMemory();
    break;
  case 'monitor':
    console.log("🔍 Starting continuous memory monitoring (Ctrl+C to stop)...");
    setInterval(checkHealth, 15000); // Every 15 seconds
    break;
  case 'stress':
    stressTest();
    break;
  default:
    console.log("Memory Monitoring Tool");
    console.log("");
    console.log("Usage:");
    console.log("  node monitor-memory.js health     - Single health check");
    console.log("  node monitor-memory.js memory     - Single memory check");
    console.log("  node monitor-memory.js monitor    - Continuous monitoring");
    console.log("  node monitor-memory.js stress     - Run memory stress test");
    console.log("");
    process.exit(1);
} 