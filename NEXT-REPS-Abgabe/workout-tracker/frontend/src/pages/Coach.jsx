import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrainCircuit, CalendarDays, Dumbbell, RefreshCw, Sparkles, Target, TrendingUp } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../context/LanguageContext';
import './Coach.css';

const statusLabel = {
  strong: 'Strong',
  watch: 'Watch',
  needs_work: 'Needs work',
  needs_data: 'Needs data',
};

const formatMetric = (value, suffix = '') => (
  value === null || value === undefined || value === '' ? '-' : `${value}${suffix}`
);

export default function Coach() {
  const { t } = useLanguage();
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const nextAnalysis = await api.getCoachAnalysis();
      setAnalysis(nextAnalysis);
    } catch (nextError) {
      console.error(nextError);
      setError(nextError.message || 'Could not load coach analysis.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAnalysis();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAnalysis]);

  const scoreTone = useMemo(() => {
    const score = analysis?.summary?.score || 0;
    if (score >= 75) return 'elite';
    if (score >= 50) return 'steady';
    return 'building';
  }, [analysis?.summary?.score]);

  return (
    <div className="coach-page">
      <section className="coach-hero">
        <div>
          <span className="coach-kicker">
            <BrainCircuit size={18} />
            {t('NEXT REPS COACH')}
          </span>
          <h1>{t('AI COACH')}</h1>
          <p>{t('A cost-free coach engine that reads your training data and turns it into next-step guidance.')}</p>
        </div>
        <button className="coach-refresh-button" type="button" onClick={loadAnalysis} disabled={isLoading}>
          <RefreshCw size={18} />
          {t(isLoading ? 'ANALYZING' : 'REFRESH')}
        </button>
      </section>

      {error && (
        <div className="coach-state coach-state-error">
          {t(error)}
        </div>
      )}

      {isLoading && !analysis ? (
        <div className="coach-state">
          <Sparkles size={22} />
          {t('Building your coach report...')}
        </div>
      ) : analysis && (
        <>
          <section className="coach-summary-band">
            <div className={`coach-score ${scoreTone}`}>
              <small>{t('COACH SCORE')}</small>
              <strong>{analysis.summary.score}</strong>
              <span>/100</span>
            </div>
            <div className="coach-summary-copy">
              <h2>{analysis.summary.headline}</h2>
              <p>
                {t('This first version uses your own app data only. No paid external AI request is made for this report.')}
              </p>
            </div>
          </section>

          <section className="coach-metrics-grid">
            <div>
              <span>{t('30D SESSIONS')}</span>
              <strong>{analysis.summary.sessionCount30}</strong>
            </div>
            <div>
              <span>{t('7D SESSIONS')}</span>
              <strong>{analysis.summary.sessionCount7}</strong>
            </div>
            <div>
              <span>{t('WORKING SETS')}</span>
              <strong>{analysis.summary.totalSets30}</strong>
            </div>
            <div>
              <span>{t('AVG RPE')}</span>
              <strong>{formatMetric(analysis.summary.avgRpe)}</strong>
            </div>
            <div>
              <span>{t('AVG STEPS')}</span>
              <strong>{analysis.summary.avgSteps.toLocaleString()}</strong>
            </div>
            <div>
              <span>{t('AVG WATER')}</span>
              <strong>{Math.round(analysis.summary.avgWaterMl / 100) / 10}L</strong>
            </div>
          </section>

          <section className="coach-grid">
            <div className="coach-panel">
              <div className="coach-panel-header">
                <Target size={20} />
                <h2>{t('Coach Insights')}</h2>
              </div>
              <div className="coach-insight-list">
                {analysis.insights.map((insight) => (
                  <article className="coach-insight" key={insight.label}>
                    <div>
                      <span>{t(insight.label)}</span>
                      <strong>{t(insight.value)}</strong>
                      <p>{t(insight.detail)}</p>
                    </div>
                    <small className={`coach-status ${insight.status}`}>
                      {t(statusLabel[insight.status] || insight.status)}
                    </small>
                  </article>
                ))}
              </div>
            </div>

            <div className="coach-panel">
              <div className="coach-panel-header">
                <Sparkles size={20} />
                <h2>{t('Next Moves')}</h2>
              </div>
              <div className="coach-recommendations">
                {analysis.recommendations.map((recommendation) => (
                  <p key={recommendation}>{t(recommendation)}</p>
                ))}
              </div>
            </div>
          </section>

          <section className="coach-grid">
            <div className="coach-panel">
              <div className="coach-panel-header">
                <TrendingUp size={20} />
                <h2>{t('Top Exercises')}</h2>
              </div>
              <div className="coach-exercise-list">
                {analysis.topExercises.length ? analysis.topExercises.map((exercise) => (
                  <div className="coach-exercise-row" key={exercise.name}>
                    <span>
                      <strong>{exercise.name}</strong>
                      <small>{exercise.muscleGroup}</small>
                    </span>
                    <span>{exercise.sets} {t('sets')}</span>
                    <span>{formatMetric(exercise.maxWeight, ' kg')}</span>
                  </div>
                )) : (
                  <div className="coach-empty">{t('Log workouts to unlock exercise rankings.')}</div>
                )}
              </div>
            </div>

            <div className="coach-panel">
              <div className="coach-panel-header">
                <Dumbbell size={20} />
                <h2>{t('Muscle Balance')}</h2>
              </div>
              <div className="coach-balance-list">
                {analysis.muscleBalance.length ? analysis.muscleBalance.map((entry) => (
                  <div className="coach-balance-row" key={entry.group}>
                    <span>{entry.group}</span>
                    <div>
                      <i style={{ width: `${Math.min(100, entry.sets * 4)}%` }} />
                    </div>
                    <strong>{entry.sets}</strong>
                  </div>
                )) : (
                  <div className="coach-empty">{t('No muscle balance data yet.')}</div>
                )}
              </div>
            </div>
          </section>

          <section className="coach-plan-section">
            <div className="coach-panel-header">
              <CalendarDays size={20} />
              <h2>{t('Suggested Week')}</h2>
            </div>
            <div className="coach-week-grid">
              {analysis.suggestedWeek.map((day) => (
                <article className="coach-day" key={day.day}>
                  <span>{t(day.day)}</span>
                  <h3>{t(day.title)}</h3>
                  <p>{t(day.goal)}</p>
                  <ul>
                    {day.exercises.map((exercise) => (
                      <li key={`${day.day}-${exercise.exercise_name}`}>
                        <strong>{exercise.exercise_name}</strong>
                        <small>{exercise.target_sets} x {exercise.target_reps}</small>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
