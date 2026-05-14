import React, { createContext, useState, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((message, type = 'success') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    }, []);

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {notifications.map((n) => (
                        <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl flex items-center gap-4 min-w-[300px] backdrop-blur-xl ${
                                n.type === 'success' ? 'bg-leaf-900/40 border-leaf-400/30 text-leaf-400' : 
                                n.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 
                                'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            }`}
                        >
                            <div className="shrink-0">
                                {n.type === 'success' && <CheckCircle2 size={24} />}
                                {n.type === 'error' && <AlertCircle size={24} />}
                                {n.type === 'info' && <Info size={24} />}
                            </div>
                            <p className="text-sm font-bold flex-1">{n.message}</p>
                            <button 
                                onClick={() => removeNotification(n.id)}
                                className="opacity-40 hover:opacity-100 transition-opacity p-1"
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within NotificationProvider');
    return context;
};
