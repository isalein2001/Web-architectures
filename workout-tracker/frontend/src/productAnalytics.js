import { API_URL, authFetch, isNativeApp } from './api';
import { hasAnalyticsConsent } from './cookieConsent';

const createEventId = () => (
  globalThis.crypto?.randomUUID?.()
  || `${Date.now()}-${Math.random().toString(36).slice(2, 18)}`
);

export const trackProductEvent = async (eventName, metadata = undefined) => {
  if (isNativeApp || !hasAnalyticsConsent()) return false;

  try {
    const response = await authFetch(`${API_URL}/product-analytics`, {
      method: 'POST',
      body: JSON.stringify({
        eventName,
        clientEventId: createEventId(),
        source: 'web',
        ...(metadata ? { metadata } : {}),
      }),
      redirectOnUnauthorized: false,
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const getMyProductAnalytics = async () => {
  const response = await authFetch(`${API_URL}/product-analytics/me`, {
    redirectOnUnauthorized: false,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not load analytics events');
  return payload.events || [];
};
