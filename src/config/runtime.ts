const apiUrl = import.meta.env.VITE_API_URL?.trim() ?? '';
const realtimeUrl = import.meta.env.VITE_REALTIME_URL?.trim() ?? '';
const appUrl = import.meta.env.VITE_APP_URL?.trim() ?? '';

export const runtimeConfig = {
  apiUrl: apiUrl.replace(/\/$/, ''),
  realtimeUrl: realtimeUrl.replace(/\/$/, ''),
  appUrl: appUrl.replace(/\/$/, ''),
  isLanConfigured: Boolean(apiUrl),
};

export const apiMode = runtimeConfig.isLanConfigured;

export function apiEndpoint(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${runtimeConfig.apiUrl}${normalizedPath}`;
}
