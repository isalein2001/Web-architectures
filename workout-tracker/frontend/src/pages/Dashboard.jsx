import { useState, useEffect } from 'react';
import { api } from '../api';
import { Play, Activity, Flame, CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalSessions: 0, sessionDates: [] });
  const [recentSessions, setRecentSessions] = useState([]);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const navigate = useNavigate();

  const quotes = [
    "This is where discipline becomes identity.",
    "You're not chasing a body - you're building a standard.",
    "Every session is a quiet investment in who you're becoming.",
    "Strength is built in moments no one else sees.",
    "You don't need motivation. You have a vision."
  ];

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 7000);
    return () => clearInterval(quoteInterval);
  }, []);

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
          <h1 className="page-title" style={{fontSize: '2.5rem', textTransform: 'uppercase', fontWeight: '800'}}>Welcome back, Athlete!</h1>
          <p style={{
            color: '#C6FF00',
            fontSize: '1.125rem',
            marginTop: '1rem',
            fontWeight: 300,
            fontFamily: 'Inter, sans-serif'
          }}>Ready to crush your goals today?</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/workout')}>
          <Play size={18} /> Start Workout
        </button>
      </header>

      <div className="grid grid-cols-3" style={{marginBottom: '4rem'}}>
        <div className="card card-glass" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{padding: '1rem', background: '#2a2a2a', borderRadius: '12px', color: '#C6FF00'}}>
            <Flame size={24} />
          </div>
          <div>
            <h3 style={{fontSize: '1.5rem', fontWeight: '700'}}>{streak} Days</h3>
            <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Current Streak</span>
          </div>
        </div>
        
        <div className="card card-glass" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{padding: '1rem', background: '#2a2a2a', borderRadius: '12px', color: '#C6FF00'}}>
            <Activity size={24} />
          </div>
          <div>
            <h3 style={{fontSize: '1.5rem', fontWeight: '700'}}>{stats.totalSessions}</h3>
            <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Total Workouts</span>
          </div>
        </div>

        <div className="card card-glass" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{padding: '1rem', background: '#2a2a2a', borderRadius: '12px', color: '#C6FF00'}}>
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
          <div key={session.id} className="card card-glass" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
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

      <div key={`quote-${quoteIndex}`} style={{
        textAlign: 'center',
        marginBottom: '4rem',
        marginTop: '4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p className="quote-text" style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          lineHeight: '1.8',
          margin: 0,
          background: 'linear-gradient(90deg, #ffffff 0%, #ffffff 75%, #C6FF00 95%, #C6FF00 100%)',
          backgroundSize: '200% 100%',
          backgroundPosition: '100% center',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {quotes[quoteIndex]}
        </p>
      </div>
    </div>
  );
}
