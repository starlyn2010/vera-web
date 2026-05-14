import React, { useContext, useState } from 'react';
import { Check, Zap, Crown, Shield, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Subscription = () => {
    const containerRef = React.useRef();
    const { user, setUser } = useContext(AuthContext);
    const [loadingPlan, setLoadingPlan] = useState(null);

    useGSAP(() => {
        gsap.from(".plan-card", {
            y: 50,
            opacity: 0,
            duration: 1,
            stagger: 0.2,
            ease: "power4.out"
        });
    }, { scope: containerRef });

    const handleUpgrade = async (planName) => {
        if (user.plan === planName || loadingPlan) return;
        setLoadingPlan(planName);
        try {
            await api.patch('/auth/plan', { plan: planName });
            const updatedUser = { ...user, plan: planName };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // Success animation
            gsap.to(`.card-${planName.replace(' ', '-')}`, {
                scale: 1.05,
                duration: 0.3,
                yoyo: true,
                repeat: 1
            });
        } catch (error) {
            console.error("Error upgrading plan:", error);
        } finally {
            setLoadingPlan(null);
        }
    };

    const plans = [
        {
            id: 'Eco-Starter',
            name: "Eco-Starter",
            price: "Gratis",
            desc: "Para entusiastas del medio ambiente.",
            icon: Shield,
            features: ["Acceso a Jud (Llama 3)", "Dashboard Ambiental Básico", "Reportes Mensuales", "Soporte por Comunidad"],
            color: "border-leaf-900/30",
            button: "Plan Actual"
        },
        {
            id: 'Bio-Pro',
            name: "Bio-Pro",
            price: "$29/mes",
            desc: "Para empresas que buscan impacto real.",
            icon: Zap,
            features: ["Jud Pro (Sin límites)", "Analíticas en Tiempo Real", "Reportes Express Ilimitados", "API Access", "Soporte 24/7"],
            color: "border-leaf-400/50 shadow-glow",
            button: "Mejorar Ahora",
            highlight: true
        },
        {
            id: 'Enterprise',
            name: "Enterprise",
            price: "Personalizado",
            desc: "Soluciones a medida para corporaciones.",
            icon: Crown,
            features: ["Infraestructura Dedicada", "Auditorías Presenciales", "Gestión de Residuos Total", "SLA Garantizado"],
            color: "border-purple-500/30",
            button: "Contactar Ventas"
        }
    ];

    return (
        <div ref={containerRef} className="p-10 font-body bg-forest-void min-h-screen text-text-primary relative overflow-hidden">
             {/* Bioluminescent blobs */}
             <div className="absolute top-1/4 -left-20 w-96 h-96 bg-leaf-400/5 blur-[120px] rounded-full pointer-events-none"></div>
             
            <header className="mb-16 text-center z-10 relative">
                <p className="text-[10px] uppercase tracking-[0.4em] text-leaf-400/60 font-bold mb-2">Escalabilidad Ambiental</p>
                <h1 className="text-6xl font-display font-bold tracking-tight">Impulsa tu Impacto</h1>
                <p className="text-text-secondary mt-6 max-w-xl mx-auto italic text-lg leading-relaxed">
                    "La sostenibilidad no es solo una opción, es la arquitectura del mañana." — Jud
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto z-10 relative">
                {plans.map((plan, i) => (
                    <div 
                        key={i} 
                        className={`plan-card card-${plan.id} glass p-10 rounded-[40px] border transition-all hover:-translate-y-2 flex flex-col ${plan.color} ${plan.highlight ? 'bg-forest-elevated' : ''} ${user?.plan === plan.id ? 'ring-2 ring-leaf-400 ring-offset-4 ring-offset-forest-void' : ''}`}
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${plan.highlight ? 'bg-leaf-400 text-forest-void' : 'bg-forest-elevated text-leaf-400'}`}>
                            <plan.icon size={28} />
                        </div>
                        <h2 className="text-2xl font-display font-bold mb-2">{plan.name}</h2>
                        <div className="text-4xl font-black mb-4 tracking-tighter">{plan.price}</div>
                        <p className="text-[13px] text-text-secondary mb-10 leading-relaxed">{plan.desc}</p>
                        
                        <div className="space-y-4 mb-12 flex-1">
                            {plan.features.map((feat, j) => (
                                <div key={j} className="flex items-center gap-4 text-[13px] text-text-primary font-medium">
                                    <div className="w-5 h-5 rounded-full bg-leaf-400/10 flex items-center justify-center shrink-0">
                                        <Check size={12} className="text-leaf-400" />
                                    </div>
                                    {feat}
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => handleUpgrade(plan.id)}
                            disabled={user?.plan === plan.id || loadingPlan === plan.id}
                            className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-glow flex items-center justify-center gap-2 ${
                                user?.plan === plan.id 
                                ? 'bg-leaf-900/20 text-leaf-400/50 cursor-default border border-leaf-400/20' 
                                : plan.highlight 
                                ? 'bg-leaf-400 text-forest-void hover:bg-leaf-300 hover:scale-[1.02]' 
                                : 'bg-forest-elevated text-text-primary hover:bg-forest-hover border border-leaf-900/30'
                            }`}
                        >
                            {loadingPlan === plan.id ? <Loader2 size={18} className="animate-spin" /> : (user?.plan === plan.id ? 'Plan Actual' : plan.button)}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Subscription;
