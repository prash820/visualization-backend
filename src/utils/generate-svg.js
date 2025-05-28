const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const projectsPath = path.join(__dirname, '../visualization-backend/projects.json');
const tempMmd = path.join(__dirname, 'temp.mmd');
const tempSvg = path.join(__dirname, 'temp.svg');

const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

function mermaidToSvg(mermaidCode) {
  fs.writeFileSync(tempMmd, mermaidCode, 'utf8');
  execSync(`mmdc -i ${tempMmd} -o ${tempSvg} --quiet`);
  const svg = fs.readFileSync(tempSvg, 'utf8');
  fs.unlinkSync(tempMmd);
  fs.unlinkSync(tempSvg);
  return svg;
}

for (const project of projects) {
  if (project.umlDiagrams) {
    for (const [key, code] of Object.entries(project.umlDiagrams)) {
      if (typeof code === 'string' && !code.trim().startsWith('<svg')) {
        try {
          const svg = mermaidToSvg(code);
          if (!project.umlDiagramsSvg) project.umlDiagramsSvg = {};
          project.umlDiagramsSvg[key] = svg;
        } catch (e) {
          console.error(`Failed to render SVG for ${key}:`, e);
        }
      }
    }
  }
}

fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2), 'utf8');
console.log('SVGs generated and saved to projects.json');