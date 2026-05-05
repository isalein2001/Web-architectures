import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
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
const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const CHART_WIDTH = 392;
const CHART_HEIGHT = 280;
const CHART_TOP_PADDING = 10;
const CHART_BOTTOM_PADDING = 0;
const chartSeries = {
  '1W': {
    change: 3.8,
    compareLabel: 'vs last week',
    labels: ['APR 09', 'APR 12', 'APR 15'],
    values: [0.18, 0.21, 0.19, 0.27, 0.43, 0.61, 0.74],
  },
  '1M': {
    change: 14.2,
    compareLabel: 'vs last month',
    labels: ['MAR 15', 'APR 01', 'APR 15'],
    values: [0.10, 0.14, 0.16, 0.15, 0.23, 0.42, 0.66, 0.74, 0.72, 0.77, 0.89, 0.96],
  },
  '1Y': {
    change: 28.6,
    compareLabel: 'vs last year',
    labels: ['JAN', 'JUN', 'DEC'],
    values: [0.08, 0.11, 0.16, 0.24, 0.31, 0.45, 0.51, 0.58, 0.70, 0.79, 0.88, 0.98],
  },
};

function getPointY(value) {
  return CHART_HEIGHT - (value * (CHART_HEIGHT - CHART_TOP_PADDING - CHART_BOTTOM_PADDING)) - CHART_BOTTOM_PADDING;
}

function getChartPoints(values) {
  return values.map((value, index) => ({
    x: (index / (values.length - 1)) * CHART_WIDTH,
    y: getPointY(value),
  }));
}

function buildSmoothLinePath(points) {
  if (points.length < 2) return '';

  let path = `M${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midpointX = (current.x + next.x) / 2;
    const midpointY = (current.y + next.y) / 2;

    path += ` Q${current.x},${current.y} ${midpointX},${midpointY}`;
  }

  const secondToLast = points[points.length - 2];
  const last = points[points.length - 1];
  path += ` Q${secondToLast.x},${secondToLast.y} ${last.x},${last.y}`;

  return path;
}

function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '', className = '', as: Tag = 'span' }) {
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

  const formattedValue = displayValue.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <Tag ref={ref} className={className}>{prefix}{formattedValue}{suffix}</Tag>;
}

export default function Analytics() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [activeRange, setActiveRange] = useState('1M');
  const chartRef = useRef(null);
  const isChartInView = useInView(chartRef, { once: false, amount: 0.4 });
  const activeChart = chartSeries[activeRange];
  const chartPoints = getChartPoints(activeChart.values);
  const chartLinePath = buildSmoothLinePath(chartPoints);
  const chartAreaPath = `${chartLinePath} L${chartPoints[chartPoints.length - 1].x},${CHART_HEIGHT} L${chartPoints[0].x},${CHART_HEIGHT} Z`;
  const endPoint = chartPoints[chartPoints.length - 1];

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
              <AnimatedNumber value={activeChart.change} decimals={1} prefix="+ " suffix=" %" className="chart-card-title-h2" as="h2" />
              <p>{activeChart.compareLabel}</p>
            </div>
            <div className="chart-filters">
              {Object.keys(chartSeries).map((range) => (
                <button
                  key={range}
                  className={activeRange === range ? 'active' : ''}
                  onClick={() => setActiveRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-area">
            <div ref={chartRef} className="chart-visual">
            <svg viewBox="0 0 400 280" className="mock-chart" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="strengthAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C5FE00" stopOpacity="0.18" />
                  <stop offset="22%" stopColor="#A8D900" stopOpacity="0.09" />
                  <stop offset="55%" stopColor="#5D6E18" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#121212" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="strengthRightBlackFade" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#121212" stopOpacity="0" />
                  <stop offset="100%" stopColor="#121212" stopOpacity="0.98" />
                </linearGradient>
                <linearGradient id="strengthBottomBlackFade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#121212" stopOpacity="0" />
                  <stop offset="100%" stopColor="#121212" stopOpacity="0.99" />
                </linearGradient>
              </defs>
              <line x1="0" y1="279" x2="400" y2="279" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <motion.g
                key={`area-${activeRange}`}
                initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0 }}
                animate={isChartInView ? { clipPath: 'inset(0 0% 0 0)', opacity: 1 } : { clipPath: 'inset(0 100% 0 0)', opacity: 0 }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <path
                  d={chartAreaPath}
                  fill="url(#strengthAreaGradient)"
                />
                <rect x="334" y="0" width="66" height="280" fill="url(#strengthRightBlackFade)" />
                <rect x="0" y="224" width="400" height="56" fill="url(#strengthBottomBlackFade)" />
              </motion.g>
              <motion.path
                key={`line-${activeRange}`}
                d={chartLinePath}
                fill="none"
                stroke="#C5FE00"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 1 }}
                animate={isChartInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 1 }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.circle
                key={`point-${activeRange}`}
                cx={endPoint.x}
                cy={endPoint.y}
                r="6"
                fill="#C5FE00"
                initial={{ scale: 0, opacity: 0 }}
                animate={isChartInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={{ duration: 0.18, delay: 1.4, ease: 'easeOut' }}
              />
            </svg>
            </div>
            <div className="chart-x-axis">
              {activeChart.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
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
