import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseDevelopmentSeedPack, developmentSeedPackSchema } from '../shared/developmentSeedPack';
import type { DevelopmentSeedPackExport } from '../server/_core/databaseAuthority/dataAdapters/developmentSeedPackExport';

export async function readSeedPackFile(packPath: string): Promise<unknown> {
  const text = await readFile(resolve(packPath), 'utf8');
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Seed pack file is not valid JSON.');
  }
  parseDevelopmentSeedPack(json);
  return json;
}

export type SeedPackFileWriteReport = {
  packPath: string;
  assetsDir: string;
  valid: boolean;
  issues: string[];
  copiedAssets: number;
  unresolvedAssets: Array<{ file: string; sourceUrl: string | null }>;
  skippedFields: string[];
};

/**
 * Write pack.json and copy every locally stored media object next to it so the
 * pack is portable: the loader re-uploads each file to whatever storage its
 * target uses. Remote-only objects are listed, never fetched.
 */
export async function writeSeedPackExport(input: {
  exported: DevelopmentSeedPackExport;
  outPath: string;
  assetsDir: string;
  resolveLocalObject: (storageKey: string) => Promise<string | null>;
}): Promise<SeedPackFileWriteReport> {
  const { exported } = input;
  const unresolvedAssets: SeedPackFileWriteReport['unresolvedAssets'] = [];
  let copiedAssets = 0;
  for (const source of exported.mediaSources) {
    const localPath = source.storageKey ? await input.resolveLocalObject(source.storageKey) : null;
    if (!localPath) {
      unresolvedAssets.push({ file: source.file, sourceUrl: source.url });
      continue;
    }
    const target = join(input.assetsDir, source.file);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(localPath, target);
    copiedAssets += 1;
  }
  await mkdir(dirname(resolve(input.outPath)), { recursive: true });
  await writeFile(resolve(input.outPath), `${JSON.stringify(exported.pack, null, 2)}\n`, 'utf8');
  const validation = developmentSeedPackSchema.safeParse(exported.pack);
  return {
    packPath: resolve(input.outPath),
    assetsDir: resolve(input.assetsDir),
    valid: validation.success,
    issues: validation.success
      ? []
      : validation.error.issues
          .slice(0, 20)
          .map(i => `${i.path.join('.') || '(root)'}: ${i.message}`),
    copiedAssets,
    unresolvedAssets,
    skippedFields: exported.skipped,
  };
}
