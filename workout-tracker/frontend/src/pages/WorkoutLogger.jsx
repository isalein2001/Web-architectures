import { useState, useEffect } from 'react';
import { api } from '../api';
import { Play, Check, Plus, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WorkoutLogger() {
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [currentExercise, setCurrentExercise] = useState('');
  const [notes, setNotes] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getPlans().then(setPlans).catch(console.error);
  }, []);

  const startPlan = (plan) => {
    setActivePlan(plan);
    let initialLogs = [];
    if (plan.exercises) {
       plan.exercises.forEach(ex => {
         for (let i = 1; i <= ex.target_sets; i++) {
            initialLogs.push({ id: Math.random().toString(), exercise_name: ex.exercise_name, set_number: i, reps: '', weight: '', completed: false });
         }
       });
    }
    setLogs(initialLogs);
  };

  const startFreestyle = () => {
    setActivePlan({ id: null, name: 'Freestyle Workout' });
    setLogs([]);
  };

  const updateLog = (id, field, value) => {
    setLogs(logs.map(log => log.id === id ? { ...log, [field]: value } : log));
  };

  const toggleComplete = (id) => {
    setLogs(logs.map(log => log.id === id ? { ...log, completed: !log.completed } : log));
  };

  const finishWorkout = async () => {
    const completedLogs = logs.filter(l => l.completed).map(l => ({
      exercise_name: l.exercise_name,
      set_number: l.set_number,
      reps: Number(l.reps) || 0,
      weight: Number(l.weight) || 0
    }));

    const sessionData = {
      date: new Date().toISOString(),
      plan_id: activePlan.id,
      notes: notes,
      logs: completedLogs
    };

    try {
      await api.logSession(sessionData);
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  if (!activePlan) {
    return (
      <div className="workout-logger">
        <header className="page-header">
          <div>
            <h1 className="page-title">Start a Workout</h1>
            <p style={{color: 'var(--text-secondary)'}}>Choose a routine or go freestyle</p>
          </div>
        </header>

        <div className="grid grid-cols-3">
          <div className="card" style={{cursor: 'pointer', textAlign: 'center', borderColor: 'var(--accent-primary)'}} onClick={startFreestyle}>
            <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>Freestyle Workout</h3>
            <p style={{color: 'var(--text-secondary)'}}>Log any exercise on the fly.</p>
          </div>
          {plans.map(plan => (
            <div key={plan.id} className="card" style={{cursor: 'pointer'}} onClick={() => startPlan(plan)}>
              <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>{plan.name}</h3>
              <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>{plan.exercises?.length || 0} exercises</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const exercises = [...new Set(logs.map(l => l.exercise_name))];

  return (
    <div className="active-workout">
      <header className="page-header">
        <div>
          <h1 className="page-title">{activePlan.name}</h1>
          <p style={{color: 'var(--text-secondary)'}}>Session in progress</p>
        </div>
        <button className="btn btn-primary" onClick={finishWorkout}>
          <Save size={18} /> Finish Routine
        </button>
      </header>

      {exercises.map(exName => {
        const exLogs = logs.filter(l => l.exercise_name === exName);
        return (
          <div key={exName} className="card" style={{marginBottom: '1.5rem'}}>
            <h3 style={{fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--accent-primary)'}}>{exName}</h3>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
               <div style={{display: 'grid', gridTemplateColumns: '50px 1fr 1fr 60px', gap: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600'}}>
                 <div>Set</div>
                 <div>Weight (kg/lb)</div>
                 <div>Reps</div>
                 <div style={{textAlign: 'center'}}>Done</div>
               </div>

               {exLogs.map(log => (
                 <div key={log.id} style={{display: 'grid', gridTemplateColumns: '50px 1fr 1fr 60px', gap: '1rem', alignItems: 'center', opacity: log.completed ? 0.6 : 1, transition: 'var(--transition)'}}>
                   <div style={{background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center', fontWeight: '500'}}>
                     {log.set_number}
                   </div>
                   <input className="input" type="number" placeholder="Weight" value={log.weight} onChange={e => updateLog(log.id, 'weight', e.target.value)} disabled={log.completed} />
                   <input className="input" type="number" placeholder="Reps" value={log.reps} onChange={e => updateLog(log.id, 'reps', e.target.value)} disabled={log.completed} />
                   <button 
                     onClick={() => toggleComplete(log.id)}
                     style={{
                       background: log.completed ? '#10b981' : 'rgba(255,255,255,0.1)',
                       border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer',
                       display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'var(--transition)'
                     }}>
                     <Check size={20} />
                   </button>
                 </div>
               ))}
            </div>
          </div>
        );
      })}

      <div className="card" style={{marginBottom: '2rem'}}>
        <h3 style={{fontSize: '1.25rem', marginBottom: '1rem'}}>Add Freestyle Exercise</h3>
        <div style={{display: 'flex', gap: '1rem'}}>
          <input className="input" style={{flex: 1}} placeholder="Exercise Name" value={currentExercise} onChange={e => setCurrentExercise(e.target.value)} />
          <button className="btn btn-secondary" onClick={() => {
            if(!currentExercise) return;
            const existingNum = logs.filter(l => l.exercise_name === currentExercise).length;
            setLogs([...logs, { id: Math.random().toString(), exercise_name: currentExercise, set_number: existingNum + 1, reps: '', weight: '', completed: false }]);
          }}>
            <Plus size={18} /> Add Set
          </button>
        </div>
      </div>
      
      <div className="card" style={{marginBottom: '2rem'}}>
        <h3 style={{fontSize: '1.25rem', marginBottom: '1rem'}}>Session Notes</h3>
        <textarea className="input" rows="3" placeholder="How did this workout feel?" value={notes} onChange={e => setNotes(e.target.value)}></textarea>
      </div>

    </div>
  );
}
