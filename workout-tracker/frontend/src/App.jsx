import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Activity, LayoutDashboard, NotebookPen, LineChart } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import PlansDirectory from './pages/PlansDirectory';
import WorkoutLogger from './pages/WorkoutLogger';
import ProgressView from './pages/ProgressView';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <Activity color="#ec4899" size={28} />
            <span>FitOrbit</span>
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
