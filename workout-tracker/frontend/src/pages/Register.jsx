import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, Lock, ShieldCheck, User, Zap } from 'lucide-react';
import { api } from '../api';
import { readFirstLaunchOnboardingDraft } from '../firstLaunchOnboardingStorage';
import './Auth.css';

const splitName = (value = '') => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const onboardingPrefill = location.state?.onboardingPrefill || readFirstLaunchOnboardingDraft();
  const nameParts = onboardingPrefill?.firstName
    ? onboardingPrefill
    : splitName(onboardingPrefill?.name);
  const [firstName, setFirstName] = useState(nameParts.firstName || '');
  const [lastName, setLastName] = useState(nameParts.lastName || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!acceptedTerms) {
      setError('Please accept the terms to continue.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await api.register({ firstName, lastName, email, password });
      if (data.verificationCode) {
        window.sessionStorage.setItem('devVerificationCode', data.verificationCode);
      }
      onLogin(data.user);
      navigate(data.user.emailVerified ? '/dashboard' : '/verify-email', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page auth-register-page">
      <img className="auth-logo" src="/nextreps-logo.svg" alt="NEXT REPS" />

      <main className="auth-shell register-shell">
        <aside className="auth-copy">
          <span className="auth-kicker">Join us</span>
          <h1>
            Evolve
            <br />
            beyond
            <br />
            <span>limits</span>
          </h1>

          <div className="auth-benefits">
            <div className="auth-benefit">
              <Zap size={16} strokeWidth={2.5} />
              <div>
                <strong>Adaptive performance</strong>
                <p>Build your profile around training, recovery, hydration and daily progress data.</p>
              </div>
            </div>
            <div className="auth-benefit">
              <ShieldCheck size={16} strokeWidth={2.5} />
              <div>
                <strong>Real-time analytics</strong>
                <p>Keep your workouts, calendar sessions and body metrics connected in one place.</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="auth-card register-card">
          <h1>
            Create <span>account</span>
          </h1>
          <p>
            Initialize your <span>performance profile</span> today.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-row">
              <label>
                First name
                <span className="auth-input-wrap">
                  <input type="text" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
                  <User size={15} strokeWidth={2.1} />
                </span>
              </label>
              <label>
                Last name
                <span className="auth-input-wrap">
                  <input type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
                  <User size={15} strokeWidth={2.1} />
                </span>
              </label>
            </div>
            <label>
              Email address
              <span className="auth-input-wrap">
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                <AtSign size={15} strokeWidth={2.1} />
              </span>
            </label>
            <div className="auth-form-row">
              <label>
                Password
                <span className="auth-input-wrap">
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                  <Lock size={15} strokeWidth={2.1} />
                </span>
              </label>
              <label>
                Confirm password
                <span className="auth-input-wrap">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                  <ShieldCheck size={15} strokeWidth={2.1} />
                </span>
              </label>
            </div>

            <div className="auth-inline auth-terms">
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                />
                <span>
                  I accept the <a href="#terms">Terms of Performance</a> and <a href="#privacy">Privacy Policy.</a>
                </span>
              </label>
            </div>

            {error && <div className="auth-error">{error}</div>}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account' : 'Register'}
            </button>
          </form>

          <div className="auth-switch">
            <span>Already have an account?</span>
            <Link to="/login" state={{ loginIntent: true }}>Login</Link>
          </div>
        </section>
      </main>

      <div className="auth-footer">
        System status: <span>Optimal</span> &nbsp; Ver. 1.0.2
      </div>
    </div>
  );
}
