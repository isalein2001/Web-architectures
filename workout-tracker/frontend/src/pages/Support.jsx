import React, { useState } from 'react';
import { Mail, MessageSquare, Plus, Send, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import './Support.css';

const faqItems = [
  {
    question: 'HOW DO I SYNC MY WEARABLE DEVICE?',
    answer: 'Open Settings, connect your wearable in the account preferences and allow activity access. Once connected, steps, hydration reminders and daily activity data will update automatically after your device syncs.',
  },
  {
    question: 'WHAT HAPPENS IF I MISS A SCHEDULED WORKOUT?',
    answer: 'Nothing is deleted or penalized. The workout stays in your plan history, and you can either start it later, log a different session or adjust your weekly schedule from the workouts page.',
  },
  {
    question: 'HOW DO I CREATE MY OWN PLAN?',
    answer: 'Go to Workouts, enter a plan name, add exercises with sets, reps, weight and rest time, then save the plan. Your custom plan will appear in the ready list and can be started whenever you train.',
  },
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
          <article className={`support-faq-item ${openFaq === index ? 'open' : ''}`} key={item.question}>
            <button
              className="support-faq-row"
              onClick={() => setOpenFaq(openFaq === index ? null : index)}
              type="button"
              aria-expanded={openFaq === index}
              aria-controls={`support-faq-answer-${index}`}
            >
              <span>{t(item.question)}</span>
              <Plus size={20} />
            </button>
            <div
              className="support-faq-answer"
              id={`support-faq-answer-${index}`}
              hidden={openFaq !== index}
            >
              <p>{t(item.answer)}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="support-main-grid">
        <div className="support-assistance">
          <h2>{t('STILL')} <span>{t('NEED ASSISTANCE?')}</span></h2>
          <p>
            {t('Our performance team is available for all users to help you reach your peak performance.')}
          </p>

          <div className="support-contact-row">
            <a className="support-contact-pill" href="mailto:support@nextreps.com">
              <span className="support-contact-icon">
                <Mail size={22} />
              </span>
              <span>
                <small>{t('EMAIL US')}</small>
                <strong>SUPPORT@NEXTREPS.COM</strong>
              </span>
            </a>

            <a className="support-contact-pill compact" href="https://www.instagram.com/nextreps" target="_blank" rel="noreferrer">
              <span className="support-contact-icon muted">
                <MessageSquare size={22} />
              </span>
              <span>
                <small>{t('SOCIAL CHANNELS')}</small>
                <strong>@NEXTREPS</strong>
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
