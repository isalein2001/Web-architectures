import React from 'react';

export default function Datenschutz() {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>PRIVACY <span>POLICY</span></h1>
        <p>At PROGYM, we prioritize your data security as much as your personal bests. This policy outlines how we handle your athletic data with elite-level precision.</p>
      </div>

      <div className="settings-layout" style={{ flexWrap: 'wrap' }}>
        <div className="settings-main" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)' }}>
          
          <section className="setting-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>DATA COLLECTION</h2>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'rgba(255,255,255,0.1)' }}>01</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              We capture essential performance metrics: heart rate, HRV, VO2 max, and spatial movement data during sessions.
            </p>
            <div className="tags">
              <span className="tag">BIOMETRIC INPUT</span>
              <span className="tag">MOTION TRACKING</span>
            </div>
          </section>

          <section className="setting-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>DATA USAGE</h2>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'rgba(255,255,255,0.1)' }}>02</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Processed via kinetic algorithms to calculate optimal recovery windows and personalized workload intensity targets.
            </p>
            <div className="tags">
              <span className="tag">RECOVERY ANALYTICS</span>
              <span className="tag">LOAD PREDICTION</span>
            </div>
          </section>

          <section className="setting-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>THIRD-PARTY SHARING</h2>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'rgba(255,255,255,0.1)' }}>03</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              We only sync with ecosystem partners you authorize (Apple Health). Zero data sales to advertisers.
            </p>
            <div className="tags">
              <span className="tag">API INTEGRATIONS</span>
              <span className="tag">SECURE SYNC</span>
            </div>
          </section>

          <section className="setting-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>USER RIGHTS</h2>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'rgba(255,255,255,0.1)' }}>04</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              You own your performance data. Request full exports, data deletion, or portable transfers at any moment.
            </p>
            <div className="tags">
              <span className="tag">DATA PORTABILITY</span>
              <span className="tag">RIGHT TO ERASE</span>
            </div>
          </section>

          <section className="setting-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>SECURITY PROTOCOLS</h2>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'rgba(255,255,255,0.1)' }}>05</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              End-to-end encryption for all telemetry data. Multi-factor authentication required for athlete profile access.
            </p>
            <div className="tags">
              <span className="tag">AES-256 ENCRYPTION</span>
              <span className="tag">2FA PROTECTION</span>
            </div>
          </section>

          <section className="setting-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>COOKIES</h2>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'rgba(255,255,255,0.1)' }}>06</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Minimalist tracking for session persistence and preference storage. No third-party marketing beacons used.
            </p>
            <div className="tags">
              <span className="tag">SESSION MANAGEMENT</span>
              <span className="tag">USER PREFERENCES</span>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
