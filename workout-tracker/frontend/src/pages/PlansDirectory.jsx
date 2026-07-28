import { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Dumbbell, Save } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function PlansDirectory() {
  const { t } = useLanguage();
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
          <h1 className="page-title">{t('Workout Plans')}</h1>
          <p style={{color: 'var(--text-secondary)'}}>{t('Manage your routines')}</p>
        </div>
        {!showCreate && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={18} /> {t('New Plan')}
          </button>
        )}
      </header>

      {showCreate && (
        <div className="card" style={{marginBottom: 'var(--space-6)'}}>
          <h2 style={{fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-5)'}}>{t('Create New Plan')}</h2>
          
          <div className="grid grid-cols-2" style={{marginBottom: 'var(--space-5)'}}>
            <div>
              <label>{t('Plan Name')}</label>
              <input className="input" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} placeholder={t('e.g. Push Day')} />
            </div>
            <div>
              <label>{t('Description')}</label>
              <input className="input" value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} placeholder={t('Optional description')} />
            </div>
          </div>

          <div style={{background: 'rgb(var(--color-black-rgb) / var(--opacity-0-2))', padding: 'var(--space-5)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)'}}>
            <h3 style={{fontSize: 'var(--font-size-base)', marginBottom: 'var(--space-4)'}}>{t('Exercises')}</h3>
            
            {newPlan.exercises.map((ex, idx) => (
              <div key={idx} style={{display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-2)', alignItems: 'center'}}>
                <Dumbbell size={16} color="var(--text-secondary)" />
                <span style={{flex: 1}}>{ex.exercise_name}</span>
                <span style={{color: 'var(--text-secondary)'}}>{ex.target_sets} {t('sets x')} {ex.target_reps} {t('reps')}</span>
              </div>
            ))}

            <div style={{display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)'}}>
              <input className="input" style={{flex: 2}} placeholder={t('Exercise Name...')} value={exerciseInput.exercise_name} onChange={e => setExerciseInput({...exerciseInput, exercise_name: e.target.value})} />
              <input className="input" style={{flex: 1}} type="number" placeholder={t('Sets')} value={exerciseInput.target_sets} onChange={e => setExerciseInput({...exerciseInput, target_sets: Number(e.target.value)})} />
              <input className="input" style={{flex: 1}} placeholder={t('Reps (e.g. 8-12)')} value={exerciseInput.target_reps} onChange={e => setExerciseInput({...exerciseInput, target_reps: e.target.value})} />
              <button className="btn btn-secondary" onClick={addExercise}>{t('Add')}</button>
            </div>
          </div>

          <div style={{display: 'flex', gap: 'var(--space-4)', justifyContent: 'flex-end'}}>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>{t('Cancel')}</button>
            <button className="btn btn-primary" onClick={savePlan}><Save size={18} /> {t('Save Plan')}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2">
        {plans.map(plan => (
          <div key={plan.id} className="card">
            <h3 style={{fontSize: 'var(--font-size-xl)', fontWeight: 'bold'}}>{plan.name}</h3>
            {plan.description && <p style={{color: 'var(--text-secondary)', marginBottom: 'var(--space-4)'}}>{plan.description}</p>}
            
            <div style={{marginTop: 'var(--space-5)'}}>
              <h4 style={{fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>{t('Exercises')}</h4>
              <ul style={{listStyle: 'none', padding: 0}}>
                {plan.exercises?.map(ex => (
                  <li key={ex.id} style={{display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: 'var(--size-1) solid var(--border-color)'}}>
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
