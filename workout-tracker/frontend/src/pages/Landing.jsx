import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { Activity, ArrowRight, BarChart3, Dumbbell, Flame, LineChart, PlayCircle, ShieldCheck, Target } from 'lucide-react';
import './Landing.css';

const reveal = {
  hidden: { opacity: 0, y: 34 },
  visible: { opacity: 1, y: 0 },
};

const featureCards = [
  {
    title: 'Personalized Workout Plans',
    text: 'Create training plans based on your goals, fitness level and available time.',
    Icon: Dumbbell,
  },
  {
    title: 'Progress Tracking',
    text: 'Log your workouts, track your sets and watch your performance improve over time.',
    Icon: LineChart,
  },
  {
    title: 'Designed for Consistency',
    text: 'Next Reps helps you stay on track, even when motivation gets low.',
    Icon: Flame,
  },
];

const scrollFrames = [
  {
    kicker: 'Plan',
    title: 'No more guessing what to train next.',
    text: 'Create workouts that fit your goals, your level and your schedule.',
    image: '/slideshow-3.png',
    stat: 'Custom plans',
  },
  {
    kicker: 'Track',
    title: 'Every set becomes useful data.',
    text: 'Log your reps, weights and sessions without overcomplicating your routine.',
    image: '/slideshow-7.png',
    stat: 'Clear logs',
  },
  {
    kicker: 'Progress',
    title: 'One more rep. One step closer.',
    text: 'See your progress grow step by step, rep by rep.',
    image: '/achievements-bg.jpg',
    stat: 'Visible results',
  },
];

export default function Landing({ currentUser }) {
  const { scrollYProgress } = useScroll();
  const heroImageY = useTransform(scrollYProgress, [0, 0.35], [0, 120]);
  const heroCopyY = useTransform(scrollYProgress, [0, 0.28], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0.25]);
  const progressScaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const primaryCta = currentUser ? '/dashboard' : '/register';

  return (
    <main className="landing-page">
      <motion.div className="landing-scroll-progress" style={{ scaleX: progressScaleX }} />

      <header className="landing-nav" aria-label="Next Reps">
        <NavLink className="landing-brand" to="/">
          <Activity size={23} />
          <span>NEXT REPS</span>
        </NavLink>
        <nav className="landing-nav-actions" aria-label="Landing navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          {currentUser ? (
            <NavLink className="landing-nav-button" to="/dashboard">Dashboard</NavLink>
          ) : (
            <NavLink className="landing-nav-button" to="/login" state={{ loginIntent: true }}>Login</NavLink>
          )}
        </nav>
      </header>

      <section className="landing-hero">
        <motion.div className="landing-hero-media" style={{ y: heroImageY }}>
          <img src="/hero-bg.jpg" alt="Athlete training with weights" />
          <div className="landing-hero-overlay" />
        </motion.div>

        <motion.div className="landing-hero-content" style={{ y: heroCopyY, opacity: heroOpacity }}>
          <motion.span
            className="landing-eyebrow"
            initial="hidden"
            animate="visible"
            variants={reveal}
            transition={{ duration: 0.55 }}
          >
            Smart workout planning
          </motion.span>
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={reveal}
            transition={{ duration: 0.65, delay: 0.08 }}
          >
            Train smarter. Track better. Progress faster.
          </motion.h1>
          <motion.p
            initial="hidden"
            animate="visible"
            variants={reveal}
            transition={{ duration: 0.65, delay: 0.16 }}
          >
            Next Reps is your smart training companion for personalized workout planning, progress tracking and long-term motivation.
          </motion.p>
          <motion.div
            className="landing-hero-actions"
            initial="hidden"
            animate="visible"
            variants={reveal}
            transition={{ duration: 0.65, delay: 0.24 }}
          >
            <NavLink className="landing-primary-button" to={primaryCta}>
              {currentUser ? 'Open Dashboard' : 'Start Your Plan'}
              <ArrowRight size={18} />
            </NavLink>
            <a className="landing-secondary-button" href="#features">Explore the App</a>
          </motion.div>
        </motion.div>

        <motion.div
          className="landing-hero-panel"
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.38 }}
        >
          <div>
            <span>Today's focus</span>
            <strong>Push Strength</strong>
          </div>
          <div className="landing-mini-progress">
            <span style={{ width: '72%' }} />
          </div>
          <small>4 exercises planned · 72% weekly consistency</small>
        </motion.div>

        <div className="landing-scroll-cue">
          <span>Scroll</span>
          <i />
        </div>
      </section>

      <section className="landing-intro" id="features">
        <motion.div
          className="landing-section-heading"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.45 }}
          variants={reveal}
          transition={{ duration: 0.6 }}
        >
          <span>Why Next Reps?</span>
          <h2>Progress starts with structure.</h2>
          <p>
            Training without structure makes progress harder. Next Reps gives you a clear plan,
            tracks your development and helps you stay consistent.
          </p>
        </motion.div>

        <div className="landing-feature-grid">
          {featureCards.map(({ title, text, Icon }, index) => (
            <motion.article
              className="landing-feature"
              key={title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              variants={reveal}
              transition={{ duration: 0.55, delay: index * 0.08 }}
            >
              <span className="landing-feature-icon"><Icon size={22} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="landing-scroll-story" id="how-it-works">
        {scrollFrames.map((frame, index) => (
          <motion.article
            className={`landing-story-frame ${index % 2 === 1 ? 'is-reversed' : ''}`}
            key={frame.title}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.42 }}
            variants={reveal}
            transition={{ duration: 0.65 }}
          >
            <div className="landing-story-copy">
              <span>{frame.kicker}</span>
              <h2>{frame.title}</h2>
              <p>{frame.text}</p>
            </div>
            <motion.div
              className="landing-story-image"
              whileInView={{ scale: 1, rotate: 0 }}
              initial={{ scale: 0.94, rotate: index % 2 === 0 ? -2 : 2 }}
              viewport={{ once: false, amount: 0.45 }}
              transition={{ duration: 0.7 }}
            >
              <img src={frame.image} alt={`${frame.kicker} preview`} />
              <div className="landing-image-badge">
                <BarChart3 size={16} />
                <span>{frame.stat}</span>
              </div>
            </motion.div>
          </motion.article>
        ))}
      </section>

      <section className="landing-proof">
        <motion.div
          className="landing-proof-image"
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.65 }}
        >
          <img src="/hero-bg-evening.jpg" alt="Evening workout session" />
        </motion.div>
        <motion.div
          className="landing-proof-copy"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={reveal}
          transition={{ duration: 0.65 }}
        >
          <span>Built for momentum</span>
          <h2>Plan. Train. Progress. Repeat.</h2>
          <p>
            Whether you want to build muscle, get stronger or stay consistent, Next Reps gives you
            the structure you need to keep moving forward.
          </p>
          <div className="landing-proof-list">
            <span><Target size={17} /> Goal-based planning</span>
            <span><ShieldCheck size={17} /> Balanced recovery rhythm</span>
            <span><PlayCircle size={17} /> Simple workout logging</span>
          </div>
        </motion.div>
      </section>

      <section className="landing-final">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.45 }}
          variants={reveal}
          transition={{ duration: 0.65 }}
        >
          <span>Your next rep starts here.</span>
          <h2>Build your perfect workout plan, powered by your goals.</h2>
          <NavLink className="landing-primary-button" to={primaryCta}>
            {currentUser ? 'Go to App' : 'Try Next Reps'}
            <ArrowRight size={18} />
          </NavLink>
        </motion.div>
      </section>
    </main>
  );
}
