import { BuildError, ErrorGroup } from './types';

export function groupErrorsByDependencies(errors: BuildError[]): ErrorGroup[] {
  const errorGroups: ErrorGroup[] = [];
  const fileToGroupMap = new Map<string, string>();

  for (const error of errors) {
    if (!error.file) {
      // Group errors without files
      const groupId = `no-file-${error.type}`;
      let group = errorGroups.find(g => g.id === groupId);
      if (!group) {
        group = { id: groupId, errors: [], relatedFiles: [], priority: 1 };
        errorGroups.push(group);
      }
      group.errors.push(error);
      continue;
    }

    // Grouping logic
    let groupId = `file-${error.file}`;
    let priority = 1;

    // Class property/method errors
    const classNameMatch = error.message.match(/(?:Property|Method|Type) '(\w+)' does not exist on type '(\w+)'/);
    if (classNameMatch) {
      const [, , className] = classNameMatch;
      groupId = `class-${className}-${error.file}`;
      priority = 3;
    }

    // Import errors
    const importMatch = error.message.match(/Cannot find module '([^']+)'/);
    if (importMatch) {
      const [, moduleName] = importMatch;
      groupId = `import-${moduleName}-${error.file}`;
      priority = 2;
    }

    // Export errors
    const exportMatch = error.message.match(/has no exported member '(\w+)'/);
    if (exportMatch) {
      const [, exportName] = exportMatch;
      groupId = `export-${exportName}-${error.file}`;
      priority = 2;
    }

    // Merge logic
    const existingGroupId = fileToGroupMap.get(error.file);
    if (existingGroupId && existingGroupId !== groupId) {
      const existingGroup = errorGroups.find(g => g.id === existingGroupId);
      const newGroup = errorGroups.find(g => g.id === groupId);
      if (existingGroup && newGroup) {
        existingGroup.errors.push(...newGroup.errors);
        existingGroup.relatedFiles = [...new Set([...existingGroup.relatedFiles, ...newGroup.relatedFiles])];
        existingGroup.priority = Math.max(existingGroup.priority, newGroup.priority);
        for (const [file, group] of fileToGroupMap.entries()) {
          if (group === groupId) fileToGroupMap.set(file, existingGroupId);
        }
        const newGroupIndex = errorGroups.findIndex(g => g.id === groupId);
        if (newGroupIndex !== -1) errorGroups.splice(newGroupIndex, 1);
      }
      groupId = existingGroupId;
    }

    let group = errorGroups.find(g => g.id === groupId);
    if (!group) {
      group = { id: groupId, errors: [], relatedFiles: [error.file], priority };
      errorGroups.push(group);
    }
    group.errors.push(error);
    fileToGroupMap.set(error.file, groupId);
  }

  return errorGroups;
} 