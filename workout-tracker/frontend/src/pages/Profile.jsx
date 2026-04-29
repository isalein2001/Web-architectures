import React, { useContext } from 'react';
import { User, Bell, Zap, Shield, Watch, Lock } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import './Profile.css';

export default function Profile() {
  const { t } = useContext(LanguageContext);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>ACCOUNT <span>SETTINGS</span></h1>
        <p>OPTIMIZE YOUR PROFILE AND INTERFACE. PREFERENCES FOR THE BEST EXPERIENCE.</p>
      </div>

      <div className="profile-layout">
        <div className="profile-left">
          <section className="profile-card">
            <div className="card-header">
              <div className="header-label">
                <User size={24} color="#C5FE00" />
                <span>ACCOUNT PROFILE</span>
              </div>
            </div>
            <div className="profile-avatar">
              <div className="avatar-circle">JA</div>
              <div className="avatar-info">
                <label>DISPLAY NAME</label>
                <p>Jonas Arnold</p>
              </div>
            </div>
            <div className="form-field">
              <label>EMAIL ADDRESS</label>
              <input type="email" defaultValue="JonasArnold@gmail.com" />
            </div>
            <div className="form-field">
              <label>PASSWORD</label>
              <div className="password-input-row">
                <input type="password" defaultValue="••••••••••••" readOnly />
                <button className="change-btn">CHANGE</button>
              </div>
            </div>
          </section>

          <section className="profile-card">
            <div className="card-header">
              <div className="header-label">
                <Zap size={24} color="#C5FE00" />
                <span>ADVANCED BIOMETRICS</span>
              </div>
            </div>
            <div className="bio-grid">
              <div className="form-field">
                <label>GENDER</label>
                <select defaultValue="Male">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-field">
                <label>HEIGHT (CM)</label>
                <input type="number" defaultValue="185" />
              </div>
              <div className="form-field">
                <label>WEIGHT (KG)</label>
                <input type="number" defaultValue="85" />
              </div>
            </div>
            <div className="bmi-row">
              <button className="calc-btn">CALCULATE BMI</button>
              <div className="bmi-display">
                <span className="bmi-label">AUTOMATED INDEX TRACKING</span>
                <span className="bmi-value">BMI: 24.8</span>
              </div>
            </div>
          </section>
        </div>

        <div className="profile-right">
          <section className="profile-card">
            <div className="card-header">
              <div className="header-label">
                <Bell size={24} color="#C5FE00" />
                <span>ALERTS</span>
              </div>
            </div>
            <div className="toggle-item">
              <div className="toggle-label">
                <span className="label-main">WORKOUT REMINDERS</span>
                <span className="label-sub">DAILY SESSION PROMPTS</span>
              </div>
              <div className="toggle-switch active"></div>
            </div>
            <div className="toggle-item">
              <div className="toggle-label">
                <span className="label-main">HYDRATION ALERTS</span>
                <span className="label-sub">WATER INTAKE TRACKING</span>
              </div>
              <div className="toggle-switch"></div>
            </div>
          </section>

          <section className="profile-card">
            <div className="card-header">
              <div className="header-label">
                <Shield size={24} color="#C5FE00" />
                <span>PRIVACY</span>
              </div>
            </div>
            <button className="export-btn">EXPORT PERSONAL DATA</button>
            <button className="delete-btn">DELETE ACCOUNT</button>
          </section>

          <section className="profile-card">
            <div className="card-header">
              <div className="header-label">
                <Watch size={24} color="#C5FE00" />
                <span>APPLE WATCH</span>
              </div>
            </div>
            <div className="device-status">
              <span className="status-badge">CONNECTED</span>
              <p className="device-info">HEALTHKIT ENABLED</p>
              <button className="disconnect-btn">DISCONNECT</button>
            </div>
          </section>

          <section className="profile-card encryption-card">
            <div className="encryption-content">
              <div className="encryption-icon-circle">
                <Lock size={100} color="#C5FE00" />
              </div>
              <div className="encryption-info">
                <div className="encryption-header">ADVANCED DATA ENCRYPTION PROTOCOL</div>
                <p className="encryption-text">All biometric data transmitted between your wearables and PROGYM servers is protected by 256-bit military-grade encryption. Your performance is private.</p>
                <div className="encryption-tags">
                  <span className="tag">HIPAA COMPLIANT</span>
                  <span className="tag">END-TO-END ENCRYPTED</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
