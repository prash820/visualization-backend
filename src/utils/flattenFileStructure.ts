// Utility to flatten a nested file structure object into an array of { path, content }
export function flattenFileStructure(structure: any, prefix = ''): Array<{ path: string, content: string }> {
  let files: Array<{ path: string, content: string }> = [];
  if (Array.isArray(structure)) {
    // Already an array of file objects
    for (const file of structure) {
      if (file && file.path && file.content) {
        files.push({ path: file.path, content: file.content });
      }
    }
    return files;
  }
  for (const key in structure) {
    if (!structure.hasOwnProperty(key)) continue;
    if (typeof structure[key] === 'string') {
      files.push({ path: prefix + key, content: structure[key] });
    } else if (typeof structure[key] === 'object') {
      files = files.concat(flattenFileStructure(structure[key], prefix + key + '/'));
    }
  }
  return files;
} 