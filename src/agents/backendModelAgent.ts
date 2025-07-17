import fs from 'fs/promises';
import path from 'path';
import { CodePlan } from '../utils/umlToCodePlan';
import { generateBackendFile } from './backendComponentAgent';

export async function generateBackendModelFiles(codePlan: CodePlan, projectPath: string) {
  // Use the new enhanced CodePlan structure
  if (codePlan.backendModels.length === 0) {
    console.log('[BackendModelAgent] No backend models found in CodePlan');
    return [];
  }

  const modelsDir = path.join(projectPath, 'backend', 'src', 'models');
  await fs.mkdir(modelsDir, { recursive: true });

  const generatedFiles: string[] = [];

  // Generate individual model files using the backend agent
  for (const model of codePlan.backendModels) {
    const modelFile = {
      path: `src/models/${model.name}.ts`,
      content: '',
      dependencies: [],
      description: `Model for ${model.name} with properties: ${model.properties.join(', ')} and methods: ${model.methods.join(', ')}`
    };
    
    console.log(`[BackendModelAgent] Generating code for ${model.name} model...`);
    const modelCode = await generateBackendFile(modelFile, codePlan);
    
    await fs.writeFile(path.join(modelsDir, `${model.name}.ts`), modelCode);
    generatedFiles.push(`backend/src/models/${model.name}.ts`);
  }

  // Generate index file
  const exports = codePlan.backendModels.map(model => `export * from './${model.name}';`).join('\n');
  const indexCode = `
// Backend Models Index
${exports}
  `.trim();

  await fs.writeFile(path.join(modelsDir, 'index.ts'), indexCode);
  generatedFiles.push('backend/src/models/index.ts');

  console.log(`[BackendModelAgent] Generated ${generatedFiles.length} backend model files`);
  return generatedFiles;
} 