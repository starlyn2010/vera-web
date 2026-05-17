import React, { useState, useContext, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Globe, Bell, Shield, Database, Moon, Sun, Save, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import gsap from 'gsap';
import api from '../services/api';

const Settings = () => {
    const { user, setUser } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    
    // Form state
    const [formData, setFormData] = useState({
        nombre: user?.nombre || '',
        email: user?.email || ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                nombre: user.nombre,
                email: user.email
            });
        }
    }, [user]);

    const roleLabel = user?.rol === 'admin' ? 'Administrador' : 'No administrador';

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Simulated profile update (assuming an endpoint exists or we'll create it)
            // For now, update local context to reflect change
            const updatedUser = { ...user, nombre: formData.nombre, email: formData.email };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            setSuccessMsg('Configuración guardada con éxito');
            setTimeout(() => setSuccessMsg(''), 3000);
            
            gsap.fromTo(".success-banner", 
                { y: -20, opacity: 0 }, 
                { y: 0, opacity: 1, duration: 0.5, ease: "back.out" }
            );
        } catch (error) {
            console.error("Error updating settings:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-10 font-body bg-forest-void min-h-screen text-text-primary relative overflow-hidden">
            {/* Bioluminescent background blobs */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-leaf-glow/5 blur-[120px] rounded-full pointer-events-none"></div>
            
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12 z-10 relative">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-leaf-400/60 font-bold mb-2">Preferencias</p>
                    <h1 className="text-5xl font-display font-bold text-text-primary tracking-tight">Panel de Control</h1>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-end w-full lg:w-auto">
                    {successMsg && (
                        <div className="success-banner flex items-center gap-2 bg-leaf-400/10 border border-leaf-400/30 px-4 py-2 rounded-xl text-leaf-400 text-sm font-bold">
                            <CheckCircle2 size={16} /> {successMsg}
                        </div>
                    )}
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-leaf-400 text-forest-void px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-glow hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 relative">
                
                {/* Profile Card */}
                <div className="lg:col-span-7 bg-forest-elevated/40 glass p-10 rounded-[40px] border border-leaf-900/20 shadow-2xl">
                    <h3 className="text-2xl font-display font-bold mb-10 flex items-center gap-3">
                        <User size={24} className="text-leaf-400" /> Perfil de Usuario
                    </h3>
                    
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-leaf-400/50 uppercase tracking-widest ml-1">Nombre Completo</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-leaf-400/30 group-focus-within:text-leaf-400 transition-colors" size={20} />
                                    <input 
                                        type="text" 
                                        className="w-full bg-forest-void/50 border border-leaf-900/30 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-leaf-400/50 outline-none transition-all"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-leaf-400/50 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-leaf-400/30 group-focus-within:text-leaf-400 transition-colors" size={20} />
                                    <input 
                                        type="email" 
                                        className="w-full bg-forest-void/50 border border-leaf-900/30 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-leaf-400/50 outline-none transition-all"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-forest-void/30 border border-leaf-900/20 flex justify-between items-center group hover:border-leaf-400/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-forest-elevated border border-leaf-900/20 flex items-center justify-center text-leaf-400">
                                    <Shield size={22} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-text-primary">Rol del Sistema</p>
                                    <p className="text-xs text-text-tertiary">Acceso actual: <span className="text-leaf-400 font-black uppercase">{roleLabel}</span></p>
                                </div>
                            </div>
                            <span className="text-[11px] font-black text-leaf-400 uppercase tracking-widest">{user?.rol || 'cliente'}</span>
                        </div>
                    </div>
                </div>

                {/* Notifications & System Card */}
                <div className="lg:col-span-5 flex flex-col gap-8">
                    <div className="bg-forest-elevated/40 glass p-8 rounded-[40px] border border-leaf-900/20 shadow-xl">
                        <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-3">
                            <Bell size={20} className="text-leaf-400" /> Notificaciones
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Alertas de Impacto', val: true },
                                { label: 'Actualizaciones de Jud AI', val: false },
                                { label: 'Reportes Automáticos', val: true },
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-forest-void/30 border border-leaf-900/10">
                                    <span className="text-xs font-bold text-text-secondary">{item.label}</span>
                                    <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${item.val ? 'bg-leaf-400' : 'bg-forest-elevated border border-leaf-900/30'}`}>
                                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${item.val ? 'right-1 bg-forest-void' : 'left-1 bg-leaf-900/50'}`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-forest-elevated/40 glass p-8 rounded-[40px] border border-leaf-900/20 shadow-xl flex-1">
                        <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-3">
                            <Globe size={20} className="text-leaf-400" /> Sistema
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-forest-void/30 border border-leaf-900/10 flex justify-between items-center">
                                <span className="text-xs font-bold text-text-secondary">Idioma</span>
                                <select className="bg-transparent text-xs font-black text-leaf-400 outline-none cursor-pointer uppercase tracking-tighter">
                                    <option className="bg-forest-void">Español</option>
                                    <option className="bg-forest-void">English</option>
                                </select>
                            </div>
                            <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex justify-between items-center group hover:bg-red-500/10 transition-all cursor-pointer">
                                <div>
                                    <p className="text-xs font-bold text-red-400">Eliminar Cuenta</p>
                                    <p className="text-[9px] text-red-400/50 font-bold uppercase tracking-tighter">Acción irreversible</p>
                                </div>
                                <Trash2 size={18} className="text-red-500/40 group-hover:text-red-500 transition-colors" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Settings;
