import React, { useState, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf, Lock, User, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [isSuccess, setIsSuccess] = useState(false);
    const containerRef = React.useRef();

    useGSAP(() => {
        gsap.from(".login-anim", {
            y: 30,
            autoAlpha: 0,
            duration: 1,
            stagger: 0.1,
            ease: "power4.out"
        });
    }, { scope: containerRef });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(username, password);
            setIsSuccess(true);
            gsap.to(".login-card", {
                scale: 1.02,
                boxShadow: "0 0 50px rgba(82, 183, 136, 0.4)",
                duration: 0.5,
                ease: "power2.out"
            });
            setTimeout(() => navigate('/dashboard'), 1000);
        } catch (err) {
            setError('Credenciales inválidas. Verifica tu usuario y contraseña.');
            gsap.fromTo(".login-card", { x: -10 }, { x: 0, duration: 0.1, repeat: 5, yoyo: true });
        }
    };

    return (
        <div ref={containerRef} className="min-h-screen flex items-center justify-center bg-forest-void font-body relative overflow-y-auto py-12">
            {/* Animated Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-leaf-glow/5 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-leaf-400/5 blur-[100px] rounded-full"></div>
            
            <div 
                className="glass p-12 rounded-[40px] shadow-2xl w-full max-w-lg border border-leaf-900/30 relative z-10 login-card login-anim"
            >
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-forest-elevated rounded-2xl mb-6 border border-leaf-400/20 shadow-glow">
                        <Leaf className="text-leaf-400" size={32} />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-leaf-400/60 font-bold mb-2">Plataforma Clear Path</p>
                    <h1 className="text-4xl font-display font-bold text-white">Bienvenido de nuevo</h1>
                    <p className="text-sm text-text-secondary mt-3">Ingresa tus credenciales para acceder al bio-sistema.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-leaf-400/80 uppercase tracking-widest ml-1">Usuario</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text-tertiary group-focus-within:text-leaf-400 transition-colors">
                                <User size={18} />
                            </div>
                            <input 
                                type="text" 
                                className="w-full p-4 pl-14 rounded-2xl border border-leaf-900/30 bg-forest-elevated/50 text-white outline-none focus:border-leaf-400/50 focus:shadow-glow transition-all"
                                placeholder="Tu nombre de usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-leaf-400/80 uppercase tracking-widest ml-1">Contraseña</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text-tertiary group-focus-within:text-leaf-400 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input 
                                type="password" 
                                className="w-full p-4 pl-14 rounded-2xl border border-leaf-900/30 bg-forest-elevated/50 text-white outline-none focus:border-leaf-400/50 focus:shadow-glow transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold">
                            <ShieldCheck size={16} />
                            {error}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={isSuccess}
                        className={`w-full font-bold py-5 rounded-2xl transition-all duration-300 shadow-glow flex items-center justify-center gap-2 group ${
                            isSuccess ? 'bg-leaf-glow text-forest-void' : 'bg-leaf-400 hover:bg-leaf-300 text-forest-void'
                        }`}
                    >
                        {isSuccess ? (
                            <>
                                <CheckCircle2 size={18} className="animate-bounce" />
                                Acceso Concedido
                            </>
                        ) : (
                            <>
                                Acceder al Sistema
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
                
                <div className="mt-10 text-center">
                    <p className="text-xs text-text-tertiary">
                        ¿No tienes una cuenta? <Link to="/register" className="text-leaf-400 font-bold hover:underline">Regístrate gratis</Link>
                    </p>
                </div>
            </div>

            {/* Footer decoration */}
            <div className="absolute bottom-8 text-center w-full z-10">
                <p className="text-[9px] text-leaf-100/20 uppercase tracking-[0.3em] font-bold">
                    Seguridad BioHands Garantizada · 2026
                </p>
            </div>
        </div>
    );
};

export default Login;
