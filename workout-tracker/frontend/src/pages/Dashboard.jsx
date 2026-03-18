import { useState, useEffect } from 'react';
import { api } from '../api';
import { Play, Activity, Flame, CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalSessions: 0, sessionDates: [] });
  const [recentSessions, setRecentSessions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const statsData = await api.getStats();
        setStats(statsData);
        
        const sessionsData = await api.getSessions();
        setRecentSessions(sessionsData.slice(0, 5));
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    }
    loadData();
  }, []);

  const calculateStreak = (dates) => {
    if (!dates || dates.length === 0) return 0;
    let streak = 0;
    let current = new Date();
    current.setHours(0,0,0,0);
    
    // Convert dates to YYYY-MM-DD
    const dateStrings = dates.map(d => {
       try { return new Date(d).toISOString().split('T')[0]; }
       catch(e) { return null; }
    }).filter(Boolean);
    
    const uniqueDateStrings = [...new Set(dateStrings)].sort().reverse();
    if(uniqueDateStrings.length === 0) return 0;

    const todayStr = current.toISOString().split('T')[0];
    let yesterday = new Date(current);
    yesterday.setDate(current.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (uniqueDateStrings[0] !== todayStr && uniqueDateStrings[0] !== yesterdayStr) {
      return 0; // Streak broken
    }
    
    let expectedDate = new Date(uniqueDateStrings[0]);
    
    for (const dStr of uniqueDateStrings) {
      if (dStr === expectedDate.toISOString().split('T')[0]) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak(stats.sessionDates);

  return (
    <div className="dashboard">
      <header className="page-header">
        <div>
          <h1 className="page-title">Welcome back, Athlete</h1>
          <p style={{color: 'var(--text-secondary)'}}>Ready to crush your goals today?</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/workout')}>
          <Play size={18} /> Start Workout
        </button>
      </header>

      <div className="grid grid-cols-3" style={{marginBottom: '2rem'}}>
        <div className="card" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{padding: '1rem', background: 'rgba(236,72,153,0.1)', borderRadius: '12px', color: 'var(--accent-secondary)'}}>
            <Flame size={24} />
          </div>
          <div>
            <h3 style={{fontSize: '1.5rem', fontWeight: '700'}}>{streak} Days</h3>
            <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Current Streak</span>
          </div>
        </div>
        
        <div className="card" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{padding: '1rem', background: 'rgba(79,70,229,0.1)', borderRadius: '12px', color: 'var(--accent-primary)'}}>
            <Activity size={24} />
          </div>
          <div>
            <h3 style={{fontSize: '1.5rem', fontWeight: '700'}}>{stats.totalSessions}</h3>
            <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Total Workouts</span>
          </div>
        </div>

        <div className="card" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{padding: '1rem', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', color: '#10b981'}}>
            <CalendarCheck size={24} />
          </div>
          <div>
            <h3 style={{fontSize: '1.5rem', fontWeight: '700'}}>
              {recentSessions.length > 0 ? format(parseISO(recentSessions[0].date), 'MMM d, yyyy') : 'Never'}
            </h3>
            <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Last Workout</span>
          </div>
        </div>
      </div>

      <h2 style={{fontSize: '1.25rem', marginBottom: '1rem', fontWeight: '600'}}>Recent Sessions</h2>
      <div className="grid">
        {recentSessions.length === 0 ? (
           <div className="card" style={{textAlign: 'center', padding: '3rem'}}>
             <p style={{color: 'var(--text-secondary)'}}>No workouts logged yet. Start a session!</p>
           </div>
        ) : recentSessions.map(session => (
          <div key={session.id} className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <h4 style={{fontWeight: '600', fontSize: '1.1rem'}}>{session.plan_name || 'Freestyle Workout'}</h4>
              <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>{format(parseISO(session.date), 'EEEE, MMMM do yyyy')}</p>
              {session.notes && <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem'}}>📝 {session.notes}</p>}
            </div>
            <div style={{textAlign: 'right'}}>
              <div className="badge">{session.logs?.length || 0} Exercises</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
