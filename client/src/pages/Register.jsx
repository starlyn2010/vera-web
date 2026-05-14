import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf, Lock, User, Mail, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import api from '../services/api';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const navigate = useNavigate();
    const containerRef = useRef();

    useGSAP(() => {
        const tl = gsap.timeline();
        tl.from(".reveal-item", {
            y: 30,
            autoAlpha: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out"
        });
    }, { scope: containerRef });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return setError('Las contraseñas no coinciden.');
        }

        setLoading(true);
        setError('');

        try {
            await api.post('/auth/register', {
                nombre_usuario: formData.username,
                correo_electronico: formData.email,
                password: formData.password
            });
            setIsRegistered(true);
            gsap.to(".register-card", {
                scale: 1.02,
                boxShadow: "0 0 50px rgba(82, 183, 136, 0.4)",
                duration: 0.5
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar el usuario.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={containerRef} className="min-h-screen flex items-center justify-center bg-forest-void font-body relative overflow-y-auto py-12">
            {/* Background Glows */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-leaf-glow/5 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-leaf-400/5 blur-[100px] rounded-full"></div>
            
            <div className="glass p-12 rounded-[40px] shadow-2xl w-full max-w-lg border border-leaf-900/30 relative z-10 register-card">
                {isRegistered ? (
                    <div className="text-center py-8 reveal-item">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-leaf-glow/20 rounded-full mb-8 border border-leaf-400/40 shadow-glow animate-pulse">
                            <CheckCircle2 className="text-leaf-glow" size={40} />
                        </div>
                        <h2 className="text-3xl font-display font-bold text-white mb-4">¡Registro Exitoso!</h2>
                        <p className="text-text-secondary mb-10 leading-relaxed">Tu cuenta en Clear Path ha sido creada. Ahora puedes acceder al bio-sistema.</p>
                        
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full bg-leaf-400 hover:bg-leaf-300 text-forest-void font-bold py-5 rounded-2xl transition-all shadow-glow flex items-center justify-center gap-2"
                        >
                            Continuar al Inicio
                            <ArrowRight size={18} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-10 reveal-item">
                            <div className="inline-flex items-center justify-center w-14 h-14 bg-forest-elevated rounded-2xl mb-6 border border-leaf-400/20 shadow-glow">
                                <Leaf className="text-leaf-400" size={28} />
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.4em] text-leaf-400/60 font-bold mb-2">Únete a Clear Path</p>
                            <h1 className="text-4xl font-display font-bold text-white">Crea tu cuenta</h1>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2 reveal-item">
                                <label className="text-[10px] font-bold text-leaf-400/80 uppercase tracking-widest ml-1">Nombre de Usuario</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text-tertiary group-focus-within:text-leaf-400 transition-colors">
                                        <User size={16} />
                                    </div>
                                    <input 
                                        type="text" 
                                        className="w-full p-3.5 pl-13 rounded-2xl border border-leaf-900/30 bg-forest-elevated/50 text-white text-sm outline-none focus:border-leaf-400/50 focus:shadow-glow transition-all"
                                        placeholder="usuario_eco"
                                        value={formData.username}
                                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 reveal-item">
                                <label className="text-[10px] font-bold text-leaf-400/80 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text-tertiary group-focus-within:text-leaf-400 transition-colors">
                                        <Mail size={16} />
                                    </div>
                                    <input 
                                        type="email" 
                                        className="w-full p-3.5 pl-13 rounded-2xl border border-leaf-900/30 bg-forest-elevated/50 text-white text-sm outline-none focus:border-leaf-400/50 focus:shadow-glow transition-all"
                                        placeholder="email@ejemplo.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 reveal-item">
                                    <label className="text-[10px] font-bold text-leaf-400/80 uppercase tracking-widest ml-1">Contraseña</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text-tertiary group-focus-within:text-leaf-400 transition-colors">
                                            <Lock size={16} />
                                        </div>
                                        <input 
                                            type="password" 
                                            className="w-full p-3.5 pl-13 rounded-2xl border border-leaf-900/30 bg-forest-elevated/50 text-white text-sm outline-none focus:border-leaf-400/50 focus:shadow-glow transition-all"
                                            placeholder="••••"
                                            value={formData.password}
                                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 reveal-item">
                                    <label className="text-[10px] font-bold text-leaf-400/80 uppercase tracking-widest ml-1">Confirmar</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text-tertiary group-focus-within:text-leaf-400 transition-colors">
                                            <ShieldCheck size={16} />
                                        </div>
                                        <input 
                                            type="password" 
                                            className="w-full p-3.5 pl-13 rounded-2xl border border-leaf-900/30 bg-forest-elevated/50 text-white text-sm outline-none focus:border-leaf-400/50 focus:shadow-glow transition-all"
                                            placeholder="••••"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold reveal-item">
                                    {error}
                                </div>
                            )}
                            
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-leaf-400 hover:bg-leaf-300 active:scale-[0.98] text-forest-void font-bold py-5 rounded-2xl transition-all duration-300 shadow-glow flex items-center justify-center gap-2 group mt-8 disabled:opacity-50 relative z-30 border-2 border-leaf-400/50"
                            >
                                {loading ? 'Procesando...' : 'Crear Cuenta'}
                                {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                            </button>
                        </form>
                        
                        <div className="mt-8 text-center reveal-item">
                            <p className="text-xs text-text-tertiary">
                                ¿Ya tienes una cuenta? <Link to="/login" className="text-leaf-400 font-bold hover:underline">Inicia Sesión</Link>
                            </p>
                        </div>
                    </>
                )}
            </div>

            <div className="absolute bottom-8 text-center w-full reveal-item">
                <p className="text-[9px] text-leaf-100/20 uppercase tracking-[0.3em] font-bold flex items-center justify-center gap-2">
                    <Sparkles size={10} /> Empieza tu camino hacia la sostenibilidad hoy
                </p>
            </div>
        </div>
    );
};

export default Register;
