import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Documentation } from './documentationStore';

const DATA_FILE = path.join(__dirname, "../../projects.json");

export interface UMLDiagrams {
  class?: string;
  sequence?: string;
  entity?: string;
  component?: string;
}

export interface DocumentationSection {
  title: string;
  content: string;
}

export interface DesignDocument {
  metadata: {
    title: string;
    authors: string[];
    date_created: string;
    date_updated: string;
    reviewers: string[];
    version: string;
    status: string;
    document_scope: string;
  };
  executive_summary: string;
  goals: {
    goals_list: string[];
    non_goals_list: string[];
  };
  background_context: string;
  requirements: {
    functional: string[];
    non_functional: string[];
    regulatory_compliance: string[];
  };
  proposed_architecture: {
    high_level_architecture_diagram: string;
    components: {
      name: string;
      purpose: string;
      responsibility: string;
      inputs_outputs: string;
      failure_modes: string;
      interfaces: string;
    }[];
    data_models: any[];
    external_integrations: any[];
  };
  detailed_design: {
    sequence_diagrams: any[];
    algorithms: any[];
    modules_classes: any[];
    concurrency_model: string;
    retry_idempotency_logic: string;
  };
  api_contracts: {
    api_type: string;
    endpoints: any[];
    request_response_format: string;
    error_handling: string;
    versioning_strategy: string;
  };
  deployment_infrastructure: {
    environment_setup: any[];
    iac_outline: string;
    ci_cd_strategy: string;
    feature_flags: string;
    secrets_configuration: string;
  };
  observability_plan: {
    logging: string;
    metrics: string;
    tracing: string;
    dashboards: string;
    alerting_rules: string;
  };
  security_considerations: {
    threat_model: string;
    encryption: {
      at_rest: string;
      in_transit: string;
    };
    authentication_authorization: string;
    secrets_handling: string;
    security_reviews_required: boolean;
  };
  failure_handling_resilience: {
    failure_modes: string;
    fallbacks_retries: string;
    graceful_degradation: string;
    disaster_recovery: string;
  };
  cost_estimation: {
    infrastructure: string;
    third_party_services: string;
    storage_bandwidth: string;
  };
  risks_tradeoffs: any[];
  alternatives_considered: any[];
  rollout_plan: {
    strategy: string;
    data_migration: string;
    stakeholder_communication: string;
    feature_flags_usage: string;
  };
  post_launch_checklist: {
    health_checks: string;
    regression_coverage: string;
    load_testing: string;
    ownership_and_runbooks: string;
  };
  open_questions: any[];
  appendix: {
    external_links: any[];
    reference_docs: any[];
    terminology: any[];
  };
  optional_extensions: {
    architecture_decision_log: any[];
    design_tools: {
      diagrams: any[];
      specs: any[];
      documentation: any[];
      version_control: any[];
    };
    linked_artifacts: {
      figma: string;
      jira_or_github: string;
    };
  };
}

export interface Project {
  _id: string;
  userId: string;
  name: string;
  description: string;
  prompt?: string;
  lastCode: string;
  framework: string;
  diagramType: string;
  createdAt: string;
  updatedAt?: string;
  umlDiagrams?: UMLDiagrams;
  documentation?: Documentation;
  designDocument?: DesignDocument;
  infraCode?: string;
  appCode?: {
    frontend: {
      components: Record<string, string>;
      pages: Record<string, string>;
      utils: Record<string, string>;
    };
    backend: {
      controllers: Record<string, string>;
      models: Record<string, string>;
      routes: Record<string, string>;
      utils: Record<string, string>;
    };
    documentation: string;
  };
  deploymentStatus?: 'not_deployed' | 'pending' | 'deployed' | 'failed' | 'destroyed';
  deploymentJobId?: string;
  deploymentOutputs?: any;
  appDeploymentStatus?: 'not_deployed' | 'deploying' | 'deployed' | 'failed';
  appDeploymentJobId?: string;
  appDeploymentOutputs?: {
    apiGatewayUrl: string;
    frontendUrl: string;
    lambdaFunctionName: string;
  };
  // Magic workflow properties
  magicAnalysis?: any;
  userPrompt?: string;
  targetCustomers?: string;
}

async function readAll(): Promise<Project[]> {
  try {
    const file = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(file);
  } catch {
    return [];
  }
}

async function writeAll(projects: Project[]) {
  await fs.writeFile(DATA_FILE, JSON.stringify(projects, null, 2), "utf-8");
}

export async function getAllProjects(): Promise<Project[]> {
  return readAll();
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const projects = await readAll();
  return projects.find(p => p._id === id);
}

export async function saveProject(project: Project): Promise<void> {
  const projects = await readAll();
  const idx = projects.findIndex(p => p._id === project._id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  await writeAll(projects);
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await readAll();
  const filtered = projects.filter(p => p._id !== id);
  await writeAll(filtered);
}

export async function createOrUpdateProjectDocumentation(
  projectId: string,
  prompt: string,
  umlDiagrams: any
): Promise<Project | null> {
  const projects = await readAll();
  const project = projects.find(p => p._id === projectId);
  if (!project) return null;

  const now = new Date().toISOString();
  const newDoc: Documentation = {
    id: project.documentation?.id || uuidv4(),
    projectId,
    prompt,
    umlDiagrams,
    status: 'pending',
    progress: 0,
    createdAt: project.documentation?.createdAt || now,
    updatedAt: now
  };

  project.documentation = newDoc;

  await saveProject(project);
  return project;
}

export async function getProjectDocumentation(projectId: string): Promise<Documentation | null> {
  const project = await getProjectById(projectId);
  return project && project.documentation ? project.documentation : null;
}

export async function updateProjectDocumentation(
  projectId: string,
  updates: Partial<Documentation>
): Promise<Project | null> {
  const project = await getProjectById(projectId);
  if (!project || !project.documentation) return null;

  project.documentation = {
    ...project.documentation,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await saveProject(project);
  return project;
}

export async function deleteProjectDocumentation(projectId: string): Promise<boolean> {
  const project = await getProjectById(projectId);
  if (!project || !project.documentation) return false;

  project.documentation = undefined;
  await saveProject(project);
  return true;
}