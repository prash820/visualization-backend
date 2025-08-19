import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { BuildResult, BuildError } from './types';

const execAsync = promisify(exec);

export async function runBuildAndCollectErrors(projectPath: string): Promise<BuildResult> {
  const logs: string[] = [];
  const warnings: BuildError[] = [];
  const errors: BuildError[] = [];

  try {
    const backendPath = path.join(projectPath, 'backend');
    const frontendPath = path.join(projectPath, 'frontend');
    const rootPackageJsonPath = path.join(projectPath, 'package.json');
    const hasBackend = await fs.access(backendPath).then(() => true).catch(() => false);
    const hasFrontend = await fs.access(frontendPath).then(() => true).catch(() => false);
    const hasRootPackageJson = await fs.access(rootPackageJsonPath).then(() => true).catch(() => false);

    if (hasBackend) {
      logs.push('Running backend validations...');
      const backendResult = await runValidationForDirectory(backendPath, 'backend');
      logs.push(...backendResult.logs);
      errors.push(...backendResult.errors);
      warnings.push(...backendResult.warnings);
    }
    if (hasFrontend) {
      logs.push('Running frontend validations...');
      const frontendResult = await runValidationForDirectory(frontendPath, 'frontend');
      logs.push(...frontendResult.logs);
      errors.push(...frontendResult.errors);
      warnings.push(...frontendResult.warnings);
    }
    if (hasRootPackageJson) {
      logs.push('Running root validations...');
      const rootResult = await runValidationForDirectory(projectPath, 'root');
      logs.push(...rootResult.logs);
      errors.push(...rootResult.errors);
      warnings.push(...rootResult.warnings);
    }
  } catch (error: any) {
    logs.push(`Error during validation: ${error.message}`);
    errors.push({ type: 'runtime', message: error.message, code: error.code, severity: 'error' });
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
    logs,
    fixedFiles: [],
    retryCount: 0
  };
}

async function runValidationForDirectory(dirPath: string, dirName: string): Promise<BuildResult> {
  const logs: string[] = [];
  const warnings: BuildError[] = [];
  const errors: BuildError[] = [];

  try {
    const packageJsonPath = path.join(dirPath, 'package.json');
    const hasPackageJson = await fs.access(packageJsonPath).then(() => true).catch(() => false);
    if (!hasPackageJson) {
      logs.push(`No package.json found in ${dirName}, skipping validations`);
      return { success: true, errors: [], warnings: [], logs, fixedFiles: [], retryCount: 0 };
    }
    logs.push(`Found package.json in ${dirName}, running validations...`);

    // TypeScript
    logs.push(`Running TypeScript compilation check for ${dirName}...`);
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', { cwd: dirPath });
      const output = stdout || stderr;
      if (output && output.trim()) {
        logs.push(`${dirName} TypeScript errors:\n${output}`);
        errors.push(...parseTypeScriptErrors(output, dirName));
      } else {
        logs.push(`${dirName} TypeScript compilation passed`);
      }
    } catch (error: any) {
      const output = error.stdout || error.stderr || '';
      logs.push(`${dirName} TypeScript compilation failed: ${output}`);
      errors.push(...parseTypeScriptErrors(output, dirName));
    }

    // ESLint
    logs.push(`Running ESLint check for ${dirName}...`);
    try {
      const { stdout, stderr } = await execAsync('npx eslint . --ext .ts,.tsx,.js,.jsx', { cwd: dirPath });
      if (stderr) {
        logs.push(`${dirName} ESLint errors:\n${stderr}`);
        errors.push(...parseESLintErrors(stderr, dirName));
      } else {
        logs.push(`${dirName} ESLint passed`);
      }
    } catch (error: any) {
      logs.push(`${dirName} ESLint failed: ${error.stderr || error.message}`);
      errors.push(...parseESLintErrors(error.stderr || '', dirName));
    }

    // NPM build
    logs.push(`Running npm build for ${dirName}...`);
    try {
      const { stdout, stderr } = await execAsync('npm run build', { cwd: dirPath });
      logs.push(`${dirName} build output:\n${stdout}`);
      if (stderr) {
        logs.push(`${dirName} build warnings:\n${stderr}`);
        warnings.push(...parseBuildWarnings(stderr, dirName));
      }
    } catch (error: any) {
      logs.push(`${dirName} build failed: ${error.stderr || error.message}`);
      errors.push(...parseNpmBuildErrors(error.stderr || '', dirName));
    }
  } catch (error: any) {
    logs.push(`Error during ${dirName} validation: ${error.message}`);
    errors.push({ type: 'runtime', message: `${dirName}: ${error.message}`, code: error.code, severity: 'error' });
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
    logs,
    fixedFiles: [],
    retryCount: 0
  };
}

function parseTypeScriptErrors(logText: string, dirName: string): BuildError[] {
  const errors: BuildError[] = [];
  const lines = logText.split('\n');
  for (const line of lines) {
    const match = line.match(/^([^(]+)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/);
    if (match) {
      const [, file, lineStr, colStr, severity, code, message] = match;
      errors.push({
        type: 'typescript',
        file: `${dirName}/${file}`,
        line: parseInt(lineStr),
        column: parseInt(colStr),
        message: message.trim(),
        code,
        severity: severity as 'error' | 'warning'
      });
    }
  }
  return errors;
}

function parseESLintErrors(logText: string, dirName: string): BuildError[] {
  const errors: BuildError[] = [];
  const lines = logText.split('\n');
  for (const line of lines) {
    const match = line.match(/^([^:]+):(\d+):(\d+):\s+(.+)$/);
    if (match) {
      const [, file, lineStr, colStr, message] = match;
      errors.push({
        type: 'eslint',
        file: `${dirName}/${file}`,
        line: parseInt(lineStr),
        column: parseInt(colStr),
        message: message.trim(),
        severity: 'error'
      });
    }
  }
  return errors;
}

function parseNpmBuildErrors(logText: string, dirName: string): BuildError[] {
  return [{
    type: 'build',
    message: `Build errors in ${dirName}:\n${logText}`,
    code: 'BUILD_ERRORS',
    severity: 'error'
  }];
}

function parseBuildWarnings(logText: string, dirName: string): BuildError[] {
  return [{
    type: 'build',
    message: `Build warnings in ${dirName}:\n${logText}`,
    code: 'BUILD_WARNINGS',
    severity: 'warning'
  }];
} 