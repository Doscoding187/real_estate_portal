import express, { type Express, type Request, type Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ENV } from './env';

const LOCAL_UPLOAD_ROOT = path.resolve(process.cwd(), 'local-uploads');
const LOCAL_UPLOAD_PUBLIC_PATH = '/local-uploads';
const LOCAL_UPLOAD_API_PATH = '/api/local-upload';

const sanitizePathSegment = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'draft';

const sanitizeExtension = (filename: string, contentType: string) => {
  const fromName = path.extname(filename).replace(/^\./, '').toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType.startsWith('video/')) return 'mp4';
  if (contentType.startsWith('image/')) return contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg';
  return 'bin';
};

const getLocalUploadOrigin = () =>
  process.env.LOCAL_UPLOAD_PUBLIC_ORIGIN || process.env.VITE_API_URL || 'http://localhost:5000';

const resolveSafeUploadPath = (key: string) => {
  const normalizedKey = key.replace(/\\/g, '/').replace(/^\/+/, '');
  const targetPath = path.resolve(LOCAL_UPLOAD_ROOT, normalizedKey);

  if (!targetPath.startsWith(`${LOCAL_UPLOAD_ROOT}${path.sep}`)) {
    throw new Error('Invalid local upload path.');
  }

  return { normalizedKey, targetPath };
};

export function createLocalUploadTarget(
  filename: string,
  contentType: string,
  propertyId: string,
): { uploadUrl: string; key: string; publicUrl: string } {
  const safePropertyId = sanitizePathSegment(propertyId);
  const extension = sanitizeExtension(filename, contentType);
  const key = `properties/${safePropertyId}/${Date.now()}-${randomUUID()}.${extension}`;
  const origin = getLocalUploadOrigin().replace(/\/$/, '');

  return {
    uploadUrl: `${origin}${LOCAL_UPLOAD_API_PATH}/${key}`,
    key,
    publicUrl: `${origin}${LOCAL_UPLOAD_PUBLIC_PATH}/${key}`,
  };
}

export function registerLocalUploadRoutes(app: Express) {
  if (ENV.isProduction) return;

  app.use(
    LOCAL_UPLOAD_PUBLIC_PATH,
    express.static(LOCAL_UPLOAD_ROOT, {
      fallthrough: false,
      maxAge: 0,
    }),
  );

  app.put(
    `${LOCAL_UPLOAD_API_PATH}/*`,
    express.raw({ type: '*/*', limit: `${ENV.maxImageSizeMb}mb` }),
    async (req: Request, res: Response) => {
      try {
        const key = req.params[0];
        if (!key) {
          return res.status(400).json({ error: 'Missing local upload key.' });
        }

        const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
        if (body.length === 0) {
          return res.status(400).json({ error: 'Empty upload body.' });
        }

        const { normalizedKey, targetPath } = resolveSafeUploadPath(key);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, body);

        res.status(201).json({
          ok: true,
          key: normalizedKey,
          publicUrl: `${getLocalUploadOrigin().replace(/\/$/, '')}${LOCAL_UPLOAD_PUBLIC_PATH}/${normalizedKey}`,
        });
      } catch (error) {
        console.error('[LocalUpload] Failed to store local upload:', error);
        res.status(500).json({ error: 'Failed to store local upload.' });
      }
    },
  );
}
