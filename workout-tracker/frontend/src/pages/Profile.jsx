import React, { useContext } from 'react';
import { User, Bell, Zap, Shield, Watch, Lock } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import './Profile.css';

export default function Profile() {
  const { t } = useContext(LanguageContext);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>{t('ACCOUNT')} <span>{t('SETTINGS')}</span></h1>
        <p>{t('OPTIMIZE YOUR PROFILE AND INTERFACE. PREFERENCES FOR THE BEST EXPERIENCE.')}</p>
      </div>

      <div className="profile-layout">
        <div className="profile-left">
          <section className="profile-card">
            <div className="card-header">
              <div className="header-label">
                <User size={24} color="#C5FE00" />
                <span>{t('ACCOUNT PROFILE')}</span>
              </div>
            </div>
            <div className="profile-avatar">
              <div className="avatar-circle">JA</div>
              <div className="avatar-info">
                <label>{t('DISPLAY NAME')}</label>
                <p>Jonas Arnold</p>
              </div>
            </div>
            <div className="form-field">
              <label>{t('EMAIL ADDRESS')}</label>
              <input type="email" defaultValue="JonasArnold@gmail.com" />
            </div>
            <div className="form-field">
              <label>{t('PASSWORD')}</label>
              <div className="password-input-row">
                <input type="password" defaultValue="••••••••••••" readOnly />
                <button className="change-btn">{t('CHANGE')}</button>
              </div>
            </div>
          </section>

          <section className="profile-card">
            <div className="card-header">
              <div className="header-label">
                <Zap size={24} color="#C5FE00" />
                <span>{t('ADVANCED BIOMETRICS')}</span>
              </div>
            </div>
            <div className="bio-grid">
              <div className="form-field">
                <label>{t('GENDER')}</label>
                <select defaultValue="Male">
                  <option>{t('Male')}</option>
                  <option>{t('Female')}</option>
                  <option>{t('Other')}</option>
                </select>
              </div>
              <div className="form-field">
                <label>{t('HEIGHT (CM)')}</label>
                <input type="number" defaultValue="185" />
              </div>
              <div className="form-field">
                <label>{t('WEIGHT (KG)')}</label>
                <input type="number" defaultValue="85" />
              </div>
            </div>
            <div className="bmi-row">
              <button className="calc-btn">{t('CALCULATE BMI')}</button>
              <div className="bmi-display">
                <span className="bmi-label">{t('AUTOMATED INDEX TRACKING')}</span>
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
                <span>{t('ALERTS')}</span>
              </div>
            </div>
            <div className="toggle-item">
              <div className="toggle-label">
                <span className="label-main">{t('WORKOUT REMINDERS')}</span>
                <span className="label-sub">{t('DAILY SESSION PROMPTS')}</span>
              </div>
              <div className="toggle-switch active"></div>
            </div>
            <div className="toggle-item">
              <div className="toggle-label">
                <span className="label-main">{t('HYDRATION ALERTS')}</span>
                <span className="label-sub">{t('WATER INTAKE TRACKING')}</span>
              </div>
              <div className="toggle-switch"></div>
            </div>
          </section>

          <section className="profile-card">
            <div className="card-header">
              <div className="header-label">
                <Shield size={24} color="#C5FE00" />
                <span>{t('PRIVACY')}</span>
              </div>
            </div>
            <button className="export-btn">{t('EXPORT PERSONAL DATA')}</button>
            <button className="delete-btn">{t('DELETE ACCOUNT')}</button>
          </section>

          <section className="profile-card">
            <div className="card-header">
              <div className="header-label">
                <Watch size={24} color="#C5FE00" />
                <span>{t('APPLE WATCH')}</span>
              </div>
            </div>
            <div className="device-status">
              <span className="status-badge">{t('CONNECTED')}</span>
              <p className="device-info">{t('HEALTHKIT ENABLED')}</p>
              <button className="disconnect-btn">{t('DISCONNECT')}</button>
            </div>
          </section>

          <section className="profile-card encryption-card">
            <div className="encryption-content">
              <div className="encryption-icon-circle">
                <Lock size={100} color="#C5FE00" />
              </div>
              <div className="encryption-info">
                <div className="encryption-header">{t('ADVANCED DATA ENCRYPTION PROTOCOL')}</div>
                <p className="encryption-text">{t('All biometric data transmitted between your wearables and PROGYM servers is protected by 256-bit military-grade encryption. Your performance is private.')}</p>
                <div className="encryption-tags">
                  <span className="tag">{t('HIPAA COMPLIANT')}</span>
                  <span className="tag">{t('END-TO-END ENCRYPTED')}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
