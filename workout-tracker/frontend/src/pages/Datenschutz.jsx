import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Radio, Zap, Share2, Shield, Lock, Cookie } from 'lucide-react';
import './Legal.css';

export default function Datenschutz() {
  const { t } = useLanguage();

  return (
    <div className="dashboard-container">
      <div className="legal-header">
        <h1>
          {t('PRIVACY')} <span style={{ color: 'var(--color-primary)' }}>{t('POLICY')}</span>
        </h1>
        <p>{t('PAGE_PRIVACY_DESC')}</p>
      </div>

      <div className="privacy-grid">
        <section className="privacy-card">
          <div className="privacy-header">
            <Radio size={24} color="var(--color-primary)" />
            <div className="privacy-number">01</div>
          </div>
          <h3>{t('DATA COLLECTION')}</h3>
          <p>
            {t('We capture essential performance metrics: heart rate, HRV, VO2 max, and spatial movement data during sessions.')}
          </p>
          <div className="tags">
            <span className="tag">{t('BIOMETRIC INPUT')}</span>
            <span className="tag">{t('MOTION TRACKING')}</span>
          </div>
        </section>

        <section className="privacy-card">
          <div className="privacy-header">
            <Zap size={24} color="var(--color-primary)" />
            <div className="privacy-number">02</div>
          </div>
          <h3>{t('DATA USAGE')}</h3>
          <p>
            {t('Processed via kinetic algorithms to calculate optimal recovery windows and personalized workload intensity targets.')}
          </p>
          <div className="tags">
            <span className="tag">{t('RECOVERY ANALYTICS')}</span>
            <span className="tag">{t('LOAD PREDICTION')}</span>
          </div>
        </section>

        <section className="privacy-card">
          <div className="privacy-header">
            <Share2 size={24} color="var(--color-primary)" />
            <div className="privacy-number">03</div>
          </div>
          <h3>{t('THIRD-PARTY SHARING')}</h3>
          <p>
            {t('We only sync with ecosystem partners you authorize (Apple Health). Zero data sales to advertisers.')}
          </p>
          <div className="tags">
            <span className="tag">{t('API INTEGRATIONS')}</span>
            <span className="tag">{t('SECURE SYNC')}</span>
          </div>
        </section>

        <section className="privacy-card">
          <div className="privacy-header">
            <Shield size={24} color="var(--color-primary)" />
            <div className="privacy-number">04</div>
          </div>
          <h3>{t('USER RIGHTS')}</h3>
          <p>
            {t('You own your performance data. Request full exports, data deletion, or portable transfers at any moment.')}
          </p>
          <div className="tags">
            <span className="tag">{t('DATA PORTABILITY')}</span>
            <span className="tag">{t('RIGHT TO ERASE')}</span>
          </div>
        </section>

        <section className="privacy-card">
          <div className="privacy-header">
            <Lock size={24} color="var(--color-primary)" />
            <div className="privacy-number">05</div>
          </div>
          <h3>{t('SECURITY PROTOCOLS')}</h3>
          <p>
            {t('End-to-end encryption for all telemetry data. Multi-factor authentication required for athlete profile access.')}
          </p>
          <div className="tags">
            <span className="tag">{t('AES-256 ENCRYPTION')}</span>
            <span className="tag">{t('2FA PROTECTION')}</span>
          </div>
        </section>

        <section className="privacy-card">
          <div className="privacy-header">
            <Cookie size={24} color="var(--color-primary)" />
            <div className="privacy-number">06</div>
          </div>
          <h3>{t('COOKIES')}</h3>
          <p>
            {t('Minimalist tracking for session persistence and preference storage. No third-party marketing beacons used.')}
          </p>
          <div className="tags">
            <span className="tag">{t('SESSION MANAGEMENT')}</span>
            <span className="tag">{t('USER PREFERENCES')}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
