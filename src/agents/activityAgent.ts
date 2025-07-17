import fs from 'fs/promises';
import path from 'path';
import { CodePlan } from '../utils/umlToCodePlan';

export async function generateActivityFiles(codePlan: CodePlan, projectPath: string) {
  // For now, skip activity generation as it's not part of the enhanced MVP
  // The enhanced system focuses on frontend/backend components, models, and integration
  console.log('[ActivityAgent] Skipping activity generation for enhanced MVP');
  return [];
} 