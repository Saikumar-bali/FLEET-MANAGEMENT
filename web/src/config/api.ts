const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');

const normalizedApiUrl = configuredApiUrl
  ? configuredApiUrl.endsWith('/api/v1')
    ? configuredApiUrl
    : `${configuredApiUrl}/api/v1`
  : null;

export const API_BASE_URL = normalizedApiUrl || '/api/v1';
