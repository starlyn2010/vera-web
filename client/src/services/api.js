import axios from 'axios';

const isFileProtocol = typeof window !== 'undefined' && window.location?.protocol === 'file:';
const isElectron = isFileProtocol || window.electronAPI !== undefined;

// Use 127.0.0.1 to avoid IPv6/localhost resolution edge cases on Windows.
const baseURL = isElectron ? 'http://127.0.0.1:5000/api' : '/api';

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
