import * as fs from 'fs/promises';
import * as path from 'path';
import { TaskPlan, UMLIntermediateRepresentation } from '../codeGenerationEngine';

export class TaskPlanStorage {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  async saveTaskPlan(taskPlan: TaskPlan, representation: UMLIntermediateRepresentation): Promise<void> {
    console.log('[TaskPlanStorage] Saving task plan to file');
    
    const taskPlanPath = path.join(this.projectPath, 'task-plan.json');
    
    // Create detailed task plan with enhanced information
    const detailedTaskPlan = {
      summary: {
        backendTasks: taskPlan.backendTasks.length,
        frontendTasks: taskPlan.frontendTasks.length,
        commonTasks: taskPlan.commonTasks.length,
        testTasks: taskPlan.testTasks.length,
        buildTasks: taskPlan.buildTasks.length,
        deploymentTasks: taskPlan.deploymentTasks.length,
        totalTasks: taskPlan.generationOrder.length,
        generationTimestamp: new Date().toISOString()
      },
      backendTasks: taskPlan.backendTasks.map(task => ({
        ...task,
        filePath: this.getFilePathForTask(task),
        estimatedComplexity: this.estimateTaskComplexity(task),
        className: this.getClassNameForTask(task, representation),
        methodSignatures: this.getMethodSignaturesForTask(task, representation),
        folderPath: this.getFolderPathForTask(task),
        imports: this.getRequiredImportsForTask(task, representation)
      })),
      frontendTasks: taskPlan.frontendTasks.map(task => ({
        ...task,
        filePath: this.getFilePathForTask(task),
        estimatedComplexity: this.estimateTaskComplexity(task),
        className: this.getClassNameForTask(task, representation),
        methodSignatures: this.getMethodSignaturesForTask(task, representation),
        folderPath: this.getFolderPathForTask(task),
        imports: this.getRequiredImportsForTask(task, representation)
      })),
      commonTasks: taskPlan.commonTasks.map(task => ({
        ...task,
        filePath: this.getFilePathForTask(task),
        estimatedComplexity: this.estimateTaskComplexity(task),
        className: this.getClassNameForTask(task, representation),
        methodSignatures: this.getMethodSignaturesForTask(task, representation),
        folderPath: this.getFolderPathForTask(task),
        imports: this.getRequiredImportsForTask(task, representation)
      })),
      testTasks: taskPlan.testTasks.map(task => ({
        ...task,
        filePath: this.getFilePathForTask(task),
        estimatedComplexity: this.estimateTaskComplexity(task),
        className: this.getClassNameForTask(task, representation),
        methodSignatures: this.getMethodSignaturesForTask(task, representation),
        folderPath: this.getFolderPathForTask(task),
        imports: this.getRequiredImportsForTask(task, representation)
      })),
      buildTasks: taskPlan.buildTasks.map(task => ({
        ...task,
        filePath: this.getFilePathForTask(task),
        estimatedComplexity: this.estimateTaskComplexity(task),
        className: this.getClassNameForTask(task, representation),
        methodSignatures: this.getMethodSignaturesForTask(task, representation),
        folderPath: this.getFolderPathForTask(task),
        imports: this.getRequiredImportsForTask(task, representation)
      })),
      deploymentTasks: taskPlan.deploymentTasks.map(task => ({
        ...task,
        filePath: this.getFilePathForTask(task),
        estimatedComplexity: this.estimateTaskComplexity(task),
        className: this.getClassNameForTask(task, representation),
        methodSignatures: this.getMethodSignaturesForTask(task, representation),
        folderPath: this.getFolderPathForTask(task),
        imports: this.getRequiredImportsForTask(task, representation)
      })),
      generationOrder: taskPlan.generationOrder.map(taskId => {
        const task = this.findTaskById(taskId, taskPlan);
        return {
          taskId,
          type: task?.type || 'unknown',
          description: task?.description || 'No description',
          filePath: task ? this.getFilePathForTask(task) : 'unknown',
          className: task ? this.getClassNameForTask(task, representation) : 'unknown',
          folderPath: task ? this.getFolderPathForTask(task) : 'unknown'
        };
      }),
      folderStructure: this.generateFolderStructure(representation)
    };

    await fs.writeFile(taskPlanPath, JSON.stringify(detailedTaskPlan, null, 2));
    console.log(`[TaskPlanStorage] Task plan saved to: ${taskPlanPath}`);
  }

  // Helper methods (extracted from CodeGenerationEngine)
  private getFilePathForTask(task: any): string {
    // Implementation from CodeGenerationEngine
    if (task.type === 'model') {
      return task.entityName ? `backend/src/models/${task.entityName}.ts` : `backend/src/models/${task.type}.ts`;
    }
    if (task.type === 'service') {
      const serviceName = task.componentName || 'Service';
      const fileName = serviceName.endsWith('Service') ? serviceName : `${serviceName}Service`;
      return `backend/src/services/${fileName}.ts`;
    }
    if (task.type === 'controller') {
      const controllerName = task.componentName || 'Controller';
      const fileName = controllerName.endsWith('Controller') ? controllerName : `${controllerName}Controller`;
      return `backend/src/controllers/${fileName}.ts`;
    }
    // ... other task types
    return `backend/src/${task.type}s/${task.type}.ts`;
  }

  private getClassNameForTask(task: any, representation: UMLIntermediateRepresentation): string {
    // Implementation from CodeGenerationEngine
    switch (task.type) {
      case 'model': return task.entityName || 'Model';
      case 'service':
        const serviceName = task.componentName || 'Service';
        return serviceName.endsWith('Service') ? serviceName : `${serviceName}Service`;
      case 'controller':
        const controllerName = task.componentName || 'Controller';
        return controllerName.endsWith('Controller') ? controllerName : `${controllerName}Controller`;
      default: return 'UnknownClass';
    }
  }

  private getMethodSignaturesForTask(task: any, representation: UMLIntermediateRepresentation): any[] {
    // Implementation from CodeGenerationEngine
    return [];
  }

  private getFolderPathForTask(task: any): string {
    // Implementation from CodeGenerationEngine
    switch (task.type) {
      case 'model': return 'backend/src/models';
      case 'service': return 'backend/src/services';
      case 'controller': return 'backend/src/controllers';
      default: return 'unknown';
    }
  }

  private getRequiredImportsForTask(task: any, representation: UMLIntermediateRepresentation): string[] {
    // Implementation from CodeGenerationEngine
    return [];
  }

  private estimateTaskComplexity(task: any): 'low' | 'medium' | 'high' {
    // Implementation from CodeGenerationEngine
    if (task.dependencies.length > 3) return 'high';
    if (task.dependencies.length > 1) return 'medium';
    return 'low';
  }

  private findTaskById(taskId: string, taskPlan: TaskPlan): any {
    // Implementation from CodeGenerationEngine
    const allTasks = [
      ...taskPlan.backendTasks,
      ...taskPlan.frontendTasks,
      ...taskPlan.commonTasks,
      ...taskPlan.testTasks,
      ...taskPlan.buildTasks,
      ...taskPlan.deploymentTasks
    ];
    return allTasks.find(task => task.id === taskId);
  }

  private generateFolderStructure(representation: UMLIntermediateRepresentation): any {
    // Implementation from CodeGenerationEngine
    return {
      backend: {
        src: {
          models: representation.entities.map(e => `${e.name}.ts`),
          services: [],
          controllers: [],
          routes: [],
          middleware: ['auth.ts', 'validation.ts', 'errorHandler.ts'],
          utils: ['database.ts', 'logger.ts', 'config.ts']
        }
      }
    };
  }
} 