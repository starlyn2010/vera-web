import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Dialog = ({ isOpen, onClose, title, children }) => {
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 z-0 bg-black/60 backdrop-blur-md"
                    />
                    
                    {/* Modal Content */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        className="relative z-10 w-full max-w-xl bg-forest-elevated border border-leaf-400/20 rounded-[32px] shadow-2xl shadow-leaf-400/10 overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        {/* Decorative Gradient */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-leaf-700 via-leaf-400 to-leaf-700" />
                        
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-8 shrink-0">
                                <h3 className="text-2xl font-display font-bold text-text-primary tracking-tight">{title}</h3>
                                <button 
                                    onClick={onClose}
                                    aria-label="Cerrar"
                                    className="p-2 hover:bg-leaf-400/10 rounded-full transition-colors text-leaf-400/60 hover:text-leaf-400"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default Dialog;
