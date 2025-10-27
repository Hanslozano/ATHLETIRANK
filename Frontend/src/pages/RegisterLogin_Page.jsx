import { useState, useEffect } from "react";
import Login from "../components/Login"
import Athletirank_Logo from '../assets/Athletirank_Logo.png';
import '../style/RegisterAndLogin.css'

export default function RegisterAndLoginPage() {
    const [displayText, setDisplayText] = useState('');
    const [isAnimating, setIsAnimating] = useState(true);
    
    useEffect(() => {
        const words = [
            'ATHLETIRANK',
            'Bracketing',
            'Statistics',
            'Award System'
        ];
        
        let wordIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let isWaitingAtEnd = false;
        
        const animate = () => {
            const currentWord = words[wordIndex];
            
            if (isWaitingAtEnd) {
                // Wait at the end before starting to delete
                setTimeout(() => {
                    isWaitingAtEnd = false;
                    isDeleting = true;
                    animate();
                }, 3000); // Increase for longer pause at end (was 2000)
                return;
            }
            
            if (!isDeleting) {
                // Typing forward
                if (charIndex <= currentWord.length) {
                    setDisplayText(currentWord.substring(0, charIndex));
                    charIndex++;
                    setTimeout(animate, 150); // Increase for slower typing (was 100)
                } else {
                    // Reached end of word
                    if (wordIndex === words.length - 1) {
                        // Last word, start deleting
                        isWaitingAtEnd = true;
                        animate();
                    } else {
                        // Move to next word
                        isWaitingAtEnd = true;
                        animate();
                    }
                }
            } else {
                // Deleting backward
                if (charIndex > 0) {
                    charIndex--;
                    setDisplayText(currentWord.substring(0, charIndex));
                    setTimeout(animate, 75); // Increase for slower deleting (was 50)
                } else {
                    // Finished deleting
                    isDeleting = false;
                    if (wordIndex === words.length - 1) {
                        // Was on last word, go back to first
                        wordIndex = 0;
                    } else {
                        // Move to next word
                        wordIndex++;
                    }
                    charIndex = 0;
                    setTimeout(animate, 500); // Increase for longer pause between words (was 300)
                }
            }
        };
        
        if (isAnimating) {
            animate();
        }
        
        return () => setIsAnimating(false);
    }, []);
    
    return (
        <div className="register-login-page-reset">
            <div className="app-container">
                <div className="split-layout">
                    {/* Left Side - Logo and Branding */}
                    <div className="left-section">
                        <div className="brand-container">
                            <img 
                                src={Athletirank_Logo} 
                                alt="Athletirank Logo" 
                                className="brand-logo"
                            />
                            <h1 className="brand-title animated-title">
                                {displayText}
                                <span className="cursor">|</span>
                            </h1>
                        </div>
                    </div>

                    {/* Right Side - Auth Forms */}
                    <div className="right-section">
                        <Login />
                    </div>
                </div>
            </div>
        </div>
    );
}