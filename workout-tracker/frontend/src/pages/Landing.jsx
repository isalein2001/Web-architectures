import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { Activity, ArrowRight, BarChart3, Dumbbell, Globe, Instagram, LineChart, PlayCircle, Target, Trophy } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import './Landing.css';

const reveal = {
  hidden: { opacity: 0, y: 34 },
  visible: { opacity: 1, y: 0 },
};

const featureIcons = [Dumbbell, LineChart, Trophy];
const heroIcons = [Dumbbell, LineChart, Trophy];
const scrollImages = ['/slideshow-3.png', '/slideshow-7.png', '/achievements-bg.jpg'];

const landingCopy = {
  en: {
    navFeatures: 'Features',
    navHow: 'How it works',
    dashboard: 'Dashboard',
    login: 'Login',
    openDashboard: 'Open Dashboard',
    createWorkout: 'Create Your Workout',
    exploreApp: 'Explore the App',
    tryNextReps: 'Try Next Reps',
    goToApp: 'Go to App',
    scroll: 'Scroll',
    heroEyebrow: 'Workout planner + training tracker',
    heroTitle: 'Your gym notebook, calendar and analytics in one app.',
    heroText: 'Build workout plans, log every set and keep your training progress connected in one clean system.',
    statement:
      'Next Reps keeps your training simple, structured, and actually smart. Build your plan, take it to the gym, log your sets, and let the dashboard do the thinking after. See what changed, where you progressed, and what your next move should be. No notes app. No Excel sheets. No "wait, what weight did I use last time?"',
    statementHighlight: 'Just train, track, analyze - and hit your next rep.',
    introEyebrow: 'What Next Reps does',
    introTitle: 'No more Excel sheets or scattered gym notes.',
    introText:
      'Your plans, sessions, calendar and analytics stay digital, organized and tied to your account. No messy spreadsheets, no lost notes, no guessing what comes next.',
    faqTitle: 'Questions? Answers.',
    faqText: 'Everything that matters before you start planning, logging and tracking your training.',
    proofEyebrow: 'Built for real training',
    proofTitle: 'Useful in the gym, useful after the gym.',
    proofText:
      'Use Next Reps live during your session, connect Apple Health for daily activity, or add a workout afterward when life gets messy. Your data stays organized per user.',
    proofItems: ['Goal-based workout planning', 'Apple Health activity sync', 'Live and past workout logging'],
    finalEyebrow: 'Your next rep starts here.',
    finalTitle: 'Create your first plan and start tracking with purpose.',
    heroSlides: [
      { kicker: '01 / 03', caption: 'Plan workouts' },
      { kicker: '02 / 03', caption: 'Log every set' },
      { kicker: '03 / 03', caption: 'Read progress' },
    ],
    features: [
      {
        title: 'Build your own plan',
        text: 'Create workouts with exercises, sets, reps, cover images and plan icons that fit your training style.',
        step: '01',
        meta: 'Plan',
      },
      {
        title: 'Log every session',
        text: 'Start a workout or add it later. Reps, weight, rest time and notes stay saved to your account.',
        step: '02',
        meta: 'Train',
      },
      {
        title: 'See what changed',
        text: 'Your dashboard, calendar and analytics turn training into visible progress, not guesswork.',
        step: '03',
        meta: 'Improve',
      },
    ],
    faqItems: [
      {
        question: 'Do I need a finished workout plan to use Next Reps?',
        answer: 'No. You can build your own plan from scratch, start with a saved plan, or log a session afterward when you trained without planning first.',
      },
      {
        question: 'Will my workouts stay saved to my account?',
        answer: 'Yes. Plans, exercises, workout sessions and uploaded cover images are tied to your user account, so your training history stays available across web and app.',
      },
      {
        question: 'Can I log a workout later?',
        answer: 'Yes. If you forgot to track live in the gym, you can add the completed workout afterward and still keep your calendar and analytics complete.',
      },
      {
        question: 'Does Next Reps work with Apple Health?',
        answer: 'In the iOS app, Next Reps can use permitted Health data like steps, active calories and exercise minutes to keep your daily dashboard more accurate.',
      },
      {
        question: 'Can I use Next Reps on web and as an app?',
        answer: 'Yes. The web version and iOS app use the same account, so your plans, logs and progress stay connected.',
      },
    ],
    scrollFrames: [
      {
        kicker: 'Create',
        title: 'Build the workout you actually want to follow.',
        text: 'Name your plan, add exercises, set planned reps and keep your own cover photo attached to it.',
        stat: 'Custom plans saved',
      },
      {
        kicker: 'Train',
        title: 'Start live or log it later.',
        text: 'Use the live logger during your workout, or backfill a completed session from the calendar when you forgot.',
        stat: 'Set-by-set logs',
      },
      {
        kicker: 'Improve',
        title: 'Your progress becomes easy to read.',
        text: 'Next Reps connects your workouts, calendar, Health data and analytics so you can see what is moving.',
        stat: 'Personal insights',
      },
    ],
  },
  de: {
    navFeatures: 'Features',
    navHow: 'So läufts',
    dashboard: 'Dashboard',
    login: 'Login',
    openDashboard: 'Dashboard öffnen',
    createWorkout: 'Workout erstellen',
    exploreApp: 'App entdecken',
    tryNextReps: 'Next Reps testen',
    goToApp: 'Zur App',
    scroll: 'Scroll',
    heroEyebrow: 'Workout-Planer + Trainingstracker',
    heroTitle: 'Dein Gym-Notizbuch, Kalender und deine Analytics in einer App.',
    heroText: 'Plane Workouts, logge jeden Satz und behalte deinen Fortschritt in einem cleanen System im Blick.',
    statement:
      'Next Reps hält dein Training simpel, strukturiert und wirklich smart. Bau deinen Plan, nimm ihn mit ins Gym, logge deine Sätze und lass danach das Dashboard für dich mitdenken. Sieh, was sich verändert hat, wo du stärker geworden bist und was als Nächstes ansteht. Keine Notizen-App. Keine Excel-Listen. Kein "warte, welches Gewicht hatte ich letztes Mal?"',
    statementHighlight: 'Einfach trainieren, tracken, analysieren - und den nächsten Rep holen.',
    introEyebrow: 'Was Next Reps macht',
    introTitle: 'Nie wieder Excel-Listen oder lose Gym-Notizen.',
    introText:
      'Deine Pläne, Sessions, dein Kalender und deine Analytics bleiben digital, sortiert und mit deinem Account verbunden. Keine chaotischen Tabellen, keine verlorenen Zettel, kein Planlos-Training.',
    faqTitle: 'Fragen? Antworten.',
    faqText: 'Alles, was du wissen musst, bevor du planst, loggst und deinen Fortschritt trackst.',
    proofEyebrow: 'Gemacht für echtes Training',
    proofTitle: 'Stark im Gym. Stark danach.',
    proofText:
      'Nutze Next Reps live während deiner Session, verbinde Apple Health für deine Tagesaktivität oder trag ein Workout später nach, wenn es im Alltag mal hektisch wird. Deine Daten bleiben sauber pro Nutzer gespeichert.',
    proofItems: ['Workout-Planung nach deinen Zielen', 'Apple-Health-Aktivitätssync', 'Live loggen oder später nachtragen'],
    finalEyebrow: 'Dein nächster Rep startet hier.',
    finalTitle: 'Erstell deinen ersten Plan und trainiere mit echtem Fokus.',
    heroSlides: [
      { kicker: '01 / 03', caption: 'Workouts planen' },
      { kicker: '02 / 03', caption: 'Jeden Satz loggen' },
      { kicker: '03 / 03', caption: 'Fortschritt sehen' },
    ],
    features: [
      {
        title: 'Bau deinen eigenen Plan',
        text: 'Erstelle Workouts mit Übungen, Sätzen, Reps, Coverbildern und Icons, die wirklich zu deinem Training passen.',
        step: '01',
        meta: 'Plan',
      },
      {
        title: 'Logge jede Session',
        text: 'Starte live oder trag dein Workout später nach. Reps, Gewicht, Pausen und Notizen bleiben in deinem Account.',
        step: '02',
        meta: 'Train',
      },
      {
        title: 'Sieh, was sich bewegt',
        text: 'Dashboard, Kalender und Analytics machen deinen Fortschritt sichtbar statt ihn irgendwo verschwinden zu lassen.',
        step: '03',
        meta: 'Improve',
      },
    ],
    faqItems: [
      {
        question: 'Brauche ich schon einen fertigen Trainingsplan?',
        answer: 'Nein. Du kannst komplett frei starten, einen gespeicherten Plan nutzen oder ein Workout später nachtragen, wenn du einfach drauflos trainiert hast.',
      },
      {
        question: 'Bleiben meine Workouts wirklich gespeichert?',
        answer: 'Ja. Pläne, Übungen, Sessions und hochgeladene Coverbilder hängen an deinem Account, damit deine Trainingshistorie in Web und App erhalten bleibt.',
      },
      {
        question: 'Kann ich ein Workout nachträglich loggen?',
        answer: 'Ja. Wenn du im Gym vergessen hast live zu tracken, kannst du die Session später eintragen und Kalender sowie Analytics bleiben vollständig.',
      },
      {
        question: 'Funktioniert Next Reps mit Apple Health?',
        answer: 'In der iOS-App kann Next Reps mit deiner Erlaubnis Health-Daten wie Schritte, aktive Kalorien und Trainingsminuten nutzen, damit dein Dashboard genauer wird.',
      },
      {
        question: 'Kann ich Web und App mit demselben Account nutzen?',
        answer: 'Ja. Web-App und iOS-App nutzen denselben Account, damit deine Pläne, Logs und Fortschritte verbunden bleiben.',
      },
    ],
    scrollFrames: [
      {
        kicker: 'Create',
        title: 'Bau ein Workout, dem du wirklich folgen willst.',
        text: 'Gib deinem Plan einen Namen, füge Übungen hinzu, plane Reps und behalte dein eigenes Coverfoto dauerhaft dabei.',
        stat: 'Eigene Pläne gespeichert',
      },
      {
        kicker: 'Train',
        title: 'Starte live oder trag es später ein.',
        text: 'Nutze den Live-Logger während des Trainings oder fülle eine fertige Session später über den Kalender nach.',
        stat: 'Logs Satz für Satz',
      },
      {
        kicker: 'Improve',
        title: 'Dein Fortschritt wird endlich lesbar.',
        text: 'Next Reps verbindet Workouts, Kalender, Health-Daten und Analytics, damit du siehst, was wirklich vorangeht.',
        stat: 'Persönliche Insights',
      },
    ],
  },
};

const HERO_SLIDE_DURATION_MS = 4200;

export default function Landing({ currentUser }) {
  const { lang, setLang } = useLanguage();
  const statementRef = useRef(null);
  const arrowRef = useRef(null);
  const faqRef = useRef(null);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [activeFaq, setActiveFaq] = useState(-1);
  const { scrollYProgress } = useScroll();
  const { scrollYProgress: statementScrollProgress } = useScroll({
    target: statementRef,
    offset: ['start 68%', 'end 30%'],
  });
  const { scrollYProgress: arrowScrollProgress } = useScroll({
    target: arrowRef,
    offset: isCompactViewport ? ['start 68%', 'start -8%'] : ['start 62%', 'start -14%'],
  });
  const { scrollYProgress: faqArrowScrollProgress } = useScroll({
    target: faqRef,
    offset: isCompactViewport ? ['start 72%', 'start -28%'] : ['start 66%', 'start -34%'],
  });
  const heroCopyY = useTransform(scrollYProgress, [0, 0.28], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0.25]);
  const progressScaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const faviconRotate = useTransform(statementScrollProgress, [0, 1], [0, 42]);
  const statementOpacity = useTransform(statementScrollProgress, [0, 0.35, 1], [1, 1, 0.28]);
  const arrowClipPath = useTransform(arrowScrollProgress, [0, 1], ['inset(0 100% 0 0)', 'inset(0 0% 0 0)']);
  const arrowGlowOpacity = useTransform(arrowScrollProgress, [0, 0.35, 1], [0.12, 0.55, 0.82]);
  const faqArrowX = useTransform(
    faqArrowScrollProgress,
    [0, 0.58, 1],
    isCompactViewport
      ? ['-98vw', '26vw', '-74vw']
      : ['-62vw', '18vw', '-48vw']
  );
  const faqArrowY = useTransform(faqArrowScrollProgress, [0, 0.58, 1], [10, -3, 0]);
  const faqArrowRotate = useTransform(faqArrowScrollProgress, [0, 0.58, 1], [-2, 1.1, 0]);
  const faqArrowScale = useTransform(faqArrowScrollProgress, [0, 0.58, 1], [0.96, 1.04, 1]);
  const faqArrowOpacity = useTransform(faqArrowScrollProgress, [0, 0.14, 1], [0, 0.9, 0.9]);
  const faqLogoX = useTransform(
    faqArrowScrollProgress,
    [0, 0.58, 1],
    isCompactViewport ? ['0vw', '0vw', '82vw'] : ['0vw', '0vw', '48vw']
  );
  const primaryCta = currentUser ? '/dashboard' : '/register';
  const copy = landingCopy[lang] || landingCopy.en;
  const heroSlides = copy.heroSlides.map((slide, index) => ({
    ...slide,
    video: `/hero-reel-${index + 1}.mp4`,
    Icon: heroIcons[index],
  }));
  const featureCards = copy.features.map((feature, index) => ({
    ...feature,
    Icon: featureIcons[index],
  }));
  const scrollFrames = copy.scrollFrames.map((frame, index) => ({
    ...frame,
    image: scrollImages[index],
  }));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, HERO_SLIDE_DURATION_MS);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 980px)');
    const syncViewport = () => setIsCompactViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);

    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  return (
    <main className="landing-page">
      <motion.div className="landing-scroll-progress" style={{ scaleX: progressScaleX }} />

      <header className="landing-nav" aria-label="Next Reps">
        <NavLink className="landing-brand" to="/">
          <img src="/nextreps-logo.svg" alt="NEXT REPS" />
        </NavLink>
        <nav className="landing-nav-actions" aria-label="Landing navigation">
          <a href="#features">{copy.navFeatures}</a>
          <a href="#how-it-works">{copy.navHow}</a>
          <a
            className="landing-social-button"
            href="https://www.instagram.com/next.reps/"
            rel="noreferrer"
            target="_blank"
          >
            <Instagram size={16} />
            <span>@next.reps</span>
          </a>
          <button
            className="landing-language-button"
            onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            type="button"
          >
            <Globe size={16} />
            <span>{lang === 'de' ? 'EN' : 'DE'}</span>
          </button>
          {currentUser ? (
            <NavLink className="landing-nav-button" to="/dashboard">{copy.dashboard}</NavLink>
          ) : (
            <NavLink className="landing-nav-button" to="/login" state={{ loginIntent: true }}>{copy.login}</NavLink>
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
              {copy.heroEyebrow}
            </motion.span>
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={reveal}
              transition={{ duration: 0.65, delay: 0.08 }}
            >
              {copy.heroTitle}
            </motion.h1>
            <motion.p
              initial="hidden"
              animate="visible"
              variants={reveal}
              transition={{ duration: 0.65, delay: 0.16 }}
            >
              {copy.heroText}
            </motion.p>
            <motion.div
              className="landing-hero-actions"
              initial="hidden"
              animate="visible"
              variants={reveal}
              transition={{ duration: 0.65, delay: 0.24 }}
            >
              <NavLink className="landing-primary-button" to={primaryCta}>
                {currentUser ? copy.openDashboard : copy.createWorkout}
                <ArrowRight size={18} />
              </NavLink>
              {currentUser ? (
                <a className="landing-secondary-button" href="#features">{copy.exploreApp}</a>
              ) : (
                <NavLink className="landing-secondary-button" to="/login" state={{ loginIntent: true }}>{copy.login}</NavLink>
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
          <span>{copy.scroll}</span>
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
            {copy.statement}
            <strong>{copy.statementHighlight}</strong>
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
          <span>{copy.introEyebrow}</span>
          <h2>{copy.introTitle}</h2>
          <p>{copy.introText}</p>
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

        <motion.div
          aria-hidden="true"
          className="landing-arrow-stage"
          ref={arrowRef}
          style={{ opacity: arrowGlowOpacity }}
        >
          <motion.div className="landing-arrow-reveal" style={{ clipPath: arrowClipPath }}>
            <img src="/nextreps-arrow-long.svg" alt="" />
          </motion.div>
        </motion.div>

        <motion.div
          className="landing-faq"
          ref={faqRef}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={reveal}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <motion.img
            aria-hidden="true"
            className="landing-faq-watermark"
            src="/nextreps-logo.svg"
            alt=""
            style={{ x: faqLogoX }}
          />
          <div className="landing-faq-copy">
            <h2>{copy.faqTitle}</h2>
            <p>{copy.faqText}</p>
            <motion.div
              aria-hidden="true"
              className="landing-faq-arrows"
              style={{
                opacity: faqArrowOpacity,
                rotate: faqArrowRotate,
                scale: faqArrowScale,
                x: faqArrowX,
                y: faqArrowY,
              }}
            >
              <img src="/nextreps-double-arrows.svg" alt="" />
            </motion.div>
          </div>
          <div className="landing-faq-list">
            {copy.faqItems.map((item, index) => {
              const isOpen = activeFaq === index;
              return (
                <article className={`landing-faq-item ${isOpen ? 'is-open' : ''}`} key={item.question}>
                  <button
                    aria-expanded={isOpen}
                    className="landing-faq-question"
                    onClick={() => setActiveFaq(isOpen ? -1 : index)}
                    type="button"
                  >
                    <span>{item.question}</span>
                    <i aria-hidden="true" />
                  </button>
                  <div className="landing-faq-answer">
                    <p>{item.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </motion.div>
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
              <img src={frame.image} alt="" />
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
          <span>{copy.proofEyebrow}</span>
          <h2>{copy.proofTitle}</h2>
          <p>{copy.proofText}</p>
          <div className="landing-proof-list">
            <span><Target size={17} /> {copy.proofItems[0]}</span>
            <span><Activity size={17} /> {copy.proofItems[1]}</span>
            <span><PlayCircle size={17} /> {copy.proofItems[2]}</span>
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
          <span>{copy.finalEyebrow}</span>
          <h2>{copy.finalTitle}</h2>
          <NavLink className="landing-primary-button" to={primaryCta}>
            {currentUser ? copy.goToApp : copy.tryNextReps}
            <ArrowRight size={18} />
          </NavLink>
        </motion.div>
      </section>
    </main>
  );
}
