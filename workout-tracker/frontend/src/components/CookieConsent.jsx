import { useEffect, useState } from 'react';
import { Check, Cookie, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { Link } from 'react-router';
import { isNativeApp } from '../api';
import { useLanguage } from '../context/LanguageContext';
import {
  getCookieConsent,
  OPEN_COOKIE_SETTINGS_EVENT,
  saveCookieConsent,
} from '../cookieConsent';
import './CookieConsent.css';

const copy = {
  de: {
    eyebrow: 'DEIN DIGITALER CHEAT DAY',
    title: 'Cookies sind nicht ideal für deine Gains – heute darfst du.',
    text: 'Notwendige Cookies halten Login und Sicherheit am Laufen. Mit deiner Zustimmung helfen uns accountbezogene Nutzungsdaten dabei, Workouts, Analysen und die App sinnvoll zu verbessern.',
    necessary: 'Notwendig',
    necessaryText: 'Login, Sicherheit und deine Cookie-Auswahl. Immer aktiv.',
    analytics: 'Produkt-Analytics',
    analyticsText: 'Ordnet Funktionsaufrufe deinem Account zu – ohne Werbetracking, IP-Speicherung oder Datenverkauf.',
    accept: 'Analytics erlauben',
    reject: 'Nur notwendige',
    settings: 'Auswahl anpassen',
    save: 'Auswahl speichern',
    details: 'Details & Datenschutz',
    close: 'Cookie-Einstellungen schließen',
  },
  en: {
    eyebrow: 'YOUR DIGITAL CHEAT DAY',
    title: 'Cookies are not ideal for your gains – but today is allowed.',
    text: 'Essential cookies keep login and security working. With your permission, account-linked usage data helps us improve workouts, analytics and the app.',
    necessary: 'Essential',
    necessaryText: 'Login, security and your cookie choice. Always active.',
    analytics: 'Product analytics',
    analyticsText: 'Links feature usage to your account – without ad tracking, IP storage or selling data.',
    accept: 'Allow analytics',
    reject: 'Essential only',
    settings: 'Adjust selection',
    save: 'Save selection',
    details: 'Details & privacy',
    close: 'Close cookie settings',
  },
};

export default function CookieConsent() {
  const { lang } = useLanguage();
  const labels = copy[lang] || copy.en;
  const isLoaderPreview = import.meta.env.DEV
    && ['previewLoader', 'preview404'].some((key) => (
      new URLSearchParams(window.location.search).has(key)
    ));
  const existingConsent = getCookieConsent();
  const [isOpen, setIsOpen] = useState(() => !isNativeApp && !existingConsent);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(() => existingConsent?.analytics === true);

  useEffect(() => {
    if (isNativeApp) return undefined;

    const reopenSettings = () => {
      const consent = getCookieConsent();
      setAnalytics(consent?.analytics === true);
      setShowSettings(true);
      setIsOpen(true);
    };

    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopenSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopenSettings);
  }, []);

  useEffect(() => {
    if (isNativeApp || !isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (isNativeApp || isLoaderPreview || !isOpen) return null;

  const chooseConsent = (allowAnalytics) => {
    saveCookieConsent({ analytics: allowAnalytics });
    setAnalytics(allowAnalytics);
    setIsOpen(false);
    setShowSettings(false);
  };

  return (
    <div className="cookie-consent-backdrop">
      <div className="cookie-consent-shell" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">
      <div className="cookie-consent-visual" aria-hidden="true">
        <span className="cookie-consent-orbit" />
        <Cookie size={58} strokeWidth={1.7} />
        <i className="cookie-crumb crumb-one" />
        <i className="cookie-crumb crumb-two" />
        <i className="cookie-crumb crumb-three" />
      </div>

      <div className="cookie-consent-copy">
        <span className="cookie-consent-eyebrow">{labels.eyebrow}</span>
        <h2 id="cookie-consent-title">{labels.title}</h2>
        <p>{labels.text}</p>

        {showSettings && (
          <div className="cookie-consent-settings">
            <div className="cookie-consent-option is-required">
              <span className="cookie-option-icon"><ShieldCheck size={18} /></span>
              <span>
                <strong>{labels.necessary}</strong>
                <small>{labels.necessaryText}</small>
              </span>
              <span className="cookie-required-state"><Check size={15} /></span>
            </div>

            <label className="cookie-consent-option">
              <span className="cookie-option-icon"><SlidersHorizontal size={18} /></span>
              <span>
                <strong>{labels.analytics}</strong>
                <small>{labels.analyticsText}</small>
              </span>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
              />
              <span className="cookie-toggle" aria-hidden="true" />
            </label>
          </div>
        )}

        <div className="cookie-consent-actions">
          <button
            className="cookie-consent-reject"
            data-cy="cookie-essential-only"
            type="button"
            onClick={() => chooseConsent(false)}
          >
            {labels.reject}
          </button>
          {showSettings ? (
            <button className="cookie-consent-accept" type="button" onClick={() => chooseConsent(analytics)}>
              {labels.save}
            </button>
          ) : (
            <button className="cookie-consent-accept" type="button" onClick={() => chooseConsent(true)}>
              {labels.accept}
            </button>
          )}
        </div>

        <div className="cookie-consent-links">
          <button type="button" onClick={() => setShowSettings((current) => !current)}>
            {labels.settings}
          </button>
          <Link to="/datenschutz">{labels.details}</Link>
        </div>
      </div>

        {existingConsent && (
          <button className="cookie-consent-close" type="button" onClick={() => setIsOpen(false)} aria-label={labels.close}>
            <X size={17} />
          </button>
        )}
      </div>
    </div>
  );
}
