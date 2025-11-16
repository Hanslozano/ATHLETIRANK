import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        try {
            const { user } = await authService.login(credentials);
            setUser(user);
            return { user };
        } catch (error) {
            throw error;
        }
    };

    const register = async (userData) => {
        try {
            return await authService.register(userData);
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const isAuthenticated = () => {
        return authService.isAuthenticated();
    };

    const value = {
        user,
        login,
        register,
        logout,
        isAuthenticated,
        isAdmin: user?.role === 'admin',
        isSportsCommittee: user?.role === 'sports_committee',
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};