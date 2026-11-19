export function getServerUrl(): string {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  // In local development, the Vite dev server typically runs on port 5173
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  // In production, when served by Express or behind a reverse proxy, use current origin
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
}
