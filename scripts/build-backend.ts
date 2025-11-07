import { build } from 'esbuild';

async function buildBackend() {
  try {
    await build({
      entryPoints: ['server/_core/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outdir: 'dist',
      packages: 'external',
      resolveExtensions: ['.ts', '.js', '.mjs', '.cjs'],
      logLevel: 'info',
    });
    console.log('✅ Backend build complete');
  } catch (error) {
    console.error('❌ Backend build failed:', error);
    process.exit(1);
  }
}

buildBackend();
