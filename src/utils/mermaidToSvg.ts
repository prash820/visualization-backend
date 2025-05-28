import { execFile } from 'child_process';
import { tmpdir } from 'os';
import { promises as fs } from 'fs';
import path from 'path';

export async function mermaidToSvg(mermaidCode: string): Promise<string> {
  const tempDir = tmpdir();
  const mmdPath = path.join(tempDir, `diagram-${Date.now()}.mmd`);
  const svgPath = path.join(tempDir, `diagram-${Date.now()}.svg`);
  await fs.writeFile(mmdPath, mermaidCode, 'utf8');
  await new Promise((resolve, reject) => {
    execFile(
      'mmdc',
      ['-i', mmdPath, '-o', svgPath, '--quiet'],
      (error) => (error ? reject(error) : resolve(null))
    );
  });
  const svg = await fs.readFile(svgPath, 'utf8');
  await fs.unlink(mmdPath);
  await fs.unlink(svgPath);
  return svg;
}