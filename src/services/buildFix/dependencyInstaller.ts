import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { BuildResult, BuildError } from './types';

const execAsync = promisify(exec);

export async function installDependenciesWithRetries(projectPath: string, maxRetries = 3, logs: string[] = []): Promise<BuildResult> {
  let retries = 0;
  let lastResult: BuildResult = {
    success: false,
    errors: [],
    warnings: [],
    logs,
    fixedFiles: [],
    retryCount: 0
  };
  while (retries < maxRetries) {
    retries++;
    const result = await installDependencies(projectPath);
    logs.push(...result.logs);
    if (result.success) {
      result.retryCount = retries;
      return result;
    }
    lastResult = result;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  lastResult.retryCount = retries;
  return lastResult;
}

export async function installDependencies(projectPath: string): Promise<BuildResult> {
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
    if (!hasBackend && !hasFrontend && !hasRootPackageJson) {
      logs.push('No package.json found in root, backend, or frontend directories');
      return { success: true, errors: [], warnings: [], logs, fixedFiles: [], retryCount: 0 };
    }
    if (hasBackend) {
      logs.push('Installing backend dependencies...');
      try {
        const { stdout, stderr } = await execAsync('npm install', { cwd: backendPath, timeout: 120000 });
        logs.push(`Backend dependencies installed successfully:\n${stdout}`);
        if (stderr) logs.push(`Backend npm install warnings:\n${stderr}`);
      } catch (error: any) {
        logs.push(`Backend dependency installation failed: ${error.stderr || error.message}`);
        errors.push({ type: 'runtime', message: `Backend dependency installation failed: ${error.stderr || error.message}`, code: 'DEPENDENCY_INSTALL_FAILED', severity: 'error' });
      }
    }
    if (hasFrontend) {
      logs.push('Installing frontend dependencies...');
      try {
        const { stdout, stderr } = await execAsync('npm install', { cwd: frontendPath, timeout: 120000 });
        logs.push(`Frontend dependencies installed successfully:\n${stdout}`);
        if (stderr) logs.push(`Frontend npm install warnings:\n${stderr}`);
      } catch (error: any) {
        logs.push(`Frontend dependency installation failed: ${error.stderr || error.message}`);
        errors.push({ type: 'runtime', message: `Frontend dependency installation failed: ${error.stderr || error.message}`, code: 'DEPENDENCY_INSTALL_FAILED', severity: 'error' });
      }
    }
    if (hasRootPackageJson) {
      logs.push('Installing root dependencies...');
      try {
        const { stdout, stderr } = await execAsync('npm install', { cwd: projectPath, timeout: 120000 });
        logs.push(`Root dependencies installed successfully:\n${stdout}`);
        if (stderr) logs.push(`Root npm install warnings:\n${stderr}`);
      } catch (error: any) {
        logs.push(`Root dependency installation failed: ${error.stderr || error.message}`);
        errors.push({ type: 'runtime', message: `Root dependency installation failed: ${error.stderr || error.message}`, code: 'DEPENDENCY_INSTALL_FAILED', severity: 'error' });
      }
    }
  } catch (error: any) {
    logs.push(`Error during dependency installation: ${error.message}`);
    errors.push({ type: 'runtime', message: error.message, code: error.code, severity: 'error' });
  }
  return { success: errors.length === 0, errors, warnings, logs, fixedFiles: [], retryCount: 0 };
} 