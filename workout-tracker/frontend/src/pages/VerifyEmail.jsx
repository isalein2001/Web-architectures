import { useState } from 'react';
import { MailCheck, RotateCcw } from 'lucide-react';
import { api } from '../api';
import './Auth.css';

export default function VerifyEmail({ currentUser, onUserUpdate }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devCode, setDevCode] = useState(() => window.sessionStorage.getItem('devVerificationCode') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitCode = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const data = await api.verifyEmail(code);
      window.sessionStorage.removeItem('devVerificationCode');
      onUserUpdate(data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async () => {
    setError('');
    setMessage('');

    try {
      const data = await api.resendVerification();
      if (data.verificationCode) {
        window.sessionStorage.setItem('devVerificationCode', data.verificationCode);
        setDevCode(data.verificationCode);
      }
      setMessage('A new verification code was sent.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="auth-page auth-login-page">
      <img className="auth-logo" src="/nextreps-logo.svg" alt="NEXT REPS" />
      <main className="auth-shell login-shell">
        <section className="auth-card login-card">
          <h1>Verify <span>email</span></h1>
          <p>
            Enter the code sent to <span>{currentUser?.email}</span>.
          </p>

          <form className="auth-form" onSubmit={submitCode}>
            <label>
              Verification code
              <span className="auth-input-wrap">
                <input
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="000000"
                  required
                />
                <MailCheck size={15} strokeWidth={2.1} />
              </span>
            </label>

            {devCode && (
              <div className="auth-dev-note">
                Dev code: <strong>{devCode}</strong>
              </div>
            )}
            {message && <div className="auth-success">{message}</div>}
            {error && <div className="auth-error">{error}</div>}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Verifying' : 'Verify account'}
            </button>
          </form>

          <button className="auth-secondary-button" type="button" onClick={resendCode}>
            <RotateCcw size={14} /> Resend code
          </button>
        </section>
      </main>
      <div className="auth-footer">
        System status: <span>Optimal</span> &nbsp; Secure onboarding
      </div>
    </div>
  );
}
