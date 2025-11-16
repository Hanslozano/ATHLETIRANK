import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Link } from "react-router-dom";
import '../style/RegisterAndLogin.css';
import universityLogo from '../assets/Arellano_University_logo.png';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    
    const { login } = useAuth();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await login(formData);
            // Updated navigation logic for new role name
            if (response?.user?.role === 'admin') {
                navigate('/AdminDashboard');
            } else if (response?.user?.role === 'sports_committee') {
                navigate('/StaffDashboard');
            } else {
                setError('Unknown user role');
            }
        } catch (error) {
            setError(error.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setResetMessage('');
        setResetLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: resetEmail })
            });

            const data = await response.json();

            if (response.ok) {
                setResetMessage('Password reset link sent to your email!');
                setTimeout(() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                    setResetMessage('');
                }, 3000);
            } else {
                setResetMessage(data.message || 'Failed to send reset link');
            }
        } catch (error) {
            setResetMessage('Error sending reset link. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo">
                        <img 
                            src={universityLogo} 
                            alt="Arellano University Logo" 
                            className="logo-image"
                        />
                    </div>
                    <h1 className="brand-name">Arellano University</h1>
                    <p className="brand-subtitle">ATHLETIRANK</p>
                </div>

                <div className="auth-form-container">
                    <h2 className="form-title">Welcome Back</h2>
                    
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}
                    
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email:</label>
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password:</label>
                            <input
                                type="password"
                                name="password"
                                className="form-input"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        <div className="forgot-password-link">
                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="forgot-password-btn"
                            >
                                Forgot Password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                    <Link 
                        to="/" 
                        className="back-to-home-btn"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgotPassword && (
                <div className="modal-overlay" onClick={() => setShowForgotPassword(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Reset Password</h2>
                        <p className="modal-description">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>
                        
                        {resetMessage && (
                            <div className={`message ${resetMessage.includes('sent') ? 'success-message' : 'error-message'}`}>
                                {resetMessage}
                            </div>
                        )}
                        
                        <form onSubmit={handleForgotPassword}>
                            <div className="form-group">
                                <label className="form-label">Email:</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                            
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => {
                                        setShowForgotPassword(false);
                                        setResetEmail('');
                                        setResetMessage('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={resetLoading}
                                >
                                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;