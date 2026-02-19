import 'express';

declare global {
  namespace Express {
    interface User {
      id: number;
      role?: string | null;
      email?: string | null;
      name?: string | null;
      agencyId?: number | null;
      developerProfileId?: number | null;
      developerId?: number | null;
      developer?: { id: number } | null;
      profile?: { developerId?: number | null } | null;
      [key: string]: unknown;
    }

    interface Request {
      user?: User | null;
    }
  }
}

export {};
