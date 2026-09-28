import type { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; roles: string[]; gangIds: string[] };
    }
  }
}

export function authenticateRequest(request: Request, _response: Response, next: NextFunction) {
  // Authentication provider integration belongs here. Until it exists, development
  // requests use an explicit header so production cannot accidentally trust a role query.
  const userId = request.header('x-user-id');
  const roles = (request.header('x-user-roles') ?? '').split(',').map((role) => role.trim().toUpperCase()).filter(Boolean);
  const gangIds = (request.header('x-user-gangs') ?? '').split(',').map((gang) => gang.trim()).filter(Boolean);
  request.user = userId ? { id: userId, roles, gangIds } : undefined;
  next();
}

export function requireRole(...allowedRoles: string[]) {
  const normalizedAllowedRoles = allowedRoles.map((role) => role.toUpperCase());
  return (request: Request, response: Response, next: NextFunction) => {
    if (request.user?.roles.some((role) => normalizedAllowedRoles.includes(role))) return next();
    response.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  };
}
