import React from 'react';

export default function Impressum() {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>IMPrint</h1>
        <p>Legal information and disclosures.</p>
      </div>
      
      <div className="settings-layout">
        <div className="settings-main">
          <section className="setting-card">
            <h2>ENTITY</h2>
            <p style={{ color: 'var(--color-text-main)', fontSize: '1.25rem', fontWeight: 'bold' }}>PROGYM ELITE PERFORMANCE GMBH</p>
            
            <div className="form-group-row" style={{ marginTop: '2rem' }}>
              <div className="form-group">
                <label>REGISTERED OFFICE</label>
                <div style={{ color: 'var(--color-text-main)', marginTop: '4px' }}>
                  Fitnessstr. 1<br />
                  10115 Berlin<br />
                  Germany
                </div>
              </div>
              <div className="form-group">
                <label>REGISTRY COURT</label>
                <div style={{ color: 'var(--color-text-main)', marginTop: '4px' }}>Amtsgericht Berlin</div>
                
                <label style={{ marginTop: '1rem' }}>REGISTRY NUMBER</label>
                <div style={{ color: 'var(--color-text-main)', marginTop: '4px' }}>HRB 123456 B</div>
              </div>
            </div>
          </section>

          <section className="setting-card">
            <h2>LEGAL REPRESENTATIVES</h2>
            <div className="form-group">
              <label>CEO / MANAGING DIRECTOR</label>
              <div style={{ color: 'var(--color-text-main)', fontSize: '1.25rem', marginTop: '4px' }}>ALEX MERCER</div>
            </div>
          </section>

          <div className="split-cards">
            <section className="setting-card">
              <h2>CONTACT DETAILS</h2>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>EMAIL</label>
                <div style={{ color: 'var(--color-primary)' }}>contact@progym.elite</div>
              </div>
              <div className="form-group">
                <label>PHONE</label>
                <div style={{ color: 'var(--color-text-main)' }}>+49 30 12345678</div>
              </div>
            </section>
            <section className="setting-card">
              <h2>VAT ID</h2>
              <div style={{ color: 'var(--color-text-main)', fontSize: '1.25rem' }}>DE 987654321</div>
            </section>
          </div>
        </div>

        <div className="settings-sidebar">
          <div className="info-card">
            <div className="info-badge">ONLINE DISPUTE RESOLUTION</div>
            <p>The European Commission provides a platform for online dispute resolution (OS), which you can find here: https://ec.europa.eu/consumers/odr. We are neither obliged nor willing to participate in a dispute resolution procedure before a consumer arbitration board.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
