import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';
import athletirank_Logo from '../assets/Athletirank_Logo.png';
import university_Logo from '../assets/Arellano_University_logo.png'
import { ImStatsBars } from "react-icons/im";
import { MdDisplaySettings } from "react-icons/md";
import { GiInjustice } from "react-icons/gi"
import '../style/Homepage.css';

const Homepage = () => {
    const [isNavOpen, setIsNavOpen] = useState(false); 
    const heroRef = useRef(null);
    const aboutRef = useRef(null);
    const featuresRef = useRef(null);
    
    // Remove once: true to allow repeated animations
    const heroInView = useInView(heroRef, { threshold: 0.3 });
    const aboutInView = useInView(aboutRef, { threshold: 0.3 });
    const featuresInView = useInView(featuresRef, { threshold: 0.3 });

    const heroControls = useAnimation();
    const aboutControls = useAnimation();
    const featuresControls = useAnimation();

    const toggleNav = () => {
        setIsNavOpen(!isNavOpen);
    };

    useEffect(() => {
        if (heroInView) {
            heroControls.start("visible");
        } else {
            heroControls.start("hidden");
        }
    }, [heroInView, heroControls]);

    useEffect(() => {
        if (aboutInView) {
            aboutControls.start("visible");
        } else {
            aboutControls.start("hidden");
        }
    }, [aboutInView, aboutControls]);

    useEffect(() => {
        if (featuresInView) {
            featuresControls.start("visible");
        } else {
            featuresControls.start("hidden");
        }
    }, [featuresInView, featuresControls]);

    // Animation variants
    const fadeInUp = {
        hidden: { opacity: 0, y: 60 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: {
                duration: 0.8,
                ease: "easeOut"
            }
        }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const scaleIn = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { 
            opacity: 1, 
            scale: 1,
            transition: {
                duration: 0.6,
                ease: "easeOut"
            }
        }
    };

    const slideInLeft = {
        hidden: { opacity: 0, x: -60 },
        visible: { 
            opacity: 1, 
            x: 0,
            transition: {
                duration: 0.8,
                ease: "easeOut"
            }
        }
    };

    const slideInRight = {
        hidden: { opacity: 0, x: 60 },
        visible: { 
            opacity: 1, 
            x: 0,
            transition: {
                duration: 0.8,
                ease: "easeOut"
            }
        }
    };

    return (
        <div className="homepage-container">

            {/* Navigation Bar */}
            <nav className="navbar">
                <div className="nav-brand">
                    <span className="nav-title">ATHLETIRANK</span>
                </div>

                <div className={`nav-links ${isNavOpen ? 'active' : ''}`}>
                    <ul>
                        <li><a href="#home" className="nav-link" onClick={toggleNav}>Home</a></li>
                        <li><a href="#about" className="nav-link" onClick={toggleNav}>About</a></li>
                               
                        <li><Link to="/schedules" className="nav-link" onClick={toggleNav}>Matches</Link></li>
                        <li><Link to="/stats" className="nav-link" onClick={toggleNav}>Statistics</Link></li>
               
                        <li><Link to="/awards%standings" className="nav-link" onClick={toggleNav}>Awards & Standings</Link></li>
                    </ul>
                </div>

                <div className="hamburger" onClick={toggleNav}>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>

                <div className="nav-buttons">
                    <Link to="/Register&Login" className="login-btn">Login</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="hero-section" id="home" ref={heroRef}>
                <motion.div 
                    className="hero-content"
                    variants={staggerContainer}
                    initial="hidden"
                    animate={heroControls}
                >
                    <motion.div className='hero-title-container' variants={fadeInUp}>
                        <h1 className="hero-title">
                            Elevate Your Sportfest with <span className="brand-highlight">ATHLETIRANK</span>
                        </h1>
                    </motion.div>

                    <motion.div className="hero-image" variants={scaleIn}>
                        <img 
                            src={athletirank_Logo} 
                            alt="AthletiRank Logo" 
                            className="hero-logo"
                        />
                    </motion.div>

                    <motion.div className='hero-text-left' variants={slideInLeft}>
                        <p className="hero-subtitle">
                            Arellano University's Digital Solution for Basketball & Volleyball Tournaments
                        </p>

                        <p className="hero-description">
                            Streamline bracket management, track player performance, and celebrate top athletes with real-time updates and automated awards. Join our sports community today!
                        </p>
                    </motion.div>

                    <motion.div className='hero-text-right' variants={slideInRight}>
                        <p className="hero-action-text">
                            Ready to Get Started?
                        </p>

                        <p className="hero-action-description">
                            Explore live tournament brackets and discover standout player statistics in real-time.
                        </p>

                        <div className="hero-cta">
                            <Link to="/brackets" className="btn-primary">View Brackets</Link>
                            <Link to="/stats" className="btn-primary">Check Stats</Link>
                        </div>
                    </motion.div>
                </motion.div>
            </main>

            {/* About Section */}
            <section className="about-section" id="about" ref={aboutRef}>
                <motion.div 
                    className="about-container"
                    variants={staggerContainer}
                    initial="hidden"
                    animate={aboutControls}
                >
                    <div className='about-content'>
                        <motion.div className='about-text' variants={fadeInUp}>
                            <h2 className='about-title'>
                                About <span>Athletirank</span>
                            </h2>

                            <p className='about-description'>
                                Developed specifically for Arellano University's Sportfest, AthletiRank represents 
                                the future of university sports management. Our comprehensive web-based platform 
                                modernizes tournament organization through cutting-edge technology and user-centered design.
                            </p>

                            <p className='about-description'>
                                By combining automated bracket management, real-time statistics tracking, and 
                                intelligent award recognition, we create an ecosystem that enhances fairness, 
                                efficiency, and engagement for organizers, athletes, and spectators alike.
                            </p>
                        </motion.div>

                        <motion.div className='about-image' variants={staggerContainer}>
                            <div className='about-stats'>
                                <motion.div className='about-stat' variants={scaleIn}>
                                    <div className='icon-container icon-container-float'>
                                        <MdDisplaySettings className='modern-icon automated-icon icon-rotate-on-hover' />
                                    </div>
                                    <h4>Automated</h4>
                                    <p>Bracket Management</p>
                                </motion.div>

                                <motion.div className='about-stat' variants={scaleIn}>
                                    <div className='icon-container-glass icon-container-pulse'>
                                        <ImStatsBars className='modern-icon stats-icon icon-bounce-on-hover' />
                                    </div>
                                    <h4>Real-time</h4>
                                    <p>Statistics</p>
                                </motion.div>

                                <motion.div className='about-stat' variants={scaleIn}>
                                    <div className='icon-container-3d'>
                                        <GiInjustice className='modern-icon award-icon' />
                                    </div>
                                    <h4>Fair</h4>
                                    <p>Award System</p>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </section>

            {/* Features Section */}
            <section className="features-section" ref={featuresRef}>
    <motion.div 
        className="features-container"
        variants={staggerContainer}
        initial="hidden"
        animate={featuresControls}
    >
        <motion.h2 className="features-title" variants={fadeInUp}>
            Why Choose AthletiRank?
        </motion.h2>

        {/* Add the SVG filter for the electric effect */}
        <svg className="eb-svg">
            <defs>
                <filter id="eb-glow">
                    <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
        </svg>

        <motion.div className="features-grid" variants={staggerContainer}>
            <motion.div className="feature-card electric-border" variants={fadeInUp} style={{"--electric-border-color": "#3b82f6", "--electric-light-color": "#60a5fa"}}>
                <div className="eb-layers">
                    <div className="eb-background-glow"></div>
                    <div className="eb-glow-2"></div>
                    <div className="eb-glow-1"></div>
                    <div className="eb-stroke"></div>
                </div>
                <div className="eb-content">
                    <div className="feature-icon">📅</div>
                    <h3>Automated Brackets</h3>
                    <p>Easily generate and update tournament brackets for basketball and volleyball with real-time match progress.</p>
                </div>
            </motion.div>

            <motion.div className="feature-card electric-border" variants={fadeInUp} style={{"--electric-border-color": "#10b981", "--electric-light-color": "#34d399"}}>
                <div className="eb-layers">
                    <div className="eb-background-glow"></div>
                    <div className="eb-glow-2"></div>
                    <div className="eb-glow-1"></div>
                    <div className="eb-stroke"></div>
                </div>
                <div className="eb-content">
                    <div className="feature-icon">📊</div>
                    <h3>Player Statistics</h3>
                    <p>Track points, assists, rebounds, and more with accurate, real-time leaderboards for fair recognition.</p>
                </div>
            </motion.div>

            <motion.div className="feature-card electric-border" variants={fadeInUp} style={{"--electric-border-color": "#f59e0b", "--electric-light-color": "#fbbf24"}}>
                <div className="eb-layers">
                    <div className="eb-background-glow"></div>
                    <div className="eb-glow-2"></div>
                    <div className="eb-glow-1"></div>
                    <div className="eb-stroke"></div>
                </div>
                <div className="eb-content">
                    <div className="feature-icon">🏆</div>
                    <h3>Award Recognition</h3>
                    <p>Automatically identify MVPs and Mythical 5 based on performance data, ensuring unbiased awards.</p>
                </div>
            </motion.div>

            <motion.div className="feature-card electric-border" variants={fadeInUp} style={{"--electric-border-color": "#8b5cf6", "--electric-light-color": "#a78bfa"}}>
                <div className="eb-layers">
                    <div className="eb-background-glow"></div>
                    <div className="eb-glow-2"></div>
                    <div className="eb-glow-1"></div>
                    <div className="eb-stroke"></div>
                </div>
                <div className="eb-content">
                    <div className="feature-icon">👥</div>
                    <h3>Role-Based Access</h3>
                    <p>Admins manage events, staff input scores, and viewers stay updated—all through a secure platform.</p>
                </div>
            </motion.div>
        </motion.div>
    </motion.div>
</section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-container">
                    <div className='footer-content'>
                        <div className='footer-brand'>
                            <img src={university_Logo} alt='university logo' className='footer-logo' />
                            <h3>Arellano University</h3>
                            <p>ATHLETIRANK</p>
                        </div>

                        <div className='footer-links-section'>
                            <div className="footer-column">
                                <h4>Platform</h4>
                                <Link to="/brackets">
                                    <i className="bi bi-diagram-3 me-1"></i>
                                    Brackets
                                </Link>

                                <Link to="/stats">
                                    <i className="bi bi-bar-chart me-1"></i>
                                    Statistics
                                </Link>

                                <Link to="/teams">
                                    <i className="bi bi-people me-1"></i>
                                    Teams
                                </Link>

                                <Link to="/schedules">
                                    <i className="bi bi-calendar-event me-1"></i>
                                    Schedules
                                </Link>
                            </div>

                            <div className='footer-column'>
                                <h4>Support</h4>
                                <Link to="/contact">
                                    <i className="bi bi-envelope me-1"></i>
                                    Contact Us
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className='footer-bottom'>
                        <p>2025 Athletirank | Arellano University Sportfest - All Right Reserved </p>

                        <div className='footer-social'>
                            <i className='facebook'></i>
                            <i className='facebook'></i>
                            <i className='facebook'></i>
                        </div>
                    </div>
                </div> 
            </footer>
        </div>
    );
};

export default Homepage;