import { useState } from 'react';
import { Activity, Clock, Droplets, Flame, Goal, Ruler, Scale, UserRound } from 'lucide-react';
import { api } from '../api';
import { getUserFirstName } from '../userStorage';
import './Onboarding.css';

const goals = [
  { id: 'fat_loss', title: 'Fat loss', text: 'Lean down, improve conditioning and build healthy routines.' },
  { id: 'muscle_gain', title: 'Muscle gain', text: 'Build strength, volume and progressive training habits.' },
  { id: 'definition', title: 'Definition', text: 'Shape, maintain and sharpen performance with balance.' },
];

const goalPresets = {
  steps: [
    { label: 'Beginner', value: 6000 },
    { label: 'Active', value: 10000 },
    { label: 'Ambitious', value: 14000 },
  ],
  calories: [
    { label: 'Light', value: 250 },
    { label: 'Strength', value: 450 },
    { label: 'HIIT', value: 650 },
  ],
  trainingMinutes: [
    { label: 'Starter', value: 20 },
    { label: 'Standard', value: 45 },
    { label: 'Athlete', value: 75 },
  ],
};

export default function Onboarding({ currentUser, onUserUpdate }) {
  const [step, setStep] = useState(1);
  const [heightCm, setHeightCm] = useState(currentUser?.heightCm || '');
  const [weightKg, setWeightKg] = useState(currentUser?.weightKg || '');
  const [gender, setGender] = useState(currentUser?.gender || 'Female');
  const [hydrationGoalLiters, setHydrationGoalLiters] = useState(currentUser?.hydrationGoalLiters || 3);
  const [dailyStepGoal, setDailyStepGoal] = useState('');
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState('');
  const [dailyTrainingMinutesGoal, setDailyTrainingMinutesGoal] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState(currentUser?.fitnessGoal || 'definition');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstName = getUserFirstName(currentUser);

  const clearFieldError = (field) => {
    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: false }));
  };

  const validateStepOne = () => {
    const nextErrors = {
      gender: !gender,
      heightCm: !heightCm,
      weightKg: !weightKg,
      hydrationGoalLiters: !hydrationGoalLiters,
    };
    setFieldErrors((currentErrors) => ({ ...currentErrors, ...nextErrors }));
    return !Object.values(nextErrors).some(Boolean);
  };

  const validateStepTwo = () => {
    const nextErrors = {
      dailyStepGoal: !dailyStepGoal,
      dailyCalorieGoal: !dailyCalorieGoal,
      dailyTrainingMinutesGoal: !dailyTrainingMinutesGoal,
      fitnessGoal: !fitnessGoal,
    };
    setFieldErrors((currentErrors) => ({ ...currentErrors, ...nextErrors }));
    return !Object.values(nextErrors).some(Boolean);
  };

  const continueToDailyGoals = () => {
    setError('');
    if (!validateStepOne()) {
      setError('Please fill in all required profile fields.');
      return;
    }
    setStep(2);
  };

  const submitOnboarding = async () => {
    setError('');

    if (!validateStepTwo()) {
      setError('Please fill in all required daily goal fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await api.completeOnboarding({
        heightCm,
        weightKg,
        gender,
        hydrationGoalLiters,
        fitnessGoal,
      });
      const nextStepGoal = Math.round(Number(dailyStepGoal) || 10000);
      const nextCalorieGoal = Math.round(Number(dailyCalorieGoal) || 2200);
      const nextTrainingMinutesGoal = Math.round(Number(dailyTrainingMinutesGoal) || 45);
      window.localStorage.setItem(`profileHeightCm:user:${data.user.id}`, String(heightCm));
      window.localStorage.setItem(`profileWeightKg:user:${data.user.id}`, String(weightKg));
      window.localStorage.setItem(`profileGender:user:${data.user.id}`, gender);
      window.localStorage.setItem(`hydrationGoalLiters:user:${data.user.id}`, String(hydrationGoalLiters));
      window.localStorage.setItem(`dailyStepGoal:user:${data.user.id}`, String(nextStepGoal));
      window.localStorage.setItem(`dailyCalorieGoal:user:${data.user.id}`, String(nextCalorieGoal));
      window.localStorage.setItem(`dailyTrainingMinutesGoal:user:${data.user.id}`, String(nextTrainingMinutesGoal));
      await api.updateTodayActivity({ step_goal: nextStepGoal }).catch(() => null);
      onUserUpdate(data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-shell">
        <section className="onboarding-hero">
          <span>Welcome to NEXT REPS</span>
          <h1 className="onboarding-title">
            <span>Let’s tune</span>
            <span>your</span>
            <span><strong>profile</strong>,</span>
            <span>{firstName}.</span>
          </h1>
          <p>Before we build your training rhythm, we need to get to know you. A few basics help us tune your goals, hydration and progress insights around your body and your focus.</p>
        </section>

        <div className="onboarding-card">
          <div className="onboarding-step-indicator">
            <span className={step === 1 ? 'active' : ''}>Profile</span>
            <span className={step === 2 ? 'active' : ''}>Daily goals</span>
          </div>

          {step === 1 && (
            <div className="onboarding-fields onboarding-fields-basic">
              <label>
                <span><UserRound size={16} /> Gender</span>
                <select className={fieldErrors.gender ? 'field-error' : ''} value={gender} onChange={(event) => { setGender(event.target.value); clearFieldError('gender'); }} required>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                <span><Ruler size={16} /> Height</span>
                <div className="onboarding-unit-field">
                  <input className={fieldErrors.heightCm ? 'field-error' : ''} type="number" value={heightCm} onChange={(event) => { setHeightCm(event.target.value); clearFieldError('heightCm'); }} placeholder="160" required />
                  <small>cm</small>
                </div>
              </label>
              <label>
                <span><Scale size={16} /> Weight</span>
                <div className="onboarding-unit-field">
                  <input className={fieldErrors.weightKg ? 'field-error' : ''} type="number" value={weightKg} onChange={(event) => { setWeightKg(event.target.value); clearFieldError('weightKg'); }} placeholder="54" required />
                  <small>kg</small>
                </div>
              </label>
              <label>
                <span><Droplets size={16} /> Daily water target</span>
                <div className="onboarding-unit-field">
                  <input
                    type="number"
                    min="1.5"
                    max="7"
                    step="0.1"
                  value={hydrationGoalLiters}
                  className={fieldErrors.hydrationGoalLiters ? 'field-error' : ''}
                  onChange={(event) => { setHydrationGoalLiters(event.target.value); clearFieldError('hydrationGoalLiters'); }}
                    required
                  />
                  <small>L/day</small>
                </div>
              </label>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="onboarding-fields onboarding-fields-goals">
                <label>
                  <span><Activity size={16} /> Daily steps</span>
                  <div className="onboarding-unit-field">
                    <input className={fieldErrors.dailyStepGoal ? 'field-error' : ''} type="number" min="1000" max="100000" step="500" value={dailyStepGoal} onChange={(event) => { setDailyStepGoal(event.target.value); clearFieldError('dailyStepGoal'); }} required />
                    <small>steps</small>
                  </div>
                  <div className="onboarding-suggestion-row">
                    {goalPresets.steps.map((preset) => (
                      <button key={preset.value} type="button" onClick={() => { setDailyStepGoal(preset.value); clearFieldError('dailyStepGoal'); }}>
                        {preset.label} <strong>{preset.value.toLocaleString()}</strong>
                      </button>
                    ))}
                  </div>
                </label>
                <label>
                  <span><Flame size={16} /> Workout calories</span>
                  <div className="onboarding-unit-field">
                    <input className={fieldErrors.dailyCalorieGoal ? 'field-error' : ''} type="number" min="500" max="8000" step="50" value={dailyCalorieGoal} onChange={(event) => { setDailyCalorieGoal(event.target.value); clearFieldError('dailyCalorieGoal'); }} required />
                    <small>kcal</small>
                  </div>
                  <div className="onboarding-suggestion-row">
                    {goalPresets.calories.map((preset) => (
                      <button key={preset.value} type="button" onClick={() => { setDailyCalorieGoal(preset.value); clearFieldError('dailyCalorieGoal'); }}>
                        {preset.label} <strong>{preset.value.toLocaleString()}</strong>
                      </button>
                    ))}
                  </div>
                </label>
                <label>
                  <span><Clock size={16} /> Training minutes</span>
                  <div className="onboarding-unit-field">
                    <input className={fieldErrors.dailyTrainingMinutesGoal ? 'field-error' : ''} type="number" min="5" max="300" step="5" value={dailyTrainingMinutesGoal} onChange={(event) => { setDailyTrainingMinutesGoal(event.target.value); clearFieldError('dailyTrainingMinutesGoal'); }} required />
                    <small>min</small>
                  </div>
                  <div className="onboarding-suggestion-row">
                    {goalPresets.trainingMinutes.map((preset) => (
                      <button key={preset.value} type="button" onClick={() => { setDailyTrainingMinutesGoal(preset.value); clearFieldError('dailyTrainingMinutesGoal'); }}>
                        {preset.label} <strong>{preset.value}</strong>
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              <p className="onboarding-edit-note">
                These are just starting targets. You can change every goal later in your dashboard or settings.
              </p>

              <div className="onboarding-goals">
                <span><Goal size={16} /> Training focus</span>
                <div>
                  {goals.map((goal) => (
                    <button key={goal.id} className={`${fitnessGoal === goal.id ? 'active' : ''} ${fieldErrors.fitnessGoal ? 'field-error' : ''}`} type="button" onClick={() => { setFitnessGoal(goal.id); clearFieldError('fitnessGoal'); }}>
                      <strong>{goal.title}</strong>
                      <small>{goal.text}</small>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <div className="onboarding-error">{error}</div>}
          <div className="onboarding-actions">
            {step === 2 && (
              <button className="onboarding-back" type="button" onClick={() => setStep(1)}>
                Back
              </button>
            )}
            {step === 1 ? (
              <button className="onboarding-submit" type="button" onClick={continueToDailyGoals}>
                Continue
              </button>
            ) : (
              <button className="onboarding-submit" type="button" onClick={submitOnboarding} disabled={isSubmitting}>
                {isSubmitting ? 'Saving profile' : 'Enter dashboard'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
