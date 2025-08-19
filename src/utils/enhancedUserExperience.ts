import { Request, Response } from 'express';

export interface UserExperienceConfig {
  enableMagicFlow: boolean;
  enableComplexFlow: boolean;
  defaultTimeout: number; // seconds
  maxRetries: number;
  enableAutoValidation: boolean;
  enableCostWarnings: boolean;
  enableProgressTracking: boolean;
}

export interface UserFlowState {
  userId: string;
  sessionId: string;
  currentStep: string;
  completedSteps: string[];
  validationResults: ValidationResult[];
  costEstimates: CostEstimate[];
  progress: number; // 0-100
  startTime: Date;
  lastActivity: Date;
  preferences: UserPreferences;
}

export interface ValidationResult {
  step: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
  timestamp: Date;
}

export interface CostEstimate {
  step: string;
  estimatedCost: number;
  monthlyCost: number;
  costBreakdown: Record<string, number>;
  isOverBudget: boolean;
  timestamp: Date;
}

export interface UserPreferences {
  preferredRegion: string;
  costLimit: number;
  autoCleanup: boolean;
  cleanupAfterHours: number;
  notificationLevel: 'minimal' | 'standard' | 'detailed';
  preferredFramework: string;
  preferredDatabase: string;
}

export interface FlowStep {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number; // seconds
  isRequired: boolean;
  validationRules: ValidationRule[];
  dependencies: string[];
}

export interface ValidationRule {
  type: 'required' | 'format' | 'length' | 'cost' | 'security';
  field: string;
  condition: string;
  message: string;
}

export class EnhancedUserExperience {
  private config: UserExperienceConfig;
  private flowStates: Map<string, UserFlowState> = new Map();
  private flowSteps: FlowStep[];

  constructor(config: UserExperienceConfig) {
    this.config = config;
    this.flowSteps = this.initializeFlowSteps();
  }

  /**
   * Initialize the Magic Flow steps
   */
  private initializeFlowSteps(): FlowStep[] {
    return [
      {
        id: 'idea_input',
        name: 'App Idea Input',
        description: 'Describe your app idea in natural language',
        estimatedDuration: 30,
        isRequired: true,
        validationRules: [
          {
            type: 'required',
            field: 'idea',
            condition: 'not_empty',
            message: 'Please describe your app idea'
          },
          {
            type: 'length',
            field: 'idea',
            condition: 'min_10_chars',
            message: 'Please provide a more detailed description (at least 10 characters)'
          }
        ],
        dependencies: []
      },
      {
        id: 'concept_generation',
        name: 'AI Concept Analysis',
        description: 'AI analyzes your idea and generates concept with diagrams',
        estimatedDuration: 60,
        isRequired: true,
        validationRules: [
          {
            type: 'required',
            field: 'concept',
            condition: 'generated',
            message: 'Concept generation failed'
          }
        ],
        dependencies: ['idea_input']
      },
      {
        id: 'user_validation',
        name: 'User Validation',
        description: 'Review and validate the generated concept',
        estimatedDuration: 45,
        isRequired: true,
        validationRules: [
          {
            type: 'required',
            field: 'user_confirmation',
            condition: 'confirmed',
            message: 'Please confirm or modify the concept'
          }
        ],
        dependencies: ['concept_generation']
      },
      {
        id: 'code_generation',
        name: 'Code Generation',
        description: 'Generate application code and infrastructure',
        estimatedDuration: 90,
        isRequired: true,
        validationRules: [
          {
            type: 'required',
            field: 'generated_code',
            condition: 'valid',
            message: 'Code generation failed'
          },
          {
            type: 'cost',
            field: 'estimated_cost',
            condition: 'within_budget',
            message: 'Generated solution exceeds cost limit'
          }
        ],
        dependencies: ['user_validation']
      },
      {
        id: 'deployment',
        name: 'Deployment',
        description: 'Deploy to AWS infrastructure',
        estimatedDuration: 120,
        isRequired: true,
        validationRules: [
          {
            type: 'required',
            field: 'deployment_url',
            condition: 'accessible',
            message: 'Deployment failed'
          }
        ],
        dependencies: ['code_generation']
      }
    ];
  }

  /**
   * Start a new user flow session
   */
  startUserFlow(userId: string, sessionId: string, preferences?: Partial<UserPreferences>): UserFlowState {
    const defaultPreferences: UserPreferences = {
      preferredRegion: 'us-east-1',
      costLimit: 50, // $50/month default
      autoCleanup: true,
      cleanupAfterHours: 24,
      notificationLevel: 'standard',
      preferredFramework: 'nextjs',
      preferredDatabase: 'dynamodb'
    };

    const flowState: UserFlowState = {
      userId,
      sessionId,
      currentStep: 'idea_input',
      completedSteps: [],
      validationResults: [],
      costEstimates: [],
      progress: 0,
      startTime: new Date(),
      lastActivity: new Date(),
      preferences: { ...defaultPreferences, ...preferences }
    };

    this.flowStates.set(sessionId, flowState);
    console.log(`[EnhancedUserExperience] Started flow for user ${userId}, session ${sessionId}`);
    
    return flowState;
  }

  /**
   * Process user input and advance flow
   */
  async processUserInput(sessionId: string, stepId: string, input: any): Promise<{
    success: boolean;
    nextStep?: string;
    validation?: ValidationResult;
    costEstimate?: CostEstimate;
    progress: number;
    error?: string;
  }> {
    const flowState = this.flowStates.get(sessionId);
    if (!flowState) {
      return { success: false, progress: 0, error: 'Session not found' };
    }

    try {
      // Update last activity
      flowState.lastActivity = new Date();

      // Validate current step
      const currentStep = this.flowSteps.find(step => step.id === stepId);
      if (!currentStep) {
        return { success: false, progress: flowState.progress, error: 'Invalid step' };
      }

      // Validate input
      const validation = await this.validateStepInput(stepId, input, flowState);
      flowState.validationResults.push(validation);

      if (!validation.isValid) {
        return {
          success: false,
          progress: flowState.progress,
          validation,
          error: validation.errors.join(', ')
        };
      }

      // Process step-specific logic
      const stepResult = await this.processStep(stepId, input, flowState);
      
      if (!stepResult.success) {
        return {
          success: false,
          progress: flowState.progress,
          error: stepResult.error
        };
      }

      // Mark step as completed
      if (!flowState.completedSteps.includes(stepId)) {
        flowState.completedSteps.push(stepId);
      }

      // Calculate cost estimate if applicable
      let costEstimate: CostEstimate | undefined;
      if (stepResult.costEstimate) {
        costEstimate = stepResult.costEstimate;
        flowState.costEstimates.push(costEstimate);
      }

      // Determine next step
      const nextStep = this.determineNextStep(stepId, flowState);
      flowState.currentStep = nextStep;

      // Update progress
      flowState.progress = this.calculateProgress(flowState);

      // Save updated state
      this.flowStates.set(sessionId, flowState);

      return {
        success: true,
        nextStep,
        validation,
        costEstimate,
        progress: flowState.progress
      };

    } catch (error) {
      console.error(`[EnhancedUserExperience] Error processing input:`, error);
      return {
        success: false,
        progress: flowState?.progress || 0,
        error: `Processing failed: ${error}`
      };
    }
  }

  /**
   * Validate step input based on validation rules
   */
  private async validateStepInput(stepId: string, input: any, flowState: UserFlowState): Promise<ValidationResult> {
    const step = this.flowSteps.find(s => s.id === stepId);
    if (!step) {
      return {
        step: stepId,
        isValid: false,
        warnings: [],
        errors: ['Invalid step'],
        suggestions: [],
        timestamp: new Date()
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Apply validation rules
    for (const rule of step.validationRules) {
      const validationResult = this.applyValidationRule(rule, input, flowState);
      
      if (validationResult.isValid === false) {
        errors.push(validationResult.message);
      } else if (validationResult.isWarning) {
        warnings.push(validationResult.message);
      }
      
      if (validationResult.suggestion) {
        suggestions.push(validationResult.suggestion);
      }
    }

    // Additional step-specific validation
    const stepValidation = await this.performStepSpecificValidation(stepId, input, flowState);
    errors.push(...stepValidation.errors);
    warnings.push(...stepValidation.warnings);
    suggestions.push(...stepValidation.suggestions);

    return {
      step: stepId,
      isValid: errors.length === 0,
      warnings,
      errors,
      suggestions,
      timestamp: new Date()
    };
  }

  /**
   * Apply a specific validation rule
   */
  private applyValidationRule(rule: ValidationRule, input: any, flowState: UserFlowState): {
    isValid: boolean;
    isWarning: boolean;
    message: string;
    suggestion?: string;
  } {
    const fieldValue = this.getFieldValue(input, rule.field);

    switch (rule.type) {
      case 'required':
        if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
          return {
            isValid: false,
            isWarning: false,
            message: rule.message
          };
        }
        break;

      case 'length':
        if (typeof fieldValue === 'string') {
          if (rule.condition === 'min_10_chars' && fieldValue.length < 10) {
            return {
              isValid: false,
              isWarning: false,
              message: rule.message,
              suggestion: 'Try to be more specific about your app idea'
            };
          }
        }
        break;

      case 'cost':
        if (rule.condition === 'within_budget' && fieldValue > flowState.preferences.costLimit) {
          return {
            isValid: false,
            isWarning: false,
            message: rule.message,
            suggestion: `Consider reducing complexity or increasing your budget limit (currently $${flowState.preferences.costLimit}/month)`
          };
        }
        break;

      case 'format':
        // Add format validation logic
        break;
    }

    return {
      isValid: true,
      isWarning: false,
      message: ''
    };
  }

  /**
   * Perform step-specific validation
   */
  private async performStepSpecificValidation(stepId: string, input: any, flowState: UserFlowState): Promise<{
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    switch (stepId) {
      case 'idea_input':
        // Validate idea complexity and feasibility
        const idea = input.idea || '';
        if (idea.length > 1000) {
          warnings.push('Your idea description is quite long. Consider breaking it into smaller, focused features.');
        }
        
        // Check for common patterns that might indicate complexity
        const complexityKeywords = ['blockchain', 'ai', 'machine learning', 'real-time', 'video', 'audio'];
        const hasComplexity = complexityKeywords.some(keyword => 
          idea.toLowerCase().includes(keyword)
        );
        
        if (hasComplexity) {
          warnings.push('Your idea includes complex features that may increase development time and cost.');
          suggestions.push('Consider starting with a simpler MVP and adding complex features later.');
        }
        break;

      case 'user_validation':
        // Validate user confirmation
        if (input.user_confirmation === 'reject' && !input.rejection_reason) {
          errors.push('Please provide a reason for rejection so we can improve the concept.');
        }
        break;

      case 'code_generation':
        // Validate generated code quality
        if (input.generated_code && input.generated_code.errors && input.generated_code.errors.length > 0) {
          errors.push('Generated code has validation errors that need to be fixed.');
        }
        break;
    }

    return { errors, warnings, suggestions };
  }

  /**
   * Process step-specific logic
   */
  private async processStep(stepId: string, input: any, flowState: UserFlowState): Promise<{
    success: boolean;
    costEstimate?: CostEstimate;
    error?: string;
  }> {
    try {
      switch (stepId) {
        case 'idea_input':
          // Store idea and prepare for concept generation
          return { success: true };

        case 'concept_generation':
          // Trigger AI concept generation
          return { success: true };

        case 'user_validation':
          // Process user confirmation/rejection
          if (input.user_confirmation === 'reject') {
            // Handle rejection - restart from concept generation
            flowState.currentStep = 'concept_generation';
            flowState.completedSteps = flowState.completedSteps.filter(step => step !== 'code_generation' && step !== 'deployment');
          }
          return { success: true };

        case 'code_generation':
          // Generate cost estimate
          const costEstimate: CostEstimate = {
            step: stepId,
            estimatedCost: input.estimated_cost || 25,
            monthlyCost: input.monthly_cost || 25,
            costBreakdown: input.cost_breakdown || { 'Lambda': 10, 'S3': 5, 'DynamoDB': 10 },
            isOverBudget: (input.monthly_cost || 25) > flowState.preferences.costLimit,
            timestamp: new Date()
          };
          return { success: true, costEstimate };

        case 'deployment':
          // Handle deployment
          return { success: true };

        default:
          return { success: true };
      }
    } catch (error) {
      return { success: false, error: `Step processing failed: ${error}` };
    }
  }

  /**
   * Determine the next step in the flow
   */
  private determineNextStep(currentStepId: string, flowState: UserFlowState): string {
    const currentStepIndex = this.flowSteps.findIndex(step => step.id === currentStepId);
    
    if (currentStepIndex === -1 || currentStepIndex >= this.flowSteps.length - 1) {
      return 'completed';
    }

    // Check if next step dependencies are met
    const nextStep = this.flowSteps[currentStepIndex + 1];
    const dependenciesMet = nextStep.dependencies.every(dep => 
      flowState.completedSteps.includes(dep)
    );

    if (dependenciesMet) {
      return nextStep.id;
    } else {
      // Find the first incomplete dependency
      const incompleteDependency = nextStep.dependencies.find(dep => 
        !flowState.completedSteps.includes(dep)
      );
      return incompleteDependency || 'error';
    }
  }

  /**
   * Calculate overall progress
   */
  private calculateProgress(flowState: UserFlowState): number {
    const totalSteps = this.flowSteps.length;
    const completedSteps = flowState.completedSteps.length;
    
    // Add partial progress for current step
    let progress = (completedSteps / totalSteps) * 100;
    
    // If current step is in progress, add partial credit
    if (flowState.currentStep !== 'completed' && !flowState.completedSteps.includes(flowState.currentStep)) {
      progress += (1 / totalSteps) * 50; // 50% credit for current step
    }
    
    return Math.min(100, Math.round(progress));
  }

  /**
   * Get field value from input object
   */
  private getFieldValue(input: any, field: string): any {
    return field.split('.').reduce((obj, key) => obj?.[key], input);
  }

  /**
   * Get current flow state
   */
  getFlowState(sessionId: string): UserFlowState | undefined {
    return this.flowStates.get(sessionId);
  }

  /**
   * Update user preferences
   */
  updatePreferences(sessionId: string, preferences: Partial<UserPreferences>): boolean {
    const flowState = this.flowStates.get(sessionId);
    if (!flowState) return false;

    flowState.preferences = { ...flowState.preferences, ...preferences };
    flowState.lastActivity = new Date();
    
    this.flowStates.set(sessionId, flowState);
    return true;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(maxAgeHours: number = 24): void {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds

    for (const [sessionId, flowState] of this.flowStates.entries()) {
      const age = now.getTime() - flowState.lastActivity.getTime();
      if (age > maxAge) {
        this.flowStates.delete(sessionId);
        console.log(`[EnhancedUserExperience] Cleaned up expired session: ${sessionId}`);
      }
    }
  }

  /**
   * Get flow statistics
   */
  getFlowStatistics(): {
    activeSessions: number;
    completedFlows: number;
    averageCompletionTime: number;
    successRate: number;
  } {
    const activeSessions = this.flowStates.size;
    const completedFlows = Array.from(this.flowStates.values()).filter(
      state => state.currentStep === 'completed'
    ).length;
    
    const completionTimes = Array.from(this.flowStates.values())
      .filter(state => state.currentStep === 'completed')
      .map(state => state.lastActivity.getTime() - state.startTime.getTime());
    
    const averageCompletionTime = completionTimes.length > 0 
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
      : 0;

    const successRate = activeSessions > 0 ? (completedFlows / activeSessions) * 100 : 0;

    return {
      activeSessions,
      completedFlows,
      averageCompletionTime,
      successRate
    };
  }
}

export default EnhancedUserExperience; 