import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { api } from '../api';
import './Auth.css';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await api.login({ email, password });
      onLogin(data.user);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page auth-login-page">
      <div className="auth-logo">PROGYM</div>

      <main className="auth-shell login-shell">
        <section className="auth-card login-card">
          <h1>Login</h1>
          <p>
            Initialize your <span>session protocols.</span>
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email address
              <span className="auth-input-wrap">
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                <Mail size={15} strokeWidth={2.1} />
              </span>
            </label>
            <label>
              Password
              <span className="auth-input-wrap">
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <Lock size={15} strokeWidth={2.1} />
              </span>
            </label>

            <div className="auth-inline">
              <label className="auth-check">
                <input type="checkbox" />
                <span>Keep me logged in</span>
              </label>
              <a href="#forgot-password">Forgot password?</a>
            </div>

            {error && <div className="auth-error">{error}</div>}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in' : 'Login'}
            </button>
          </form>

          <div className="auth-switch">
            <span>New to PROGYM?</span>
            <Link to="/register">Register</Link>
          </div>
        </section>
      </main>

      <div className="auth-footer">
        System status: <span>Optimal</span> &nbsp; Ver. 1.0.2
      </div>
    </div>
  );
}
