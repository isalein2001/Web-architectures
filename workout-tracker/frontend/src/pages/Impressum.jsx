import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Building2, UserCheck, AtSign, Phone, ShieldCheck } from 'lucide-react';
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

          <div className="entity-title">PROGYM ELITE PERFORMANCE GMBH</div>

          <div className="entity-grid">
            <div className="entity-details">
              <div className="card-block">
                <div className="card-label">{t('REGISTERED OFFICE')}</div>
                <div className="card-value">
                  Fitnessstr. 1<br />
                  10115 Berlin<br />
                  {t('Germany')}
                </div>
              </div>
            </div>
            <div className="entity-details">
              <div className="card-block">
                <div className="card-label">{t('REGISTRY COURT')}</div>
                <div className="card-value">Amtsgericht Berlin</div>
              </div>
              <div className="card-block">
                <div className="card-label">{t('REGISTRY NUMBER')}</div>
                <div className="card-value">HRB 123456 B</div>
              </div>
            </div>
          </div>
        </section>

        <section className="legal-card representative-card">
          <div className="widget-header">
            <div className="header-label">
              <UserCheck size={18} />
              <span>{t('LEGAL REPRESENTATIVES')}</span>
            </div>
          </div>
          <div className="card-title">ALEX MERCER</div>
          <div className="card-value">{t('CEO / MANAGING DIRECTOR')}</div>
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
                <div className="card-value">contact@progym.elite</div>
              </div>
              <div className="detail-wrapper">
                <div className="card-label">{t('PHONE')}</div>
                <div className="card-value">+49 30 12345678</div>
              </div>
            </div>
            <div className="row">
              <div className="detail-wrapper">
                <div className="card-label">{t('VAT ID')}</div>
                <div className="card-value">DE 987654321</div>
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
