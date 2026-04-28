import React from 'react';
import './Profile.css';

export default function Profile() {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>ACCOUNT <span>SETTINGS</span></h1>
        <p>OPTIMIZE YOUR PROFILE AND INTERFACE. PREFERENCES FOR THE BEST EXPERIENCE.</p>
      </div>

      <div className="settings-layout">
        <div className="settings-main">
          {/* Account Profile Section */}
          <section className="setting-card">
            <h2>ACCOUNT PROFILE</h2>
            <div className="form-group-row">
              <div className="form-group">
                <label>DISPLAY NAME</label>
                <input type="text" defaultValue="Jonas Arnold" />
              </div>
              <div className="form-group">
                <label>EMAIL ADDRESS</label>
                <input type="email" defaultValue="JonasArnold@gmail.com" />
              </div>
            </div>
            <div className="form-group">
              <label>PASSWORD</label>
              <div className="password-row">
                <input type="password" defaultValue="••••••••••••" readOnly />
                <button className="change-btn">CHANGE</button>
              </div>
            </div>
          </section>

          {/* Advanced Biometrics Section */}
          <section className="setting-card">
            <h2>ADVANCED BIOMETRICS</h2>
            <div className="form-group-row three-col">
              <div className="form-group">
                <label>GENDER</label>
                <select defaultValue="Male">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>HEIGHT (CM)</label>
                <input type="number" defaultValue="185" />
              </div>
              <div className="form-group">
                <label>WEIGHT (KG)</label>
                <input type="number" defaultValue="85" />
              </div>
            </div>
            
            <div className="bmi-section">
              <button className="calc-btn">CALCULATE BMI</button>
              <div className="bmi-result">
                <span>AUTOMATED INDEX TRACKING</span>
                <span className="bmi-val">BMI: 24.8</span>
              </div>
            </div>
          </section>

          {/* Alerts & Privacy Section */}
          <div className="split-cards">
            <section className="setting-card">
              <h2>ALERTS</h2>
              <div className="toggle-row">
                <label>WORKOUT REMINDERS</label>
                <span>DAILY SESSION PROMPTS</span>
              </div>
              <div className="toggle-row">
                <label>HYDRATION ALERTS</label>
                <span>WATER INTAKE TRACKING</span>
              </div>
            </section>

            <section className="setting-card privacy-card">
              <h2>PRIVACY</h2>
              <button className="outline-btn">EXPORT PERSONAL DATA</button>
              <button className="danger-btn">DELETE ACCOUNT</button>
            </section>
          </div>

          <div className="action-row">
            <button className="outline-btn">DISCARD CHANGES</button>
            <button className="workout-btn" style={{width: 'auto'}}>APPLY CHANGES</button>
          </div>
        </div>

        <div className="settings-sidebar">
          <div className="info-card">
            <div className="info-badge">ADVANCED DATA ENCRYPTION PROTOCOL</div>
            <p>All biometric data transmitted between your wearables and PROGYM servers is protected by 256-bit military-grade encryption. Your performance is private.</p>
            <div className="tags">
              <span className="tag">HIPAA COMPLIANT</span>
              <span className="tag">END-TO-END ENCRYPTED</span>
            </div>
          </div>

          <div className="info-card connected-card">
            <div className="info-badge success">CONNECTED</div>
            <h3>APPLE WATCH</h3>
            <p>HEALTHKIT ENABLED</p>
            <button className="danger-text-btn">DISCONNECT</button>
          </div>
        </div>
      </div>
    </div>
  );
}
