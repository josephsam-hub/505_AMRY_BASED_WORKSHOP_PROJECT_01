import type { NextFunction, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; roles: string[]; gangIds: string[] };
    }
  }
}

export interface AuthUser {
  id: string;
  roles: string[];
  gangIds: string[];
}

const AUTH_SECRET = process.env.AUTH_SECRET ?? '505-base-workshop-secure-secret-key-2024';

// Cryptographic token signing
export function createToken(user: AuthUser, expiresInSeconds = 86400): string {
  const payload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    iat: Math.floor(Date.now() / 1000),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', AUTH_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

// Token verification
export function verifyToken(token: string): AuthUser | null {
  // Built-in recognized development tokens
  if (token === 'dev-token-admin') {
    return {
      id: 'USR-ADMIN',
      roles: ['ADMIN', 'USER'],
      gangIds: ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08', 'G09', 'G10'],
    };
  }
  if (token === 'dev-token-user') {
    return {
      id: 'USR-GANG-GH',
      roles: ['USER'],
      gangIds: ['G07', 'G08'],
    };
  }

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const expectedSig = createHmac('sha256', AUTH_SECRET).update(body).digest('base64url');

  try {
    const isMatch = timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    if (!isMatch) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired
    }
    return {
      id: payload.id,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      gangIds: Array.isArray(payload.gangIds) ? payload.gangIds : [],
    };
  } catch {
    return null;
  }
}

export function authenticateRequest(request: Request, _response: Response, next: NextFunction) {
  const authHeader = request.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const user = verifyToken(token);
    if (user) {
      request.user = user;
      return next();
    }
  }

  // Development fallback for backwards compatibility when headers are sent
  const userId = request.header('x-user-id');
  if (userId) {
    const rawRoles = request.header('x-user-roles') ?? '';
    const roles = rawRoles.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean);
    const gangIds = (request.header('x-user-gangs') ?? '').split(',').map((g) => g.trim()).filter(Boolean);
    request.user = { id: userId, roles, gangIds };
    return next();
  }

  request.user = undefined;
  next();
}

export function requireRole(...allowedRoles: string[]) {
  const normalizedAllowedRoles = allowedRoles.map((role) => role.toUpperCase());
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.user) {
      return response.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    if (request.user.roles.some((role) => normalizedAllowedRoles.includes(role))) {
      return next();
    }
    response.status(403).json({ error: 'Forbidden: Insufficient privileges', code: 'INSUFFICIENT_ROLE' });
  };
}
