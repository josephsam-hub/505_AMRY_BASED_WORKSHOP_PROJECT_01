import { apiEndpoint, runtimeConfig } from '../config/runtime';

export type ServerConnectionState = 'connected' | 'offline' | 'checking';

export async function checkWorkshopServer(signal?: AbortSignal): Promise<ServerConnectionState> {
  if (!runtimeConfig.isLanConfigured) return 'connected';

  try {
    const response = await fetch(apiEndpoint('/api/health'), {
      method: 'GET',
      signal,
      cache: 'no-store',
    });
    return response.ok ? 'connected' : 'offline';
  } catch {
    return 'offline';
  }
}
