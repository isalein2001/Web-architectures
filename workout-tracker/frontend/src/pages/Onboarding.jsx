import { useState } from 'react';
import { Droplets, Goal, Ruler, Scale, UserRound } from 'lucide-react';
import { api } from '../api';
import { getUserFirstName } from '../userStorage';
import './Onboarding.css';

const goals = [
  { id: 'fat_loss', title: 'Fat loss', text: 'Lean down, improve conditioning and build healthy routines.' },
  { id: 'muscle_gain', title: 'Muscle gain', text: 'Build strength, volume and progressive training habits.' },
  { id: 'definition', title: 'Definition', text: 'Shape, maintain and sharpen performance with balance.' },
];

export default function Onboarding({ currentUser, onUserUpdate }) {
  const [heightCm, setHeightCm] = useState(currentUser?.heightCm || '');
  const [weightKg, setWeightKg] = useState(currentUser?.weightKg || '');
  const [gender, setGender] = useState(currentUser?.gender || 'Female');
  const [hydrationGoalLiters, setHydrationGoalLiters] = useState(currentUser?.hydrationGoalLiters || 3);
  const [fitnessGoal, setFitnessGoal] = useState(currentUser?.fitnessGoal || 'definition');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstName = getUserFirstName(currentUser);

  const submitOnboarding = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await api.completeOnboarding({
        heightCm,
        weightKg,
        gender,
        hydrationGoalLiters,
        fitnessGoal,
      });
      window.localStorage.setItem(`profileHeightCm:user:${data.user.id}`, String(heightCm));
      window.localStorage.setItem(`profileWeightKg:user:${data.user.id}`, String(weightKg));
      window.localStorage.setItem(`profileGender:user:${data.user.id}`, gender);
      window.localStorage.setItem(`hydrationGoalLiters:user:${data.user.id}`, String(hydrationGoalLiters));
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
          <span>Welcome to PROGYM</span>
          <h1 className="onboarding-title">
            <span>Let’s tune</span>
            <span>your</span>
            <span><strong>profile</strong>,</span>
            <span>{firstName}.</span>
          </h1>
          <p>Before we build your training rhythm, we need to get to know you. A few basics help us tune your goals, hydration and progress insights around your body and your focus.</p>
        </section>

        <form className="onboarding-card" onSubmit={submitOnboarding}>
          <div className="onboarding-fields">
            <label>
              <span><UserRound size={16} /> Gender</span>
              <select value={gender} onChange={(event) => setGender(event.target.value)} required>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              <span><Ruler size={16} /> Height</span>
              <div className="onboarding-unit-field">
                <input type="number" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} placeholder="160" required />
                <small>cm</small>
              </div>
            </label>
            <label>
              <span><Scale size={16} /> Weight</span>
              <div className="onboarding-unit-field">
                <input type="number" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} placeholder="54" required />
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
                  onChange={(event) => setHydrationGoalLiters(event.target.value)}
                  required
                />
                <small>L/day</small>
              </div>
            </label>
          </div>

          <div className="onboarding-goals">
            <span><Goal size={16} /> Training focus</span>
            <div>
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  className={fitnessGoal === goal.id ? 'active' : ''}
                  type="button"
                  onClick={() => setFitnessGoal(goal.id)}
                >
                  <strong>{goal.title}</strong>
                  <small>{goal.text}</small>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="onboarding-error">{error}</div>}
          <button className="onboarding-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving profile' : 'Enter dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
