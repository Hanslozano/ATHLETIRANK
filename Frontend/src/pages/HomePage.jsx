import { Link } from 'react-router-dom';
import { useState } from 'react'; 
import athletirank_Logo from '../assets/Athletirank_Logo.png';
import university_Logo from '../assets/Arellano_University_logo.png'
import { ImStatsBars } from "react-icons/im";
import { MdDisplaySettings } from "react-icons/md";
import { GiInjustice } from "react-icons/gi"
import '../style/Homepage.css';

const Homepage = () => {
    const [isNavOpen, setIsNavOpen] = useState(false); 

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
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
                        <li><Link to="/" className="nav-link" onClick={toggleNav}>Home</Link></li>
                        <li><Link to="/about" className="nav-link" onClick={toggleNav}>About</Link></li>
                        <li><Link to="/brackets" className="nav-link" onClick={toggleNav}>Brackets</Link></li>
                        <li><Link to="/stats" className="nav-link" onClick={toggleNav}>Statistics</Link></li>
                        <li><Link to="/teams" className="nav-link" onClick={toggleNav}>Teams</Link></li>
                        <li><Link to="/schedules" className="nav-link" onClick={toggleNav}>Schedules</Link></li>
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
<main className="hero-section">
    <div className="hero-content">
        
        <div className='hero-title-container'>
            <h1 className="hero-title">
                Elevate Your Sportfest with <span className="brand-highlight">ATHLETIRANK</span>
            </h1>
        </div>

        <div className="hero-image">
            <img 
                src={athletirank_Logo} 
                alt="AthletiRank Logo" 
                className="hero-logo"
            />
        </div>

        <div className='hero-text-left'>
            <p className="hero-subtitle">
                Arellano University's Digital Solution for Basketball & Volleyball Tournaments
            </p>

            <p className="hero-description">
                Streamline bracket management, track player performance, and celebrate top athletes with real-time updates and automated awards. Join our sports community today!
            </p>
        </div>

        <div className='hero-text-right'>

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
        </div>
    </div>
</main>

        
            {/* About Section */}
           
<section className="about-section">
    <div className="about-container">
        <div className='about-content'>
            <div className='about-text'>
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
            </div>

            <div className='about-image'>
                <div className='about-stats'>
                    <div className='about-stat'>
                        
                        <div className='icon-container icon-container-float'>
                            <MdDisplaySettings className='modern-icon automated-icon icon-rotate-on-hover' />
                        </div>
                        <h4>Automated</h4>
                        <p>Bracket Management</p>
                    </div>

                    <div className='about-stat'>
                        
                        <div className='icon-container-glass icon-container-pulse'>
                            <ImStatsBars className='modern-icon stats-icon icon-bounce-on-hover' />
                        </div>
                        <h4>Real-time</h4>
                        <p>Statistics</p>
                    </div>

                    <div className='about-stat'>
                        
                        <div className='icon-container-3d'>
                            <GiInjustice className='modern-icon award-icon' />
                        </div>
                        <h4>Fair</h4>
                        <p>Award System</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>




            {/* Features Section */}
            <section className="features-section">
                <div className="features-container">

                    <h2 className="features-title">Why Choose AthletiRank?</h2>

                    <div className="features-grid">

                        <div className="feature-card">
                            <div className="feature-icon">📅</div>
                            <h3>Automated Brackets</h3>
                            <p>Easily generate and update tournament brackets for basketball and volleyball with real-time match progress.</p>
                        </div>


                        <div className="feature-card">
                            <div className="feature-icon">📊</div>
                            <h3>Player Statistics</h3>
                            <p>Track points, assists, rebounds, and more with accurate, real-time leaderboards for fair recognition.</p>
                        </div>


                        <div className="feature-card">
                            <div className="feature-icon">🏆</div>
                            <h3>Award Recognition</h3>
                            <p>Automatically identify MVPs and Mythical 5 based on performance data, ensuring unbiased awards.</p>
                        </div>


                        <div className="feature-card">
                            <div className="feature-icon">👥</div>
                            <h3>Role-Based Access</h3>
                            <p>Admins manage events, staff input scores, and viewers stay updated—all through a secure platform.</p>
                        </div>

                        
                    </div>
                </div>
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
                            <i  className='facebook'></i>
                             <i  className='facebook'></i>
                              <i  className='facebook'></i>
                        </div>

                    </div>

                </div> 
            </footer>


        </div>
    );
};

export default Homepage;