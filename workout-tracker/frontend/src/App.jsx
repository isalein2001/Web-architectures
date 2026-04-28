import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { Activity, LayoutDashboard, NotebookPen, LineChart, Search, Globe, Bell, Info, LifeBuoy } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Workouts from "./pages/Workouts";
import Analytics from "./pages/Analytics";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import Profile from "./pages/Profile";
import Landing from "./pages/Landing";
import "./index.css";
import "./App.css";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "./context/LanguageContext";

function AppLayout() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const { t, lang, setLang } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <aside className="sidebar">
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
          <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <LineChart size={20} /> {t('Analytics')}
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <Activity size={20} /> {t('Settings')}
          </NavLink>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Info size={20} /> {t('About Us')}
            </NavLink>
            <NavLink to="/support" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <LifeBuoy size={20} /> {t('Support')}
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="workout-btn">{t('START WORKOUT')}</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-area">
        {/* Top Bar */}
        <header className="topbar">
          <div className="search-bar">
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
            <Bell size={20} color="#ADAAAA" style={{ cursor: 'pointer' }} />
            
            <NavLink to="/profile" style={{ textDecoration: 'none' }}>
              <div className="user-profile" style={{ cursor: 'pointer' }}>
                <div className="user-info">
                  <span className="user-role">{t('Member')}</span>
                  <span className="user-name">Jonas Arnold</span>
                </div>
                <div className="user-avatar"></div>
              </div>
            </NavLink>
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<><Landing /><Dashboard /></>} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/workouts" element={<Workouts />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
          
          {/* Global Footer */}
          <footer className="global-footer">
            <div className="footer-links">
              <NavLink to="/impressum" className="footer-link">{t('IMPRESSUM')}</NavLink>
              <NavLink to="/datenschutz" className="footer-link">{t('DATENSCHUTZ')}</NavLink>
            </div>
            <div className="footer-copyright">
              © 2026 PROGYM PERFORMANCE SYSTEMS. ALL RIGHTS RESERVED.
            </div>
          </footer>
        </main>
      </div>
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
