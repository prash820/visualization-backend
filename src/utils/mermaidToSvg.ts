import { execFile } from 'child_process';
import { tmpdir } from 'os';
import { promises as fs } from 'fs';
import path from 'path';

export async function mermaidToSvg(mermaidCode: string): Promise<string> {
  const tempDir = tmpdir();
  const mmdPath = path.join(tempDir, `diagram-${Date.now()}.mmd`);
  const svgPath = path.join(tempDir, `diagram-${Date.now()}.svg`);
  console.log('[mermaidToSvg] Writing Mermaid code to:', mmdPath);
  await fs.writeFile(mmdPath, mermaidCode, 'utf8');
  console.log('[mermaidToSvg] Running: mmdc -i', mmdPath, '-o', svgPath, '--quiet');
  await new Promise((resolve, reject) => {
    execFile(
      'mmdc',
      ['-i', mmdPath, '-o', svgPath, '--quiet'],
      (error, stdout, stderr) => {
        if (error) {
          console.error('[mermaidToSvg] Error executing mmdc:', error, stderr);
          reject(error);
        } else {
          console.log('[mermaidToSvg] mmdc executed successfully:', svgPath);
          resolve(null);
        }
      }
    );
  });
  // Check if SVG file exists
  try {
    await fs.access(svgPath);
    console.log('[mermaidToSvg] SVG file exists:', svgPath);
  } catch (e) {
    console.error('[mermaidToSvg] SVG file does not exist after mmdc:', svgPath);
    throw e;
  }
  const svg = await fs.readFile(svgPath, 'utf8');
  console.log('[mermaidToSvg] SVG content length:', svg.length);
  await fs.unlink(mmdPath);
  await fs.unlink(svgPath);
  return svg;
}