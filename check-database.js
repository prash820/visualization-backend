const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'data/infraai.db');
const db = new Database(dbPath);

console.log('🔍 Checking database for project project-1755154248274...');

// Get all jobs for the specific project
const stmt = db.prepare('SELECT * FROM jobs WHERE projectId = ? ORDER BY updatedAt DESC');
const rows = stmt.all('project-1755154248274');

console.log(`Found ${rows.length} jobs for project project-1755154248274:\n`);

rows.forEach((row, index) => {
  console.log(`Job ${index + 1}:`);
  console.log(`  ID: ${row.id}`);
  console.log(`  Type: ${row.type}`);
  console.log(`  Status: ${row.status}`);
  console.log(`  Phase: ${row.phase}`);
  console.log(`  Has Result: ${!!row.result}`);
  console.log(`  Result Type: ${typeof row.result}`);
  console.log(`  Result Length: ${row.result ? row.result.length : 0}`);
  
  if (row.result) {
    console.log(`  Result Preview: ${row.result.substring(0, 200)}...`);
    
    try {
      const parsed = JSON.parse(row.result);
      console.log(`  ✅ Result is valid JSON`);
      console.log(`  Parsed keys: ${Object.keys(parsed).join(', ')}`);
    } catch (error) {
      console.log(`  ❌ Result is NOT valid JSON: ${error.message}`);
    }
  }
  
  console.log('');
});

db.close(); 