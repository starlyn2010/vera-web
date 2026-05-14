import axios from 'axios';

const isElectron = window.electronAPI !== undefined;
const baseURL = isElectron ? 'http://localhost:5000/api' : '/api';

const api = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to add Auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error(`Unauthorized request to: ${error.config?.url}`);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('unauthorized'));
        }
        return Promise.reject(error);
    }
);

export default api;

