import React, { useState } from 'react';
import { Mail, MessageSquare, Plus, Send, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import './Support.css';

const faqItems = [
  'HOW DO I SYNC MY WEARABLE DEVICE?',
  'WHAT HAPPENS IF I MISS A SCHEDULED WORKOUT?',
  'HOW DO I CREATE MY OWN PLAN?',
];

export default function Support() {
  const { t } = useLanguage();
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="support-page">
      <section className="support-hero">
        <h1>{t('SUPPORT')} <span>{t('CENTER')}</span></h1>
        <p>{t('FREQUENTLY ASKED QUESTIONS')}</p>
      </section>

      <section className="support-faq">
        {faqItems.map((item, index) => (
          <button
            key={item}
            className={`support-faq-row ${openFaq === index ? 'open' : ''}`}
            onClick={() => setOpenFaq(openFaq === index ? null : index)}
            type="button"
          >
            <span>{t(item)}</span>
            <Plus size={20} />
          </button>
        ))}
      </section>

      <section className="support-main-grid">
        <div className="support-assistance">
          <h2>{t('STILL')} <span>{t('NEED ASSISTANCE?')}</span></h2>
          <p>
            {t('Our performance team is available for all users to help you reach your peak performance.')}
          </p>

          <div className="support-contact-row">
            <a className="support-contact-pill" href="mailto:support@progym.com">
              <span className="support-contact-icon">
                <Mail size={22} />
              </span>
              <span>
                <small>{t('EMAIL US')}</small>
                <strong>SUPPORT@PROGYM.COM</strong>
              </span>
            </a>

            <a className="support-contact-pill compact" href="https://www.instagram.com/progym" target="_blank" rel="noreferrer">
              <span className="support-contact-icon muted">
                <MessageSquare size={22} />
              </span>
              <span>
                <small>{t('SOCIAL CHANNELS')}</small>
                <strong>@PROGYM</strong>
              </span>
            </a>
          </div>
        </div>

        <form className="support-ticket-card">
          <h2>{t('SUBMIT A TICKET')}</h2>

          <label className="support-field">
            <span>{t('SUBJECT')}</span>
            <input type="text" placeholder={t("What's going on?")} />
          </label>

          <label className="support-field">
            <span>{t('DEPARTMENT')}</span>
            <div className="support-select-shell">
              <select defaultValue="TECHNICAL SUPPORT">
                <option>{t('TECHNICAL SUPPORT')}</option>
                <option>{t('TRAINING PLAN')}</option>
                <option>{t('BILLING')}</option>
                <option>{t('ACCOUNT')}</option>
              </select>
              <ChevronDown size={18} />
            </div>
          </label>

          <label className="support-field">
            <span>{t('MESSAGE')}</span>
            <textarea placeholder={t('Describe your issue in detail...')} />
          </label>

          <button className="support-submit" type="button">
            {t('SUBMIT REQUEST')} <Send size={18} />
          </button>
        </form>
      </section>
    </div>
  );
}
