import React from 'react';
import { TrendingUp, Calendar, Target, Award } from 'lucide-react';
import './Analytics.css';

export default function Analytics() {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>STRENGTH <span>Insights</span></h1>
        <p>REAL-TIME PERFORMANCE Trend & STRENGTH Progress</p>
      </div>

      <div className="analytics-grid">
        {/* Main Chart Card */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">
              <h2>+14.2%</h2>
              <span>vs last month</span>
            </div>
            <div className="chart-filters">
              <button>1W</button>
              <button className="active">1M</button>
              <button>1Y</button>
            </div>
          </div>
          
          <div className="chart-area">
            {/* Mock chart visualization */}
            <svg viewBox="0 0 400 100" className="mock-chart">
              <path d="M0,80 Q50,90 100,60 T200,40 T300,20 T400,10 L400,100 L0,100 Z" fill="rgba(197, 254, 0, 0.1)" />
              <path d="M0,80 Q50,90 100,60 T200,40 T300,20 T400,10" fill="none" stroke="#C5FE00" strokeWidth="3" />
            </svg>
            <div className="chart-x-axis">
              <span>MAR 15</span>
              <span>APR 01</span>
              <span>APR 15</span>
            </div>
          </div>
        </div>

        {/* Training Schedule */}
        <div className="schedule-card">
          <h2>TRAINING SCHEDULE FOR APRIL 2026</h2>
          <div className="calendar-grid">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="cal-header">{d}</div>
            ))}
            {/* Generate mock days */}
            {Array.from({length: 30}, (_, i) => i + 1).map(day => (
              <div key={day} className={`cal-day ${[2,4,7,9,11,14,16,18,21].includes(day) ? 'completed' : ''}`}>
                {day}
              </div>
            ))}
          </div>
          
          <div className="schedule-stats">
            <div className="stat">
              <span className="val">12 DAYS</span>
              <span className="lbl">CURRENT STREAK</span>
            </div>
            <div className="stat">
              <span className="val">78%</span>
              <span className="lbl">MONTHLY COMPLETION RATE</span>
            </div>
          </div>
        </div>

        {/* Milestone Card */}
        <div className="milestone-card">
          <div className="ms-icon">
            <Target size={24} />
          </div>
          <div className="ms-content">
            <span className="ms-badge">NEW MILESTONE</span>
            <h3>BENCH PRESS +5KG</h3>
            <span className="ms-time">unlocked 2h ago</span>
          </div>
        </div>

        {/* Training Quality */}
        <div className="quality-card">
          <div className="quality-header">
            <h3>Weekly Training quality</h3>
            <Award size={24} color="#C5FE00" />
          </div>
          <div className="quality-score">
            94<span>%</span>
          </div>
          <p>Your progress toward a perfect training week</p>
        </div>
      </div>
    </div>
  );
}
