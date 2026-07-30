import { ArrowLeft, Dumbbell, Home } from 'lucide-react';
import { Link } from 'react-router';
import { isNativeApp } from '../api';
import './NotFound.css';

export default function NotFound({ isAuthenticated = false }) {
  const destination = isAuthenticated || isNativeApp ? '/dashboard' : '/';
  const destinationLabel = isAuthenticated || isNativeApp ? 'BACK TO DASHBOARD' : 'BACK TO START';

  return (
    <div className="not-found-page">
      <div className="not-found-grid" aria-hidden="true" />

      <section className="not-found-card">
        <div className="not-found-code" aria-label="Error 404">
          <span>4</span>
          <span className="not-found-zero">
            <i className="not-found-plate plate-left" />
            <Dumbbell size={62} strokeWidth={1.35} />
            <i className="not-found-plate plate-right" />
          </span>
          <span>4</span>
        </div>

        <span className="not-found-kicker">REST DAY FOR THIS URL</span>
        <h1>Your reps got lost.</h1>
        <p>
          This page skipped leg day and disappeared from the workout plan.
          Let&apos;s get you back to something that actually exists.
        </p>

        <Link className="not-found-action" to={destination}>
          {isAuthenticated || isNativeApp ? <Home size={18} /> : <ArrowLeft size={18} />}
          {destinationLabel}
        </Link>

        <span className="not-found-footnote">ERROR 404 · NO SETS FOUND</span>
      </section>
    </div>
  );
}
