import React, { useState, useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';
import { TrendingUp, Target, Award, Dumbbell, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
} from 'date-fns';
import './Analytics.css';

const trainingDays = [1, 3, 6, 7, 8, 10, 13, 14, 15];
const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '', className = '' }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });

  useEffect(() => {
    if (!isInView) {
      setDisplayValue(0);
      return;
    }

    let startTimestamp = null;
    let animationFrame;
    const duration = 1500;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(easeProgress * value);
      if (progress < 1) animationFrame = window.requestAnimationFrame(step);
    };

    animationFrame = window.requestAnimationFrame(step);
    return () => { if (animationFrame) window.cancelAnimationFrame(animationFrame); };
  }, [value, isInView]);

  return <span ref={ref} className={className}>{prefix}{displayValue.toFixed(decimals)}{suffix}</span>;
}

export default function Analytics() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3, 1));

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const dateFormat = 'd';
    const days = [];
    let day = startDate;

    for (let i = 0; i < 42; i += 1) {
      const formattedDate = format(day, dateFormat);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());
      const dayNumber = Number(formattedDate);

      let className = 'cal-day';
      if (!isCurrentMonth) className += ' text-muted';
      if (isToday) className += ' active';
      if (trainingDays.includes(dayNumber) && isCurrentMonth) className += ' completed';

      days.push(
        <div
          className={className}
          key={day.toISOString()}
          style={{ opacity: isCurrentMonth ? 1 : 0.3 }}
        >
          {formattedDate}
        </div>
      );
      day = addDays(day, 1);
    }
    return days;
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>STRENGTH <span>INSIGHTS</span></h1>
        <p>REAL-TIME PERFORMANCE TREND</p>
      </div>

      <div className="analytics-grid">
        <div className="chart-card">
          <div className="chart-card-top">
            <div className="chart-card-title">
              <span>STRENGTH PROGRESS</span>
              <AnimatedNumber value={14.2} decimals={1} prefix="+" suffix="%" className="chart-card-title-h2" />
              <p>vs last month</p>
            </div>
            <div className="chart-filters">
              <button>1W</button>
              <button className="active">1M</button>
              <button>1Y</button>
            </div>
          </div>

          <div className="chart-area">
            <svg viewBox="0 0 400 110" className="mock-chart" preserveAspectRatio="xMidYMid meet">
              <path d="M0,105 Q50,80 100,55 T200,30 T300,15 T390,3 L390,110 L0,110 Z" fill="rgba(197, 254, 0, 0.1)" />
              <path d="M0,105 Q50,80 100,55 T200,30 T300,15 T390,3" fill="none" stroke="#C5FE00" strokeWidth="4" strokeLinecap="round" />
              <circle cx="390" cy="3" r="5" fill="#C5FE00" />
            </svg>
            <div className="chart-x-axis">
              <span>MAR 15</span>
              <span>APR 01</span>
              <span>APR 15</span>
            </div>
          </div>
        </div>

        <div className="metrics-row">
          <div className="metric-card">
            <div className="metric-card-top">
              <div className="metric-card-icon">
                <Dumbbell size={20} />
              </div>
              <span>BENCH PRESS</span>
            </div>
            <div className="metric-card-value">
              315 <span>LBS</span>
            </div>
            <div className="metric-card-meta">CURRENT PB</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-top">
              <div className="metric-card-icon">
                <Dumbbell size={20} />
              </div>
              <span>DEADLIFT</span>
            </div>
            <div className="metric-card-value">
              485 <span>LBS</span>
            </div>
            <div className="metric-card-meta">CURRENT PB</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-top">
              <div className="metric-card-icon">
                <TrendingUp size={20} />
              </div>
              <span>SQUADS</span>
            </div>
            <div className="metric-card-value">
              405 <span>LBS</span>
            </div>
            <div className="metric-card-meta">CURRENT PB</div>
          </div>

          <div className="milestone-card">
            <div className="ms-badge">NEW MILESTONE</div>
            <h3>BENCH PRESS +5KG</h3>
            <p>Unlocked 2h ago</p>
          </div>
        </div>

        <div className="schedule-card">
          <div className="calendar-header">
            <h3>{format(currentMonth, 'MMMM yyyy').toUpperCase()}</h3>
            <div className="calendar-nav">
              <ChevronLeft size={16} onClick={prevMonth} />
              <ChevronRight size={16} onClick={nextMonth} />
            </div>
          </div>
          <div className="calendar-grid">
            {weekdays.map((day, index) => (
              <div key={index} className="cal-day-name">
                {day}
              </div>
            ))}
            {renderCalendarDays()}
          </div>
          <div className="schedule-footer">
            <span className="schedule-meta">
              <span className="status-dot"></span> CURRENT STREAK: 12 DAYS
            </span>
            <span className="schedule-meta highlight">78% MONTHLY COMPLETION RATE</span>
          </div>
        </div>

        <div className="quality-card">
          <div className="quality-card-top">
            <div>
              <span>WEEKLY TRAINING QUALITY</span>
              <h3>94<span>%</span></h3>
            </div>
            <Award size={24} />
          </div>
          <p>Your progress toward a perfect training week</p>
        </div>
      </div>
    </div>
  );
}
