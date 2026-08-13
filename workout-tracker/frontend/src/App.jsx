import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from "react-router";
import { Activity, LayoutDashboard, NotebookPen, LineChart, Search, Globe, Bell, Droplets, X, Flame, User, PlayCircle, Target, BarChart3, Dumbbell, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Workouts from "./pages/Workouts";
import Analytics from "./pages/Analytics";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import Profile from "./pages/Profile";
import Landing from "./pages/Landing";
import FirstLaunchOnboarding from "./pages/FirstLaunchOnboarding";
import Support from "./pages/Support";
import About from "./pages/About";
import Coach from "./pages/Coach";
import WorkoutLogger from "./pages/WorkoutLogger";
import NotFound from "./pages/NotFound";
import CookieConsent from "./components/CookieConsent";
import { Login, Onboarding, Register, VerifyEmail } from "./features/auth";
import { api, isNativeApp } from "./api";
import { hasCompletedFirstLaunchOnboarding } from "./firstLaunchOnboardingStorage";
import { getUserDisplayName, getUserInitials, getUserStorageKey } from "./userStorage";
import "./index.css";
import "./App.css";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "./context/LanguageContext";
import { initSyncManager } from "./workoutSync";
import { autoSyncAppleHealthActivity, getTodayHealthDateKey, hasAppleHealthConnection } from "./healthKit";
import { cancelNativeHydrationReminders, scheduleNativeHydrationReminders } from "./hydrationReminders";

const HYDRATION_REMINDER_INTERVAL_MS = 2 * 60 * 60 * 1000;
const WORKOUT_REMINDER_TIME = { hour: 18, minute: 0 };
const APPLE_HEALTH_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

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

const getNextLocalMidnightDelay = () => {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  nextMidnight.setHours(0, 0, 2, 0);
  return nextMidnight.getTime() - now.getTime();
};

const triggerLocalTestNotification = async () => {
  if (!('Notification' in window)) {
    console.warn('[PUSH-TEST] Notifications are not supported in this browser.');
    return { ok: false, reason: 'unsupported' };
  }

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();

  if (permission !== 'granted') {
    console.warn('[PUSH-TEST] Notification permission not granted.');
    return { ok: false, reason: permission };
  }

  new Notification('NEXT REPS Test', {
    body: 'Dies ist eine Test-Benachrichtigung für iOS.',
    icon: '/favicon.png?v=4',
    badge: '/favicon.png?v=4',
    tag: 'nextreps-test',
  });

  return { ok: true, reason: 'granted' };
};

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  const isVerificationPage = location.pathname === "/verify-email";
  const isOnboardingPage = location.pathname === "/onboarding";
  const isRootPath = location.pathname === "/";
  const isLanding = isRootPath && !isNativeApp;
  const isPublicLegalPage = !isNativeApp && ["/datenschutz", "/impressum"].includes(location.pathname);
  const shouldPreviewLoader = import.meta.env.DEV
    && new URLSearchParams(location.search).has('previewLoader');
  const canShowLogin = location.pathname === "/login" && (isNativeApp || location.state?.loginIntent === true);
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
  const [hasSeenFirstLaunch, setHasSeenFirstLaunch] = useState(() => (
    isNativeApp && hasCompletedFirstLaunchOnboarding()
  ));
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickLogTab, setQuickLogTab] = useState('water');
  const [dailyActivity, setDailyActivity] = useState(null);
  const [quickLogCustomValue, setQuickLogCustomValue] = useState('');
  const [quickLogStatus, setQuickLogStatus] = useState('');
  const [isQuickLogSaving, setIsQuickLogSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPlans, setSearchPlans] = useState([]);
  const langRef = useRef(null);
  const alertsRef = useRef(null);
  const activeHealthDateKeyRef = useRef(getTodayHealthDateKey());
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
  const showPushDebugButton = !isNativeApp && (import.meta.env.DEV || window.location.search.includes('debug=push'));
  const hydrationAlertsStorageKey = getUserStorageKey('hydrationAlertsEnabled', currentUser);
  const waterIntakeMl = dailyActivity?.water_intake_ml || 0;
  const waterGoalMl = dailyActivity?.water_goal_ml || Math.round((currentUser?.hydrationGoalLiters || 3) * 1000);
  const stepsToday = dailyActivity?.steps || 0;
  const stepGoal = dailyActivity?.step_goal || 10000;
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
    navigate('/', { replace: true });
  };

  const handleUserUpdate = (nextUser) => {
    setCurrentUser((current) => ({
      ...(current || {}),
      ...nextUser,
      profileImage: Object.prototype.hasOwnProperty.call(nextUser, 'profileImage')
        ? nextUser.profileImage
        : current?.profileImage,
    }));
  };

  const handlePushTest = async () => {
    try {
      if (api.testPushNotification) {
        await api.testPushNotification();
        return;
      }
      await triggerLocalTestNotification();
    } catch (error) {
      console.error('[PUSH-TEST] Could not trigger test notification:', error);
      await triggerLocalTestNotification().catch(() => null);
    }
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
      <Search size={18} color="var(--color-text-muted)" />
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
    setQuickLogOpen(true);
  }

  const logQuickAddition = async (type, amount) => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    setIsQuickLogSaving(true);
    setQuickLogStatus('');
    try {
      const activity = await api.updateTodayActivity({
        water_intake_ml: type === 'water'
          ? Math.min(20000, waterIntakeMl + Math.round(parsedAmount))
          : waterIntakeMl,
        steps: type === 'steps'
          ? Math.min(200000, stepsToday + Math.round(parsedAmount))
          : stepsToday,
      });
      setDailyActivity(activity);
      setQuickLogCustomValue('');
      setQuickLogStatus('✓ Logged');
      window.dispatchEvent(new CustomEvent('daily-activity-change', { detail: activity }));
      window.setTimeout(() => setQuickLogStatus(''), 1800);
    } catch (error) {
      console.error(error);
      setQuickLogStatus(t('Could not save. Please try again.'));
    } finally {
      setIsQuickLogSaving(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const loadCurrentUser = async () => {
      try {
        const data = await api.getCurrentUser();
        const user = data.user;
        if (!user?.id) {
          if (!isCancelled) setCurrentUser(user);
          return;
        }

        const profileImageData = await api.getCurrentUserProfileImage().catch(() => null);
        if (isCancelled) return;

        setCurrentUser({
          ...user,
          profileImage: profileImageData?.profileImage || null,
        });
      } catch {
        if (!isCancelled) setCurrentUser(null);
      } finally {
        if (!isCancelled) setIsAuthLoading(false);
      }
    };

    void loadCurrentUser();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.id || Object.prototype.hasOwnProperty.call(currentUser, 'profileImage')) return undefined;

    let isCancelled = false;
    api.getCurrentUserProfileImage()
      .then((data) => {
        if (isCancelled) return;
        setCurrentUser((user) => (
          user?.id === currentUser.id
            ? { ...user, profileImage: data.profileImage || null }
            : user
        ));
      })
      .catch(() => {
        if (isCancelled) return;
        setCurrentUser((user) => (
          user?.id === currentUser.id
            ? { ...user, profileImage: null }
            : user
        ));
      });

    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    initSyncManager(currentUser?.id ? currentUser : null);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    setWorkoutRemindersEnabled(window.localStorage.getItem(workoutRemindersStorageKey) !== 'false');
    setHydrationAlertsEnabled(window.localStorage.getItem(hydrationAlertsStorageKey) !== 'false');
  }, [currentUser?.id, workoutRemindersStorageKey, hydrationAlertsStorageKey]);

  useEffect(() => {
    if (!currentUser?.id || !currentUser.emailVerified || !currentUser.onboardingCompleted) return undefined;

    const syncAppleHealthIfConnected = async (reason) => {
      if (!hasAppleHealthConnection(currentUser)) return;

      try {
        const result = await autoSyncAppleHealthActivity(currentUser, reason);
        if (result?.activity) {
          setDailyActivity(result.activity);
        }
      } catch (error) {
        console.error('[APPLE HEALTH] Auto sync failed:', error);
      }
    };

    const refreshToday = async (reason) => {
      const currentDateKey = getTodayHealthDateKey();
      if (activeHealthDateKeyRef.current !== currentDateKey) {
        activeHealthDateKeyRef.current = currentDateKey;
        setDailyActivity(null);
      }

      await refreshDailyActivity();
      await syncAppleHealthIfConnected(reason);
    };

    refreshToday('app-start').catch(console.error);
    api.getPlans().then(setSearchPlans).catch(() => setSearchPlans([]));

    const handleFocus = () => {
      refreshToday('app-focus').catch(console.error);
      api.getPlans().then(setSearchPlans).catch(() => null);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };
    const handleOpenQuickLog = (event) => openQuickLog(event.detail?.tab || 'water');
    const handleDailyActivityChange = (event) => {
      if (event.detail) setDailyActivity(event.detail);
    };
    const refreshInterval = window.setInterval(() => {
      refreshToday('active-interval').catch(console.error);
    }, APPLE_HEALTH_REFRESH_INTERVAL_MS);
    let midnightTimer = null;
    const scheduleMidnightRefresh = () => {
      midnightTimer = window.setTimeout(() => {
        refreshToday('midnight-rollover').catch(console.error).finally(scheduleMidnightRefresh);
      }, getNextLocalMidnightDelay());
    };
    scheduleMidnightRefresh();

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('open-quick-log', handleOpenQuickLog);
    window.addEventListener('daily-activity-change', handleDailyActivityChange);
    return () => {
      window.clearInterval(refreshInterval);
      window.clearTimeout(midnightTimer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('open-quick-log', handleOpenQuickLog);
      window.removeEventListener('daily-activity-change', handleDailyActivityChange);
    };
  }, [currentUser?.id, currentUser?.emailVerified, currentUser?.onboardingCompleted]);

  useEffect(() => {
    if (!currentUser?.id || !currentUser.emailVerified || !currentUser.onboardingCompleted) return;
    if (isNativeApp) return;
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

    let hydrationReminderTimeout;

    const scheduleHydrationReminder = () => {
      hydrationReminderTimeout = window.setTimeout(() => {
        setActiveReminder({
          id: `hydration-${Date.now()}`,
          type: 'hydration',
          title: t('HYDRATION REMINDER'),
          message: t('Time to drink water. Keep your daily target on track.'),
          meta: t('Every 2 hours'),
        });
        scheduleHydrationReminder();
      }, HYDRATION_REMINDER_INTERVAL_MS);
    };

    scheduleHydrationReminder();

    return () => window.clearTimeout(hydrationReminderTimeout);
  }, [hydrationAlertsEnabled, t]);

  useEffect(() => {
    if (hydrationAlertsEnabled) {
      scheduleNativeHydrationReminders({
        title: t('HYDRATION REMINDER'),
        message: t('Time to drink water. Keep your daily target on track.'),
      }).catch((error) => {
        console.error('[NOTIFICATIONS] Could not schedule hydration reminders:', error);
      });
      return undefined;
    }

    cancelNativeHydrationReminders().catch((error) => {
      console.error('[NOTIFICATIONS] Could not cancel hydration reminders:', error);
    });
    return undefined;
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
    const tokenStyles = getComputedStyle(document.documentElement);
    const cursorCenterOffset = Number.parseFloat(tokenStyles.getPropertyValue('--size-10')) || 10;
    
    const animate = () => {
      cursorX += (mouseX - cursorX) * 0.2;
      cursorY += (mouseY - cursorY) * 0.2;
      
      const isHovering = cursor.classList.contains('hover-active');
      const scale = isHovering ? 'scale(0.85)' : 'scale(1)';
      
      cursor.style.transform = `translate3d(${cursorX - cursorCenterOffset}px, ${cursorY - cursorCenterOffset}px, 0) ${scale}`;
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

  if (isNativeApp && isRootPath && !hasSeenFirstLaunch) {
    return (
      <Routes>
        <Route path="/" element={<FirstLaunchOnboarding onComplete={() => setHasSeenFirstLaunch(true)} />} />
      </Routes>
    );
  }

  if (isLanding || isPublicLegalPage) {
    return (
      <Routes>
        <Route path="/" element={<Landing currentUser={currentUser} />} />
        <Route
          path="/datenschutz"
          element={<div className="public-legal-page"><Datenschutz /></div>}
        />
        <Route
          path="/impressum"
          element={<div className="public-legal-page"><Impressum /></div>}
        />
      </Routes>
    );
  }

  if (isAuthLoading || shouldPreviewLoader) {
    return (
      <div className="app-loading-page" role="status" aria-live="polite">
        <section className="app-loading-card">
          <div className="app-loading-mark" aria-hidden="true">
            <span className="app-loading-ring" />
            <Dumbbell size={30} strokeWidth={1.8} />
          </div>
          <span className="app-loading-kicker">NEXT REPS</span>
          <h1>{t('Loading')}</h1>
          <p>{t('Checking your session.')}</p>
          <span className="app-loading-progress" aria-hidden="true">
            <i />
          </span>
        </section>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route
          path="/login"
          element={canShowLogin ? <Login onLogin={setCurrentUser} /> : <Navigate to="/" replace />}
        />
        <Route path="/register" element={<Register onLogin={setCurrentUser} />} />
        <Route path="/" element={isNativeApp ? <Navigate to="/login" replace /> : <Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
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
    <div className={`app-container app-container--${isNativeApp ? 'app' : 'web'} ${isLanding ? 'app-container--landing' : ''}`}>
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <NavLink 
            to={isNativeApp ? "/dashboard" : "/"} 
            style={{ textDecoration: 'none' }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="sidebar-logo">
              <img src="/nextreps-logo.svg" alt="NEXT REPS" />
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
              <img src="/nextreps-logo.svg" alt="NEXT REPS" />
              <span>
                <small>{t(pageTitleKey)}</small>
              </span>
            </NavLink>
            {renderSearchBar('desktop-search-bar')}
            
            <div className="topbar-actions">
              <div className="lang-selector" ref={langRef} onClick={() => setLangOpen(!langOpen)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Globe size={18} /> {lang.toUpperCase()}
                </div>
                <div className={`lang-dropdown ${langOpen ? 'open' : ''}`}>
                  <div onClick={(e) => { e.stopPropagation(); setLang('en'); setLangOpen(false); }} className={lang === 'en' ? 'active' : ''}>EN</div>
                  <div onClick={(e) => { e.stopPropagation(); setLang('de'); setLangOpen(false); }} className={lang === 'de' ? 'active' : ''}>DE</div>
                </div>
              </div>
              {renderSearchBar('mobile-search-bar')}
              {showPushDebugButton && currentUser && (
                <button
                  className="topbar-icon-button"
                  type="button"
                  aria-label="Test notification"
                  title="Test notification"
                  onClick={handlePushTest}
                >
                  <Bell size={18} />
                </button>
              )}
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

        {currentUser && location.pathname === '/dashboard' && (
          <aside className={`quick-log-floating ${quickLogOpen ? 'is-open' : ''}`} aria-label={t('QUICK LOG')}>
            <button
              className="quick-log-floating-tab"
              type="button"
              onClick={() => quickLogOpen ? setQuickLogOpen(false) : openQuickLog('water')}
              aria-expanded={quickLogOpen}
            >
              {quickLogOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              <Plus size={17} />
              <span>{t('QUICK LOG')}</span>
            </button>
            <section className="quick-log-floating-panel" aria-hidden={!quickLogOpen}>
              <header>
                <div><strong>{t('QUICK LOG')}</strong><small>Track it. Keep moving.</small></div>
                <button type="button" onClick={() => setQuickLogOpen(false)} aria-label={t('Close quick log')}><ChevronRight size={17} /></button>
              </header>

              <div className="quick-log-floating-section">
                <div className="quick-log-floating-section-head">
                  <span><Droplets size={16} /> {t('WATER')}</span>
                  <strong>{(waterIntakeMl / 1000).toFixed(1)} L / {(waterGoalMl / 1000).toFixed(1)} L</strong>
                </div>
                <div className="quick-log-floating-presets">
                  {[250, 500].map((amount) => <button key={amount} type="button" disabled={isQuickLogSaving} onClick={() => logQuickAddition('water', amount)}>+{amount} ml</button>)}
                </div>
                <div className="quick-log-floating-input">
                  <input type="number" min="1" inputMode="numeric" value={quickLogTab === 'water' ? quickLogCustomValue : ''} onFocus={() => { setQuickLogTab('water'); setQuickLogCustomValue(''); }} onChange={(event) => { setQuickLogTab('water'); setQuickLogCustomValue(event.target.value); }} placeholder="Custom ml" />
                  <button type="button" disabled={isQuickLogSaving || quickLogTab !== 'water' || !quickLogCustomValue} onClick={() => logQuickAddition('water', quickLogCustomValue)}>{t('ADD')}</button>
                </div>
              </div>

              <div className="quick-log-floating-section">
                <div className="quick-log-floating-section-head">
                  <span><Activity size={16} /> {t('STEPS')}</span>
                  <strong>{stepsToday.toLocaleString()} / {stepGoal.toLocaleString()}</strong>
                </div>
                <div className="quick-log-floating-presets">
                  {[500, 1000].map((amount) => <button key={amount} type="button" disabled={isQuickLogSaving} onClick={() => logQuickAddition('steps', amount)}>+{amount.toLocaleString()}</button>)}
                </div>
                <div className="quick-log-floating-input">
                  <input type="number" min="1" inputMode="numeric" value={quickLogTab === 'steps' ? quickLogCustomValue : ''} onFocus={() => { setQuickLogTab('steps'); setQuickLogCustomValue(''); }} onChange={(event) => { setQuickLogTab('steps'); setQuickLogCustomValue(event.target.value); }} placeholder="Enter steps" />
                  <button type="button" disabled={isQuickLogSaving || quickLogTab !== 'steps' || !quickLogCustomValue} onClick={() => logQuickAddition('steps', quickLogCustomValue)}>{t('ADD')}</button>
                </div>
              </div>

              {quickLogStatus && <div className={`quick-log-floating-status ${quickLogStatus.includes('Could') ? 'error' : ''}`}>{quickLogStatus}</div>}
            </section>
          </aside>
        )}

        <main className={`main-content ${isLanding ? 'main-content--landing' : ''}`}>
          <Routes>
            <Route path="/" element={isNativeApp ? <Navigate to="/dashboard" replace /> : <Landing currentUser={currentUser} />} />
            <Route path="/dashboard" element={<Dashboard currentUser={currentUser} dailyActivity={dailyActivity} surface={isNativeApp ? 'app' : 'web'} />} />
            <Route path="/workouts" element={<Workouts currentUser={currentUser} />} />
            <Route path="/start-workout" element={<WorkoutLogger currentUser={currentUser} />} />
            <Route path="/analytics" element={<Analytics currentUser={currentUser} />} />
            <Route path="/coach" element={<Coach currentUser={currentUser} />} />
            <Route path="/settings" element={<Profile currentUser={currentUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="/profile" element={<Profile currentUser={currentUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />} />
            <Route path="/support" element={<Support />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound isAuthenticated />} />
          </Routes>
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
      <CookieConsent />
    </Router>
  );
}
