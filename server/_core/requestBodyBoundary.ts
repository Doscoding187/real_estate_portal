import express, { type Express, type NextFunction, type Request, type Response } from 'express';

export const REQUEST_BODY_LIMIT = '14mb';

export function registerRequestBodyBoundary(app: Express): void {
  app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ limit: REQUEST_BODY_LIMIT, extended: true, parameterLimit: 1_000 }));
  app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({
        error: 'Request body is too large.',
        requestId: (req as any).requestId,
      });
    }
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({
        error: 'Request body is invalid.',
        requestId: (req as any).requestId,
      });
    }
    return next(error);
  });
}
