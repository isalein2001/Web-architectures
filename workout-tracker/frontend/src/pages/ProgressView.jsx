import { useState, useEffect } from 'react';
import { api } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

export default function ProgressView() {
  const [exerciseQuery, setExerciseQuery] = useState('Bench Press');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProgress = async () => {
    if (!exerciseQuery) return;
    setLoading(true);
    try {
      const logs = await api.getProgress(exerciseQuery);
      
      const grouped = {};
      logs.forEach(log => {
        const dateStr = log.date.split('T')[0];
        if (!grouped[dateStr]) grouped[dateStr] = { dateStr, maxWeight: 0, maxReps: 0 };
        if (log.weight > grouped[dateStr].maxWeight) grouped[dateStr].maxWeight = log.weight;
        if (log.reps > grouped[dateStr].maxReps) grouped[dateStr].maxReps = log.reps;
      });

      const formattedData = Object.values(grouped).sort((a,b) => new Date(a.dateStr) - new Date(b.dateStr)).map(d => ({
        ...d,
        displayDate: format(parseISO(d.dateStr), 'MMM dd')
      }));
      
      setData(formattedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  return (
    <div className="progress-view">
      <header className="page-header">
        <div>
          <h1 className="page-title">Progress Tracking</h1>
          <p style={{color: 'var(--text-secondary)'}}>Visualize your gains over time</p>
        </div>
      </header>

      <div className="card" style={{marginBottom: '2rem'}}>
        <div style={{display: 'flex', gap: '1rem'}}>
          <input 
            className="input" 
            style={{flex: 1}} 
            value={exerciseQuery} 
            onChange={e => setExerciseQuery(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && fetchProgress()}
            placeholder="Search exercise (e.g. Squat)" 
          />
          <button className="btn btn-primary" onClick={fetchProgress}>Analyze</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{fontSize: '1.25rem', marginBottom: '1.5rem'}}>Development over time</h3>
        
        {loading ? (
          <p style={{color: 'var(--text-secondary)'}}>Loading data...</p>
        ) : data.length === 0 ? (
          <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)'}}>
            No data found for "{exerciseQuery}". Try logging some workouts first!
          </div>
        ) : (
          <div style={{height: '400px', width: '100%'}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="displayDate" stroke="var(--text-secondary)" />
                <YAxis yAxisId="left" stroke="var(--text-secondary)" />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="maxWeight" name="Max Weight" stroke="var(--accent-primary)" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line yAxisId="right" type="monotone" dataKey="maxReps" name="Max Reps" stroke="var(--accent-secondary)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
