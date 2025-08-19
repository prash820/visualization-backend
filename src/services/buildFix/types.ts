export type BuildErrorType = 'typescript' | 'eslint' | 'build' | 'test' | 'runtime';
export type BuildErrorSeverity = 'error' | 'warning';

export interface BuildError {
  type: BuildErrorType;
  file?: string;
  line?: number;
  column?: number;
  message: string;
  code?: string;
  stack?: string;
  severity: BuildErrorSeverity;
}

export interface BuildResult {
  success: boolean;
  errors: BuildError[];
  warnings: BuildError[];
  logs: string[];
  fixedFiles: string[];
  retryCount: number;
}

export interface FixRequest {
  error: BuildError;
  projectPath: string;
  relevantCode: string;
  context: string;
  targetDirectory: string;
}

export interface ErrorGroup {
  id: string;
  errors: BuildError[];
  relatedFiles: string[];
  priority: number; // Higher = more critical
}

export interface BuildState {
  projectPath: string;
  jobId: string;
  installRetries: number;
  buildRetries: number;
  totalFixedFiles: string[];
  allLogs: string[];
  currentErrorGroups: ErrorGroup[];
  fixedErrorGroups: string[];
  maxInstallRetries: number;
  maxBuildRetries: number;
}

export interface AIFixResult {
  success: boolean;
  fixedContent?: string | Record<string, string>;
  newFiles?: Record<string, string>;
  error?: string;
} 