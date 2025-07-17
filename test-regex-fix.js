// Test the TypeScript error parsing regex fix
const fs = require('fs');
const path = require('path');

// Sample TypeScript error output (from our manual test)
const sampleTypeScriptErrors = `
src/components/Routing.tsx:55:10 - error TS1128: Declaration or statement expected.
src/components/Routing.tsx:60:3 - error TS1128: Declaration or statement expected.
src/components/Routing.tsx:61:1 - error TS1128: Declaration or statement expected.
src/components/Routing.tsx:69:15 - error TS1109: Expression expected.
src/components/Routing.tsx:69:17 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:69:21 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:69:31 - error TS1435: Unknown keyword or identifier.
src/components/Routing.tsx:69:39 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:69:49 - error TS1435: Unknown keyword or identifier.
src/components/Routing.tsx:70:1 - error TS1003: Identifier expected.
src/components/Routing.tsx:70:17 - error TS1005: ';' expected.
src/components/Routing.tsx:70:25 - error TS1109: Expression expected.
src/components/Routing.tsx:70:31 - error TS1443: Module declaration names may only use ' or " quoted strings.
src/components/Routing.tsx:70:63 - error TS1005: '{' expected.
src/components/Routing.tsx:70:67 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:70:81 - error TS1005: '(' expected.
src/components/Routing.tsx:70:87 - error TS1005: ';' expected.
src/components/Routing.tsx:70:112 - error TS1005: ';' expected.
src/components/Routing.tsx:70:117 - error TS1005: ')' expected.
src/components/Routing.tsx:71:1 - error TS1003: Identifier expected.
src/components/Routing.tsx:71:13 - error TS1005: ';' expected.
src/components/Routing.tsx:71:28 - error TS1109: Expression expected.
src/components/Routing.tsx:71:30 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:71:33 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:71:39 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:71:42 - error TS1435: Unknown keyword or identifier.
src/components/Routing.tsx:71:63 - error TS1228: A type predicate is only allowed in return type position for functions and methods.
src/components/Routing.tsx:71:86 - error TS1005: ';' expected.
src/components/Routing.tsx:71:109 - error TS1005: ';' expected.
src/components/Routing.tsx:72:1 - error TS1003: Identifier expected.
src/components/Routing.tsx:72:14 - error TS1005: ';' expected.
src/components/Routing.tsx:72:25 - error TS1109: Expression expected.
src/components/Routing.tsx:72:31 - error TS1443: Module declaration names may only use ' or " quoted strings.
src/components/Routing.tsx:72:41 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:72:107 - error TS1005: ';' expected.
src/components/Routing.tsx:72:110 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:72:117 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:73:1 - error TS1003: Identifier expected.
src/components/Routing.tsx:73:12 - error TS1005: ';' expected.
src/components/Routing.tsx:73:22 - error TS1109: Expression expected.
src/components/Routing.tsx:73:24 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:73:26 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:73:35 - error TS1435: Unknown keyword or identifier.
src/components/Routing.tsx:73:41 - error TS1228: A type predicate is only allowed in return type position for functions and methods.
src/components/Routing.tsx:73:44 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:73:50 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:73:53 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:73:64 - error TS1005: ';' expected.
src/components/Routing.tsx:73:82 - error TS1005: ';' expected.
src/components/Routing.tsx:73:88 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:74:1 - error TS1003: Identifier expected.
src/components/Routing.tsx:74:24 - error TS1109: Expression expected.
src/components/Routing.tsx:74:26 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:74:30 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:74:40 - error TS1228: A type predicate is only allowed in return type position for functions and methods.
src/components/Routing.tsx:74:43 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:74:54 - error TS1434: Unexpected keyword or identifier.
src/components/Routing.tsx:74:58 - error TS1435: Unknown keyword or identifier.
src/components/Routing.tsx:74:68 - error TS1005: '(' expected.
src/components/Routing.tsx:74:79 - error TS1005: ';' expected.
src/components/Routing.tsx:74:94 - error TS1005: ';' expected.
src/components/Routing.tsx:74:99 - error TS1005: ')' expected.
src/components/Routing.tsx:74:118 - error TS1005: ';' expected.
src/components/Routing.tsx:74:130 - error TS1003: Identifier expected.
src/components/StateManagement.tsx:32:1 - error TS1128: Declaration or statement expected.
src/components/StateManagement.tsx:48:3 - error TS1128: Declaration or statement expected.
src/components/StateManagement.tsx:49:1 - error TS1128: Declaration or statement expected.
src/components/StateManagement.tsx:58:1 - error TS1128: Declaration or statement expected.
src/components/StateManagement.tsx:67:1 - error TS1128: Declaration or statement expected.
src/components/StateManagement.tsx:81:3 - error TS1128: Declaration or statement expected.
src/components/StateManagement.tsx:82:1 - error TS1128: Declaration or statement expected.
src/components/UIComponents.tsx:23:7 - error TS1005: ',' expected.
src/components/UIComponents.tsx:23:12 - error TS1389: 'if' is not allowed as a variable declaration name.
src/components/UIComponents.tsx:43:3 - error TS1128: Declaration or statement expected.
src/components/UIComponents.tsx:73:3 - error TS1128: Declaration or statement expected.
src/components/UIComponents.tsx:74:1 - error TS1128: Declaration or statement expected.
src/components/UIComponents/CalculatorPage.tsx:18:7 - error TS1005: ',' expected.
src/components/UIComponents/CalculatorPage.tsx:29:9 - error TS1109: Expression expected.
src/components/UIComponents/CalculatorPage.tsx:33:3 - error TS1128: Declaration or statement expected.
src/components/UIComponents/CalculatorPage.tsx:34:1 - error TS1128: Declaration or statement expected.
src/components/UIComponents/CalculatorPage.tsx:38:1 - error TS1109: Expression expected.
src/components/UIComponents/CalculatorPage.tsx:38:8 - error TS1005: ';' expected.
src/components/UIComponents/CalculatorPage.tsx:38:9 - error TS1109: Expression expected.
src/components/UIComponents/CalculatorPage.tsx:38:11 - error TS1109: Expression expected.
src/hooks/useCalculator.ts:32:1 - error TS1128: Declaration or statement expected.

Found 87 errors in 5 files.
`;

// Updated regex patterns (from our fix)
function parseTypeScriptErrors(logText) {
  const errors = [];
  const seenErrors = new Set(); // Track seen errors to avoid duplicates
  
  // Helper function to add error if not seen before
  const addError = (error) => {
    const key = `${error.file}:${error.line}:${error.column}:${error.message}`;
    if (!seenErrors.has(key)) {
      seenErrors.add(key);
      errors.push(error);
    }
  };
  
  // Pattern 1: Standard TypeScript errors with file:line:column format
  // Updated to match actual TypeScript output: file:line:column - error TS1234: message
  const tsErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS\d+:\s+(.+)/g;
  let match;

  while ((match = tsErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim()
    });
  }

  // Pattern 10: Declaration or statement expected errors (TS1128)
  const declarationErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1128:\s+(.+)/g;
  while ((match = declarationErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1128'
    });
  }

  // Pattern 11: Expression expected errors (TS1109)
  const expressionErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1109:\s+(.+)/g;
  while ((match = expressionErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1109'
    });
  }

  // Pattern 12: Identifier expected errors (TS1003)
  const identifierErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1003:\s+(.+)/g;
  while ((match = identifierErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1003'
    });
  }

  // Pattern 13: Semicolon expected errors (TS1005)
  const semicolonErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1005:\s+(.+)/g;
  while ((match = semicolonErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1005'
    });
  }

  // Pattern 14: Unexpected keyword or identifier errors (TS1434)
  const unexpectedKeywordErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1434:\s+(.+)/g;
  while ((match = unexpectedKeywordErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1434'
    });
  }

  // Pattern 15: Unknown keyword or identifier errors (TS1435)
  const unknownKeywordErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1435:\s+(.+)/g;
  while ((match = unknownKeywordErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1435'
    });
  }

  // Pattern 18: Variable declaration name errors (TS1389)
  const variableDeclarationErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1389:\s+(.+)/g;
  while ((match = variableDeclarationErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1389'
    });
  }

  return errors;
}

// Test the parsing
console.log('🧪 Testing TypeScript Error Parsing Regex Fix...\n');

const parsedErrors = parseTypeScriptErrors(sampleTypeScriptErrors);

console.log(`📊 Results:`);
console.log(`✅ Total errors parsed: ${parsedErrors.length}`);
console.log(`🎯 Expected errors: 87`);
console.log(`📈 Success rate: ${((parsedErrors.length / 87) * 100).toFixed(1)}%`);

if (parsedErrors.length > 0) {
  console.log('\n📝 Sample parsed errors:');
  parsedErrors.slice(0, 5).forEach((error, index) => {
    console.log(`  ${index + 1}. ${error.file}:${error.line}:${error.column} - ${error.message} (${error.code || 'TS'})`);
  });
  
  if (parsedErrors.length > 5) {
    console.log(`  ... and ${parsedErrors.length - 5} more errors`);
  }
}

// Check for specific error types
const errorTypes = {};
parsedErrors.forEach(error => {
  const code = error.code || 'TS';
  errorTypes[code] = (errorTypes[code] || 0) + 1;
});

console.log('\n📊 Error type breakdown:');
Object.entries(errorTypes).forEach(([code, count]) => {
  console.log(`  ${code}: ${count} errors`);
});

console.log('\n✅ Test completed!'); 