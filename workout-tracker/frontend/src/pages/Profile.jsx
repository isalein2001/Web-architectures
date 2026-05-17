import React, { useContext, useEffect, useState } from 'react';
import {
  Bell,
  Download,
  Droplets,
  LogOut,
  Lock,
  Minus,
  Plus,
  CircleQuestionMark,
  Save,
  Scale,
  Shield,
  ShieldCheck,
  Target,
  TrendingUp,
  User,
  Watch,
  X,
} from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { getUserDisplayName, getUserInitials, getUserStorageKey } from '../userStorage';
import { api } from '../api';
import './Profile.css';

export default function Profile({ currentUser, onLogout, onUserUpdate }) {
  const { t } = useContext(LanguageContext);
  const userDisplayName = getUserDisplayName(currentUser);
  const userInitials = getUserInitials(currentUser);
  const storageKey = (key) => getUserStorageKey(key, currentUser);
  const [accountFirstName, setAccountFirstName] = useState(currentUser?.firstName || userDisplayName.split(/\s+/)[0] || '');
  const [accountLastName, setAccountLastName] = useState(currentUser?.lastName || userDisplayName.split(/\s+/).slice(1).join(' ') || '');
  const [accountEmail, setAccountEmail] = useState(currentUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountStatus, setAccountStatus] = useState({ type: '', message: '' });
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [hydrationGoal, setHydrationGoal] = useState(() => {
    const savedGoal = window.localStorage.getItem(storageKey('hydrationGoalLiters'));
    return savedGoal ? Number(savedGoal) : (currentUser?.hydrationGoalLiters || 3.5);
  });
  const [workoutRemindersEnabled, setWorkoutRemindersEnabled] = useState(() => (
    window.localStorage.getItem(storageKey('workoutRemindersEnabled')) !== 'false'
  ));
  const [hydrationAlertsEnabled, setHydrationAlertsEnabled] = useState(() => (
    window.localStorage.getItem(storageKey('hydrationAlertsEnabled')) !== 'false'
  ));
  const [activeReminder, setActiveReminder] = useState(null);
  const [isBmiInfoOpen, setIsBmiInfoOpen] = useState(false);
  const [gender, setGender] = useState(() => window.localStorage.getItem(storageKey('profileGender')) || currentUser?.gender || 'Female');
  const [height, setHeight] = useState(() => window.localStorage.getItem(storageKey('profileHeightCm')) || currentUser?.heightCm || '185');
  const [weight, setWeight] = useState(() => window.localStorage.getItem(storageKey('profileWeightKg')) || currentUser?.weightKg || '85');
  const [isBmiTrackingEnabled, setIsBmiTrackingEnabled] = useState(() => (
    window.localStorage.getItem(storageKey('bmiTrackingEnabled')) !== 'false'
  ));
  const [bmiValue, setBmiValue] = useState(() => window.localStorage.getItem(storageKey('profileBmi')) || '24.8');
  const [hasUnsavedBiometrics, setHasUnsavedBiometrics] = useState(false);

  useEffect(() => {
    const nextDisplayName = getUserDisplayName(currentUser);
    setAccountFirstName(currentUser?.firstName || nextDisplayName.split(/\s+/)[0] || '');
    setAccountLastName(currentUser?.lastName || nextDisplayName.split(/\s+/).slice(1).join(' ') || '');
    setAccountEmail(currentUser?.email || '');
    setCurrentPassword('');
    setNewPassword('');
    setAccountStatus({ type: '', message: '' });
    setHydrationGoal(Number(window.localStorage.getItem(storageKey('hydrationGoalLiters')) || currentUser?.hydrationGoalLiters || 3.5));
    setGender(window.localStorage.getItem(storageKey('profileGender')) || currentUser?.gender || 'Female');
    setHeight(window.localStorage.getItem(storageKey('profileHeightCm')) || currentUser?.heightCm || '185');
    setWeight(window.localStorage.getItem(storageKey('profileWeightKg')) || currentUser?.weightKg || '85');
  }, [currentUser]);

  useEffect(() => {
    window.localStorage.setItem(storageKey('hydrationGoalLiters'), hydrationGoal.toString());
  }, [hydrationGoal, currentUser?.id]);

  useEffect(() => {
    window.localStorage.setItem(storageKey('workoutRemindersEnabled'), workoutRemindersEnabled.toString());
    window.dispatchEvent(new CustomEvent('alert-preferences-change', {
      detail: { workoutRemindersEnabled },
    }));
  }, [workoutRemindersEnabled, currentUser?.id]);

  useEffect(() => {
    window.localStorage.setItem(storageKey('hydrationAlertsEnabled'), hydrationAlertsEnabled.toString());
    window.dispatchEvent(new CustomEvent('alert-preferences-change', {
      detail: { hydrationAlertsEnabled },
    }));
  }, [hydrationAlertsEnabled, currentUser?.id]);

  useEffect(() => {
    const handleAlertPreferenceChange = (event) => {
      if (typeof event.detail?.workoutRemindersEnabled === 'boolean') {
        setWorkoutRemindersEnabled(event.detail.workoutRemindersEnabled);
      }
      if (typeof event.detail?.hydrationAlertsEnabled === 'boolean') {
        setHydrationAlertsEnabled(event.detail.hydrationAlertsEnabled);
      }
    };

    window.addEventListener('alert-preferences-change', handleAlertPreferenceChange);
    return () => window.removeEventListener('alert-preferences-change', handleAlertPreferenceChange);
  }, []);

  const changeHydrationGoal = (amount) => {
    setHydrationGoal((goal) => Number(Math.min(7, Math.max(1.5, goal + amount)).toFixed(1)));
  };

  const showDemoHydrationReminder = () => {
    setHydrationAlertsEnabled(true);
    setActiveReminder({
      id: `hydration-demo-${Date.now()}`,
      type: 'hydration',
      title: t('HYDRATION REMINDER'),
      message: t('Time to drink water. Keep your daily target on track.'),
      meta: t('Demo reminder'),
    });
  };

  const calculateBmi = (heightCm, weightKg) => {
    const parsedHeight = Number(heightCm);
    const parsedWeight = Number(weightKg);

    if (!parsedHeight || !parsedWeight) return '';

    const heightMeters = parsedHeight / 100;
    return (parsedWeight / (heightMeters * heightMeters)).toFixed(1);
  };

  const saveBiometrics = async () => {
    window.localStorage.setItem(storageKey('profileGender'), gender);
    window.localStorage.setItem(storageKey('profileHeightCm'), height);
    window.localStorage.setItem(storageKey('profileWeightKg'), weight);
    window.localStorage.setItem(storageKey('hydrationGoalLiters'), hydrationGoal.toString());
    window.localStorage.setItem(storageKey('bmiTrackingEnabled'), isBmiTrackingEnabled.toString());

    const nextBmi = calculateBmi(height, weight);
    if (isBmiTrackingEnabled && nextBmi) {
      setBmiValue(nextBmi);
      window.localStorage.setItem(storageKey('profileBmi'), nextBmi);
    }

    try {
      const data = await api.updateCurrentUser({
        firstName: accountFirstName,
        lastName: accountLastName,
        email: accountEmail,
        gender,
        heightCm: height,
        weightKg: weight,
        hydrationGoalLiters: hydrationGoal,
      });
      onUserUpdate(data.user);
      setHasUnsavedBiometrics(false);
    } catch (error) {
      setAccountStatus({ type: 'error', message: error.message });
    }
  };

  const updateBiometricField = (setter) => (value) => {
    setter(value);
    setHasUnsavedBiometrics(true);
  };

  const toggleBmiTracking = () => {
    setIsBmiTrackingEnabled((enabled) => !enabled);
    setHasUnsavedBiometrics(true);
  };

  const saveAccountProfile = async () => {
    setAccountStatus({ type: '', message: '' });

    if (!accountFirstName.trim() || !accountLastName.trim() || !accountEmail.trim()) {
      setAccountStatus({ type: 'error', message: t('Please fill in first name, last name and email.') });
      return;
    }

    setIsSavingAccount(true);

    try {
      const data = await api.updateCurrentUser({
        firstName: accountFirstName,
        lastName: accountLastName,
        email: accountEmail,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      onUserUpdate(data.user);
      setCurrentPassword('');
      setNewPassword('');
      setAccountStatus({ type: 'success', message: t('Account updated.') });
    } catch (error) {
      setAccountStatus({ type: 'error', message: error.message });
    } finally {
      setIsSavingAccount(false);
    }
  };

  const updateProfileImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAccountStatus({ type: 'error', message: t('Please choose an image file.') });
      return;
    }

    if (file.size > 10_000_000) {
      setAccountStatus({ type: 'error', message: t('Please choose an image under 10 MB.') });
      return;
    }

    setIsSavingAvatar(true);
    setAccountStatus({ type: '', message: '' });

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = await api.updateCurrentUser({
          firstName: accountFirstName,
          lastName: accountLastName,
          email: accountEmail,
          profileImage: reader.result,
        });
        onUserUpdate(data.user);
        setAccountStatus({ type: 'success', message: t('Profile image updated.') });
      } catch (error) {
        setAccountStatus({ type: 'error', message: error.message });
      } finally {
        setIsSavingAvatar(false);
        event.target.value = '';
      }
    };
    reader.onerror = () => {
      setIsSavingAvatar(false);
      setAccountStatus({ type: 'error', message: t('Could not read image file.') });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="profile-page">
      <header className="profile-hero">
        <h1>{t('ACCOUNT')} <span>{t('SETTINGS')}</span></h1>
        <p>{t('OPTIMIZE YOUR PROFILE AND INTERFACE. PREFERENCES FOR THE BEST EXPERIENCE.')}</p>
      </header>

      <div className="profile-settings-grid">
        <main className="profile-main-column">
          <section className="profile-panel account-panel">
            <div className="profile-panel-heading">
              <span className="profile-heading-icon"><User size={20} /></span>
              <h2>{t('ACCOUNT PROFILE')}</h2>
              <button className="biometrics-save-button unsaved" type="button" onClick={saveAccountProfile} disabled={isSavingAccount}>
                <Save size={14} /> {isSavingAccount ? t('SAVING') : t('SAVE')}
              </button>
            </div>

            <div className="account-profile-body">
              <div className="profile-avatar-edit">
                <div className="profile-avatar-ring">
                  <div
                    className={`profile-avatar-face ${currentUser?.profileImage ? 'has-image' : ''}`}
                    style={currentUser?.profileImage ? { backgroundImage: `url(${currentUser.profileImage})` } : undefined}
                  >
                    {!currentUser?.profileImage && userInitials}
                  </div>
                </div>
                <label className="profile-avatar-upload" aria-label={t('CHANGE')}>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={updateProfileImage} disabled={isSavingAvatar} />
                  <Plus size={14} />
                </label>
              </div>

              <div className="account-form-grid">
                <label className="profile-form-field">
                  <span>{t('FIRST NAME')}</span>
                  <input type="text" value={accountFirstName} onChange={(event) => setAccountFirstName(event.target.value)} />
                </label>
                <label className="profile-form-field">
                  <span>{t('LAST NAME')}</span>
                  <input type="text" value={accountLastName} onChange={(event) => setAccountLastName(event.target.value)} />
                </label>
                <label className="profile-form-field">
                  <span>{t('EMAIL ADDRESS')}</span>
                  <input type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} />
                </label>
                <label className="profile-form-field password-field">
                  <span>{t('CHANGE PASSWORD')}</span>
                  <div className="profile-password-row">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      placeholder={t('Current password')}
                      autoComplete="current-password"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder={t('New password')}
                      autoComplete="new-password"
                    />
                  </div>
                </label>
                {accountStatus.message && (
                  <div className={`profile-account-status ${accountStatus.type}`}>
                    {accountStatus.message}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="profile-panel biometrics-panel">
            <div className="profile-panel-heading">
              <span className="profile-heading-icon"><TrendingUp size={20} /></span>
              <h2>{t('ADVANCED BIOMETRICS')}</h2>
              <button className={`biometrics-save-button ${hasUnsavedBiometrics ? 'unsaved' : 'saved'}`} type="button" onClick={saveBiometrics}>
                <Save size={14} /> {t('SAVE')}
              </button>
            </div>

            <div className="biometrics-grid">
              <label className="profile-form-field">
                <span>{t('GENDER')}</span>
                <select value={gender} onChange={(event) => updateBiometricField(setGender)(event.target.value)}>
                  <option value="Male">{t('Male')}</option>
                  <option value="Female">{t('Female')}</option>
                  <option value="Other">{t('Other')}</option>
                </select>
              </label>
              <label className="profile-form-field">
                <span>{t('HEIGHT (CM)')}</span>
                <input type="number" value={height} onChange={(event) => updateBiometricField(setHeight)(event.target.value)} />
              </label>
              <label className="profile-form-field">
                <span>{t('WEIGHT (KG)')}</span>
                <input type="number" value={weight} onChange={(event) => updateBiometricField(setWeight)(event.target.value)} />
              </label>
            </div>

            <div className="bmi-control-row">
              <div>
                <h3>{t('CALCULATE BMI')}</h3>
                <p>{t('AUTOMATED INDEX TRACKING')}</p>
              </div>
              <div className={`bmi-result-pill ${!isBmiTrackingEnabled ? 'inactive' : ''}`}>
                <Scale size={16} />
                <span>{isBmiTrackingEnabled && bmiValue ? `BMI: ${bmiValue}` : t('BMI OFF')}</span>
              </div>
              <button
                className="bmi-info-button"
                type="button"
                aria-label={t('WHAT IS BMI?')}
                onClick={() => setIsBmiInfoOpen(true)}
              >
                <CircleQuestionMark size={18} />
              </button>
              <button
                className={`profile-mini-toggle ${isBmiTrackingEnabled ? 'active' : ''}`}
                type="button"
                aria-label={t('AUTOMATED INDEX TRACKING')}
                aria-pressed={isBmiTrackingEnabled}
                onClick={toggleBmiTracking}
              ></button>
            </div>
          </section>

          <section className="profile-panel encryption-panel">
            <div className="encryption-copy">
              <h2>{t('ADVANCED DATA')} <span>{t('ENCRYPTION PROTOCOL')}</span></h2>
              <p>{t('All biometric data transmitted between your wearables and PROGYM servers is protected by 256-bit military-grade encryption. Your performance is private.')}</p>
              <div className="encryption-badges">
                <span><ShieldCheck size={16} /> {t('HIPAA COMPLIANT')}</span>
                <span><ShieldCheck size={16} /> {t('END-TO-END ENCRYPTED')}</span>
              </div>
            </div>
            <div className="encryption-visual">
              <Lock size={64} />
            </div>
          </section>
        </main>

        <aside className="profile-side-column">
          <section className="profile-panel compact-panel alerts-panel">
            <div className="profile-panel-heading">
              <span className="profile-heading-icon"><Bell size={20} /></span>
              <h2>{t('ALERTS')}</h2>
            </div>

            <div className="profile-toggle-row">
              <div>
                <h3>{t('WORKOUT REMINDERS')}</h3>
                <p>{t('DAILY SESSION PROMPTS')}</p>
              </div>
              <button
                className={`profile-mini-toggle ${workoutRemindersEnabled ? 'active' : ''}`}
                type="button"
                aria-label={t('WORKOUT REMINDERS')}
                aria-pressed={workoutRemindersEnabled}
                onClick={() => setWorkoutRemindersEnabled((enabled) => !enabled)}
              ></button>
            </div>
            <div className="profile-toggle-row">
              <div>
                <h3>{t('HYDRATION ALERTS')}</h3>
                <p>{t('WATER INTAKE TRACKING')}</p>
              </div>
              <button
                className={`profile-mini-toggle ${hydrationAlertsEnabled ? 'active' : ''}`}
                type="button"
                aria-label={t('HYDRATION ALERTS')}
                aria-pressed={hydrationAlertsEnabled}
                onClick={() => setHydrationAlertsEnabled((enabled) => !enabled)}
              ></button>
            </div>
            {hydrationAlertsEnabled && (
              <p className="alert-schedule-note">{t('Hydration reminders are scheduled for morning, midday and evening.')}</p>
            )}
            <button className="profile-outline-action alert-demo-button" type="button" onClick={showDemoHydrationReminder}>
              <Bell size={14} /> {t('SHOW DEMO REMINDER')}
            </button>
          </section>

          <section className="profile-panel compact-panel hydration-goal-panel">
            <div className="profile-panel-heading">
              <span className="profile-heading-icon"><Droplets size={20} /></span>
              <h2>{t('HYDRATION GOAL')}</h2>
            </div>

            <div className="hydration-goal-value">
              <span>{hydrationGoal.toFixed(1)}L</span>
              <small>{t('DAILY WATER TARGET')}</small>
            </div>

            <div className="profile-hydration-controls">
              <button type="button" onClick={() => changeHydrationGoal(-0.1)} aria-label={t('Decrease hydration goal')}>
                <Minus size={15} />
              </button>
              <input
                type="range"
                min="1.5"
                max="7"
                step="0.1"
                value={hydrationGoal}
                onChange={(event) => setHydrationGoal(Number(event.target.value))}
                aria-label={t('Hydration goal in liters')}
              />
              <button type="button" onClick={() => changeHydrationGoal(0.1)} aria-label={t('Increase hydration goal')}>
                <Plus size={15} />
              </button>
            </div>

            <div className="hydration-recommendation">
              <Target size={16} />
              <span>{t('Recommended: 2.5L - 3.5L')}</span>
            </div>
          </section>

          <section className="profile-panel compact-panel privacy-panel">
            <div className="profile-panel-heading">
              <span className="profile-heading-icon"><Shield size={20} /></span>
              <h2>{t('PRIVACY')}</h2>
            </div>
            <button className="profile-outline-action" type="button"><Download size={14} /> {t('EXPORT PERSONAL DATA')}</button>
            <button className="profile-outline-action" type="button" onClick={onLogout}><LogOut size={14} /> {t('LOG OUT')}</button>
            <button className="profile-danger-action" type="button">{t('DELETE ACCOUNT')}</button>
          </section>

          <section className="profile-panel compact-panel watch-panel">
            <div className="watch-card-topline">
              <span className="watch-icon"><Watch size={20} /></span>
              <span className="status-badge">{t('CONNECTED')}</span>
            </div>
            <h2>{t('APPLE WATCH')}</h2>
            <p>{t('HEALTHKIT ENABLED')}</p>
            <button className="profile-danger-action" type="button">{t('DISCONNECT')}</button>
          </section>
        </aside>
      </div>

      {activeReminder && (
        <div className="profile-reminder-toast" role="status" aria-live="polite">
          <div className="profile-reminder-icon">
            {activeReminder.type === 'workout' ? <Bell size={20} /> : <Droplets size={20} />}
          </div>
          <div className="profile-reminder-content">
            <span>{activeReminder.meta}</span>
            <h3>{activeReminder.title}</h3>
            <p>{activeReminder.message}</p>
          </div>
          <button type="button" onClick={() => setActiveReminder(null)} aria-label={t('Dismiss reminder')}>
            <X size={16} />
          </button>
        </div>
      )}

      {isBmiInfoOpen && (
        <div
          className="bmi-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsBmiInfoOpen(false);
          }}
        >
          <section className="bmi-info-modal" role="dialog" aria-modal="true" aria-labelledby="bmi-info-title">
            <button className="bmi-modal-close" type="button" onClick={() => setIsBmiInfoOpen(false)} aria-label={t('Close BMI info')}>
              <X size={18} />
            </button>

            <div className="bmi-modal-header">
              <span className="profile-heading-icon"><Scale size={20} /></span>
              <div>
                <span>{t('BODY MASS INDEX')}</span>
                <h2 id="bmi-info-title">{t('WHAT IS BMI?')}</h2>
              </div>
            </div>

            <p className="bmi-modal-intro">
              {t('BMI is a simple value calculated from your height and weight. It gives a rough reference point for body composition, but it is not a full health analysis.')}
            </p>

            <div className="bmi-formula-card">
              <span>{t('HOW IT WORKS')}</span>
              <strong>BMI = kg / m²</strong>
              <p>{t('Your weight is divided by your height squared, then placed into broad categories such as underweight, normal weight or overweight.')}</p>
            </div>

            <div className="bmi-info-grid">
              <div>
                <h3>{t('IMPORTANT TO KNOW')}</h3>
                <p>{t('BMI does not consider muscle mass, body composition, genetics or athletic performance. A strong athlete can have a higher BMI and still be fit and healthy.')}</p>
              </div>
              <div>
                <h3>{t('USE IT AS A REFERENCE')}</h3>
                <p>{t('Numbers can guide you. They do not define you.')}</p>
              </div>
            </div>

            <div className="bmi-ranges-section">
              <h3>{t('BMI REFERENCE RANGES')}</h3>
              <p>{t('For adults, these ranges are commonly used as a broad orientation. Your training level, muscle mass and overall health context still matter.')}</p>

              <div className="bmi-range-list">
                <div className="bmi-range-card low">
                  <span>{t('LOW')}</span>
                  <strong>{t('Under 18.5')}</strong>
                  <p>{t('Often classified as underweight.')}</p>
                </div>
                <div className="bmi-range-card good">
                  <span>{t('GOOD')}</span>
                  <strong>18.5 - 24.9</strong>
                  <p>{t('Usually considered the healthy weight range.')}</p>
                </div>
                <div className="bmi-range-card medium">
                  <span>{t('MEDIUM')}</span>
                  <strong>25.0 - 29.9</strong>
                  <p>{t('Often classified as overweight, depending on context.')}</p>
                </div>
                <div className="bmi-range-card high">
                  <span>{t('HIGH')}</span>
                  <strong>{t('30.0 and above')}</strong>
                  <p>{t('Often classified as obesity and worth discussing in context.')}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
