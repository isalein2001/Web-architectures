import React from 'react';
import { Plus, Image as ImageIcon, Play } from 'lucide-react';
import './Workouts.css';

export default function Workouts() {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Workouts <span>& Plans</span></h1>
        <p>Build your custom plan or choose from ready-made templates.</p>
      </div>

      <div className="workouts-grid">
        {/* Build Your Own Plan Section */}
        <div className="custom-plan-card">
          <h2>BUILD YOUR OWN PLAN</h2>
          
          <div className="input-group">
            <label>WORKOUT NAME (E.G. MONDAY OLYMPIC LIFTING)</label>
            <input type="text" placeholder="Workout Name..." />
          </div>

          <div className="input-group">
            <label>WORKOUT COVER IMAGE</label>
            <div className="upload-box">
              <ImageIcon size={32} color="#ADAAAA" />
              <span>UPLOAD COVER PHOTO</span>
              <small>PNG, JPG UP TO 10MB</small>
            </div>
          </div>

          <div className="exercise-list">
            <div className="exercise-item">
              <div className="ex-header">Barbell Back Squat</div>
              <div className="ex-details">
                <div className="ex-stat"><span>SETS</span> 4</div>
                <div className="ex-stat"><span>REPS</span> 8-10</div>
                <div className="ex-stat"><span>REST (S)</span> 90</div>
              </div>
              <div className="ex-notes">NOTES: Focus on depth and explosive upward phase...</div>
            </div>

            <div className="exercise-item new-exercise">
              <input type="text" placeholder="Exercise Name..." className="new-ex-input" />
              <div className="ex-inputs">
                <input type="number" placeholder="SETS" />
                <input type="text" placeholder="REPS" />
                <input type="number" placeholder="REST (S)" />
              </div>
              <input type="text" placeholder="NOTES" className="new-ex-notes" />
              <button className="add-ex-btn"><Plus size={16} /> ADD EXERCISE</button>
            </div>
          </div>

          <button className="workout-btn" style={{marginTop: '2rem'}}>SAVE WORKOUT</button>
        </div>

        {/* Ready Made Plans Section */}
        <div className="ready-plans-section">
          <h2>READY-MADE WORKOUT PLANS</h2>
          <p className="subtitle">Curated high-performance foundations.</p>

          <div className="plan-cards">
            {/* Advanced Plan */}
            <div className="plan-card">
              <div className="plan-badge">ADVANCED PLAN</div>
              <h3>PUSH PULL LEGS</h3>
              <ul className="plan-exercises">
                <li>Chest Press (3x12)</li>
                <li>Incline Bench Press (3x12)</li>
                <li>Shoulder Press (2x15)</li>
                <li className="more-ex">+ 3 MORE EXERCISES</li>
              </ul>
              <button className="start-plan-btn"><Play size={16} /> START WORKOUT</button>
            </div>

            {/* Beginner Fat Loss */}
            <div className="plan-card">
              <div className="plan-badge beginner">BEGINNER PLAN</div>
              <h3>FAT LOSS</h3>
              <ul className="plan-exercises">
                <li>HIIT Intervals (15m)</li>
                <li>Bodyweight Squats (4x20)</li>
                <li>Mountain Climbers (4x30s)</li>
              </ul>
              <button className="start-plan-btn"><Play size={16} /> START WORKOUT</button>
            </div>

            {/* Beginner Full Body */}
            <div className="plan-card">
              <div className="plan-badge beginner">BEGINNER PLAN</div>
              <h3>FULL BODY WORKOUT</h3>
              <ul className="plan-exercises">
                <li>Bench Press (3x12)</li>
                <li>Lat Pulldown (3x12)</li>
                <li>Lateral Raise (4x12)</li>
                <li className="more-ex">+ 4 MORE EXERCISES</li>
              </ul>
              <button className="start-plan-btn"><Play size={16} /> START WORKOUT</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
