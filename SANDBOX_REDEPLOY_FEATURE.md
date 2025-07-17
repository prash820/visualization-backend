# Sandbox Redeploy Feature

## Overview

The sandbox redeploy feature allows users to retry sandbox creation when it fails, leveraging the AI-powered auto-fixing system to resolve TypeScript errors and other issues automatically.

## Features

### 🔄 **One-Click Redeploy**
- Retry failed sandbox deployments with a single click
- Automatic cleanup of previous failed attempts
- Fresh sandbox environment creation

### 🤖 **AI-Powered Auto-Fixes**
- Automatically detects and fixes TypeScript errors
- Resolves dependency issues
- Handles AWS SDK compatibility problems
- Fixes Express.js type extensions

### 📊 **Enhanced Status Tracking**
- Real-time progress monitoring
- Detailed error reporting
- Build and runtime logs
- Test results display

## How It Works

### 1. **Failure Detection**
When a sandbox fails, the UI shows:
- Failed status badge
- Error details in the logs tab
- Redeploy button with AI fixes indicator

### 2. **Redeploy Process**
```typescript
// User clicks "Redeploy with AI Fixes"
const redeploySandbox = async () => {
  // 1. Clean up previous failed job
  // 2. Create new sandbox job
  // 3. Apply AI auto-fixes during build
  // 4. Retry with enhanced error resolution
}
```

### 3. **AI Auto-Fix Integration**
The redeploy process uses the enhanced `buildWithAutoFix()` system:
- **Round 1**: Normal build attempt
- **Round 2**: AI auto-fix + retry build  
- **Round 3**: Second AI auto-fix + final build

## UI Components

### **Redeploy Button**
```tsx
{sandboxStatus.status === 'failed' && (
  <Button
    size="sm"
    variant="destructive"
    onClick={redeploySandbox}
    disabled={isLoading}
    className="w-full"
  >
    {isLoading ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Redeploying...
      </>
    ) : (
      <>
        <RotateCcw className="mr-2 h-4 w-4" />
        Redeploy with AI Fixes
      </>
    )}
  </Button>
)}
```

### **Status Indicators**
- **Failed**: Red badge with redeploy option
- **Processing**: Loading spinner with progress
- **Completed**: Green badge with sandbox URL

## API Endpoints

### **Create Sandbox**
```http
POST /api/sandbox/create
Content-Type: application/json

{
  "projectId": "string",
  "appCode": "object"
}
```

### **Redeploy Sandbox**
```http
POST /api/sandbox/redeploy
Content-Type: application/json

{
  "projectId": "string"
}
```

### **Get Sandbox Status**
```http
GET /api/sandbox/status/{jobId}
```

## Backend Implementation

### **Redeploy Controller**
```typescript
export const redeploySandbox = async (req: Request, res: Response) => {
  const { projectId } = req.body;
  
  // 1. Clean up existing failed job
  const existingJob = Object.values(sandboxJobs).find(job => 
    job.projectId === projectId && job.status === 'failed'
  );
  
  if (existingJob) {
    delete sandboxJobs[existingJob.jobId];
  }
  
  // 2. Get project and app code
  const project = await getProjectById(projectId);
  
  // 3. Create new sandbox job
  const jobId = generateSandboxJobId();
  sandboxJobs[jobId] = {
    jobId,
    projectId,
    status: "processing",
    phase: "setup",
    progress: 10,
    lastAccessed: new Date(),
    appCode: project.appCode
  };

  // 4. Start enhanced sandbox setup with AI auto-fixes
  setupSandboxEnvironment(jobId, projectId, project.appCode);
  
  res.json({ 
    jobId, 
    status: "accepted",
    phase: "setup",
    message: "Redeploying sandbox environment...",
    isRedeploy: true
  });
};
```

### **Enhanced Build Process**
```typescript
async function buildWithAutoFix(projectId: string) {
  // Round 1: Normal build
  const buildResult = await runBuildCommand(sandboxDir);
  if (buildResult.success) return { success: true, logs, errors };
  
  // Round 2: AI auto-fix + retry
  const fixResult = await autoFixTypeScriptErrors(projectId, buildResult.output);
  if (fixResult.fixed) {
    const retryResult = await runBuildCommand(sandboxDir);
    if (retryResult.success) return { success: true, logs, errors };
    
    // Round 3: Second AI auto-fix + final attempt
    const secondFixResult = await autoFixTypeScriptErrors(projectId, retryResult.output);
    if (secondFixResult.fixed) {
      const finalResult = await runBuildCommand(sandboxDir);
      return { success: finalResult.success, logs, errors };
    }
  }
  
  return { success: false, logs, errors };
}
```

## Error Types Auto-Fixed

### **TypeScript Errors**
- `string | undefined` → `string` conversions
- Missing type annotations
- Incorrect type assignments
- Optional property access

### **AWS SDK Issues**
- `GetItemCommand` parameter fixes
- `ReturnValues` enum usage
- `AttributeValue` type handling
- Missing `Key` properties

### **Express.js Issues**
- Request type extensions for user data
- JWT verification with proper secret handling
- Missing middleware imports

### **Dependency Issues**
- Missing `express-validator` imports
- `aws-lambda` type declarations
- `serverless-http` imports
- Environment variable safety

## User Experience Flow

### **1. Initial Sandbox Creation**
```
User clicks "Create Sandbox" 
→ Sandbox creation starts
→ Progress tracking with phases
→ Success or failure
```

### **2. Sandbox Failure**
```
Sandbox fails with errors
→ UI shows failed status
→ Error details in logs tab
→ Redeploy button appears
```

### **3. Redeploy with AI Fixes**
```
User clicks "Redeploy with AI Fixes"
→ Previous failed job cleaned up
→ New sandbox job created
→ AI auto-fixes applied during build
→ Enhanced error resolution
→ Success or detailed failure info
```

## Benefits

### **For Users**
- ✅ **No Manual Debugging**: AI automatically fixes common issues
- ✅ **Faster Recovery**: One-click retry instead of manual troubleshooting
- ✅ **Better Success Rate**: Multi-round AI fixing improves success chances
- ✅ **Clear Feedback**: Detailed logs and error information

### **For Developers**
- ✅ **Reduced Support**: Fewer manual interventions needed
- ✅ **Learning System**: AI learns from fixes for future improvements
- ✅ **Robust Pipeline**: More reliable sandbox creation process
- ✅ **Better UX**: Users can self-serve through failures

## Configuration

### **Environment Variables**
```bash
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### **Error Thresholds**
- **Max Rounds**: 3 AI fix attempts
- **Max Tokens**: 4000 per AI request
- **Temperature**: 0.1 (low creativity, high accuracy)

## Monitoring and Logging

### **Redeploy Logs**
```
🤖 Starting AI-powered TypeScript error auto-fix...
📋 Found 41 TypeScript errors to fix
📁 Errors found in 15 files
🔧 Fixing errors in src/models/Note.ts...
✅ Fixed 9 errors in src/models/Note.ts
🎯 Auto-fix completed: 35 errors fixed out of 41 total errors
🔄 Retrying build after auto-fix...
✅ Build successful after auto-fix!
```

### **Status Tracking**
- Job creation timestamps
- Phase progression tracking
- Error categorization
- Success/failure metrics

## Future Enhancements

### **1. Smart Redeploy**
- Analyze failure patterns
- Suggest specific fixes
- Learn from successful redeploys

### **2. Advanced Error Categories**
- Semantic error analysis
- Custom fix strategies
- Integration with ESLint rules

### **3. Performance Optimization**
- Parallel file processing
- Caching of common fixes
- Incremental fixing strategies

### **4. User Control**
- Configurable auto-fix preferences
- Manual approval for certain fixes
- Rollback capabilities

## Example Usage

### **Frontend Integration**
```tsx
// In AppDevelopment.tsx
const redeploySandbox = async () => {
  const response = await fetch('/api/sandbox/redeploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId })
  });

  const result = await response.json();
  setSandboxJobId(result.jobId);
  setCurrentPhase('sandbox');
  
  toast({
    title: 'Sandbox Redeploy Started',
    description: 'Your sandbox environment is being redeployed with AI auto-fixes...',
  });
};
```

### **Backend Integration**
```typescript
// In sandboxController.ts
const buildResult = await buildWithAutoFix(projectId);

if (buildResult.success) {
  console.log("✅ Build successful with auto-fix");
  job.buildLogs = [...(job.buildLogs || []), ...buildResult.logs];
} else {
  console.log("⚠️ Build failed, but auto-fix attempted");
  job.buildLogs = [...(job.buildLogs || []), ...buildResult.logs];
  job.buildErrors = [...(job.buildErrors || []), ...buildResult.errors];
}
```

## Conclusion

The sandbox redeploy feature transforms the development experience from a brittle, error-prone process into a robust, self-healing system. By combining AI-powered auto-fixing with one-click redeployment, users can now recover from sandbox failures quickly and automatically, leading to faster development cycles and better user satisfaction.

The feature is fully integrated with the existing sandbox system and provides comprehensive error handling, detailed logging, and a smooth user experience that encourages experimentation and rapid iteration. 