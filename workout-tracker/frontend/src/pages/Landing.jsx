import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { Activity, ArrowRight, BarChart3, Dumbbell, LineChart, PlayCircle, Target, Trophy } from 'lucide-react';
import './Landing.css';

const reveal = {
  hidden: { opacity: 0, y: 34 },
  visible: { opacity: 1, y: 0 },
};

const featureCards = [
  {
    title: 'Build your own plan',
    text: 'Create workouts with exercises, sets, reps, cover images and plan icons that fit your training style.',
    Icon: Dumbbell,
    step: '01',
    meta: 'Plan',
  },
  {
    title: 'Log every session',
    text: 'Start a workout or add it later. Reps, weight, rest time and notes stay saved to your account.',
    Icon: LineChart,
    step: '02',
    meta: 'Train',
  },
  {
    title: 'See what changed',
    text: 'Your dashboard, calendar and analytics turn training into visible progress, not guesswork.',
    Icon: Trophy,
    step: '03',
    meta: 'Improve',
  },
];

const scrollFrames = [
  {
    kicker: 'Create',
    title: 'Build the workout you actually want to follow.',
    text: 'Name your plan, add exercises, set planned reps and keep your own cover photo attached to it.',
    image: '/slideshow-3.png',
    stat: 'Custom plans saved',
  },
  {
    kicker: 'Train',
    title: 'Start live or log it later.',
    text: 'Use the live logger during your workout, or backfill a completed session from the calendar when you forgot.',
    image: '/slideshow-7.png',
    stat: 'Set-by-set logs',
  },
  {
    kicker: 'Improve',
    title: 'Your progress becomes easy to read.',
    text: 'Next Reps connects your workouts, calendar, Health data and analytics so you can see what is moving.',
    image: '/achievements-bg.jpg',
    stat: 'Personal insights',
  },
];

const heroSlides = [
  {
    video: '/hero-reel-1.mp4',
    kicker: '01 / 03',
    caption: 'Plan workouts',
    Icon: Dumbbell,
  },
  {
    video: '/hero-reel-2.mp4',
    kicker: '02 / 03',
    caption: 'Log every set',
    Icon: LineChart,
  },
  {
    video: '/hero-reel-3.mp4',
    kicker: '03 / 03',
    caption: 'Read progress',
    Icon: Trophy,
  },
];

const HERO_SLIDE_DURATION_MS = 4200;

export default function Landing({ currentUser }) {
  const statementRef = useRef(null);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const { scrollYProgress } = useScroll();
  const { scrollYProgress: statementScrollProgress } = useScroll({
    target: statementRef,
    offset: ['start 68%', 'end 30%'],
  });
  const heroCopyY = useTransform(scrollYProgress, [0, 0.28], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0.25]);
  const progressScaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const faviconRotate = useTransform(statementScrollProgress, [0, 1], [0, 42]);
  const statementOpacity = useTransform(statementScrollProgress, [0, 0.35, 1], [1, 1, 0.28]);
  const primaryCta = currentUser ? '/dashboard' : '/register';

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, HERO_SLIDE_DURATION_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="landing-page">
      <motion.div className="landing-scroll-progress" style={{ scaleX: progressScaleX }} />

      <header className="landing-nav" aria-label="Next Reps">
        <NavLink className="landing-brand" to="/">
          <img src="/nextreps-logo.svg" alt="NEXT REPS" />
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
        <div className="landing-hero-media" aria-hidden="true">
          <div className="landing-hero-overlay" />
        </div>

        <div className="landing-hero-layout">
          <motion.div className="landing-hero-content" style={{ y: heroCopyY, opacity: heroOpacity }}>
            <motion.span
              className="landing-eyebrow"
              initial="hidden"
              animate="visible"
              variants={reveal}
              transition={{ duration: 0.55 }}
            >
              Workout planner + training tracker
            </motion.span>
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={reveal}
              transition={{ duration: 0.65, delay: 0.08 }}
            >
              Build your plan. Log your sets. See your progress.
            </motion.h1>
            <motion.p
              initial="hidden"
              animate="visible"
              variants={reveal}
              transition={{ duration: 0.65, delay: 0.16 }}
            >
              Next Reps helps you create workout plans, track reps and weights, connect daily activity and understand your training progress in one place.
            </motion.p>
            <motion.div
              className="landing-hero-actions"
              initial="hidden"
              animate="visible"
              variants={reveal}
              transition={{ duration: 0.65, delay: 0.24 }}
            >
              <NavLink className="landing-primary-button" to={primaryCta}>
                {currentUser ? 'Open Dashboard' : 'Create Your Workout'}
                <ArrowRight size={18} />
              </NavLink>
              {currentUser ? (
                <a className="landing-secondary-button" href="#features">Explore the App</a>
              ) : (
                <NavLink className="landing-secondary-button" to="/login" state={{ loginIntent: true }}>Login</NavLink>
              )}
            </motion.div>
          </motion.div>

          <motion.aside
            className="landing-hero-side"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.25 }}
          >
            <div className="landing-hero-reel" aria-label="Next Reps preview reel">
              <div className="landing-hero-reel-media">
                {heroSlides.map((slide, index) => (
                  <video
                    aria-hidden="true"
                    autoPlay
                    className={index === activeHeroSlide ? 'is-active' : ''}
                    key={slide.video}
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    src={slide.video}
                  />
                ))}
                <div className="landing-hero-reel-overlay" />
                <div className="landing-hero-reel-badge">next-reps.de</div>
              </div>
              <div className="landing-hero-reel-footer">
                {React.createElement(heroSlides[activeHeroSlide].Icon, {
                  'aria-hidden': true,
                  size: 18,
                  strokeWidth: 2.4,
                })}
                <span>{heroSlides[activeHeroSlide].kicker}</span>
                <strong>{heroSlides[activeHeroSlide].caption}</strong>
              </div>
              <div className="landing-hero-reel-progress" key={activeHeroSlide}>
                {heroSlides.map((slide, index) => (
                  <span
                    aria-label={`Slide ${index + 1}`}
                    className={index === activeHeroSlide ? 'is-active' : ''}
                    key={slide.caption}
                  />
                ))}
              </div>
            </div>
          </motion.aside>
        </div>

        <div className="landing-scroll-cue">
          <span>Scroll</span>
          <i />
        </div>
      </section>

      <section className="landing-brand-statement" aria-label="Why Next Reps" ref={statementRef}>
        <motion.div
          className="landing-brand-statement-inner"
          style={{ opacity: statementOpacity }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.45 }}
          variants={reveal}
          transition={{ duration: 0.65 }}
        >
          <div className="landing-brand-emblem">
            <motion.img src="/favicon.png?v=4" alt="" style={{ rotate: faviconRotate }} />
          </div>
          <p>
            Next Reps is built for people who want structure without slowing down their training.
            Create your plan, train from it, log the real numbers and come back to a dashboard that
            actually remembers what changed. No scattered notes, no lost workouts, no guessing your
            next move. Just every set, every session and every next rep in one clear system.
          </p>
        </motion.div>
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
          <span>What Next Reps does</span>
          <h2>Your gym notebook, calendar and analytics in one app.</h2>
          <p>
            Stop guessing what you trained, which weight you used or whether you are actually improving.
            Next Reps keeps plans, sessions and progress tied to your account.
          </p>
        </motion.div>

        <div className="landing-feature-grid">
          {featureCards.map(({ title, text, Icon, step, meta }, index) => (
            <motion.article
              className="landing-feature"
              key={title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              variants={reveal}
              transition={{ duration: 0.55, delay: index * 0.08 }}
            >
              <div className="landing-feature-topline">
                <span className="landing-feature-number">{step}</span>
                <span className="landing-feature-meta">{meta}</span>
              </div>
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
          <span>Built for real training</span>
          <h2>Useful in the gym, useful after the gym.</h2>
          <p>
            Use Next Reps live during your session, connect Apple Health for daily activity, or add a
            workout afterward when life gets messy. Your data stays organized per user.
          </p>
          <div className="landing-proof-list">
            <span><Target size={17} /> Goal-based workout planning</span>
            <span><Activity size={17} /> Apple Health activity sync</span>
            <span><PlayCircle size={17} /> Live and past workout logging</span>
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
          <h2>Create your first plan and start tracking with purpose.</h2>
          <NavLink className="landing-primary-button" to={primaryCta}>
            {currentUser ? 'Go to App' : 'Try Next Reps'}
            <ArrowRight size={18} />
          </NavLink>
        </motion.div>
      </section>
    </main>
  );
}
