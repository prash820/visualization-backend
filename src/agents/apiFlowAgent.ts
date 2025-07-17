import fs from 'fs/promises';
import path from 'path';
import { CodePlan } from '../utils/umlToCodePlan';

export async function generateApiFlowFiles(codePlan: CodePlan, projectPath: string) {
  // For now, skip API flow generation as it's not part of the enhanced MVP
  // The enhanced system focuses on frontend/backend components, models, and integration
  console.log('[ApiFlowAgent] Skipping API flow generation for enhanced MVP');
  return [];
} 