import React, { useRef, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  const wrapperRef = useRef(null);
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!wrapperRef.current || hasNavigated.current) return;
      
      const rect = wrapperRef.current.getBoundingClientRect();
      // When the landing wrapper is completely scrolled out of view (Dashboard is at the top)
      if (rect.bottom <= 10) {
        hasNavigated.current = true;
        navigate('/dashboard', { replace: true });
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initially in case they reload the page already scrolled down
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navigate]);

  // Track scroll strictly within this 300vh wrapper
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"]
  });

  // Background Glow Animations
  const glow1X = useTransform(scrollYProgress, [0, 1], [0, 600]);
  const glow1Y = useTransform(scrollYProgress, [0, 1], [0, 400]);
  
  const glow2X = useTransform(scrollYProgress, [0, 1], [0, -600]);
  const glow2Y = useTransform(scrollYProgress, [0, 1], [0, -400]);

  // Screen 1: Logo
  const logoScale = useTransform(scrollYProgress, [0, 0.2], [1, 5]);
  const logoOpacity = useTransform(scrollYProgress, [0.1, 0.3], [1, 0]);

  // Screen 2: Text 1
  const text1Y = useTransform(scrollYProgress, [0.2, 0.4, 0.6], [200, 0, -200]);
  const text1Opacity = useTransform(scrollYProgress, [0.2, 0.4, 0.5, 0.6], [0, 1, 1, 0]);

  // Screen 3: Text 2
  const text2Y = useTransform(scrollYProgress, [0.5, 0.7, 0.9], [200, 0, -200]);
  const text2Opacity = useTransform(scrollYProgress, [0.5, 0.7, 0.8, 0.9], [0, 1, 1, 0]);
  
  // Hide scroll indicator early
  const indicatorOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

  return (
    <div ref={wrapperRef} className="landing-integration-wrapper">
      <div className="landing-sticky-frame">
        
        {/* Background Graphic */}
        <div className="landing-background">
          <div className="grid-overlay"></div>
          <motion.div className="glow glow-1" style={{ x: glow1X, y: glow1Y }}></motion.div>
          <motion.div className="glow glow-2" style={{ x: glow2X, y: glow2Y }}></motion.div>
        </div>

        {/* Content Wrapper */}
        <div className="landing-content-frame">
          
          <motion.div 
            className="landing-logo"
            style={{ scale: logoScale, opacity: logoOpacity }}
          >
            PROGYM
          </motion.div>

          <motion.div 
            className="landing-text"
            style={{ y: text1Y, opacity: text1Opacity }}
          >
            <h1>ELEVATE YOUR<br/><span>PERFORMANCE</span></h1>
          </motion.div>

          <motion.div 
            className="landing-text"
            style={{ y: text2Y, opacity: text2Opacity }}
          >
            <h1>DATA DRIVEN.<br/><span>RESULT FOCUSED.</span></h1>
          </motion.div>
          
          <motion.div 
            className="scroll-indicator"
            style={{ opacity: indicatorOpacity }}
          >
            <span>SCROLL DOWN</span>
            <div className="mouse-icon">
              <div className="wheel"></div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
