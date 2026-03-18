import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Activity, LayoutDashboard, NotebookPen, LineChart } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import PlansDirectory from './pages/PlansDirectory';
import WorkoutLogger from './pages/WorkoutLogger';
import ProgressView from './pages/ProgressView';
import './index.css';

import { useEffect } from 'react';

function App() {
    useEffect(() => {
      // Create cursor element
      const cursor = document.createElement('div');
      cursor.id = 'custom-cursor';
      document.body.appendChild(cursor);

      // Hide default cursor
      document.body.style.cursor = 'none';

      // Cursor movement
      let mouseX = 0, mouseY = 0;
      let cursorX = 0, cursorY = 0;
      const animate = () => {
        cursorX += (mouseX - cursorX) * 0.2;
        cursorY += (mouseY - cursorY) * 0.2;
        cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
        requestAnimationFrame(animate);
      };
      animate();

      const moveHandler = e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
      };
      window.addEventListener('mousemove', moveHandler);

      return () => {
        window.removeEventListener('mousemove', moveHandler);
        document.body.style.cursor = '';
        if (cursor) cursor.remove();
      };
    }, []);
  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <Activity color="#C6FF00" size={28} />
            <span>PROGYM</span>
          </div>
          <nav className="nav-links">
            <NavLink to="/" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} /> Dashboard
            </NavLink>
            <NavLink to="/plans" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <NotebookPen size={20} /> Plans
            </NavLink>
            <NavLink to="/workout" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <Activity size={20} /> Active Workout
            </NavLink>
            <NavLink to="/progress" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <LineChart size={20} /> Progress
            </NavLink>
          </nav>
        </aside>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plans" element={<PlansDirectory />} />
            <Route path="/workout" element={<WorkoutLogger />} />
            <Route path="/progress" element={<ProgressView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
