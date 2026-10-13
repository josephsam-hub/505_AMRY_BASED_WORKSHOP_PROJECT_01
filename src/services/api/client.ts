import { apiEndpoint, runtimeConfig } from '../../config/runtime';
import { getDataMode } from '../../config/dataMode';
import { handleSimulationApiRequest } from '../simulation/simulationApiHandler';
import { useAppStore } from '../../store/useAppStore';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const TOKEN_KEY = 'workshop_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? 'dev-token-admin';
  } catch {
    return 'dev-token-admin';
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const mode = getDataMode();
  const currentRole = useAppStore.getState().role;

  // In SIMULATION mode: use deterministic Simulation API Handler
  if (mode === 'SIMULATION') {
    return handleSimulationApiRequest<T>(path, init, currentRole);
  }

  // In PRODUCTION mode: strictly use configured PostgreSQL backend
  if (!runtimeConfig.apiUrl) {
    throw new ApiError(
      'PostgreSQL Backend is not configured (VITE_API_URL is empty). Please set VITE_API_URL in .env or switch to Simulation Mode.',
      503
    );
  }

  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');

  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Also pass development identity headers matching active role
  if (currentRole === 'admin') {
    headers.set('x-user-id', 'USR-ADMIN');
    headers.set('x-user-roles', 'ADMIN,USER');
    headers.set('x-user-gangs', 'G01,G02,G03,G04,G05,G06,G07,G08,G09,G10');
  } else {
    headers.set('x-user-id', 'USR-GANG-GH');
    headers.set('x-user-roles', 'USER');
    headers.set('x-user-gangs', 'G07,G08');
  }

  try {
    const response = await fetch(apiEndpoint(path), {
      ...init,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new ApiError(
        body?.error ?? `Workshop PostgreSQL backend returned HTTP ${response.status}`,
        response.status
      );
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const msg = error instanceof Error ? error.message : 'Network error connecting to workshop backend';
    throw new ApiError(`Production Database Unreachable: ${msg}`, 503);
  }
}
