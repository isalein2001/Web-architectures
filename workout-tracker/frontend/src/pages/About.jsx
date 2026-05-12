import React from 'react';
import { UsersRound } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import './About.css';

const founders = [
  {
    name: 'ISABEL PRIEB',
    role: 'THE DEVELOPER',
    avatarClass: 'isabel',
    description:
      'Technical Lead - Focused on software architecture and data logic. She builds the robust engine behind PROGYM, ensuring every rep and set is recorded with precision and backed by reliable engineering.',
  },
  {
    name: 'MARCEL MILLER',
    role: 'THE DESIGNER',
    avatarClass: 'marcel',
    description:
      'Creative Lead - Specializing in UI/UX and visual strategy. He transforms complex workout data into a clean, intuitive experience, ensuring that tracking your progress is as seamless as the workout itself.',
  },
];

const philosophy = [
  {
    number: '01',
    title: 'PRECISION',
    copy: "Every rep is a data point. We don't guess - we calculate. Minimal effort for maximum metabolic disruption.",
  },
  {
    number: '02',
    title: 'INTENSITY',
    copy: 'Comfort is the enemy of progress. We design for the threshold where physical limits are redefined.',
  },
  {
    number: '03',
    title: 'EVOLUTION',
    copy: 'The body is a machine that must be upgraded constantly. Stagnation is not an option in the PROGYM ecosystem.',
  },
];

export default function About() {
  const { t } = useLanguage();

  return (
    <div className="about-page">
      <header className="about-hero">
        <h1>{t('ABOUT US')} - <span>{t('FOUNDERS')}</span></h1>
      </header>

      <section className="founders-grid">
        {founders.map((founder) => (
          <article className="founder-card" key={founder.name}>
            <div className={`founder-avatar ${founder.avatarClass}`} aria-hidden="true">
              <div className="avatar-face">
                <span className="avatar-eye left" />
                <span className="avatar-eye right" />
                <span className="avatar-nose" />
                <span className="avatar-mouth" />
              </div>
            </div>
            <h2>{founder.name}</h2>
            <div className="founder-role">{t(founder.role)}</div>
            <p>{t(founder.description)}</p>
          </article>
        ))}
      </section>

      <section className="team-story">
        <div className="team-copy">
          <div className="about-accent-line" />
          <h2>{t('THE TEAM BEHIND')} <span>{t('PROGYM')}</span></h2>
          <p>
            <span>{t('PROGYM')}</span> {t('started with a simple vision: we were tired of tattered notebooks and losing track of our progress between sets. We built this digital home to replace pens and paper with a seamless, intelligent platform for your hard work. From tracking every rep to visualizing long-term growth, we created the tool we always wanted for our own journey. No more guessing, just pure progress.')}
          </p>
        </div>

        <aside className="about-stat-card">
          <div>
            <span>{t('ACTIVE ATHLETES')}</span>
            <strong>120+</strong>
          </div>
          <small>{t('USERS')}</small>
          <UsersRound size={26} />
        </aside>
      </section>

      <section className="philosophy-panel">
        <h2>{t('OUR')} <span>{t('PHILOSOPHY')}</span></h2>
        <div className="philosophy-grid">
          {philosophy.map((item) => (
            <article className="philosophy-item" key={item.number}>
              <div>{item.number}</div>
              <h3>{t(item.title)}</h3>
              <p>{t(item.copy)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
