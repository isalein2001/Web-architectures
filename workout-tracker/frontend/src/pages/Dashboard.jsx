import React, { useState, useEffect, useRef } from 'react';
import { useInView, motion } from 'framer-motion';
import { api } from '../api';
import { Activity, Flame, Clock, Trophy, Droplets, Calendar, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays 
} from 'date-fns';
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
  const { t } = useLanguage();
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  
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
        <span className="circular-progress-label">{t('COMPLETED')}</span>
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
  const { t } = useLanguage();
  const [stats, setStats] = useState({ totalSessions: 0, sessionDates: [] });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);

    const dateFormat = "dd";
    const days = [];
    let day = startDate;

    for (let i = 0; i < 42; i++) {
      const formattedDate = format(day, dateFormat);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());
      
      let className = "cal-day";
      if (!isCurrentMonth) className += " text-muted";
      if (isToday) className += " active";

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

  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    '/slideshow-1.jpg',
    '/slideshow-2.png',
    '/slideshow-3.png',
    '/slideshow-4.png',
    '/slideshow-5.png',
    '/slideshow-6.png',
    '/slideshow-7.png',
    '/slideshow-8.png',
    '/slideshow-9.png'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const getGreetingData = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return { text: t("GOOD MORNING") };
    if (hour >= 11 && hour < 18) return { text: t("HELLO") };
    if (hour >= 18 && hour < 22) return { text: t("GOOD EVENING") };
    return { text: t("HELLO") };
  };

  const greeting = getGreetingData();

  return (
    <div className="dashboard-container">
      
      {/* Hero Banner Slideshow */}
      <div className="hero-banner">
        {slides.map((slide, index) => (
          <div
            key={slide}
            className="hero-slide"
            style={{
              backgroundImage: `url('${slide}')`,
              opacity: index === currentSlide ? 0.4 : 0,
              transition: 'opacity 2.5s ease-in-out'
            }}
          />
        ))}
        <div className="hero-gradient-overlay" />

        <div className="hero-content">
          <h1>{greeting.text}, <span>JONAS</span></h1>
          <p>{t('WELCOME BACK, ATHLETE. YOUR DAILY TARGET IS SYNCHRONIZED.')}</p>
        </div>
      </div>

      {/* Top Grid: Daily Goal & Widgets */}
      <div className="top-grid">
        {/* Daily Goal */}
        <div className="card daily-goal-card">
          <div className="card-header-flex">
            <h2>{t('DAILY GOAL')}</h2>
            <div className="goal-badges">
              <span className="badge badge-outline">{t('ACTIVE RECOVERY')}</span>
              <span className="badge badge-solid">{t('ELITE TRACK')}</span>
            </div>
          </div>
          
          <div className="daily-goal-chart">
            <CircularProgress percentage={75} />
          </div>
          
          <div className="quote-of-day">
            {t('Quote of the day: Consistency beats motivation')}
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
                <h3>{t('STAY HYDRATED')}</h3>
                <p>{t('1.2L more for peak efficiency.')}</p>
              </div>
            </div>
            <div className="hydration-goal">
              <Droplets size={16} /> {t('GOAL: 3.5L DAILY')}
            </div>
            {/* Background decorative drop */}
            <Droplets className="bg-icon-drop" size={120} />
          </div>

          {/* Calendar */}
          <div className="card calendar-card">
            <div className="calendar-header">
              <h3>{format(currentMonth, "MMMM yyyy").toUpperCase()}</h3>
              <div className="calendar-nav">
                <ChevronLeft size={16} onClick={prevMonth} />
                <ChevronRight size={16} onClick={nextMonth} />
              </div>
            </div>
            <div className="calendar-grid">
              <div className="cal-day-name">{t('SUN')}</div>
              <div className="cal-day-name">{t('MON')}</div>
              <div className="cal-day-name">{t('TUE')}</div>
              <div className="cal-day-name">{t('WED')}</div>
              <div className="cal-day-name">{t('THU')}</div>
              <div className="cal-day-name">{t('FRI')}</div>
              <div className="cal-day-name">{t('SAT')}</div>
              
              {renderCalendarDays()}
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
              <span>{t('ACTIVE FLOW')}</span>
              <span className="stat-badge">+2.4k</span>
            </div>
          </div>
          <div className="stat-title-side">{t('STEPS')}</div>
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
              <span>{t('BURN RATE')}</span>
              <span className="stat-badge">{t('OPTIMAL')}</span>
            </div>
          </div>
          <div className="stat-title-side">{t('CALORIES')}</div>
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
              <span>{t('TIME IN ZONE')}</span>
              <span className="stat-badge">{t('MIN')}</span>
            </div>
          </div>
          <div className="stat-title-side">{t('MINUTES')}</div>
        </div>
      </div>

      {/* Achievements Card */}
      <div className="card achievements-card">
        <div className="achievements-content">
          <div className="achievements-text-area">
            <div className="achievements-label">{t('LATEST ACHIEVEMENT')}</div>
            <h2>{t('ACHIEVEMENTS')}</h2>
            <p className="achievements-desc">
              {t("You've maintained a top 5% strength-to-weight ratio worldwide for 12 consecutive weeks.")}
            </p>
            
            <div className="lifts-grid">
              <div className="lift-item">
                <span className="lift-name">{t('DEADLIFT')}</span>
                <span className="lift-weight">180kg</span>
                <span className="badge badge-solid">{t('NEW PR')}</span>
              </div>
              <div className="lift-item">
                <span className="lift-name">{t('SQUAT')}</span>
                <span className="lift-weight">140kg</span>
                <span className="badge badge-outline">{t('TOP 5%')}</span>
              </div>
              <div className="lift-item">
                <span className="lift-name">{t('BENCH')}</span>
                <span className="lift-weight">100kg</span>
                <span className="badge badge-outline">{t('TOP 10%')}</span>
              </div>
            </div>
          </div>
          
          <AnimatedMedal />
        </div>
      </div>

    </div>
  );
}
