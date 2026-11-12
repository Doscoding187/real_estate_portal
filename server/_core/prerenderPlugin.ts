import type { Plugin } from 'vite';
import { listPrerenderPages, prerenderFileName, renderPrerenderedHtml } from './prerenderPages';

/**
 * Vite plugin that emits build-time HTML for the homepage, published place pages and the
 * fixed-content public pages. It reuses the application shell that Vite built, so scripts and
 * styles are untouched and React boots as before. Register it after canonicalDiscoveryHtml in
 * vite.config.ts. PRERENDER_LOCALITIES=false limits the output to provinces and cities.
 */
export function prerenderPagesPlugin(): Plugin {
  return {
    name: 'property-listify-prerender-pages',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const template = bundle['index.html'];
        if (!template || template.type !== 'asset') {
          throw new Error('Prerendered pages require the built application shell');
        }
        const shell = String(template.source);
        const pages = listPrerenderPages({
          includeLocalities: process.env.PRERENDER_LOCALITIES !== 'false',
        });
        for (const page of pages) {
          const source = renderPrerenderedHtml(shell, page);
          if (page.path === '/') {
            template.source = source;
          } else {
            this.emitFile({ type: 'asset', fileName: prerenderFileName(page), source });
          }
        }
      },
    },
  };
}
