"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMagicHealth = exports.getBuildStatus = exports.getConceptStatus = exports.getInfrastructureStatus = exports.restartFromPhase = exports.retriggerInfraGeneration = exports.provisionInfrastructure = exports.handleUserConfirmation = exports.startMagicFlow = void 0;
const memoryManager_1 = require("../utils/memoryManager");
const projectFileStore_1 = require("../utils/projectFileStore");
const aiProvider_1 = require("../config/aiProvider");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const conceptJobs = {};
const appCreationJobs = {};
// Set up memory management for job stores
memoryManager_1.memoryManager.setupJobStoreCleanup(conceptJobs, "conceptJobs", 40 * 60 * 1000, 25); // 40 min, max 25 jobs
memoryManager_1.memoryManager.setupJobStoreCleanup(appCreationJobs, "appCreationJobs", 60 * 60 * 1000, 20); // 60 min, max 20 jobs
/**
 * Helper function to clean AI responses that may be wrapped in markdown code fences
 */
function cleanJsonResponse(response) {
    let cleaned = response.trim();
    // Remove markdown code fences and language specifiers
    cleaned = cleaned.replace(/^```[\w]*\s*/g, ''); // Remove opening fences with language
    cleaned = cleaned.replace(/\s*```$/g, ''); // Remove closing fences
    // Remove any lines that are just language specifiers
    cleaned = cleaned.replace(/^(typescript|javascript|ts|js|tsx|jsx)\s*$/gm, '');
    // Remove extra whitespace and normalize line endings
    cleaned = cleaned.replace(/^\s*\n/gm, ''); // Remove empty lines at start
    cleaned = cleaned.replace(/\n\s*$/g, ''); // Remove trailing whitespace
    return cleaned.trim();
}
function generateJobId(prefix = 'magic') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
// AI request wrapper with retry logic
function makeAIRequest(prompt_1, systemPrompt_1) {
    return __awaiter(this, arguments, void 0, function* (prompt, systemPrompt, maxRetries = 3) {
        var _a, _b;
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Try OpenAI first
                if (process.env.OPENAI_API_KEY) {
                    try {
                        const messages = systemPrompt
                            ? [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]
                            : [{ role: "user", content: prompt }];
                        const response = yield aiProvider_1.anthropic.messages.create({
                            model: aiProvider_1.ANTHROPIC_MODEL,
                            max_tokens: 4000,
                            temperature: 0.3,
                            messages
                        });
                        const content = response.content[0];
                        const resultText = content.type === 'text' ? content.text : '';
                        return resultText;
                    }
                    catch (error) {
                        if (((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('429')) || ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('quota'))) {
                            console.log(`[Magic Flow] OpenAI rate limit, trying Anthropic...`);
                            return yield makeAnthropicRequest(prompt, systemPrompt);
                        }
                        lastError = error;
                    }
                }
                // Fallback to Anthropic
                if (process.env.ANTHROPIC_SECRET_KEY) {
                    return yield makeAnthropicRequest(prompt, systemPrompt);
                }
                // Wait before retry
                if (attempt < maxRetries) {
                    yield new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
            catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error("All AI providers failed");
    });
}
function makeAnthropicRequest(prompt, systemPrompt) {
    return __awaiter(this, void 0, void 0, function* () {
        const messages = [{ role: "user", content: prompt }];
        const response = yield aiProvider_1.anthropic.messages.create({
            model: aiProvider_1.ANTHROPIC_MODEL,
            max_tokens: 4000,
            temperature: 0.3,
            system: systemPrompt,
            messages
        });
        const content = response.content[0];
        if (content.type === 'text') {
            return content.text;
        }
        throw new Error("Invalid response format from Anthropic");
    });
}
/**
 * PHASE 1: Start Magic Flow - Idea Analysis
 * User provides app idea + target customers, AI analyzes and creates detailed summary
 */
const startMagicFlow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { prompt, targetCustomers, projectId } = req.body;
    if (!prompt) {
        res.status(400).json({ error: "App idea prompt is required" });
        return;
    }
    const jobId = generateJobId('concept');
    console.log(`[Magic Flow] Starting comprehensive analysis for job ${jobId}`);
    conceptJobs[jobId] = {
        status: "processing",
        phase: "analysis",
        progress: 10,
        startTime: new Date(),
        lastAccessed: new Date(),
        userPrompt: prompt,
        targetCustomers: targetCustomers || "General users"
    };
    // Start analysis in background
    analyzeAppIdea(jobId, prompt, targetCustomers, projectId);
    res.json({
        jobId,
        status: "accepted",
        phase: "analysis",
        message: "Starting comprehensive app idea analysis..."
    });
});
exports.startMagicFlow = startMagicFlow;
/**
 * Phase 1 Implementation: Comprehensive App Idea Analysis
 */
function analyzeAppIdea(jobId, prompt, targetCustomers, projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`[Magic Flow] Phase 1: Analyzing app idea for job ${jobId}`);
            conceptJobs[jobId].progress = 20;
            conceptJobs[jobId].lastAccessed = new Date();
            const analysisPrompt = `You are an expert product analyst and software architect. Analyze the following app idea comprehensively and provide a detailed summary.

App Idea: ${prompt}
Target Customers/Users (ICP): ${targetCustomers}

Provide a comprehensive analysis in the following JSON format:
{
  "appSummary": {
    "name": "Suggested app name",
    "description": "Clear, detailed description of what the app does",
    "coreValue": "Main value proposition for users",
    "keyFeatures": ["feature1", "feature2", "feature3"],
    "userJourney": "How users will interact with the app step-by-step"
  },
  "targetAudience": {
    "primaryUsers": "Who will use this app primarily",
    "userPersonas": ["persona1", "persona2"],
    "painPoints": ["pain1", "pain2"],
    "useCases": ["usecase1", "usecase2"]
  },
  "technicalOverview": {
    "appType": "web app|mobile app|desktop app|api service",
    "architecture": "monolithic|microservices|serverless",
    "estimatedComplexity": "simple|medium|complex",
    "keyTechnologies": ["tech1", "tech2"],
    "dataRequirements": "What data the app will handle",
    "integrations": ["integration1", "integration2"]
  },
  "businessModel": {
    "revenueModel": "freemium|subscription|one-time|advertising",
    "marketSize": "estimated market opportunity",
    "competitiveAdvantage": "what makes this app unique",
    "mvpFeatures": ["core feature for MVP"]
  },
  "implementationPlan": {
    "estimatedTimeline": "development time estimate",
    "developmentPhases": ["phase1", "phase2"],
    "riskFactors": ["risk1", "risk2"],
    "successMetrics": ["metric1", "metric2"]
  },
  "recommendation": {
    "viability": "high|medium|low",
    "reasoning": "why this app idea is/isn't viable",
    "suggestedImprovements": ["improvement1", "improvement2"],
    "nextSteps": "what to do next"
  }
}

Be thorough, realistic, and provide actionable insights. Focus on creating a clear picture of what will be built.
Return ONLY the JSON response, no explanations.`;
            const analysisResponse = yield makeAIRequest(analysisPrompt);
            const analysisResult = JSON.parse(cleanJsonResponse(analysisResponse));
            conceptJobs[jobId] = Object.assign(Object.assign({}, conceptJobs[jobId]), { status: "completed", phase: "user_confirmation", progress: 100, analysisResult, endTime: new Date(), lastAccessed: new Date() });
            // Save to project if provided
            if (projectId) {
                try {
                    const project = yield (0, projectFileStore_1.getProjectById)(projectId);
                    if (project) {
                        project.magicAnalysis = analysisResult;
                        project.userPrompt = prompt;
                        project.targetCustomers = targetCustomers;
                        yield (0, projectFileStore_1.saveProject)(project);
                    }
                }
                catch (error) {
                    console.error(`[Magic Flow] Error saving analysis to project ${projectId}:`, error);
                }
            }
            console.log(`[Magic Flow] Phase 1 Complete: Analysis ready for user confirmation`);
        }
        catch (error) {
            console.error(`[Magic Flow] Phase 1 failed for job ${jobId}:`, error);
            conceptJobs[jobId] = Object.assign(Object.assign({}, conceptJobs[jobId]), { status: "failed", phase: "analysis", progress: 100, error: error.message || "Analysis failed", endTime: new Date(), lastAccessed: new Date() });
        }
    });
}
/**
 * PHASE 2: User Confirmation/Rejection
 * User reviews the analysis and either confirms to proceed or rejects to restart
 */
const handleUserConfirmation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId, confirmed, rejectionReason, updatedPrompt, updatedTargetCustomers } = req.body;
    if (!jobId || !conceptJobs[jobId]) {
        res.status(404).json({ error: "Concept job not found" });
        return;
    }
    const job = conceptJobs[jobId];
    memoryManager_1.memoryManager.touchJob(job);
    if (job.phase !== 'user_confirmation') {
        res.status(400).json({ error: "Job is not ready for user confirmation" });
        return;
    }
    if (confirmed) {
        // User confirmed - proceed to UML generation
        console.log(`[Magic Flow] User confirmed concept for job ${jobId}, starting UML generation`);
        const buildJobId = generateJobId('build');
        appCreationJobs[buildJobId] = {
            status: "processing",
            phase: "uml_generation",
            progress: 10,
            startTime: new Date(),
            lastAccessed: new Date(),
            userPrompt: job.userPrompt,
            targetCustomers: job.targetCustomers,
            analysisResult: job.analysisResult,
            userConfirmed: true
        };
        // Start UML generation in background
        generateUMLDiagrams(buildJobId);
        res.json({
            conceptJobId: jobId,
            buildJobId,
            status: "confirmed",
            phase: "uml_generation",
            message: "Concept confirmed! Starting UML diagram generation..."
        });
    }
    else {
        // User rejected - restart with updated prompt if provided
        console.log(`[Magic Flow] User rejected concept for job ${jobId}`);
        job.userConfirmed = false;
        job.rejectionReason = rejectionReason || "User requested changes";
        job.lastAccessed = new Date();
        if (updatedPrompt) {
            // Start new analysis with updated prompt
            const newJobId = generateJobId('concept');
            console.log(`[Magic Flow] Starting new analysis with updated prompt for job ${newJobId}`);
            conceptJobs[newJobId] = {
                status: "processing",
                phase: "analysis",
                progress: 10,
                startTime: new Date(),
                lastAccessed: new Date(),
                userPrompt: updatedPrompt,
                targetCustomers: updatedTargetCustomers || job.targetCustomers
            };
            analyzeAppIdea(newJobId, updatedPrompt, updatedTargetCustomers || job.targetCustomers || "");
            res.json({
                originalJobId: jobId,
                newJobId,
                status: "restarted",
                phase: "analysis",
                message: "Starting new analysis with updated prompt..."
            });
        }
        else {
            res.json({
                jobId,
                status: "rejected",
                phase: "user_confirmation",
                message: "Concept rejected. Please provide an updated prompt to restart."
            });
        }
    }
});
exports.handleUserConfirmation = handleUserConfirmation;
/**
 * PHASE 3: UML Diagram Generation
 * Generate comprehensive UML diagrams (class, sequence, component, architecture)
 */
function generateUMLDiagrams(jobId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`[Magic Flow] Phase 3: Generating UML diagrams for job ${jobId}`);
            const job = appCreationJobs[jobId];
            job.progress = 20;
            job.lastAccessed = new Date();
            const { analysisResult, userPrompt, targetCustomers } = job;
            const umlPrompt = `Based on the comprehensive app analysis, generate detailed UML diagrams.

App Summary: ${JSON.stringify(analysisResult.appSummary, null, 2)}
Technical Overview: ${JSON.stringify(analysisResult.technicalOverview, null, 2)}
Original Prompt: ${userPrompt}
Target Customers: ${targetCustomers}

Generate comprehensive UML diagrams in PlantUML format:

{
  "componentDiagram": "PlantUML component diagram showing system architecture and component relationships",
  "classDiagram": "PlantUML class diagram with detailed classes, attributes, methods, and relationships", 
  "sequenceDiagram": "PlantUML sequence diagram showing key user interactions and system flows",
  "architectureDiagram": "PlantUML deployment diagram showing infrastructure components and deployment architecture"
}

Requirements:
1. Component diagram should show all major system components and their dependencies
2. Class diagram should include detailed business logic classes with methods and attributes
3. Sequence diagram should cover main user flows and system interactions
4. Architecture diagram should show deployment components (databases, servers, APIs, etc.)
5. Use proper PlantUML syntax with @startuml/@enduml blocks
6. Include meaningful component and class names based on the app functionality
7. Show clear relationships and data flow

Return ONLY the JSON response with PlantUML code.`;
            const umlResponse = yield makeAIRequest(umlPrompt);
            const umlDiagrams = JSON.parse(cleanJsonResponse(umlResponse));
            job.progress = 50;
            job.umlDiagrams = umlDiagrams;
            job.phase = 'infra_generation';
            job.lastAccessed = new Date();
            console.log(`[Magic Flow] Phase 3 Complete: UML diagrams generated, starting infrastructure generation`);
            // Automatically proceed to infrastructure generation
            generateInfrastructureCode(jobId);
        }
        catch (error) {
            console.error(`[Magic Flow] Phase 3 failed for job ${jobId}:`, error);
            appCreationJobs[jobId] = Object.assign(Object.assign({}, appCreationJobs[jobId]), { status: "failed", phase: "uml_generation", progress: 100, error: error.message || "UML generation failed", endTime: new Date(), lastAccessed: new Date() });
        }
    });
}
/**
 * PHASE 4: Infrastructure Code Generation
 * Generate Terraform infrastructure code based on architecture diagram
 */
function generateInfrastructureCode(jobId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Use the new fail-safe version for all infrastructure generation
        console.log(`[Magic Flow] Phase 4: Using fail-safe infrastructure generation for job ${jobId}`);
        return generateInfrastructureCodeFailSafe(jobId, false);
    });
}
/**
 * PHASE 5: Application Code Generation
 * Generate application code using enhanced approach with comprehensive UI components
 */
function generateApplicationCode(jobId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            console.log(`[Magic Flow] Phase 5: Generating application code with comprehensive UI components for job ${jobId}`);
            const job = appCreationJobs[jobId];
            job.progress = 80;
            job.phase = 'app_generation';
            job.lastAccessed = new Date();
            const { analysisResult, umlDiagrams, infraCode, userPrompt } = job;
            if (!userPrompt) {
                throw new Error("User prompt is required for application code generation");
            }
            // First, detect app type and get comprehensive component requirements
            const appTypeAnalysis = yield detectAppTypeAndGenerateComponents(userPrompt);
            // Use componentDetails for structured generation if available
            const componentAnalysis = {
                appType: appTypeAnalysis.appType,
                components: appTypeAnalysis.componentDetails || [],
                requiredComponents: appTypeAnalysis.requiredComponents,
                relationships: [], // Will be built from component dependencies
                architecture: {
                    pattern: "layered",
                    layers: ["presentation", "business", "data"]
                }
            };
            console.log(`[Magic Flow] Using ${componentAnalysis.components.length} components for parallel generation`);
            // Generate comprehensive application code using the parallel approach
            const codePrompt = `Based on the app analysis, UML diagrams, and comprehensive component requirements, generate a complete application code structure with comprehensive UI components.

**CRITICAL**: This must be a production-ready application with comprehensive UI component coverage.

App Analysis: ${JSON.stringify(analysisResult, null, 2)}
Component Analysis: ${JSON.stringify(componentAnalysis, null, 2)}
App Type: ${appTypeAnalysis.appType}
Required Components: ${JSON.stringify(appTypeAnalysis.requiredComponents, null, 2)}
UML Diagrams: ${JSON.stringify(umlDiagrams, null, 2)}
Infrastructure Code: ${infraCode}
Original Prompt: ${userPrompt}

**CRITICAL: USE PARALLEL-COMPATIBLE COMPONENT STRUCTURE**
Generate code for each component in the componentAnalysis.components array.
Each component should be independently generatable for parallel processing.

**ENHANCED CODE GENERATION REQUIREMENTS:**
1. **CRITICALLY IMPORTANT**: Generate ALL components from the componentAnalysis.components array
2. Generate ALL components from the required components list
3. Include comprehensive UI component coverage (20-30 frontend components)
4. Break down complex components into focused, single-purpose components
5. Include proper error handling, loading states, and edge case components
6. Add authentication and user management components
7. Include search, filter, and sorting components where applicable
8. Add responsive design components (mobile nav, modals, etc.)
9. Include notification and feedback components
10. Add accessibility components where needed
11. Create reusable components and their usage patterns

**PARALLEL PROCESSING COMPATIBILITY:**
- Each component should be self-contained with minimal dependencies
- Use standardized interfaces for component communication
- Include proper TypeScript typing for all components
- Ensure components can be generated independently

Generate a complete application with comprehensive frontend and backend code structure in the following JSON format:
{
  "frontend": {
    "components": {
      "Login.tsx": "authentication login component code",
      "Register.tsx": "user registration component code",
      "TaskList.tsx": "comprehensive task list component",
      "TaskItem.tsx": "individual task item component",
      "TaskForm.tsx": "task creation/editing form component",
      "TaskDetails.tsx": "task details view component",
      "TaskFilters.tsx": "task filtering component",
      "TaskSearch.tsx": "task search component",
      "Dashboard.tsx": "dashboard overview component",
      "Header.tsx": "main navigation header component",
      "Sidebar.tsx": "sidebar navigation component",
      "Modal.tsx": "reusable modal component",
      "LoadingSpinner.tsx": "loading state component",
      "ErrorBoundary.tsx": "error handling component",
      "Notification.tsx": "notification system component",
      "UserProfile.tsx": "user profile component",
      "Settings.tsx": "user settings component",
      "MobileNav.tsx": "mobile navigation component",
      "Breadcrumbs.tsx": "breadcrumb navigation component",
      "Dropdown.tsx": "dropdown menu component",
      "DatePicker.tsx": "date picker component",
      "Tooltip.tsx": "tooltip component",
      "ConfirmDialog.tsx": "confirmation dialog component"
    },
    "pages": {
      "HomePage.tsx": "main home page",
      "LoginPage.tsx": "login page",
      "DashboardPage.tsx": "dashboard page",
      "TasksPage.tsx": "tasks management page",
      "ProfilePage.tsx": "user profile page",
      "SettingsPage.tsx": "settings page",
      "NotFoundPage.tsx": "404 error page"
    },
    "hooks": {
      "useAuth.ts": "authentication hook",
      "useTasks.ts": "task management hook",
      "useApi.ts": "API communication hook",
      "useNotification.ts": "notification hook",
      "useLocalStorage.ts": "local storage hook"
    },
    "services": {
      "apiService.ts": "API service with comprehensive endpoints",
      "authService.ts": "authentication service",
      "taskService.ts": "task management service",
      "notificationService.ts": "notification service",
      "storageService.ts": "local storage service"
    },
    "utils": {
      "constants.ts": "application constants",
      "helpers.ts": "utility functions",
      "validators.ts": "form validation functions",
      "formatters.ts": "data formatting functions",
      "dateUtils.ts": "date utility functions"
    }
  },
  "backend": {
    "controllers": {
      "authController.ts": "authentication controller with login/register/profile",
      "taskController.ts": "comprehensive task management controller",
      "userController.ts": "user management controller",
      "projectController.ts": "project management controller",
      "searchController.ts": "search functionality controller"
    },
    "models": {
      "User.ts": "user model with validation",
      "Task.ts": "task model with comprehensive properties",
      "Project.ts": "project model",
      "Session.ts": "session model",
      "ActivityLog.ts": "activity logging model"
    },
    "services": {
      "authService.ts": "authentication service",
      "taskService.ts": "task business logic service",
      "userService.ts": "user management service",
      "emailService.ts": "email notification service",
      "searchService.ts": "search functionality service"
    },
    "routes": {
      "authRoutes.ts": "authentication routes",
      "taskRoutes.ts": "task management routes",
      "userRoutes.ts": "user management routes",
      "projectRoutes.ts": "project management routes",
      "searchRoutes.ts": "search routes"
    },
    "middleware": {
      "authMiddleware.ts": "authentication middleware",
      "validationMiddleware.ts": "request validation middleware",
      "errorMiddleware.ts": "error handling middleware",
      "loggingMiddleware.ts": "request logging middleware"
    },
    "utils": {
      "database.ts": "database connection utilities",
      "encryption.ts": "password encryption utilities",
      "logger.ts": "logging utilities",
      "validators.ts": "data validation utilities",
      "emailTemplates.ts": "email template utilities"
    }
  },
  "documentation": "comprehensive documentation for the application"
}

**CRITICAL REQUIREMENTS:**
1. Generate complete, functional TypeScript/JavaScript code for each file
2. Use modern React with hooks and functional components
3. Include proper error handling and validation throughout
4. Follow best practices for the identified architecture
5. Include comprehensive API endpoints and database models
6. Add proper authentication and authorization
7. Include responsive design and mobile-friendly components
8. Add proper loading states and error boundaries
9. Include accessibility features (ARIA labels, keyboard navigation)
10. Add proper TypeScript interfaces and types
11. Include comprehensive form validation
12. Add proper state management patterns
13. Include search, filter, and sorting functionality
14. Add notification and feedback systems
15. Include proper routing and navigation

**BUILD-READY TYPESCRIPT REACT CODE REQUIREMENTS:**

1. **MANDATORY COMPONENT STRUCTURE:**
All React components must follow this exact pattern:
- Import React and necessary hooks (import React, { useState, useEffect } from 'react')
- Define TypeScript interface for props
- Use React.FC with proper typing
- Export default component
- Use .tsx extension for React components

2. **API SERVICE PATTERN:**
All API services must use:
- Simple environment variable pattern: const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'
- Consistent error handling with try/catch blocks
- TypeScript interfaces for all API responses
- NO window object references (breaks during build)
- NO complex environment variable chains

3. **HOOK PATTERN:**
Custom hooks must:
- Import React hooks properly
- Use TypeScript typing for all state
- Return object with state and methods
- Follow standard React hook conventions
- Use proper useEffect dependency arrays

4. **UTILITY PATTERN:**
Utility functions must:
- Use TypeScript function signatures
- Export functions individually
- Include proper error handling
- Use simple environment variable patterns

**CRITICAL VALIDATION CHECKLIST:**
✅ All components use proper TypeScript interfaces
✅ All components import React properly: import React from 'react'
✅ All exports use 'export default ComponentName'
✅ API calls use simple pattern: process.env.REACT_APP_API_URL || 'http://localhost:5000'
✅ No window references in component code
✅ All file extensions are .tsx for components, .ts for utilities
✅ No complex router configurations
✅ All useState and useEffect hooks are properly typed

**ERROR PREVENTION FOR BUILD SUCCESS:**
- NO missing imports (React, useState, useEffect, etc.)
- NO undefined variables or functions
- NO invalid JSX syntax
- NO complex environment variable patterns like window.ENV
- NO .js/.jsx file extensions for TypeScript project
- NO router components that require additional dependencies
- NO Next.js patterns (use React patterns only)
- NO unescaped quotes in JSX strings
- NO missing semicolons in TypeScript
- NO circular imports between components

**FRONTEND REQUIREMENTS:**
- Environment-aware API configuration
- Comprehensive error handling and retry logic
- Loading states for all async operations
- Responsive design for mobile and desktop
- Accessibility features throughout
- Proper form validation and feedback
- Search and filtering capabilities
- Notification system
- User authentication flows
- Dashboard with statistics and overview
- Task management with full CRUD operations
- User profile and settings management

**BACKEND REQUIREMENTS:**
- RESTful API design with proper HTTP methods
- Authentication with JWT tokens
- Input validation and sanitization
- Comprehensive error handling
- Database integration with proper models
- Search functionality with filtering
- Email notifications
- Activity logging
- Rate limiting and security measures
- Proper CORS configuration
- Health check endpoints

**DEPLOYMENT COMPATIBILITY:**
- Environment variables for all configurations
- AWS Lambda compatibility for backend
- S3 static hosting compatibility for frontend
- Proper API Gateway integration
- DynamoDB integration for data storage
- Cognito integration for authentication

Return ONLY the JSON response with the complete application code structure. No explanations, no markdown formatting, just the JSON object with comprehensive code for each file.`;
            // Try to generate application code with retry logic
            const appCode = yield generateApplicationCodeWithRetry(codePrompt, userPrompt, 3);
            const parsedAppCode = JSON.parse(cleanJsonResponse(appCode));
            job.appCode = parsedAppCode;
            console.log(`[Magic Flow] Phase 5 Complete: Comprehensive application code generated with ${Object.keys(((_a = parsedAppCode.frontend) === null || _a === void 0 ? void 0 : _a.components) || {}).length} frontend components`);
            // 🆕 Phase 6: AI Code Validation and Correction
            console.log("[Magic Flow] Phase 6: Starting AI validation and correction...");
            try {
                const aiValidationResult = yield validateAndFixGeneratedCode(parsedAppCode);
                if (aiValidationResult.hasChanges) {
                    console.log(`[Magic Flow] ✅ AI applied ${aiValidationResult.totalFixes} fixes to generated code`);
                    console.log(`[Magic Flow] Frontend fixes: ${aiValidationResult.frontendFixes.length}`);
                    console.log(`[Magic Flow] Backend fixes: ${aiValidationResult.backendFixes.length}`);
                    // Update the job with corrected code
                    job.appCode = aiValidationResult.correctedCode;
                    job.validationReport = aiValidationResult.validationReport;
                    job.fixesApplied = aiValidationResult.frontendFixes.concat(aiValidationResult.backendFixes);
                }
                else {
                    console.log(`[Magic Flow] ✅ Generated code passed AI validation without changes`);
                    job.validationReport = 'AI validation passed - no changes needed';
                    job.fixesApplied = [];
                }
            }
            catch (validationError) {
                console.warn(`[Magic Flow] ⚠️ AI validation failed, using original code:`, validationError);
                job.validationReport = `AI validation warning: ${validationError}`;
                job.fixesApplied = [];
            }
            job.progress = 90;
            job.phase = 'infra_provision';
            job.lastAccessed = new Date();
            console.log("[Magic Flow] Phase 6 Complete: AI validation and correction finished");
            // Ready for manual provisioning trigger
            job.status = "ready_for_provision";
        }
        catch (error) {
            console.error(`[Magic Flow] Phase 5 Error: ${error}`);
            const job = appCreationJobs[jobId];
            job.status = "failed";
            job.error = error instanceof Error ? error.message : String(error);
            job.lastAccessed = new Date();
        }
    });
}
// Helper function to retry generating application code with different prompts/strategies
function generateApplicationCodeWithRetry(prompt_1, userPrompt_1) {
    return __awaiter(this, arguments, void 0, function* (prompt, userPrompt, maxRetries = 3) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[Magic Flow] Attempt ${attempt}/${maxRetries} to generate application code...`);
                const response = yield makeAIRequest(prompt);
                const cleanedResponse = cleanJsonResponse(response);
                // Check if the response is a conversational text or a JSON structure
                if (cleanedResponse.trim().startsWith('"') && cleanedResponse.trim().includes("I'm sorry") ||
                    cleanedResponse.trim().startsWith("I'm sorry") ||
                    cleanedResponse.trim().startsWith("I apologize") ||
                    cleanedResponse.trim().startsWith("I cannot") ||
                    !cleanedResponse.trim().startsWith('{')) {
                    console.warn(`[Magic Flow] AI returned conversational response, retrying with different prompt strategy...`);
                    // If conversational, try to rephrase the prompt or use a different strategy
                    const rephrasePrompt = `Please generate the application code in JSON format, focusing on the app idea: "${userPrompt}". If you cannot generate JSON, please return a JSON object with an "error" key and a message explaining why.`;
                    return yield generateApplicationCodeWithRetry(rephrasePrompt, userPrompt, maxRetries - attempt); // Retry with a different prompt
                }
                // If it's a JSON response, try to parse it
                const parsedResponse = JSON.parse(cleanedResponse);
                // Validate that the parsed result has the expected structure
                if (!parsedResponse.frontend || !parsedResponse.backend) {
                    console.warn(`[Magic Flow] Parsed code missing frontend or backend, retrying with different prompt strategy...`);
                    const fallbackPrompt = `Please generate the application code in JSON format, focusing on the app idea: "${userPrompt}". If you cannot generate JSON, please return a JSON object with an "error" key and a message explaining why.`;
                    return yield generateApplicationCodeWithRetry(fallbackPrompt, userPrompt, maxRetries - attempt); // Retry with a different prompt
                }
                return response; // Return the successful JSON response
            }
            catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    yield new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }
        throw lastError || new Error("All attempts to generate application code failed");
    });
}
// AI Validation Function for Generated Code
function validateAndFixGeneratedCode(generatedCode) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        console.log(`[Magic Flow AI Validation] Starting comprehensive AI code validation...`);
        try {
            // Analyze frontend code for common React/TypeScript issues
            const frontendIssues = analyzeMagicCodeIssues(generatedCode.frontend, 'frontend');
            const backendIssues = analyzeMagicCodeIssues(generatedCode.backend, 'backend');
            // Check if validation is needed
            const totalIssues = frontendIssues.length + backendIssues.length;
            if (totalIssues === 0) {
                return {
                    hasChanges: false,
                    correctedCode: generatedCode,
                    frontendFixes: [],
                    backendFixes: [],
                    totalFixes: 0,
                    validationReport: 'Code validation passed - no issues detected'
                };
            }
            console.log(`[Magic Flow AI Validation] Found ${totalIssues} issues to fix: ${frontendIssues.length} frontend, ${backendIssues.length} backend`);
            // Apply basic local fixes (simplified for magic flow)
            const correctedCode = Object.assign({}, generatedCode);
            const frontendFixes = [];
            const backendFixes = [];
            // Apply basic fixes to frontend components
            if ((_a = correctedCode.frontend) === null || _a === void 0 ? void 0 : _a.components) {
                for (const [fileName, code] of Object.entries(correctedCode.frontend.components)) {
                    let fixedCode = code;
                    // Add React import if missing
                    if (!fixedCode.includes('import React') && (fileName.endsWith('.tsx') || fileName.endsWith('.jsx'))) {
                        fixedCode = `import React from 'react';\n\n${fixedCode}`;
                        frontendFixes.push(`Added React import to ${fileName}`);
                    }
                    // Add default export if missing
                    if (!fixedCode.includes('export default')) {
                        const componentName = fileName.replace(/\.[^/.]+$/, "");
                        fixedCode += `\n\nexport default ${componentName};`;
                        frontendFixes.push(`Added default export to ${fileName}`);
                    }
                    correctedCode.frontend.components[fileName] = fixedCode;
                }
            }
            // Apply basic fixes to backend controllers
            if ((_b = correctedCode.backend) === null || _b === void 0 ? void 0 : _b.controllers) {
                for (const [fileName, code] of Object.entries(correctedCode.backend.controllers)) {
                    let fixedCode = code;
                    // Add exports if missing
                    if (!fixedCode.includes('export') && !fixedCode.includes('module.exports')) {
                        fixedCode += `\n\nmodule.exports = ${fileName.replace(/\.[^/.]+$/, "")}Controller;`;
                        backendFixes.push(`Added exports to ${fileName}`);
                    }
                    correctedCode.backend.controllers[fileName] = fixedCode;
                }
            }
            const totalFixes = frontendFixes.length + backendFixes.length;
            return {
                hasChanges: totalFixes > 0,
                correctedCode,
                frontendFixes,
                backendFixes,
                totalFixes,
                validationReport: `Applied ${totalFixes} local validation fixes`
            };
        }
        catch (error) {
            console.error(`[Magic Flow AI Validation] Error during AI validation:`, error);
            return {
                hasChanges: false,
                correctedCode: generatedCode,
                frontendFixes: [],
                backendFixes: [],
                totalFixes: 0,
                validationReport: `AI validation failed: ${error}`
            };
        }
    });
}
// Helper function to analyze code issues for magic flow
function analyzeMagicCodeIssues(codeSection, sectionType) {
    const issues = [];
    if (!codeSection || typeof codeSection !== 'object') {
        issues.push(`${sectionType} section is missing or invalid`);
        return issues;
    }
    // Check different categories
    for (const [categoryName, category] of Object.entries(codeSection)) {
        if (!category || typeof category !== 'object') {
            issues.push(`${sectionType}/${categoryName} category is missing or invalid`);
            continue;
        }
        for (const [fileName, code] of Object.entries(category)) {
            if (typeof code !== 'string' || !code.trim()) {
                issues.push(`${sectionType}/${categoryName}/${fileName} is empty or invalid`);
                continue;
            }
            // Frontend-specific checks
            if (sectionType === 'frontend') {
                if (categoryName === 'components' && (fileName.endsWith('.tsx') || fileName.endsWith('.jsx'))) {
                    if (!code.includes('import React')) {
                        issues.push(`${fileName} missing React import`);
                    }
                    if (!code.includes('export default')) {
                        issues.push(`${fileName} missing default export`);
                    }
                }
            }
            // Backend-specific checks
            if (sectionType === 'backend') {
                if (categoryName === 'controllers' && !code.includes('export')) {
                    issues.push(`${fileName} missing exports`);
                }
            }
            // General syntax checks
            const braceCount = (code.match(/\{/g) || []).length - (code.match(/\}/g) || []).length;
            if (braceCount !== 0) {
                issues.push(`${fileName} has unmatched braces`);
            }
        }
    }
    return issues;
}
// Helper function to detect app type and generate comprehensive component requirements
function detectAppTypeAndGenerateComponents(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("[Magic Flow] Detecting app type and generating comprehensive component requirements");
        const appTypePrompt = `Analyze the following app description and provide a JSON response with app type and required components:

App Description: ${prompt}

Respond with JSON in this format:
{
  "appType": "task_management" | "e_commerce" | "social_media" | "dashboard" | "blog" | "portfolio" | "booking" | "chat" | "learning" | "finance",
  "requiredComponents": {
    "frontend": ["Login", "Dashboard", "TaskList", "TaskForm", "UserProfile"],
    "backend": ["authController", "taskController", "userController"],
    "pages": ["HomePage", "LoginPage", "DashboardPage"],
    "services": ["authService", "apiService", "taskService"]
  },
  "componentDetails": [
    {
      "name": "ComponentName",
      "type": "frontend" | "backend" | "shared",
      "category": "component" | "page" | "service" | "controller" | "model",
      "responsibilities": ["responsibility1", "responsibility2"],
      "methods": ["method1", "method2"],
      "priority": "high" | "medium" | "low",
      "complexity": "low" | "medium" | "high"
    }
  ]
}

**CRITICAL**: Generate detailed componentDetails array with 15-25 components for comprehensive coverage.
Include frontend components like: Login, Dashboard, Navigation, Forms, Lists, Modals, etc.
Include backend components like: Controllers, Services, Models, Routes, Middleware, etc.`;
        try {
            const response = yield makeAIRequest(appTypePrompt);
            const parsedResponse = JSON.parse(cleanJsonResponse(response));
            // Ensure we have a valid response structure
            if (!parsedResponse.appType) {
                parsedResponse.appType = "web_application";
            }
            if (!parsedResponse.requiredComponents) {
                parsedResponse.requiredComponents = {
                    frontend: ["Dashboard", "Login", "UserProfile"],
                    backend: ["authController", "userController"],
                    pages: ["HomePage", "LoginPage"],
                    services: ["authService", "apiService"]
                };
            }
            // Ensure componentDetails is properly structured for parallel processing
            if (!parsedResponse.componentDetails || !Array.isArray(parsedResponse.componentDetails)) {
                parsedResponse.componentDetails = generateDefaultComponentDetails(parsedResponse.appType);
            }
            console.log(`[Magic Flow] App type detected: ${parsedResponse.appType} with ${parsedResponse.componentDetails.length} components`);
            return parsedResponse;
        }
        catch (error) {
            console.error("[Magic Flow] Error detecting app type:", error);
            // Return a comprehensive default response
            return {
                appType: "web_application",
                requiredComponents: {
                    frontend: ["Dashboard", "Login", "UserProfile", "Navigation", "TaskList", "TaskForm"],
                    backend: ["authController", "userController", "taskController"],
                    pages: ["HomePage", "LoginPage", "DashboardPage"],
                    services: ["authService", "apiService", "taskService"]
                },
                componentDetails: generateDefaultComponentDetails("web_application")
            };
        }
    });
}
// Generate default component details for parallel processing
function generateDefaultComponentDetails(appType) {
    const baseComponents = [
        // Frontend Components
        { name: "Login", type: "frontend", category: "component", responsibilities: ["user authentication", "form validation"], methods: ["handleLogin", "validateForm"], priority: "high", complexity: "medium" },
        { name: "Dashboard", type: "frontend", category: "component", responsibilities: ["data overview", "navigation"], methods: ["fetchData", "renderCharts"], priority: "high", complexity: "high" },
        { name: "UserProfile", type: "frontend", category: "component", responsibilities: ["user info display", "profile editing"], methods: ["loadProfile", "updateProfile"], priority: "medium", complexity: "medium" },
        { name: "Navigation", type: "frontend", category: "component", responsibilities: ["app navigation", "menu display"], methods: ["renderMenu", "handleNavigation"], priority: "high", complexity: "low" },
        { name: "Modal", type: "frontend", category: "component", responsibilities: ["popup dialogs", "overlay content"], methods: ["show", "hide", "handleClose"], priority: "medium", complexity: "low" },
        { name: "LoadingSpinner", type: "frontend", category: "component", responsibilities: ["loading states", "visual feedback"], methods: ["show", "hide"], priority: "low", complexity: "low" },
        { name: "ErrorBoundary", type: "frontend", category: "component", responsibilities: ["error handling", "fallback UI"], methods: ["componentDidCatch", "render"], priority: "medium", complexity: "medium" },
        // Pages
        { name: "HomePage", type: "frontend", category: "page", responsibilities: ["landing page", "initial view"], methods: ["componentDidMount", "render"], priority: "high", complexity: "low" },
        { name: "LoginPage", type: "frontend", category: "page", responsibilities: ["authentication page"], methods: ["handleSubmit", "render"], priority: "high", complexity: "medium" },
        { name: "DashboardPage", type: "frontend", category: "page", responsibilities: ["main app interface"], methods: ["loadData", "render"], priority: "high", complexity: "high" },
        // Services
        { name: "apiService", type: "frontend", category: "service", responsibilities: ["API communication", "request handling"], methods: ["get", "post", "put", "delete"], priority: "high", complexity: "medium" },
        { name: "authService", type: "frontend", category: "service", responsibilities: ["authentication logic", "token management"], methods: ["login", "logout", "getToken"], priority: "high", complexity: "medium" },
        // Backend Components
        { name: "authController", type: "backend", category: "controller", responsibilities: ["authentication endpoints", "user management"], methods: ["login", "register", "profile"], priority: "high", complexity: "medium" },
        { name: "userController", type: "backend", category: "controller", responsibilities: ["user operations", "profile management"], methods: ["getProfile", "updateProfile", "deleteUser"], priority: "medium", complexity: "medium" },
        { name: "User", type: "backend", category: "model", responsibilities: ["user data model", "validation"], methods: ["validate", "save", "findById"], priority: "high", complexity: "low" },
        { name: "authMiddleware", type: "backend", category: "middleware", responsibilities: ["token validation", "route protection"], methods: ["verifyToken", "authorize"], priority: "high", complexity: "medium" }
    ];
    // Add app-specific components based on type
    if (appType === "task_management") {
        baseComponents.push({ name: "TaskList", type: "frontend", category: "component", responsibilities: ["task display", "list management"], methods: ["loadTasks", "renderTasks"], priority: "high", complexity: "medium" }, { name: "TaskForm", type: "frontend", category: "component", responsibilities: ["task creation", "task editing"], methods: ["handleSubmit", "validateTask"], priority: "high", complexity: "medium" }, { name: "TaskItem", type: "frontend", category: "component", responsibilities: ["individual task display"], methods: ["toggleComplete", "editTask"], priority: "medium", complexity: "low" }, { name: "taskController", type: "backend", category: "controller", responsibilities: ["task CRUD operations"], methods: ["createTask", "getTasks", "updateTask", "deleteTask"], priority: "high", complexity: "medium" }, { name: "Task", type: "backend", category: "model", responsibilities: ["task data model"], methods: ["validate", "save", "findByUser"], priority: "high", complexity: "low" });
    }
    return baseComponents;
}
const provisionInfrastructure = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.body;
    if (!jobId || !appCreationJobs[jobId]) {
        res.status(404).json({ error: "Job not found" });
        return;
    }
    try {
        const job = appCreationJobs[jobId];
        job.phase = 'infra_provision';
        job.progress = 95;
        job.lastAccessed = new Date();
        // Here you would integrate with the actual infrastructure provisioning
        // For now, we'll simulate the process
        console.log(`[Magic Flow] Infrastructure provisioning initiated for job ${jobId}`);
        res.json({
            message: "Infrastructure provisioning started",
            jobId: jobId,
            status: "provisioning"
        });
    }
    catch (error) {
        console.error(`[Magic Flow] Infrastructure provisioning error:`, error);
        res.status(500).json({ error: error.message || "Infrastructure provisioning failed" });
    }
});
exports.provisionInfrastructure = provisionInfrastructure;
/**
 * RETRIGGER INFRASTRUCTURE GENERATION
 * Allows regenerating infrastructure code for an existing job
 */
const retriggerInfraGeneration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    const { forceRegenerate, updatedPrompt } = req.body;
    if (!jobId || !appCreationJobs[jobId]) {
        res.status(404).json({ error: "Build job not found" });
        return;
    }
    try {
        const job = appCreationJobs[jobId];
        memoryManager_1.memoryManager.touchJob(job);
        // Check if job has the necessary data for infrastructure generation
        if (!job.analysisResult || !job.umlDiagrams) {
            res.status(400).json({
                error: "Job missing required data (analysis or UML diagrams) for infrastructure generation",
                currentPhase: job.phase,
                hasAnalysis: !!job.analysisResult,
                hasUmlDiagrams: !!job.umlDiagrams
            });
            return;
        }
        console.log(`[Magic Flow] Retriggering infrastructure generation for job ${jobId}`);
        // Update job status for infrastructure regeneration
        job.phase = 'infra_generation';
        job.progress = 60;
        job.status = 'processing';
        job.error = undefined; // Clear previous errors
        job.lastAccessed = new Date();
        // Update prompt if provided
        if (updatedPrompt) {
            job.userPrompt = updatedPrompt;
            console.log(`[Magic Flow] Updated prompt for job ${jobId}`);
        }
        // Start infrastructure generation in background
        generateInfrastructureCodeFailSafe(jobId, forceRegenerate);
        res.json({
            jobId,
            status: "processing",
            phase: "infra_generation",
            message: "Infrastructure code regeneration started",
            forceRegenerate,
            updatedPrompt: !!updatedPrompt
        });
    }
    catch (error) {
        console.error(`[Magic Flow] Error retriggering infrastructure generation:`, error);
        res.status(500).json({
            error: error.message || "Failed to retrigger infrastructure generation"
        });
    }
});
exports.retriggerInfraGeneration = retriggerInfraGeneration;
/**
 * RESTART FROM SPECIFIC PHASE
 * Allows restarting the magic flow from a specific phase
 */
const restartFromPhase = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    const { phase, updatedPrompt, clearErrors } = req.body;
    if (!jobId || !appCreationJobs[jobId]) {
        res.status(404).json({ error: "Build job not found" });
        return;
    }
    try {
        const job = appCreationJobs[jobId];
        memoryManager_1.memoryManager.touchJob(job);
        const validPhases = ['uml_generation', 'infra_generation', 'app_generation'];
        if (!validPhases.includes(phase)) {
            res.status(400).json({
                error: "Invalid phase",
                validPhases,
                requestedPhase: phase
            });
            return;
        }
        console.log(`[Magic Flow] Restarting job ${jobId} from phase: ${phase}`);
        // Clear errors if requested
        if (clearErrors) {
            job.error = undefined;
        }
        // Update prompt if provided
        if (updatedPrompt) {
            job.userPrompt = updatedPrompt;
        }
        // Reset job status
        job.status = 'processing';
        job.phase = phase;
        job.lastAccessed = new Date();
        // Clear downstream results based on restart phase
        if (phase === 'uml_generation') {
            job.progress = 20;
            job.umlDiagrams = undefined;
            job.infraCode = undefined;
            job.appCode = undefined;
            generateUMLDiagrams(jobId);
        }
        else if (phase === 'infra_generation') {
            job.progress = 60;
            job.infraCode = undefined;
            job.appCode = undefined;
            generateInfrastructureCodeFailSafe(jobId, true);
        }
        else if (phase === 'app_generation') {
            job.progress = 80;
            job.appCode = undefined;
            generateApplicationCode(jobId);
        }
        res.json({
            jobId,
            status: "processing",
            phase,
            message: `Restarted from phase: ${phase}`,
            clearedDownstreamResults: true,
            updatedPrompt: !!updatedPrompt
        });
    }
    catch (error) {
        console.error(`[Magic Flow] Error restarting from phase:`, error);
        res.status(500).json({
            error: error.message || "Failed to restart from phase"
        });
    }
});
exports.restartFromPhase = restartFromPhase;
/**
 * Enhanced Fail-Safe Infrastructure Generation
 * Includes retry logic, validation, and better error handling
 */
function generateInfrastructureCodeFailSafe(jobId_1) {
    return __awaiter(this, arguments, void 0, function* (jobId, forceRegenerate = false) {
        const maxRetries = 3;
        let attempt = 0;
        while (attempt < maxRetries) {
            attempt++;
            try {
                console.log(`[Magic Flow] Infrastructure generation attempt ${attempt}/${maxRetries} for job ${jobId}`);
                const job = appCreationJobs[jobId];
                job.progress = 60 + (attempt - 1) * 5; // Increment progress slightly with each attempt
                job.lastAccessed = new Date();
                const { analysisResult, umlDiagrams, userPrompt } = job;
                // Validate required data
                if (!analysisResult) {
                    throw new Error("Missing analysis result required for infrastructure generation");
                }
                if (!umlDiagrams) {
                    throw new Error("Missing UML diagrams required for infrastructure generation");
                }
                if (!userPrompt) {
                    throw new Error("Missing user prompt required for infrastructure generation");
                }
                // Enhanced infrastructure prompt with fail-safe patterns
                const infraPrompt = `Generate production-ready Terraform infrastructure code based on the app analysis and architecture diagram.

**CRITICAL: This is attempt ${attempt}/${maxRetries} - focus on generating VALID, DEPLOYABLE Terraform code.**

App Analysis: ${JSON.stringify(analysisResult, null, 2)}
Architecture Diagram: ${umlDiagrams.architectureDiagram || ""}
Component Diagram: ${umlDiagrams.componentDiagram || ""}
Original Prompt: ${userPrompt}

**FAIL-SAFE REQUIREMENTS - CRITICAL FOR SUCCESS:**

**1. TERRAFORM SYNTAX VALIDATION:**
- ALL resources must have valid Terraform syntax
- NO missing required arguments
- ALL block configurations must be complete
- Use ONLY validated AWS resource patterns

**2. CRITICAL S3 BUCKET NAMING (FIXED IN THIS VERSION):**
- Bucket names MUST be ≤ 63 characters total
- Use SHORT prefixes: "web-" (4 chars) or "app-" (4 chars) ONLY
- Pattern: bucket_prefix = "web-\${random_string.suffix.result}-"
- Total calculation: "web-" (4) + random (8) + "-" (1) + AWS suffix (~10) = ~23 chars
- ✅ NEVER use long prefixes like "notes-app-frontend-" 

**3. PROVIDER CONFIGURATION (MANDATORY):**
provider "aws" {
  region = "us-east-1"
}

**4. LAMBDA FUNCTION REQUIREMENTS:**
- NO data.archive_file blocks
- Use filename = "function_name.zip"
- Use source_code_hash = filebase64sha256("function_name.zip")
- Runtime must be nodejs18.x or nodejs20.x

**5. API GATEWAY DEPENDENCY MANAGEMENT:**
- For REST API: ALWAYS use explicit depends_on in aws_api_gateway_deployment
- Include ALL methods, integrations, and permissions in depends_on
- Create aws_api_gateway_stage as separate resource
- Consider using HTTP API (aws_apigatewayv2_api) for simpler deployment

**6. MANDATORY OUTPUTS:**
output "frontend_url" {
  description = "Frontend S3 website URL"
  value       = "http://\${aws_s3_bucket.frontend.id}.s3-website-us-east-1.amazonaws.com"
}

output "api_endpoint" {
  description = "API Gateway endpoint"
  value       = aws_api_gateway_deployment.main.invoke_url
}

**7. RESOURCE NAMING VALIDATION:**
- S3 bucket: Use bucket_prefix with random_string suffix
- IAM roles: Simple names like "lambda-execution-role"
- Lambda functions: Simple names like "app-main-function"
- DynamoDB tables: Simple names like "AppData"

**CRITICAL ERROR PREVENTION:**
❌ NO bucket names longer than 63 characters
❌ NO deprecated aws_s3_bucket acl parameter
❌ NO missing engine parameter for RDS resources
❌ NO data.archive_file blocks for Lambda
❌ NO variables in provider block
❌ NO missing required arguments in resource blocks

**RETRY-SPECIFIC INSTRUCTIONS:**
${attempt > 1 ? `
This is retry attempt ${attempt}. Previous attempts failed. Focus on:
- Shorter S3 bucket names (use "web-" prefix only)
- Complete resource configurations
- Valid Terraform syntax
- AWS resource compliance
` : ''}

**DEPLOYMENT VALIDATION CHECKLIST:**
✅ All resource names are AWS-compliant
✅ S3 bucket names are ≤ 63 characters
✅ All required arguments are present
✅ Provider block uses direct region
✅ No deprecated parameters used
✅ Lambda functions use proper deployment pattern
✅ Outputs provide necessary URLs

Generate ONLY raw Terraform HCL code. Start with terraform block, end with outputs. No markdown, no explanations.`;
                // Generate infrastructure code with enhanced error handling
                const infraCode = yield makeAIRequestWithRetry(infraPrompt, attempt);
                // Validate the generated code
                const validationResult = validateTerraformCode(infraCode);
                if (!validationResult.isValid) {
                    console.warn(`[Magic Flow] Infrastructure validation failed (attempt ${attempt}):`, validationResult.errors);
                    if (attempt < maxRetries) {
                        console.log(`[Magic Flow] Retrying infrastructure generation with validation feedback...`);
                        continue;
                    }
                    else {
                        throw new Error(`Infrastructure validation failed: ${validationResult.errors.join(', ')}`);
                    }
                }
                // Success - update job with generated infrastructure
                job.progress = 70;
                job.infraCode = infraCode;
                job.phase = 'app_generation';
                job.lastAccessed = new Date();
                console.log(`[Magic Flow] Infrastructure generation successful on attempt ${attempt} for job ${jobId}`);
                // Continue to app generation if this was triggered as part of the flow
                if (!forceRegenerate) {
                    generateApplicationCode(jobId);
                }
                else {
                    // If this was a manual retrigger, just mark as ready for next phase
                    job.status = "ready_for_app_generation";
                }
                return; // Success - exit retry loop
            }
            catch (error) {
                console.error(`[Magic Flow] Infrastructure generation attempt ${attempt} failed for job ${jobId}:`, error);
                if (attempt >= maxRetries) {
                    // Final failure after all retries
                    appCreationJobs[jobId] = Object.assign(Object.assign({}, appCreationJobs[jobId]), { status: "failed", phase: "infra_generation", progress: 100, error: `Infrastructure generation failed after ${maxRetries} attempts: ${error.message}`, endTime: new Date(), lastAccessed: new Date() });
                    return;
                }
                // Wait before retry with exponential backoff
                const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                console.log(`[Magic Flow] Waiting ${delay}ms before retry attempt ${attempt + 1}...`);
                yield new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    });
}
/**
 * Enhanced AI request with retry-specific context
 */
function makeAIRequestWithRetry(prompt_1, attemptNumber_1) {
    return __awaiter(this, arguments, void 0, function* (prompt, attemptNumber, maxRetries = 3) {
        const contextualPrompt = attemptNumber > 1
            ? `RETRY ATTEMPT ${attemptNumber}: ${prompt}\n\nIMPORTANT: Previous attempts failed. Focus on generating valid, working code.`
            : prompt;
        return yield makeAIRequest(contextualPrompt);
    });
}
/**
 * Validate Terraform code for common issues
 */
function validateTerraformCode(terraformCode) {
    const errors = [];
    // Check for basic Terraform structure
    if (!terraformCode.includes('terraform {')) {
        errors.push('Missing terraform configuration block');
    }
    if (!terraformCode.includes('provider "aws"')) {
        errors.push('Missing AWS provider configuration');
    }
    // Check for S3 bucket naming issues
    const bucketMatches = terraformCode.match(/bucket\s*=\s*"([^"]+)"/g);
    if (bucketMatches) {
        bucketMatches.forEach(match => {
            var _a;
            const bucketName = (_a = match.match(/"([^"]+)"/)) === null || _a === void 0 ? void 0 : _a[1];
            if (bucketName && bucketName.length > 63) {
                errors.push(`S3 bucket name too long: ${bucketName} (${bucketName.length} chars, max 63)`);
            }
        });
    }
    // Check for deprecated parameters
    if (terraformCode.includes('acl =')) {
        errors.push('Using deprecated aws_s3_bucket acl parameter');
    }
    // Check for data.archive_file (should not be present)
    if (terraformCode.includes('data "archive_file"')) {
        errors.push('Contains data.archive_file blocks (not allowed)');
    }
    // Check for missing RDS engine parameter
    if (terraformCode.includes('aws_db_instance') && !terraformCode.includes('engine =')) {
        errors.push('RDS instance missing required engine parameter');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
/**
 * GET INFRASTRUCTURE STATUS
 * Check the status of infrastructure generation specifically
 */
const getInfrastructureStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { jobId } = req.params;
    if (!jobId || !appCreationJobs[jobId]) {
        res.status(404).json({ error: "Build job not found" });
        return;
    }
    try {
        const job = appCreationJobs[jobId];
        memoryManager_1.memoryManager.touchJob(job);
        res.json({
            jobId: jobId,
            status: job.status,
            phase: job.phase,
            progress: job.progress,
            hasInfraCode: !!job.infraCode,
            infraCodeLength: ((_a = job.infraCode) === null || _a === void 0 ? void 0 : _a.length) || 0,
            infraCodePreview: job.infraCode ? job.infraCode.substring(0, 200) + '...' : null,
            canRetrigger: !!(job.analysisResult && job.umlDiagrams),
            error: job.error,
            lastAccessed: job.lastAccessed
        });
    }
    catch (error) {
        console.error(`[Magic Flow] Error getting infrastructure status:`, error);
        res.status(500).json({ error: error.message || "Failed to get infrastructure status" });
    }
});
exports.getInfrastructureStatus = getInfrastructureStatus;
const getConceptStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    if (!jobId || !conceptJobs[jobId]) {
        res.status(404).json({ error: "Job not found" });
        return;
    }
    try {
        const job = conceptJobs[jobId];
        job.lastAccessed = new Date();
        res.json({
            jobId: jobId,
            status: job.status,
            phase: job.phase,
            progress: job.progress,
            analysisResult: job.analysisResult,
            userConfirmed: job.userConfirmed,
            rejectionReason: job.rejectionReason,
            error: job.error
        });
    }
    catch (error) {
        console.error(`[Magic Flow] Error getting concept status:`, error);
        res.status(500).json({ error: error.message || "Failed to get concept status" });
    }
});
exports.getConceptStatus = getConceptStatus;
const getBuildStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    if (!jobId || !appCreationJobs[jobId]) {
        res.status(404).json({ error: "Job not found" });
        return;
    }
    try {
        const job = appCreationJobs[jobId];
        job.lastAccessed = new Date();
        res.json({
            jobId: jobId,
            status: job.status,
            phase: job.phase,
            progress: job.progress,
            umlDiagrams: job.umlDiagrams,
            infraCode: job.infraCode,
            appCode: job.appCode,
            error: job.error,
            deploymentResult: job.deploymentResult
        });
    }
    catch (error) {
        console.error(`[Magic Flow] Error getting build status:`, error);
        res.status(500).json({ error: error.message || "Failed to get build status" });
    }
});
exports.getBuildStatus = getBuildStatus;
const getMagicHealth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const activeJobs = Object.keys(appCreationJobs).length;
        const completedJobs = Object.values(appCreationJobs).filter(job => job.status === 'completed').length;
        const failedJobs = Object.values(appCreationJobs).filter(job => job.status === 'failed').length;
        res.json({
            status: "healthy",
            activeJobs: activeJobs,
            completedJobs: completedJobs,
            failedJobs: failedJobs,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        });
    }
    catch (error) {
        console.error(`[Magic Flow] Health check error:`, error);
        res.status(500).json({
            status: "unhealthy",
            error: error.message || "Health check failed"
        });
    }
});
exports.getMagicHealth = getMagicHealth;
