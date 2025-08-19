const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'data/infraai.db');
const db = new Database(dbPath);

console.log('🔧 Fixing corrupted job results in database...');

// Get all jobs
const stmt = db.prepare('SELECT * FROM jobs');
const rows = stmt.all();

let fixedCount = 0;

rows.forEach(row => {
  if (row.result) {
    try {
      // Try to parse the result
      const parsed = JSON.parse(row.result);
      
      // If it's already an object (which shouldn't happen), stringify it
      if (typeof parsed === 'object' && parsed !== null) {
        const stringified = JSON.stringify(parsed);
        if (stringified !== row.result) {
          // Update the database
          const updateStmt = db.prepare('UPDATE jobs SET result = ? WHERE id = ?');
          updateStmt.run(stringified, row.id);
          fixedCount++;
          console.log(`✅ Fixed job ${row.id}: re-stringified result`);
        }
      }
    } catch (error) {
      console.log(`❌ Job ${row.id} has invalid JSON: ${error.message}`);
      
      // If it's an object string, try to fix it
      if (row.result.includes('[object Object]')) {
        console.log(`🔧 Attempting to fix [object Object] in job ${row.id}`);
        
        // Try to get the actual result from the job
        try {
          // For now, just set it to an empty object
          const updateStmt = db.prepare('UPDATE jobs SET result = ? WHERE id = ?');
          updateStmt.run('{}', row.id);
          fixedCount++;
          console.log(`✅ Fixed job ${row.id}: set to empty object`);
        } catch (updateError) {
          console.log(`❌ Failed to fix job ${row.id}: ${updateError.message}`);
        }
      }
    }
  }
});

console.log(`\n🎉 Database fix complete! Fixed ${fixedCount} jobs.`);
db.close(); 