import { loadUmlDiagrams, analyzeBackendUml, analyzeFrontendUml } from './utils/umlUtils';
import { generateBackendFile } from './agents/backendComponentAgent';
import { generateFrontendFile } from './agents/frontendComponentAgent';
import { runBuildFixPipeline, runBackendIntegrationTest, runFrontendIntegrationTest, wireUpApiIntegration, runEndToEndTests } from './utils/pipelineUtils';
import { saveFileToDisk } from './utils/fileUtils';
import { flattenFileStructure } from './utils/flattenFileStructure';

export async function orchestrateAppGeneration(projectId: string) {
  // 1. Read UML diagrams
  const umlDiagrams = await loadUmlDiagrams(projectId);

  // 2. Analyze backend UML diagrams
  const backendPlan = await analyzeBackendUml(umlDiagrams.backend);

  // 3. Backend code generation (per file)
  const backendFiles = flattenFileStructure(backendPlan.fileStructure);
  for (const file of backendFiles) {
    const code = await generateBackendFile(file, backendPlan);
    await saveFileToDisk(file.path, code);
  }

  // 4. Backend fix & integration test
  await runBuildFixPipeline('backend');
  await runBackendIntegrationTest();

  // 5. Analyze frontend UML diagrams (with backend context)
  const frontendPlan = await analyzeFrontendUml(umlDiagrams.frontend, backendPlan.apiSchema);

  // 6. Frontend code generation (per file)
  const frontendFiles = flattenFileStructure(frontendPlan.fileStructure);
  for (const file of frontendFiles) {
    const code = await generateFrontendFile(file, frontendPlan, backendPlan.apiSchema);
    await saveFileToDisk(file.path, code);
  }

  // 7. Frontend fix & integration test
  await runBuildFixPipeline('frontend');
  await runFrontendIntegrationTest();

  // 8. Integration: wire up API calls, run end-to-end tests
  await wireUpApiIntegration(frontendPlan, backendPlan);
  await runEndToEndTests();
} 