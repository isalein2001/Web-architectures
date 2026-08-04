export const COOKIE_CONSENT_STORAGE_KEY = 'nextrepsCookieConsent';
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_CHANGED_EVENT = 'nextreps-cookie-consent-changed';
export const OPEN_COOKIE_SETTINGS_EVENT = 'nextreps-open-cookie-settings';

export const getCookieConsent = () => {
  if (typeof window === 'undefined') return null;

  try {
    const consent = JSON.parse(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
    return consent?.version === COOKIE_CONSENT_VERSION ? consent : null;
  } catch {
    return null;
  }
};

export const saveCookieConsent = ({ analytics }) => {
  const consent = {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics: Boolean(analytics),
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT, { detail: consent }));
  return consent;
};

export const hasAnalyticsConsent = () => getCookieConsent()?.analytics === true;

export const openCookieSettings = () => {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
};
