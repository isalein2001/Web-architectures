import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Activity, LayoutDashboard, NotebookPen, LineChart, Search, Globe, Bell, Info, LifeBuoy, Droplets, X } from "lucide-react";
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
                : 'PROGYM';
  const userDisplayName = getUserDisplayName(currentUser);
  const userInitials = getUserInitials(currentUser);
  const workoutRemindersStorageKey = getUserStorageKey('workoutRemindersEnabled', currentUser);
  const hydrationAlertsStorageKey = getUserStorageKey('hydrationAlertsEnabled', currentUser);

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
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setLangOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setAlertsOpen(false);
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
            <span>PROGYM</span>
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
              <span>PROGYM</span>
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
            <NavLink to="/dashboard" className="mobile-topbar-brand" aria-label="PROGYM Dashboard">
              <Activity color="#C5FE00" size={22} />
              <span>
                <strong>PROGYM</strong>
                <small>{t(pageTitleKey)}</small>
              </span>
            </NavLink>
            <div className="search-bar desktop-search-bar">
              <Search size={18} color="#ADAAAA" />
              <input type="text" placeholder={t('SEARCH...')} />
            </div>
            
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
              <div className="search-bar mobile-search-bar" aria-label={t('SEARCH...')}>
                <Search size={18} color="#ADAAAA" />
                <input type="text" placeholder={t('SEARCH...')} />
              </div>
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

        <main className={`main-content ${isLanding ? 'main-content--landing' : ''}`}>
          <Routes>
            <Route path="/" element={<><Landing /><Dashboard /></>} />
            <Route path="/dashboard" element={<Dashboard currentUser={currentUser} />} />
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
              © 2026 PROGYM PERFORMANCE SYSTEMS. ALL RIGHTS RESERVED.
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
