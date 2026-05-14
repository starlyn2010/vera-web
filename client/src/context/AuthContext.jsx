import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (error) {
                console.error('Error parsing saved user', error);
                logout();
            }
        }
        setLoading(false);

        // Global handler for 401 errors
        const handleUnauthorized = () => {
            logout();
        };
        window.addEventListener('unauthorized', handleUnauthorized);
        return () => window.removeEventListener('unauthorized', handleUnauthorized);
    }, []);

    const login = async (nombre_usuario, password) => {
        const res = await api.post('/auth/login', { nombre_usuario, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
