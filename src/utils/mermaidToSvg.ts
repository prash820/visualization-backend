import { tmpdir } from 'os';
import { promises as fs } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

export async function mermaidToSvg(mermaidCode: string): Promise<string> {
  const tempDir = tmpdir();
  const mmdPath = path.join(tempDir, `diagram-${Date.now()}.mmd`);
  const svgPath = path.join(tempDir, `diagram-${Date.now()}.svg`);
  
  console.log('[mermaidToSvg] Writing Mermaid code to:', mmdPath);
  await fs.writeFile(mmdPath, mermaidCode, 'utf8');

  try {
    // Launch browser with system Chrome
    const browser = await puppeteer.launch({
      executablePath: '/app/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--headless=new'
      ],
    });

    // Create new page
    const page = await browser.newPage();

    // Set content with mermaid diagram and mermaid.js
    await page.setContent(`
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
        </head>
        <body>
          <div class="mermaid">
            ${mermaidCode}
          </div>
          <script>
            mermaid.initialize({
              startOnLoad: true,
              theme: 'default',
              securityLevel: 'loose'
            });
          </script>
        </body>
      </html>
    `);

    // Wait for mermaid to render
    await page.waitForSelector('.mermaid svg');

    // Get SVG content
    const svg = await page.evaluate(() => {
      const svgElement = document.querySelector('.mermaid svg');
      return svgElement ? svgElement.outerHTML : '';
    });

    // Close browser
    await browser.close();

    // Clean up temp files
    await fs.unlink(mmdPath);
    await fs.unlink(svgPath);

    console.log('[mermaidToSvg] SVG generated successfully');
    return svg;
  } catch (error) {
    console.error('[mermaidToSvg] Error generating SVG:', error);
    throw error;
  }
}