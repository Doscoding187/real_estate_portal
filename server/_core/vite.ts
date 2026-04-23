import express, { type Express } from 'express';
import fs from 'fs';
import { type Server } from 'http';
import { nanoid } from 'nanoid';
import path from 'path';
import { injectSeoHead } from './seoHead';

function isReservedNonHtmlPath(pathname: string): boolean {
  return (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /^\/sitemap(?:-[a-z0-9-]+)?\.xml$/i.test(pathname)
  );
}

export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer } = await import('vite');
  const { default: viteConfig } = await import('../../vite.config');

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: 'custom',
  });

  app.use(vite.middlewares);
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    const pathname = req.path || '/';

    if (isReservedNonHtmlPath(pathname)) {
      res.status(404).type('text/plain; charset=utf-8').end('Not found');
      return;
    }

    try {
      const clientTemplate = path.resolve(import.meta.dirname, '../..', 'client', 'index.html');

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, 'utf-8');
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
      template = injectSeoHead(template, url);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, the bundled server is in dist/index.js
  // Frontend files are in dist/public
  const distPath = path.resolve(import.meta.dirname, 'public');

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(
    express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        const normalizedPath = filePath.toLowerCase();

        if (normalizedPath.endsWith(`${path.sep}index.html`)) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          return;
        }

        if (normalizedPath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return;
        }

        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
      },
    }),
  );

  // fall through to index.html if the file doesn't exist
  app.use('*', (req, res) => {
    if (isReservedNonHtmlPath(req.path || '/')) {
      res.status(404).type('text/plain; charset=utf-8').end('Not found');
      return;
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const indexPath = path.resolve(distPath, 'index.html');
    fs.promises
      .readFile(indexPath, 'utf-8')
      .then(template => injectSeoHead(template, req.originalUrl))
      .then(page => {
        res.status(200).type('text/html; charset=utf-8').send(page);
      })
      .catch(error => {
        console.error('Failed to render SPA fallback HTML', error);
        res.sendFile(indexPath);
      });
  });
}
