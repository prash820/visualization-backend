const fs = require('fs-extra');
const path = require('path');

// Ensure dist directory exists
fs.ensureDirSync(path.join(__dirname, 'dist'));

// Copy templates directory
fs.copySync(
  path.join(__dirname, 'src', 'templates'),
  path.join(__dirname, 'dist', 'templates'),
  { overwrite: true }
);

console.log('Templates copied successfully!'); 