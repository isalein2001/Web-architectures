import React, { useState, useEffect, useRef } from 'react';
import { useInView, motion } from 'framer-motion';
import { api } from '../api';
import { Activity, Flame, Clock, Trophy, Droplets, Calendar, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import './Dashboard.css';

function AnimatedNumber({ value, useComma }) {
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
      setDisplayValue(Math.floor(easeProgress * value));
      if (progress < 1) animationFrame = window.requestAnimationFrame(step);
    };

    animationFrame = window.requestAnimationFrame(step);
    return () => { if (animationFrame) window.cancelAnimationFrame(animationFrame); };
  }, [value, isInView]);

  return <span ref={ref}>{useComma ? displayValue.toLocaleString('en-US') : displayValue}</span>;
}

function CircularProgress({ percentage }) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  
  // Animate from 0 to target percentage when in view
  const displayPercentage = isInView ? percentage : 0;
  const strokeDashoffset = circumference - (displayPercentage / 100) * circumference;

  return (
    <div className="circular-progress-container" ref={ref}>
      <svg className="circular-progress-svg" viewBox="0 0 200 200">
        <circle 
          className="circular-progress-bg" 
          cx="100" cy="100" r={radius} 
          strokeWidth="12" fill="none" 
        />
        <circle 
          className="circular-progress-fill" 
          cx="100" cy="100" r={radius} 
          strokeWidth="12" fill="none" 
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.165, 0.84, 0.44, 1)" }}
        />
      </svg>
      <div className="circular-progress-content">
        <span className="circular-progress-value">
          <AnimatedNumber value={percentage} useComma={false} />%
        </span>
        <span className="circular-progress-label">COMPLETED</span>
      </div>
    </div>
  );
}

function AnimatedMedal() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });

  return (
    <div className="achievements-medal-area" ref={ref}>
      <div className="medal-glow-bg"></div>
      <motion.div 
        className="medal-icon"
        initial={{ scale: 0 }}
        animate={isInView ? { scale: [0, 1.3, 0.85, 1.15, 0.95, 1] } : { scale: 0 }}
        transition={{ 
          duration: 1.5, 
          times: [0, 0.4, 0.65, 0.8, 0.9, 1], 
          ease: "easeInOut" 
        }}
      >
        <Award size={40} color="#000" />
      </motion.div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ totalSessions: 0, sessionDates: [] });

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);

  const getGreetingData = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
      return { text: "GOOD MORNING", bg: "/hero-bg-morning.png" };
    }
    if (hour >= 11 && hour < 18) {
      return { text: "HELLO", bg: "/hero-bg.png" }; // Default athlete image for day
    }
    if (hour >= 18 && hour < 22) {
      return { text: "GOOD EVENING", bg: "/hero-bg-evening.png" };
    }
    // Night time (22:00 - 04:59)
    return { text: "HELLO", bg: "/hero-bg-night.png" };
  };

  const greeting = getGreetingData();

  return (
    <div className="dashboard-container">
      
      {/* Hero Banner */}
      <div 
        className="hero-banner"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.4) 100%), url('${greeting.bg}')`
        }}
      >
        <div className="hero-content">
          <h1>{greeting.text}, <span>JONAS</span></h1>
          <p>WELCOME BACK, ATHLETE. YOUR DAILY TARGET IS SYNCHRONIZED.</p>
        </div>
      </div>

      {/* Top Grid: Daily Goal & Widgets */}
      <div className="top-grid">
        {/* Daily Goal */}
        <div className="card daily-goal-card">
          <div className="card-header-flex">
            <h2>DAILY GOAL</h2>
            <div className="goal-badges">
              <span className="badge badge-outline">ACTIVE RECOVERY</span>
              <span className="badge badge-solid">ELITE TRACK</span>
            </div>
          </div>
          
          <div className="daily-goal-chart">
            <CircularProgress percentage={75} />
          </div>
          
          <div className="quote-of-day">
            Quote of the day: Consistency beats motivation
          </div>
        </div>

        {/* Right Stack */}
        <div className="top-grid-right-stack">
          {/* Hydration */}
          <div className="card hydration-card">
            <div className="hydration-content">
              <div className="icon-circle solid-green">
                <Droplets size={24} color="#000" />
              </div>
              <div className="hydration-text">
                <h3>STAY HYDRATED</h3>
                <p>1.2L more for peak efficiency.</p>
              </div>
            </div>
            <div className="hydration-goal">
              <Droplets size={16} /> GOAL: 3.5L DAILY
            </div>
            {/* Background decorative drop */}
            <Droplets className="bg-icon-drop" size={120} />
          </div>

          {/* Calendar */}
          <div className="card calendar-card">
            <div className="calendar-header">
              <h3>APRIL 2026</h3>
              <div className="calendar-nav">
                <ChevronLeft size={16} />
                <ChevronRight size={16} />
              </div>
            </div>
            <div className="calendar-grid">
              <div className="cal-day-name">SUN</div>
              <div className="cal-day-name">MON</div>
              <div className="cal-day-name">TUE</div>
              <div className="cal-day-name">WED</div>
              <div className="cal-day-name">THU</div>
              <div className="cal-day-name">FRI</div>
              <div className="cal-day-name">SAT</div>
              
              <div className="cal-day">29</div>
              <div className="cal-day">30</div>
              <div className="cal-day">31</div>
              <div className="cal-day active">01</div>
              <div className="cal-day">02</div>
              <div className="cal-day">03</div>
              <div className="cal-day">04</div>
              
              <div className="cal-day">05</div>
              <div className="cal-day">06</div>
              <div className="cal-day">07</div>
              <div className="cal-day">08</div>
              <div className="cal-day">09</div>
              <div className="cal-day">10</div>
              <div className="cal-day">11</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* Steps */}
        <div className="stat-card horizontal">
          <div className="icon-circle glow-green">
            <Activity size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              <AnimatedNumber value={12482} useComma={true} />
            </div>
            <div className="stat-details">
              <span>ACTIVE FLOW</span>
              <span className="stat-badge">+2.4k</span>
            </div>
          </div>
          <div className="stat-title-side">STEPS</div>
        </div>

        {/* Calories */}
        <div className="stat-card horizontal">
          <div className="icon-circle glow-green">
            <Flame size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              <AnimatedNumber value={2140} useComma={true} />
            </div>
            <div className="stat-details">
              <span>BURN RATE</span>
              <span className="stat-badge">OPTIMAL</span>
            </div>
          </div>
          <div className="stat-title-side">CALORIES</div>
        </div>

        {/* Minutes */}
        <div className="stat-card horizontal">
          <div className="icon-circle glow-green">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              <AnimatedNumber value={84} useComma={false} />
            </div>
            <div className="stat-details">
              <span>TIME IN ZONE</span>
              <span className="stat-badge">MIN</span>
            </div>
          </div>
          <div className="stat-title-side">MINUTES</div>
        </div>
      </div>

      {/* Achievements Card */}
      <div className="card achievements-card">
        <div className="achievements-content">
          <div className="achievements-text-area">
            <div className="achievements-label">LATEST ACHIEVEMENT</div>
            <h2>ARCHIEVEMENTS</h2>
            <p className="achievements-desc">
              You've maintained a top 5% strength-to-weight ratio worldwide for 12 consecutive weeks.
            </p>
            
            <div className="lifts-grid">
              <div className="lift-item">
                <span className="lift-name">DEADLIFT</span>
                <span className="lift-weight">485 LBS</span>
              </div>
              <div className="lift-item">
                <span className="lift-name">SQUAT</span>
                <span className="lift-weight">405 LBS</span>
              </div>
              <div className="lift-item">
                <span className="lift-name">BENCH</span>
                <span className="lift-weight">315 LBS</span>
              </div>
            </div>
          </div>
          
          <AnimatedMedal />
        </div>
      </div>

    </div>
  );
}
