import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Check, Dumbbell, LineChart, NotebookPen, Sparkles, Target } from 'lucide-react';
import './FirstLaunchOnboarding.css';

const STORAGE_KEY = 'nextRepsFirstLaunchOnboarding';

const introScreens = [
  {
    headline: (name) => `Good to have you here, ${name}.`,
    text: 'Next Reps keeps your training clean, structured, and easy to follow without slowing you down in the gym.',
    Icon: Sparkles,
  },
  {
    headline: () => 'You train hard.',
    text: 'Your notes should not make it harder. No messy logs, no lost numbers, no guessing what happened last time.',
    Icon: NotebookPen,
  },
  {
    headline: () => 'Everything in one place.',
    text: 'Your plans, workouts, sets, reps, weights, and progress. Connected, organized, easy to find.',
    Icon: Dumbbell,
  },
  {
    headline: () => 'Your workouts turn into insights.',
    text: 'See what changed, spot patterns, and know where to push next without turning your training into homework.',
    small: 'Your numbers, but make them useful.',
    Icon: BarChart3,
  },
  {
    headline: () => 'No more guessing.',
    text: 'No notes app. No Excel sheets. No "wait, what weight did I use last time?"',
    small: 'Just train, track, and know your next move.',
    Icon: Target,
  },
  {
    headline: () => 'Now let’s make it yours.',
    text: 'A few quick questions, and Next Reps will shape your space around the way you actually train.',
    button: 'Set up my space',
    Icon: LineChart,
  },
];

const setupScreens = [
  {
    key: 'goal',
    headline: 'What are you training for right now?',
    small: 'Pick what fits best. You can always change it later.',
    options: ['Build muscle', 'Get stronger', 'Lose fat', 'Stay consistent', 'Just track my workouts'],
  },
  {
    key: 'level',
    headline: 'Where are you at right now?',
    text: 'No judgment. Just better recommendations.',
    options: ['Just getting started', 'I know my way around', 'I’m here to push numbers'],
  },
  {
    key: 'frequency',
    headline: 'How often do you train?',
    text: 'Let’s build around your real routine, not some perfect fantasy plan.',
    options: ['2x per week', '3x per week', '4x per week', '5x+ per week'],
  },
  {
    key: 'style',
    headline: 'How do you want to train?',
    text: 'Choose your tracking style.',
    small: 'Because not every workout starts with a perfect plan.',
    options: ['Follow a plan', 'Log freely', 'Both, depending on the day'],
  },
];

const slideVariants = {
  enter: { opacity: 0, y: 28, scale: 0.98 },
  center: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.985 },
};

export const hasCompletedFirstLaunchOnboarding = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')?.completed === true;
  } catch {
    return false;
  }
};

export default function FirstLaunchOnboarding({ currentUser, onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')?.name || '';
    } catch {
      return '';
    }
  });
  const [answers, setAnswers] = useState({});
  const [nameTouched, setNameTouched] = useState(false);

  const totalSteps = 1 + introScreens.length + setupScreens.length + 1;
  const progress = ((step + 1) / totalSteps) * 100;
  const cleanName = name.trim() || 'Athlete';
  const isNameStep = step === 0;
  const introIndex = step - 1;
  const setupIndex = step - 1 - introScreens.length;
  const isIntroStep = introIndex >= 0 && introIndex < introScreens.length;
  const isSetupStep = setupIndex >= 0 && setupIndex < setupScreens.length;
  const isFinalStep = step === totalSteps - 1;
  const selectedSetup = isSetupStep ? setupScreens[setupIndex] : null;
  const canContinue = !isSetupStep || Boolean(answers[selectedSetup.key]);

  const activeIcon = useMemo(() => {
    if (isIntroStep) return introScreens[introIndex].Icon;
    if (isSetupStep) return Dumbbell;
    if (isFinalStep) return Check;
    return Sparkles;
  }, [introIndex, isFinalStep, isIntroStep, isSetupStep]);
  const ActiveIcon = activeIcon;

  const persistOnboarding = (completed = false) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      completed,
      name: cleanName,
      answers,
      updatedAt: new Date().toISOString(),
    }));
  };

  const finishOnboarding = () => {
    persistOnboarding(true);
    onComplete?.();
    if (currentUser?.emailVerified && currentUser?.onboardingCompleted) {
      navigate('/dashboard', { replace: true });
      return;
    }
    navigate('/login', { replace: true, state: { loginIntent: true } });
  };

  const continueFlow = () => {
    if (isNameStep && !name.trim()) {
      setNameTouched(true);
      return;
    }

    if (isFinalStep) {
      finishOnboarding();
      return;
    }

    persistOnboarding(false);
    setStep((current) => Math.min(current + 1, totalSteps - 1));
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 0));
  };

  const renderScreen = () => {
    if (isNameStep) {
      return (
        <>
          <span className="first-launch-kicker">Next Reps Setup</span>
          <h1>Welcome, Athlete.</h1>
          <p>What should we call you?</p>
          <label className="first-launch-name-field">
            <input
              autoComplete="given-name"
              autoFocus
              onChange={(event) => {
                setName(event.target.value);
                setNameTouched(true);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') continueFlow();
              }}
              placeholder="Your name"
              type="text"
              value={name}
            />
          </label>
          {nameTouched && !name.trim() && (
            <small className="first-launch-error">Give us a name to personalize the setup.</small>
          )}
          <small className="first-launch-small">Let’s set up your training space.</small>
        </>
      );
    }

    if (isIntroStep) {
      const screen = introScreens[introIndex];
      return (
        <>
          <span className="first-launch-kicker">{String(step + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}</span>
          <h1>{screen.headline(cleanName)}</h1>
          <p>{screen.text}</p>
          {screen.small && <small className="first-launch-small">{screen.small}</small>}
        </>
      );
    }

    if (isSetupStep) {
      return (
        <>
          <span className="first-launch-kicker">Personal setup</span>
          <h1>{selectedSetup.headline}</h1>
          {selectedSetup.text && <p>{selectedSetup.text}</p>}
          <div className="first-launch-options">
            {selectedSetup.options.map((option) => (
              <button
                className={answers[selectedSetup.key] === option ? 'selected' : ''}
                key={option}
                onClick={() => setAnswers((current) => ({ ...current, [selectedSetup.key]: option }))}
                type="button"
              >
                <span>{option}</span>
                <i>{answers[selectedSetup.key] === option && <Check size={14} />}</i>
              </button>
            ))}
          </div>
          {selectedSetup.small && <small className="first-launch-small">{selectedSetup.small}</small>}
        </>
      );
    }

    return (
      <>
        <span className="first-launch-kicker">Ready</span>
        <h1>You’re all set, {cleanName}.</h1>
        <p>Your training space is ready. Build the plan. Log the work. Watch the progress.</p>
        <small className="first-launch-small">Time for your next rep.</small>
        <div className="first-launch-summary">
          {setupScreens.map((screen) => (
            <span key={screen.key}>{answers[screen.key] || 'Flexible'}</span>
          ))}
        </div>
      </>
    );
  };

  return (
    <main className="first-launch-page">
      <div className="first-launch-bg" aria-hidden="true" />
      <header className="first-launch-topbar">
        <NavLink to="/" className="first-launch-brand" aria-label="Next Reps">
          <img src="/nextreps-logo.svg" alt="NEXT REPS" />
        </NavLink>
        <NavLink className="first-launch-login" to="/login" state={{ loginIntent: true }}>
          Login
        </NavLink>
      </header>

      <section className="first-launch-shell" aria-live="polite">
        <div className="first-launch-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="first-launch-card">
          <div className="first-launch-orbit" aria-hidden="true">
            <ActiveIcon size={28} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              animate="center"
              className="first-launch-copy"
              exit="exit"
              initial="enter"
              key={step}
              transition={{ duration: 0.34, ease: 'easeOut' }}
              variants={slideVariants}
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>

          <div className="first-launch-actions">
            {step > 0 ? (
              <button className="first-launch-back" onClick={goBack} type="button">
                Back
              </button>
            ) : (
              <span />
            )}
            <button
              className="first-launch-primary"
              disabled={!canContinue}
              onClick={continueFlow}
              type="button"
            >
              {isFinalStep ? 'Enter Next Reps' : introScreens[introIndex]?.button || 'Continue'}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
