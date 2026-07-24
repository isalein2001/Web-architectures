import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Building2, AtSign, ShieldCheck } from 'lucide-react';
import './Legal.css';

export default function Impressum() {
  const { t } = useLanguage();

  return (
    <div className="dashboard-container">
      <div className="legal-header">
        <h1>{t('PAGE_IMPRINT_TITLE')}</h1>
        <p>{t('PAGE_IMPRINT_DESC')}</p>
      </div>

      <div className="legal-layout">
        <section className="legal-card entity-card">
          <div className="widget-header">
            <div className="header-label">
              <Building2 size={18} />
              <span>{t('ENTITY')}</span>
            </div>
          </div>

          <div className="entity-title">Isabel Prieb</div>

          <div className="entity-grid">
            <div className="entity-details">
              <div className="card-block">
                <div className="card-label">{t('REGISTERED OFFICE')}</div>
                <div className="card-value">
                  Windsbacher Straße 16<br />
                  91174 Spalt<br />
                  {t('Germany')}
                </div>
              </div>
            </div>
            <div className="entity-details">
              <div className="card-block">
                <div className="card-label">Website</div>
                <div className="card-value">next-reps.de</div>
              </div>
            </div>
          </div>
        </section>

        <section className="legal-card contact-card">
          <div className="widget-header">
            <div className="header-label">
              <AtSign size={18} />
              <span>{t('CONTACT DETAILS')}</span>
            </div>
          </div>

          <div className="contact-details">
            <div className="row">
              <div className="detail-wrapper">
                <div className="card-label">{t('EMAIL')}</div>
                <div className="card-value">IsabelPrieb@gmail.com</div>
              </div>
              <div className="detail-wrapper">
                <div className="card-label">{t('PHONE')}</div>
                <div className="card-value">+49 176 72240218</div>
              </div>
            </div>
          </div>
        </section>

        <section className="legal-card neon-border-card">
          <div className="widget-header">
            <div className="header-label">
              <ShieldCheck size={18} />
              <span>{t('ONLINE DISPUTE RESOLUTION')}</span>
            </div>
          </div>
          <p>
            {t('The European Commission provides a platform for online dispute resolution (ODR), which you can find here: https://ec.europa.eu/consumers/odr. We are neither obliged nor willing to participate in a dispute resolution procedure before a consumer arbitration board.')}
          </p>
        </section>
      </div>
    </div>
  );
}
