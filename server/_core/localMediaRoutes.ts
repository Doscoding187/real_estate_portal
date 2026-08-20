import type { Express, Request, Response } from 'express';

import {
  getLocalMediaMaxBytes,
  getLocalMediaObjectForDelivery,
  isLocalMediaStorage,
  writeLocalMediaObject,
} from './mediaStorage';
import { verifyListingMediaUploadToken } from '../services/listingMediaAuthority';
import {
  verifyLandEvidenceDeliveryToken,
  verifyLandEvidenceUploadReservation,
} from '../services/landEvidenceStorage';

function queryString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function statusForUploadError(error: unknown): number {
  const message = error instanceof Error ? error.message : '';
  if (/exceeds|too large/i.test(message)) return 413;
  if (/already exists/i.test(message)) return 409;
  return 400;
}

function sendError(res: Response, error: unknown, fallback: string): void {
  const message = error instanceof Error && error.message ? error.message : fallback;
  res.status(statusForUploadError(error)).json({ error: message });
}

async function handleLocalMediaUpload(req: Request, res: Response): Promise<void> {
  const token = queryString(req.query.uploadToken);
  if (!token) {
    res.status(400).json({ error: 'A local media upload token is required.' });
    return;
  }

  try {
    let reservation: { key: string; contentType: string; mediaType: 'image' | 'video' | 'floorplan' | 'pdf' };
    try {
      reservation = verifyListingMediaUploadToken(token, { requireConfirmed: false });
    } catch {
      const privateReservation = verifyLandEvidenceUploadReservation(token);
      reservation = { ...privateReservation, mediaType: privateReservation.contentType === 'application/pdf' ? 'pdf' : 'image' };
    }
    const requestContentType = String(req.headers['content-type'] || '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase();
    if (!requestContentType || requestContentType !== reservation.contentType) {
      throw new Error('Uploaded media content type does not match its upload authority.');
    }

    const contentLengthHeader = req.headers['content-length'];
    if (typeof contentLengthHeader === 'string') {
      const declaredLength = Number(contentLengthHeader);
      if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
        throw new Error('Uploaded media content length is invalid.');
      }
      if (declaredLength > getLocalMediaMaxBytes(reservation.mediaType)) {
        throw new Error('Uploaded media exceeds the permitted size.');
      }
    }

    const result = await writeLocalMediaObject(
      reservation.key,
      reservation.contentType,
      req,
      getLocalMediaMaxBytes(reservation.mediaType),
    );
    res.status(200).json({ key: reservation.key, contentLength: result.contentLength });
  } catch (error) {
    sendError(res, error, 'Unable to store local media.');
  }
}

async function handleLocalMediaDelivery(req: Request, res: Response): Promise<void> {
  const key = queryString(req.query.key);
  if (!key) {
    res.status(400).json({ error: 'A local media key is required.' });
    return;
  }

  try {
    if (key.startsWith('private/')) throw new Error('Private evidence requires an authorized delivery token.');
    const object = await getLocalMediaObjectForDelivery(key);
    res.setHeader('Content-Type', object.contentType);
    res.setHeader('Content-Length', String(object.contentLength));
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.sendFile(
      object.path,
      { acceptRanges: true, cacheControl: false, lastModified: false },
      error => {
        if (error && !res.headersSent) {
          res
            .status((error as Error & { statusCode?: number }).statusCode || 404)
            .json({ error: 'Local media is unavailable.' });
        }
      },
    );
  } catch {
    res.status(404).json({ error: 'Local media is unavailable.' });
  }
}

async function handlePrivateEvidenceDelivery(req: Request, res: Response): Promise<void> {
  const token = queryString(req.query.deliveryToken);
  if (!token) { res.status(400).json({ error: 'A private evidence delivery token is required.' }); return; }
  try {
    const reservation = verifyLandEvidenceDeliveryToken(token);
    const object = await getLocalMediaObjectForDelivery(reservation.key);
    res.setHeader('Content-Type', object.contentType);
    res.setHeader('Content-Length', String(object.contentLength));
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(object.path, { acceptRanges: true, cacheControl: false, lastModified: false });
  } catch {
    res.status(404).json({ error: 'Private evidence is unavailable.' });
  }
}

/**
 * Mounts only the development local-storage boundary. S3 mode has no local
 * object route, so an accidental production/local-disk URL cannot be served.
 */
export function registerLocalMediaRoutes(app: Express): void {
  if (!isLocalMediaStorage()) return;

  app.put('/api/local-media/upload', (req, res) => {
    void handleLocalMediaUpload(req, res);
  });
  app.get('/api/local-media/object', (req, res) => {
    void handleLocalMediaDelivery(req, res);
  });
  app.head('/api/local-media/object', (req, res) => {
    void handleLocalMediaDelivery(req, res);
  });
  app.get('/api/local-media/private-evidence', (req, res) => {
    void handlePrivateEvidenceDelivery(req, res);
  });
}
