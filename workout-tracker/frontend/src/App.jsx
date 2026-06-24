import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Activity, LayoutDashboard, NotebookPen, LineChart, Search, Globe, Bell, Info, LifeBuoy, Droplets, X, Flame, User, PlayCircle, Target, BarChart3, Dumbbell } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Workouts from "./pages/Workouts";
import Analytics from "./pages/Analytics";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import Profile from "./pages/Profile";
import Landing from "./pages/Landing";
import Support from "./pages/Support";
import About from "./pages/About";
import WorkoutLogger from "./pages/WorkoutLogger";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Onboarding from "./pages/Onboarding";
import { api } from "./api";
import { getUserDisplayName, getUserInitials, getUserStorageKey } from "./userStorage";
import "./index.css";
import "./App.css";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "./context/LanguageContext";

const HYDRATION_REMINDER_TIMES = [
  { hour: 8, minute: 30 },
  { hour: 13, minute: 0 },
  { hour: 19, minute: 0 },
];
const WORKOUT_REMINDER_TIME = { hour: 18, minute: 0 };
const waterQuickAdds = [250, 500, 750, 1000];
const stepQuickAdds = [500, 1000, 2500, 5000];

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const getNextReminderDelay = ({ hour, minute }) => {
  const now = new Date();
  const nextReminder = new Date();
  nextReminder.setHours(hour, minute, 0, 0);

  if (nextReminder <= now) {
    nextReminder.setDate(nextReminder.getDate() + 1);
  }

  return nextReminder.getTime() - now.getTime();
};

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  const isVerificationPage = location.pathname === "/verify-email";
  const isOnboardingPage = location.pathname === "/onboarding";
  const isLanding = location.pathname === "/";
  const { t, lang, setLang } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [workoutRemindersEnabled, setWorkoutRemindersEnabled] = useState(() => (
    window.localStorage.getItem('workoutRemindersEnabled') !== 'false'
  ));
  const [hydrationAlertsEnabled, setHydrationAlertsEnabled] = useState(() => (
    window.localStorage.getItem('hydrationAlertsEnabled') !== 'false'
  ));
  const [activeReminder, setActiveReminder] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickLogTab, setQuickLogTab] = useState('water');
  const [dailyActivity, setDailyActivity] = useState(null);
  const [quickLogCustomValue, setQuickLogCustomValue] = useState('');
  const [quickLogStatus, setQuickLogStatus] = useState('');
  const [isQuickLogSaving, setIsQuickLogSaving] = useState(false);
  const [draftWaterMl, setDraftWaterMl] = useState(0);
  const [draftSteps, setDraftSteps] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPlans, setSearchPlans] = useState([]);
  const langRef = useRef(null);
  const alertsRef = useRef(null);
  const pageTitleKey = location.pathname === '/dashboard'
    ? 'Dashboard'
    : location.pathname === '/workouts'
      ? 'Workouts'
      : location.pathname === '/analytics'
        ? 'Analytics'
        : location.pathname === '/settings'
          ? 'Settings'
          : location.pathname === '/profile'
            ? 'Profile'
            : location.pathname === '/about'
              ? 'About Us'
              : location.pathname === '/support'
                ? 'Support'
                : 'NEXT REPS';
  const userDisplayName = getUserDisplayName(currentUser);
  const userInitials = getUserInitials(currentUser);
  const workoutRemindersStorageKey = getUserStorageKey('workoutRemindersEnabled', currentUser);
  const hydrationAlertsStorageKey = getUserStorageKey('hydrationAlertsEnabled', currentUser);
  const waterIntakeMl = dailyActivity?.water_intake_ml || 0;
  const waterGoalMl = dailyActivity?.water_goal_ml || Math.round((currentUser?.hydrationGoalLiters || 3) * 1000);
  const stepsToday = dailyActivity?.steps || 0;
  const stepGoal = dailyActivity?.step_goal || 10000;
  const visibleWaterMl = quickLogOpen ? draftWaterMl : waterIntakeMl;
  const visibleSteps = quickLogOpen ? draftSteps : stepsToday;
  const visibleWaterProgress = Math.min(100, Math.round((visibleWaterMl / Math.max(waterGoalMl, 1)) * 100));
  const visibleStepsProgress = Math.min(100, Math.round((visibleSteps / Math.max(stepGoal, 1)) * 100));
  const visibleStepCalories = Math.round(visibleSteps * (Number(currentUser?.weightKg) || 75) * 0.00055);
  const uniquePlanExercises = Array.from(new Map(searchPlans
    .flatMap((plan) => (plan.exercises || []).map((exercise) => ({
      key: String(exercise.exercise_name || '').trim().toLowerCase(),
      label: exercise.exercise_name,
      planName: plan.name,
    })))
    .filter((exercise) => exercise.key && exercise.label)
    .map((exercise) => [exercise.key, exercise])
  ).values());
  const searchEntries = [
    { type: 'Page', label: 'Dashboard', description: 'Daily goals, calendar and overview', path: '/dashboard', Icon: LayoutDashboard },
    { type: 'Page', label: 'Workouts', description: 'Create, edit and start workout plans', path: '/workouts', Icon: NotebookPen },
    { type: 'Page', label: 'Analytics', description: 'Strength progress and training insights', path: '/analytics', Icon: LineChart },
    { type: 'Page', label: 'Settings', description: 'Account and preferences', path: '/settings', Icon: Activity },
    { type: 'Page', label: 'Profile', description: 'Body metrics and advanced biometrics', path: '/profile', Icon: User },
    { type: 'Page', label: 'Support', description: 'Help center and ticket form', path: '/support', Icon: LifeBuoy },
    { type: 'Page', label: 'About Us', description: 'Founders and NEXT REPS philosophy', path: '/about', Icon: Info },
    { type: 'Action', label: 'Start Workout', description: 'Open workout launcher', path: '/start-workout', Icon: PlayCircle },
    { type: 'Action', label: 'Log Water', description: 'Open quick hydration log', action: () => openQuickLog('water'), Icon: Droplets },
    { type: 'Action', label: 'Log Steps', description: 'Open quick steps log', action: () => openQuickLog('steps'), Icon: Activity },
    { type: 'Analytics', label: 'Progressive Overload Score', description: 'Strength pressure over the last 30 days', path: '/analytics', Icon: Target },
    { type: 'Analytics', label: 'Average Session Duration', description: 'Recent workout duration trend', path: '/analytics', Icon: BarChart3 },
    { type: 'Analytics', label: 'Exercise Diversity', description: 'Exercise variety in recent workouts', path: '/analytics', Icon: Activity },
    ...searchPlans.map((plan) => ({
      type: 'Workout',
      label: plan.name,
      description: `${(plan.exercises || []).length} exercises`,
      path: '/workouts',
      Icon: Dumbbell,
    })),
    ...uniquePlanExercises.map((exercise) => ({
      type: 'Exercise',
      label: exercise.label,
      description: `In ${exercise.planName}`,
      path: '/workouts',
      Icon: Dumbbell,
    })),
  ];
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredSearchEntries = (normalizedSearchQuery
    ? searchEntries.filter((entry) => (
      `${entry.label} ${entry.description} ${entry.type}`.toLowerCase().includes(normalizedSearchQuery)
    ))
    : []
  ).slice(0, 5);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // The local auth state should still be cleared if the server is already logged out.
    }
    setCurrentUser(null);
    navigate('/login', { replace: true });
  };

  const handleUserUpdate = (nextUser) => {
    setCurrentUser(nextUser);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const selectSearchEntry = (entry) => {
    if (entry.action) {
      entry.action();
    } else if (entry.path) {
      navigate(entry.path);
    }
    closeSearch();
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      closeSearch();
      return;
    }

    if (event.key === 'Enter' && filteredSearchEntries[0]) {
      event.preventDefault();
      selectSearchEntry(filteredSearchEntries[0]);
    }
  };

  const renderSearchBar = (className) => (
    <div
      className={`search-bar global-search ${className} ${searchOpen ? 'search-open' : ''}`}
      onClick={() => setSearchOpen(true)}
    >
      <Search size={18} color="#ADAAAA" />
      <input
        type="text"
        value={searchQuery}
        placeholder={t('SEARCH...')}
        onChange={(event) => {
          setSearchQuery(event.target.value);
          setSearchOpen(true);
        }}
        onFocus={() => setSearchOpen(true)}
        onKeyDown={handleSearchKeyDown}
      />
      {searchOpen && (
        <div className="global-search-dropdown">
          <div className="global-search-results">
            {filteredSearchEntries.length > 0 ? (
              filteredSearchEntries.map((entry) => {
                const ResultIcon = entry.Icon;
                return (
                  <button
                    key={`${entry.type}-${entry.label}-${entry.description}`}
                    type="button"
                    className="global-search-result"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSearchEntry(entry)}
                  >
                    <span className="global-search-result-icon">
                      <ResultIcon size={14} />
                    </span>
                    <span className="global-search-result-copy">
                      <strong>{t(entry.label)}</strong>
                      <small>{t(entry.description)}</small>
                    </span>
                  </button>
                );
              })
            ) : normalizedSearchQuery ? (
              <div className="global-search-empty">
                {t('No results found')}
              </div>
            ) : (
              <div className="global-search-hint">
                {t('Type to search pages, workouts or exercises.')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const refreshDailyActivity = async () => {
    if (!currentUser?.id) return;
    const activity = await api.getTodayActivity();
    setDailyActivity(activity);
    window.dispatchEvent(new CustomEvent('daily-activity-change', { detail: activity }));
  };

  function openQuickLog(tab = 'water') {
    setQuickLogTab(tab);
    setQuickLogCustomValue('');
    setQuickLogStatus('');
    setDraftWaterMl(waterIntakeMl);
    setDraftSteps(stepsToday);
    setQuickLogOpen(true);
  }

  const addQuickLogValue = (amount) => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    if (quickLogTab === 'water') {
      setDraftWaterMl((value) => Math.min(20000, value + Math.round(parsedAmount)));
    } else {
      setDraftSteps((value) => Math.min(200000, value + Math.round(parsedAmount)));
    }

    setQuickLogCustomValue('');
    setQuickLogStatus(t('Ready to save.'));
  };

  const saveQuickLog = async () => {
    setIsQuickLogSaving(true);
    setQuickLogStatus('');

    try {
      const activity = await api.updateTodayActivity({
        water_intake_ml: Math.max(0, Math.min(20000, Math.round(Number(draftWaterMl) || 0))),
        steps: Math.max(0, Math.min(200000, Math.round(Number(draftSteps) || 0))),
      });
      setDailyActivity(activity);
      setQuickLogCustomValue('');
      setDraftWaterMl(activity.water_intake_ml || 0);
      setDraftSteps(activity.steps || 0);
      setQuickLogStatus(t('Saved.'));
      window.dispatchEvent(new CustomEvent('daily-activity-change', { detail: activity }));
    } catch (error) {
      console.error(error);
      setQuickLogStatus(t('Could not save. Please try again.'));
    } finally {
      setIsQuickLogSaving(false);
    }
  };

  useEffect(() => {
    api.getCurrentUser()
      .then((data) => setCurrentUser(data.user))
      .catch(() => setCurrentUser(null))
      .finally(() => setIsAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    setWorkoutRemindersEnabled(window.localStorage.getItem(workoutRemindersStorageKey) !== 'false');
    setHydrationAlertsEnabled(window.localStorage.getItem(hydrationAlertsStorageKey) !== 'false');
  }, [currentUser?.id, workoutRemindersStorageKey, hydrationAlertsStorageKey]);

  useEffect(() => {
    if (!currentUser?.id || !currentUser.emailVerified || !currentUser.onboardingCompleted) return undefined;

    refreshDailyActivity().catch(console.error);
    api.getPlans().then(setSearchPlans).catch(() => setSearchPlans([]));

    const handleFocus = () => {
      refreshDailyActivity().catch(console.error);
      api.getPlans().then(setSearchPlans).catch(() => null);
    };
    const handleOpenQuickLog = (event) => openQuickLog(event.detail?.tab || 'water');

    window.addEventListener('focus', handleFocus);
    window.addEventListener('open-quick-log', handleOpenQuickLog);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('open-quick-log', handleOpenQuickLog);
    };
  }, [currentUser?.id, currentUser?.emailVerified, currentUser?.onboardingCompleted]);

  useEffect(() => {
    if (!currentUser?.id || !currentUser.emailVerified || !currentUser.onboardingCompleted) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;

    const promptStorageKey = getUserStorageKey('pushPermissionPrompted', currentUser);
    if (window.localStorage.getItem(promptStorageKey) === 'true') return;

    const setupPush = async () => {
      try {
        const permission = await Notification.requestPermission();
        window.localStorage.setItem(promptStorageKey, 'true');
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.register('/sw.js');
        const existingSubscription = await registration.pushManager.getSubscription();
        const { publicKey } = await api.getPushPublicKey();
        const subscription = existingSubscription || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await api.subscribeToPush(subscription.toJSON());
      } catch (error) {
        console.error('[PUSH] Could not enable push notifications:', error);
      }
    };

    setupPush();
  }, [currentUser?.id, currentUser?.emailVerified, currentUser?.onboardingCompleted]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setLangOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setAlertsOpen(false);
      }
      if (!event.target.closest('.global-search')) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  useEffect(() => {
    window.localStorage.setItem(workoutRemindersStorageKey, workoutRemindersEnabled.toString());
    window.dispatchEvent(new CustomEvent('alert-preferences-change', {
      detail: { workoutRemindersEnabled },
    }));
  }, [workoutRemindersEnabled, workoutRemindersStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(hydrationAlertsStorageKey, hydrationAlertsEnabled.toString());
    window.dispatchEvent(new CustomEvent('alert-preferences-change', {
      detail: { hydrationAlertsEnabled },
    }));
  }, [hydrationAlertsEnabled, hydrationAlertsStorageKey]);

  useEffect(() => {
    if (!workoutRemindersEnabled) return undefined;

    const workoutReminderTimeout = window.setTimeout(() => {
      setActiveReminder({
        id: `workout-${Date.now()}`,
        type: 'workout',
        title: t('WORKOUT REMINDER'),
        message: t('Your daily session prompt is ready. Keep the streak alive.'),
        meta: t('Daily session prompt'),
      });
    }, getNextReminderDelay(WORKOUT_REMINDER_TIME));

    return () => window.clearTimeout(workoutReminderTimeout);
  }, [workoutRemindersEnabled, t]);

  useEffect(() => {
    if (!hydrationAlertsEnabled) return undefined;

    const reminderTimeouts = HYDRATION_REMINDER_TIMES.map((reminderTime) =>
      window.setTimeout(() => {
        setActiveReminder({
          id: `hydration-${Date.now()}`,
          type: 'hydration',
          title: t('HYDRATION REMINDER'),
          message: t('Time to drink water. Keep your daily target on track.'),
          meta: t('Morning, midday and evening reminder'),
        });
      }, getNextReminderDelay(reminderTime))
    );

    return () => reminderTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
  }, [hydrationAlertsEnabled, t]);

  useEffect(() => {
    const cursor = document.createElement("div");
    cursor.id = "custom-cursor";
    document.body.appendChild(cursor);
    document.body.style.cursor = "none";

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    
    const animate = () => {
      cursorX += (mouseX - cursorX) * 0.2;
      cursorY += (mouseY - cursorY) * 0.2;
      
      const isHovering = cursor.classList.contains('hover-active');
      const scale = isHovering ? 'scale(0.85)' : 'scale(1)';
      
      // Offset by 10px to perfectly center the 20x20 div on the mouse
      cursor.style.transform = `translate3d(${cursorX - 10}px, ${cursorY - 10}px, 0) ${scale}`;
      requestAnimationFrame(animate);
    };
    animate();

    const moveHandler = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // Continuously check if we are hovering over anything clickable
      const clickable = e.target.closest('a, button, input, select, textarea, [role="button"], .sidebar-nav a, .user-profile, .cal-day, .card, .search-bar, .topbar-actions > *');
      if (clickable) {
        cursor.classList.add('hover-active');
      } else {
        cursor.classList.remove('hover-active');
      }
    };

    window.addEventListener("mousemove", moveHandler);

    return () => {
      window.removeEventListener("mousemove", moveHandler);
      document.body.style.cursor = "";
      const el = document.getElementById("custom-cursor");
      if (el) el.remove();
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  if (isAuthLoading) {
    return (
      <div className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">
            <Activity size={24} />
            <span>NEXT REPS</span>
          </div>
          <h1>Loading</h1>
          <p>Checking your session.</p>
        </section>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={setCurrentUser} />} />
        <Route path="/register" element={<Register onLogin={setCurrentUser} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (currentUser && isAuthPage) {
    return <Navigate to="/dashboard" replace />;
  }

  if (currentUser.emailVerified && currentUser.onboardingCompleted && (isVerificationPage || isOnboardingPage)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!currentUser.emailVerified) {
    return (
      <Routes>
        <Route path="/verify-email" element={<VerifyEmail currentUser={currentUser} onUserUpdate={handleUserUpdate} />} />
        <Route path="*" element={<Navigate to="/verify-email" replace />} />
      </Routes>
    );
  }

  if (!currentUser.onboardingCompleted) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding currentUser={currentUser} onUserUpdate={handleUserUpdate} />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <NavLink 
            to="/" 
            style={{ textDecoration: 'none' }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="sidebar-logo">
              <Activity color="#C5FE00" size={28} />
              <span>NEXT REPS</span>
            </div>
          </NavLink>
          <div className="sidebar-subtitle">{t('Member').toUpperCase()}</div>
        </div>
        
        <nav className="nav-links">
          <NavLink 
            to="/dashboard" 
            className={`nav-link ${location.pathname === '/' || location.pathname === '/dashboard' ? 'active' : ''}`}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <LayoutDashboard size={20} /> {t('Dashboard')}
          </NavLink>
          <NavLink to="/workouts" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <NotebookPen size={20} /> {t('Workouts')}
          </NavLink>
          <NavLink to="/start-workout" className="mobile-start-workout-button">
            <Activity size={18} />
            <span>{t('START')}</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <LineChart size={20} /> {t('Analytics')}
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <Activity size={20} /> {t('Settings')}
          </NavLink>

          <div className="nav-secondary-links">
            <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Info size={20} /> {t('About Us')}
            </NavLink>
            <NavLink to="/support" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <LifeBuoy size={20} /> {t('Support')}
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/start-workout" className="workout-btn">{t('START WORKOUT')}</NavLink>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-area">
        {!isLanding && (
          <header className="topbar">
            <NavLink to="/dashboard" className="mobile-topbar-brand" aria-label="NEXT REPS Dashboard">
              <Activity color="#C5FE00" size={22} />
              <span>
                <strong>NEXT REPS</strong>
                <small>{t(pageTitleKey)}</small>
              </span>
            </NavLink>
            {renderSearchBar('desktop-search-bar')}
            
            <div className="topbar-actions">
              <div className="lang-selector" ref={langRef} onClick={() => setLangOpen(!langOpen)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={18} /> {lang.toUpperCase()}
                </div>
                <div className={`lang-dropdown ${langOpen ? 'open' : ''}`}>
                  <div onClick={(e) => { e.stopPropagation(); setLang('en'); setLangOpen(false); }} className={lang === 'en' ? 'active' : ''}>EN</div>
                  <div onClick={(e) => { e.stopPropagation(); setLang('de'); setLangOpen(false); }} className={lang === 'de' ? 'active' : ''}>DE</div>
                </div>
              </div>
              {renderSearchBar('mobile-search-bar')}
              <div className="alerts-selector" ref={alertsRef}>
                <button
                  className={`topbar-icon-button ${alertsOpen ? 'active' : ''}`}
                  type="button"
                  aria-label={t('ALERTS')}
                  aria-expanded={alertsOpen}
                  onClick={() => setAlertsOpen((open) => !open)}
                >
                  <Bell size={20} />
                </button>
                <div className={`alerts-dropdown ${alertsOpen ? 'open' : ''}`}>
                  <div className="alerts-dropdown-header">{t('ALERT SETTINGS')}</div>
                  <button
                    className="alerts-dropdown-row"
                    type="button"
                    onClick={() => setWorkoutRemindersEnabled((enabled) => !enabled)}
                  >
                    <span>
                      <strong>{t('WORKOUT REMINDERS')}</strong>
                      <small>{t('DAILY SESSION PROMPTS')}</small>
                    </span>
                    <span className={`topbar-mini-toggle ${workoutRemindersEnabled ? 'active' : ''}`}></span>
                  </button>
                  <button
                    className="alerts-dropdown-row"
                    type="button"
                    onClick={() => setHydrationAlertsEnabled((enabled) => !enabled)}
                  >
                    <span>
                      <strong>{t('HYDRATION ALERTS')}</strong>
                      <small>{t('WATER INTAKE TRACKING')}</small>
                    </span>
                    <span className={`topbar-mini-toggle ${hydrationAlertsEnabled ? 'active' : ''}`}></span>
                  </button>
                </div>
              </div>
              
              <NavLink to="/profile" style={{ textDecoration: 'none' }}>
                <div className="user-profile" style={{ cursor: 'pointer' }}>
                  <div className="user-info">
                    <span className="user-role">{t('Member')}</span>
                    <span className="user-name">{userDisplayName}</span>
                  </div>
                  <div
                    className={`user-avatar ${currentUser?.profileImage ? 'has-image' : ''}`}
                    style={currentUser?.profileImage ? { backgroundImage: `url(${currentUser.profileImage})` } : undefined}
                  >
                    {!currentUser?.profileImage && userInitials}
                  </div>
                </div>
              </NavLink>
            </div>
          </header>
        )}

        {quickLogOpen && (
          <div
            className="quick-log-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setQuickLogOpen(false);
            }}
          >
            <section className="quick-log-panel" role="dialog" aria-modal="true" aria-labelledby="quick-log-title">
              <button className="quick-log-close" type="button" onClick={() => setQuickLogOpen(false)} aria-label={t('Close quick log')}>
                <X size={17} />
              </button>
              <div className="quick-log-header">
                <span>{t('QUICK LOG')}</span>
                <h2 id="quick-log-title">{t('TRACK IT FAST')}</h2>
                <p>{t('Add water or steps in one tap. Small updates keep your day accurate.')}</p>
              </div>

              <div className="quick-log-tabs">
                <button type="button" className={quickLogTab === 'water' ? 'active' : ''} onClick={() => { setQuickLogTab('water'); setQuickLogCustomValue(''); setQuickLogStatus(''); }}>
                  <Droplets size={16} /> {t('WATER')}
                </button>
                <button type="button" className={quickLogTab === 'steps' ? 'active' : ''} onClick={() => { setQuickLogTab('steps'); setQuickLogCustomValue(''); setQuickLogStatus(''); }}>
                  <Activity size={16} /> {t('STEPS')}
                </button>
              </div>

              <div className="quick-log-progress-grid">
                <div>
                  <small>{t('WATER TODAY')}</small>
                  <strong>{(visibleWaterMl / 1000).toFixed(2)}L</strong>
                  <span>{visibleWaterProgress}% / {(waterGoalMl / 1000).toFixed(1)}L</span>
                </div>
                <div>
                  <small>{t('STEPS TODAY')}</small>
                  <strong>{visibleSteps.toLocaleString()}</strong>
                  <span>{visibleStepsProgress}% / {stepGoal.toLocaleString()}</span>
                </div>
              </div>

              <label className="quick-log-current">
                <span>{quickLogTab === 'water' ? t('TODAY WATER') : t('TODAY STEPS')}</span>
                <div>
                  <input
                    type="number"
                    min="0"
                    value={quickLogTab === 'water' ? draftWaterMl : draftSteps}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (quickLogTab === 'water') {
                        setDraftWaterMl(Math.max(0, Math.min(20000, Math.round(value || 0))));
                      } else {
                        setDraftSteps(Math.max(0, Math.min(200000, Math.round(value || 0))));
                      }
                      setQuickLogStatus(t('Ready to save.'));
                    }}
                  />
                  <small>{quickLogTab === 'water' ? 'ML' : t('STEPS')}</small>
                </div>
              </label>

              <div className="quick-log-presets">
                {(quickLogTab === 'water' ? waterQuickAdds : stepQuickAdds).map((amount) => (
                  <button
                    type="button"
                    key={amount}
                    onClick={() => addQuickLogValue(amount)}
                    disabled={isQuickLogSaving}
                  >
                    +{quickLogTab === 'water' ? `${amount} ml` : amount.toLocaleString()}
                  </button>
                ))}
              </div>

              <label className="quick-log-custom">
                <span>{quickLogTab === 'water' ? t('CUSTOM WATER') : t('CUSTOM STEPS')}</span>
                <div>
                  <input
                    type="number"
                    min="1"
                    value={quickLogCustomValue}
                    onChange={(event) => setQuickLogCustomValue(event.target.value)}
                    placeholder={quickLogTab === 'water' ? '350' : '1200'}
                  />
                  <small>{quickLogTab === 'water' ? 'ML' : t('STEPS')}</small>
                  <button type="button" onClick={() => addQuickLogValue(quickLogCustomValue)} disabled={isQuickLogSaving || !quickLogCustomValue}>
                    {t('ADD')}
                  </button>
                </div>
              </label>

              {quickLogTab === 'steps' && (
                <div className="quick-log-footnote">
                  <Flame size={14} /> {t('Estimated from steps')}: {visibleStepCalories} kcal
                </div>
              )}

              <div className="quick-log-actions">
                <button
                  className="quick-log-reset-button"
                  type="button"
                  onClick={() => {
                    setDraftWaterMl(waterIntakeMl);
                    setDraftSteps(stepsToday);
                    setQuickLogCustomValue('');
                    setQuickLogStatus(t('Changes reset.'));
                  }}
                  disabled={isQuickLogSaving}
                >
                  {t('RESET')}
                </button>
                <button className="quick-log-save-button" type="button" onClick={saveQuickLog} disabled={isQuickLogSaving}>
                  {isQuickLogSaving ? t('SAVING') : t('SAVE LOG')}
                </button>
              </div>

              {quickLogStatus && (
                <div className={`quick-log-status ${quickLogStatus.includes('Could') ? 'error' : ''}`}>
                  {quickLogStatus}
                </div>
              )}
            </section>
          </div>
        )}

        <main className={`main-content ${isLanding ? 'main-content--landing' : ''}`}>
          <Routes>
            <Route path="/" element={<><Landing /><Dashboard currentUser={currentUser} dailyActivity={dailyActivity} onOpenQuickLog={openQuickLog} /></>} />
            <Route path="/dashboard" element={<Dashboard currentUser={currentUser} dailyActivity={dailyActivity} onOpenQuickLog={openQuickLog} />} />
            <Route path="/workouts" element={<Workouts currentUser={currentUser} />} />
            <Route path="/start-workout" element={<WorkoutLogger currentUser={currentUser} />} />
            <Route path="/analytics" element={<Analytics currentUser={currentUser} />} />
            <Route path="/settings" element={<Profile currentUser={currentUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="/profile" element={<Profile currentUser={currentUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />} />
            <Route path="/support" element={<Support />} />
            <Route path="/about" element={<About />} />
          </Routes>
          
          {/* Global Footer */}
          <footer className="global-footer">
            <div className="footer-links">
              <div className="footer-link-row">
                <NavLink to="/impressum" className="footer-link">{t('IMPRESSUM')}</NavLink>
                <NavLink to="/datenschutz" className="footer-link">{t('DATENSCHUTZ')}</NavLink>
              </div>
              <div className="footer-link-row">
                <NavLink to="/about" className="footer-link">{t('About Us')}</NavLink>
                <NavLink to="/support" className="footer-link">{t('Support')}</NavLink>
              </div>
            </div>
            <div className="footer-copyright">
              © 2026 NEXT REPS PERFORMANCE SYSTEMS. ALL RIGHTS RESERVED.
            </div>
          </footer>
        </main>
      </div>
      {activeReminder && (
        <div className="app-reminder-toast" role="status" aria-live="polite">
          <div className="app-reminder-icon">
            {activeReminder.type === 'workout' ? <Bell size={20} /> : <Droplets size={20} />}
          </div>
          <div className="app-reminder-content">
            <span>{activeReminder.meta}</span>
            <h3>{activeReminder.title}</h3>
            <p>{activeReminder.message}</p>
          </div>
          <button type="button" onClick={() => setActiveReminder(null)} aria-label={t('Dismiss reminder')}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}
