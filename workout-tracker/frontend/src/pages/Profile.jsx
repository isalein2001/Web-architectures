import React, { useContext, useEffect, useState } from 'react';
import {
  Bell,
  Info,
  LogOut,
  Lock,
  MailCheck,
  Pencil,
  RefreshCw,
  Save,
  Scale,
  Shield,
  ShieldCheck,
  TrendingUp,
  User,
  Watch,
  X,
} from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { getUserDisplayName, getUserInitials, getUserStorageKey } from '../userStorage';
import { api } from '../api';
import { isHealthMetricsFromToday, syncAppleHealthActivity } from '../healthKit';
import './Profile.css';

export default function Profile({ currentUser, onLogout, onUserUpdate }) {
  const { t } = useContext(LanguageContext);
  const userDisplayName = getUserDisplayName(currentUser);
  const userInitials = getUserInitials(currentUser);
  const storageKey = (key) => getUserStorageKey(key, currentUser);
  const [accountFirstName, setAccountFirstName] = useState(currentUser?.firstName || userDisplayName.split(/\s+/)[0] || '');
  const [accountLastName, setAccountLastName] = useState(currentUser?.lastName || userDisplayName.split(/\s+/).slice(1).join(' ') || '');
  const [accountEmail, setAccountEmail] = useState(currentUser?.pendingEmail || currentUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountStatus, setAccountStatus] = useState({ type: '', message: '' });
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isResendingEmailCode, setIsResendingEmailCode] = useState(false);
  const [workoutRemindersEnabled, setWorkoutRemindersEnabled] = useState(() => (
    window.localStorage.getItem(storageKey('workoutRemindersEnabled')) !== 'false'
  ));
  const [hydrationAlertsEnabled, setHydrationAlertsEnabled] = useState(() => (
    window.localStorage.getItem(storageKey('hydrationAlertsEnabled')) !== 'false'
  ));
  const [isWatchConnected, setIsWatchConnected] = useState(() => (
    window.localStorage.getItem(storageKey('appleWatchConnected')) === 'true'
  ));
  const [isWatchSyncing, setIsWatchSyncing] = useState(false);
  const [watchSyncStatus, setWatchSyncStatus] = useState('');
  const [watchMetrics, setWatchMetrics] = useState(() => {
    const savedMetrics = window.localStorage.getItem(storageKey('appleHealthMetrics'));
    if (!savedMetrics) return null;
    try {
      const parsedMetrics = JSON.parse(savedMetrics);
      return isHealthMetricsFromToday(parsedMetrics) ? parsedMetrics : null;
    } catch {
      return null;
    }
  });
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
    const savedMetrics = window.localStorage.getItem(storageKey('appleHealthMetrics'));
    let nextWatchMetrics = null;
    let hasStoredWatchConnection = window.localStorage.getItem(storageKey('appleWatchConnected')) === 'true';
    if (savedMetrics) {
      try {
        const parsedMetrics = JSON.parse(savedMetrics);
        nextWatchMetrics = isHealthMetricsFromToday(parsedMetrics) ? parsedMetrics : null;
        hasStoredWatchConnection = hasStoredWatchConnection || Boolean(parsedMetrics);
      } catch {
        nextWatchMetrics = null;
      }
    }

    // Keep the form draft in sync when the active account changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccountFirstName(currentUser?.firstName || nextDisplayName.split(/\s+/)[0] || '');
    setAccountLastName(currentUser?.lastName || nextDisplayName.split(/\s+/).slice(1).join(' ') || '');
    setAccountEmail(currentUser?.pendingEmail || currentUser?.email || '');
    setCurrentPassword('');
    setNewPassword('');
    setEmailVerificationCode('');
    setAccountStatus({ type: '', message: '' });
    setGender(window.localStorage.getItem(storageKey('profileGender')) || currentUser?.gender || 'Female');
    setHeight(window.localStorage.getItem(storageKey('profileHeightCm')) || currentUser?.heightCm || '185');
    setWeight(window.localStorage.getItem(storageKey('profileWeightKg')) || currentUser?.weightKg || '85');
    setWatchMetrics(nextWatchMetrics);
    setIsWatchConnected(hasStoredWatchConnection || Boolean(nextWatchMetrics));
  }, [currentUser]);

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
    window.localStorage.setItem(storageKey('appleWatchConnected'), isWatchConnected.toString());
  }, [isWatchConnected, currentUser?.id]);

  useEffect(() => {
    if (watchMetrics) {
      window.localStorage.setItem(storageKey('appleHealthMetrics'), JSON.stringify(watchMetrics));
    } else {
      window.localStorage.removeItem(storageKey('appleHealthMetrics'));
    }
  }, [watchMetrics, currentUser?.id]);

  const syncAppleHealth = async () => {
    setIsWatchSyncing(true);
    setWatchSyncStatus('');

    try {
      const { metrics, activity, syncError } = await syncAppleHealthActivity(currentUser);
      setWatchMetrics(metrics);
      setIsWatchConnected(true);
      setWatchSyncStatus(syncError
        ? 'APPLE HEALTH CONNECTED - SERVER SYNC WILL RETRY'
        : (activity ? 'APPLE HEALTH SYNCED' : 'APPLE HEALTH CONNECTED'));
    } catch (error) {
      console.error(error);
      if (!watchMetrics) {
        setIsWatchConnected(false);
      }
      setWatchSyncStatus(error.message || 'APPLE HEALTH SYNC FAILED');
    } finally {
      setIsWatchSyncing(false);
    }
  };

  const disconnectAppleHealth = () => {
    setIsWatchConnected(false);
    setWatchMetrics(null);
    setWatchSyncStatus('DISCONNECTED');
  };

  const calculateBmi = (heightCm, weightKg) => {
    const parsedHeight = Number(heightCm);
    const parsedWeight = Number(weightKg);

    if (!parsedHeight || !parsedWeight) return '';

    const heightMeters = parsedHeight / 100;
    return (parsedWeight / (heightMeters * heightMeters)).toFixed(1);
  };

  const liveBmiValue = calculateBmi(height, weight);

  const saveBiometrics = async () => {
    window.localStorage.setItem(storageKey('profileGender'), gender);
    window.localStorage.setItem(storageKey('profileHeightCm'), height);
    window.localStorage.setItem(storageKey('profileWeightKg'), weight);
    window.localStorage.setItem(storageKey('bmiTrackingEnabled'), isBmiTrackingEnabled.toString());

    if (isBmiTrackingEnabled && liveBmiValue) {
      setBmiValue(liveBmiValue);
      window.localStorage.setItem(storageKey('profileBmi'), liveBmiValue);
    }

    try {
      const data = await api.updateCurrentUser({
        firstName: accountFirstName,
        lastName: accountLastName,
        email: currentUser?.email || accountEmail,
        gender,
        heightCm: height,
        weightKg: weight,
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

  const saveAccountProfile = async ({ includeEmailChange = false } = {}) => {
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
        email: includeEmailChange ? accountEmail : (currentUser?.email || accountEmail),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      onUserUpdate(data.user);
      setCurrentPassword('');
      setNewPassword('');
      setEmailVerificationCode('');
      setAccountStatus({
        type: 'success',
        message: data.user.pendingEmail ? t('Verification code sent. Please confirm your new email.') : t('Account updated.'),
      });
    } catch (error) {
      setAccountStatus({ type: 'error', message: error.message });
    } finally {
      setIsSavingAccount(false);
    }
  };

  const requestEmailChange = async () => {
    if (accountEmail.trim().toLowerCase() === (currentUser?.email || '').toLowerCase()) {
      setAccountStatus({ type: 'error', message: t('Enter a new email address first.') });
      return;
    }

    await saveAccountProfile({ includeEmailChange: true });
  };

  const verifyAccountEmail = async () => {
    const code = emailVerificationCode.trim();
    if (!code) {
      setAccountStatus({ type: 'error', message: t('Please enter the verification code.') });
      return;
    }

    setIsVerifyingEmail(true);
    setAccountStatus({ type: '', message: '' });

    try {
      const data = await api.verifyEmailChange(code);
      onUserUpdate(data.user);
      setEmailVerificationCode('');
      setAccountStatus({ type: 'success', message: t('Email verified.') });
    } catch (error) {
      setAccountStatus({ type: 'error', message: error.message });
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const resendEmailVerificationCode = async () => {
    setIsResendingEmailCode(true);
    setAccountStatus({ type: '', message: '' });

    try {
      await api.resendEmailChange();
      setAccountStatus({ type: 'success', message: t('Verification code sent.') });
    } catch (error) {
      setAccountStatus({ type: 'error', message: error.message });
    } finally {
      setIsResendingEmailCode(false);
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
          email: currentUser?.email || accountEmail,
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
                  <Pencil size={14} />
                </label>
                <div className="account-avatar-actions">
                  <button className="account-footer-button" type="button" onClick={onLogout}>
                    <LogOut size={14} /> {t('LOG OUT')}
                  </button>
                  <button className="account-footer-button danger" type="button">
                    {t('DELETE ACCOUNT')}
                  </button>
                </div>
              </div>

              <div className="account-form-grid">
                <div className="account-name-row">
                  <label className="profile-form-field">
                    <span>{t('FIRST NAME')}</span>
                    <input type="text" value={accountFirstName} onChange={(event) => setAccountFirstName(event.target.value)} />
                  </label>
                  <label className="profile-form-field">
                    <span>{t('LAST NAME')}</span>
                    <input type="text" value={accountLastName} onChange={(event) => setAccountLastName(event.target.value)} />
                  </label>
                </div>
                <label className="profile-form-field account-email-field">
                  <span className="account-email-label">
                    {t('EMAIL ADDRESS')}
                    <strong className={currentUser?.pendingEmail ? 'pending' : currentUser?.emailVerified ? 'verified' : ''}>
                      {currentUser?.pendingEmail ? t('PENDING') : currentUser?.emailVerified ? t('VERIFIED') : t('UNVERIFIED')}
                    </strong>
                  </span>
                  <div className="account-email-row">
                    <input type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} />
                    <button type="button" onClick={requestEmailChange} disabled={isSavingAccount}>
                      {t('CHANGE EMAIL')}
                    </button>
                  </div>
                </label>
                {currentUser?.pendingEmail && (
                  <div className="account-email-verification">
                    <div className="account-email-verification-copy">
                      <MailCheck size={18} />
                      <div>
                        <strong>{t('Confirm new email')}</strong>
                        <p>{t('Enter the verification code sent to')} {currentUser.pendingEmail}.</p>
                      </div>
                    </div>
                    <div className="account-code-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="6"
                        value={emailVerificationCode}
                        onChange={(event) => setEmailVerificationCode(event.target.value)}
                        placeholder={t('6-digit code')}
                        aria-label={t('Verification code')}
                      />
                      <button type="button" onClick={verifyAccountEmail} disabled={isVerifyingEmail}>
                        <Shield size={14} /> {isVerifyingEmail ? t('VERIFYING') : t('VERIFY')}
                      </button>
                      <button type="button" className="ghost" onClick={resendEmailVerificationCode} disabled={isResendingEmailCode}>
                        <RefreshCw size={14} /> {isResendingEmailCode ? t('SENDING') : t('RESEND')}
                      </button>
                    </div>
                  </div>
                )}
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
                <div className="account-save-actions">
                  <button className="biometrics-save-button account-save-button" type="button" onClick={saveAccountProfile} disabled={isSavingAccount}>
                    <Save size={14} /> {isSavingAccount ? t('SAVING') : t('SAVE PROFILE')}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="profile-panel biometrics-panel">
            <div className="profile-panel-heading">
              <span className="profile-heading-icon"><TrendingUp size={20} /></span>
              <h2>{t('ADVANCED BIOMETRICS')}</h2>
              <button className={`biometrics-save-button ${hasUnsavedBiometrics ? 'unsaved' : 'saved'}`} type="button" onClick={saveBiometrics}>
                {hasUnsavedBiometrics ? t('SAVE CHANGES') : t('SAVED')}
              </button>
            </div>

            {hasUnsavedBiometrics && (
              <div className="biometrics-unsaved-note" role="status">
                {t('Unsaved biometric changes. Press save to store this status.')}
              </div>
            )}

            <div className="biometrics-grid">
              <div className="biometric-metric biometric-gender-card">
                <span>{t('ASSIGNED GENDER')}</span>
                <div className="biometric-segment-control" role="group" aria-label={t('GENDER')}>
                  {['Male', 'Female', 'Other'].map((option) => (
                    <button
                      key={option}
                      className={gender === option ? 'active' : ''}
                      type="button"
                      onClick={() => updateBiometricField(setGender)(option)}
                    >
                      {t(option)}
                    </button>
                  ))}
                </div>
              </div>
              <label className="profile-form-field">
                <span>{t('HEIGHT PROFILE')}</span>
                <div className="biometric-number-pill">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={height}
                    onChange={(event) => updateBiometricField(setHeight)(event.target.value)}
                    aria-label={t('HEIGHT (CM)')}
                  />
                  <small>{t('CM')}</small>
                </div>
              </label>
              <label className="profile-form-field">
                <span>{t('WEIGHT MATRIX')}</span>
                <div className="biometric-number-pill">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={weight}
                    onChange={(event) => updateBiometricField(setWeight)(event.target.value)}
                    aria-label={t('WEIGHT (KG)')}
                  />
                  <small>{t('KG')}</small>
                </div>
              </label>
            </div>

            <div className="bmi-control-row">
              <button
                className="bmi-info-button"
                type="button"
                aria-label={t('WHAT IS BMI?')}
                onClick={() => setIsBmiInfoOpen(true)}
              >
                <Scale size={20} />
              </button>
              <div>
                <h3>{t('BODY MASS INDEX')}</h3>
                <p>{isBmiTrackingEnabled && (liveBmiValue || bmiValue) ? (liveBmiValue || bmiValue) : t('BMI OFF')}</p>
              </div>
              <div className={`bmi-result-pill ${!isBmiTrackingEnabled ? 'inactive' : ''}`}>
                <span>{isBmiTrackingEnabled ? t('OPTIMAL RANGE') : t('TRACKING OFF')}</span>
              </div>
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
              <p>{t('All biometric data transmitted between your wearables and NEXT REPS servers is protected by 256-bit military-grade encryption. Your performance is private.')}</p>
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
          </section>

          <section className={`profile-panel compact-panel watch-panel ${isWatchConnected ? 'connected' : 'disconnected'}`}>
            <div className="watch-card-topline">
              <span className="watch-icon"><Watch size={20} /></span>
              <span className="status-badge">{isWatchConnected ? t('CONNECTED') : t('DISCONNECTED')}</span>
            </div>
            <h2>{t('APPLE WATCH')}</h2>
            <p>
              {isWatchConnected
                ? `${t('HEALTHKIT ENABLED')}${watchMetrics?.steps ? ` · ${watchMetrics.steps.toLocaleString()} ${t('STEPS')}` : ''}`
                : t('HEALTHKIT DISCONNECTED')}
            </p>
            {watchMetrics && (
              <div className="watch-metrics">
                <span>{watchMetrics.activeEnergyKcal.toLocaleString()} kcal</span>
                <span>{watchMetrics.exerciseMinutes.toLocaleString()} min</span>
              </div>
            )}
            {watchSyncStatus && <small className="watch-sync-status">{t(watchSyncStatus)}</small>}
            <button
              className="profile-danger-action"
              type="button"
              disabled={isWatchSyncing}
              onClick={isWatchConnected ? disconnectAppleHealth : syncAppleHealth}
            >
              {isWatchSyncing ? t('SYNCING') : isWatchConnected ? t('DISCONNECT') : t('CONNECT')}
            </button>
            {isWatchConnected && (
              <button
                className="profile-watch-sync-action"
                type="button"
                disabled={isWatchSyncing}
                onClick={syncAppleHealth}
              >
                {t('SYNC NOW')}
              </button>
            )}
          </section>

        </aside>
      </div>

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
