import { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Dumbbell, Save } from 'lucide-react';

export default function PlansDirectory() {
  const [plans, setPlans] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', description: '', exercises: [] });
  const [exerciseInput, setExerciseInput] = useState({ exercise_name: '', target_sets: 3, target_reps: '10' });

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const data = await api.getPlans();
      setPlans(data);
    } catch (err) {
      console.error(err);
    }
  }

  const addExercise = () => {
    if (!exerciseInput.exercise_name) return;
    setNewPlan({
      ...newPlan,
      exercises: [...newPlan.exercises, exerciseInput]
    });
    setExerciseInput({ exercise_name: '', target_sets: 3, target_reps: '10' });
  };

  const savePlan = async () => {
    if (!newPlan.name) return;
    try {
      await api.createPlan(newPlan);
      setShowCreate(false);
      setNewPlan({ name: '', description: '', exercises: [] });
      loadPlans();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="plans-directory">
      <header className="page-header">
        <div>
          <h1 className="page-title">Workout Plans</h1>
          <p style={{color: 'var(--text-secondary)'}}>Manage your routines</p>
        </div>
        {!showCreate && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={18} /> New Plan
          </button>
        )}
      </header>

      {showCreate && (
        <div className="card" style={{marginBottom: '2rem'}}>
          <h2 style={{fontSize: '1.25rem', marginBottom: '1.5rem'}}>Create New Plan</h2>
          
          <div className="grid grid-cols-2" style={{marginBottom: '1.5rem'}}>
            <div>
              <label>Plan Name</label>
              <input className="input" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} placeholder="e.g. Push Day" />
            </div>
            <div>
              <label>Description</label>
              <input className="input" value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} placeholder="Optional description" />
            </div>
          </div>

          <div style={{background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem'}}>
            <h3 style={{fontSize: '1rem', marginBottom: '1rem'}}>Exercises</h3>
            
            {newPlan.exercises.map((ex, idx) => (
              <div key={idx} style={{display: 'flex', gap: '1rem', marginBottom: '0.5rem', alignItems: 'center'}}>
                <Dumbbell size={16} color="var(--text-secondary)" />
                <span style={{flex: 1}}>{ex.exercise_name}</span>
                <span style={{color: 'var(--text-secondary)'}}>{ex.target_sets} sets x {ex.target_reps} reps</span>
              </div>
            ))}

            <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
              <input className="input" style={{flex: 2}} placeholder="Exercise Name" value={exerciseInput.exercise_name} onChange={e => setExerciseInput({...exerciseInput, exercise_name: e.target.value})} />
              <input className="input" style={{flex: 1}} type="number" placeholder="Sets" value={exerciseInput.target_sets} onChange={e => setExerciseInput({...exerciseInput, target_sets: Number(e.target.value)})} />
              <input className="input" style={{flex: 1}} placeholder="Reps (e.g. 8-12)" value={exerciseInput.target_reps} onChange={e => setExerciseInput({...exerciseInput, target_reps: e.target.value})} />
              <button className="btn btn-secondary" onClick={addExercise}>Add</button>
            </div>
          </div>

          <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={savePlan}><Save size={18} /> Save Plan</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2">
        {plans.map(plan => (
          <div key={plan.id} className="card">
            <h3 style={{fontSize: '1.25rem', fontWeight: 'bold'}}>{plan.name}</h3>
            {plan.description && <p style={{color: 'var(--text-secondary)', marginBottom: '1rem'}}>{plan.description}</p>}
            
            <div style={{marginTop: '1.5rem'}}>
              <h4 style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Exercises</h4>
              <ul style={{listStyle: 'none', padding: 0}}>
                {plan.exercises?.map(ex => (
                  <li key={ex.id} style={{display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)'}}>
                    <span>{ex.exercise_name}</span>
                    <span style={{color: 'var(--text-secondary)'}}>{ex.target_sets}x{ex.target_reps}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
