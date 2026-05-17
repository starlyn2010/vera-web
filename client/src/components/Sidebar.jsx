import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { assetUrl } from '../utils/assetUrl';
import { 
    LayoutDashboard, 
    FolderKanban, 
    FileText, 
    BarChart3, 
    Settings, 
    Package, 
    ShoppingCart, 
    LogOut,
    MessageSquare,
    Moon,
    Sun
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef();
    const roleLabel = user?.rol === 'admin' ? 'Administrador' : 'No admin';

    useGSAP(() => {
        gsap.from(".nav-anim", {
            x: -15,
            opacity: 0,
            duration: 0.6,
            stagger: 0.03,
            ease: "power2.out",
            clearProps: "opacity,transform"
        });
    }, { scope: containerRef });

    const navItems = [
        { name: 'Panel Principal', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Asistente Jud', path: '/chatbot', icon: MessageSquare, special: true },
        { name: 'Inventario', path: '/inventory', icon: Package },
        { name: 'Proyectos', path: '/projects', icon: FolderKanban },
        { name: 'Analíticas', path: '/analytics', icon: BarChart3 },
        { name: 'Reportes', path: '/reports', icon: FileText },
        { name: 'Órdenes', path: '/orders', icon: ShoppingCart },
        { name: 'Configuración', path: '/settings', icon: Settings },
    ];

    return (
        <>
            {/* Mobile Toggle */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-3 bg-forest-elevated border border-leaf-900/30 rounded-xl text-leaf-400 shadow-glow"
            >
                <div className="w-5 h-0.5 bg-current mb-1"></div>
                <div className="w-5 h-0.5 bg-current mb-1"></div>
                <div className="w-5 h-0.5 bg-current"></div>
            </button>

            <aside 
                ref={containerRef} 
                className={`fixed md:relative z-40 w-72 bg-forest-primary border-r border-leaf-900/30 h-screen flex flex-col font-body transition-transform duration-500 ease-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
            >
            {/* Background Glow */}
            <div className="absolute top-0 -left-24 w-64 h-64 bg-leaf-400/5 blur-[100px] pointer-events-none"></div>
            
            <div className="p-8 pb-4 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <img src={assetUrl('/logo.png')} className="w-10 h-10 rounded-xl object-cover border border-leaf-400/20" alt="Logo" />
                    <div>
                        <h1 className="text-xl font-display font-bold leading-tight tracking-tight text-text-primary">Clear Path</h1>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-leaf-400/60 font-bold">Huella Verde</p>
                    </div>
                </div>
                <button
                    onClick={toggleTheme}
                    className="w-8 h-8 rounded-lg bg-forest-elevated border border-leaf-900/30 flex items-center justify-center text-leaf-400 hover:text-white transition-all"
                    title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                    {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>
            </div>

            <nav className="flex-1 relative z-10 overflow-y-auto px-6 py-4">
                <ul className="space-y-2">
                    {navItems.map((item) => (
                        <li key={item.name}>
                            <NavLink 
                                to={item.path}
                                className={({ isActive }) => 
                                    `flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 group nav-anim ${
                                        isActive 
                                        ? 'bg-leaf-700/20 border border-leaf-400/30 text-leaf-400' 
                                        : 'text-text-secondary hover:text-text-primary hover:bg-forest-hover border border-transparent hover:border-leaf-400/20'
                                    } ${item.special ? 'mb-6 mt-2 bg-forest-elevated border border-leaf-900/50 shadow-lg' : ''}`
                                }
                            >
                                <item.icon
                                    size={18}
                                    className={`transition-transform duration-300 group-hover:scale-110 ${item.special ? 'text-leaf-400' : 'text-text-tertiary group-hover:text-leaf-400 opacity-80 group-hover:opacity-100'}`}
                                />
                                <span className={`text-[13px] font-medium truncate ${item.special ? 'font-bold' : ''}`}>{item.name}</span>
                                {item.special && <span className="ml-auto w-2 h-2 bg-leaf-glow rounded-full animate-pulse shadow-[0_0_8px_var(--green-glow)]"></span>}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="pt-8 border-t border-leaf-900/30 relative z-10">
                <div className="bg-forest-elevated/50 p-5 rounded-[24px] border border-leaf-900/30 mb-6 group hover:border-leaf-400/30 transition-all">
                    <p className="text-[10px] font-black text-leaf-400/40 uppercase tracking-widest mb-3">Socio Ambiental</p>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-leaf-400 text-forest-void rounded-xl flex items-center justify-center font-black text-sm shadow-glow transition-transform group-hover:scale-105">
                            {user?.nombre?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[13px] font-black text-text-primary truncate leading-tight mb-1">{user?.nombre || 'Explorador'}</p>
                            <span className="px-2 py-0.5 rounded-full bg-leaf-400/10 border border-leaf-400/30 text-[9px] font-black text-leaf-400 uppercase tracking-widest whitespace-nowrap">
                                {roleLabel}
                            </span>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={logout}
                    className="flex items-center gap-4 p-4 w-full rounded-2xl hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-all duration-300 group"
                >
                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
        
        {/* Overlay */}
        {isOpen && (
            <div 
                onClick={() => setIsOpen(false)}
                className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity"
            ></div>
        )}
        </>
    );
};

export default Sidebar;
