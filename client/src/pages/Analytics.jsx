import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, PieChart, Activity, Download, ArrowUpRight, Zap, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Analytics = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const navigate = useNavigate();
    const isAdmin = user?.rol === 'admin';
    const [stats, setStats] = useState({
        ingresos_totales: 0,
        pedidos_totales: 0,
        totalProjects: 0,
        activeProjects: 0,
        averages: [],
        monthlyImpact: []
    });
    const [loading, setLoading] = useState(true);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [timeRange, setTimeRange] = useState('1M');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [salesRes, summaryRes] = await Promise.all([
                    api.get('/analytics/sales'),
                    api.get('/analytics/environmental') // Fixed endpoint name
                ]);
                
                setStats({
                    ...summaryRes.data,
                    ...salesRes.data
                });
            } catch (err) {
                console.error("Error fetching analytics:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const kpis = [
        { label: 'Ingresos Totales', value: `$${(stats.ingresos_totales || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-leaf-400', bg: 'bg-leaf-400/10' },
        { label: 'Proyectos Activos', value: stats.activeProjects || 0, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Eficiencia Eco', value: '94%', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        { label: 'Pedidos Bio', value: stats.pedidos_totales || 0, icon: PieChart, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    ];

    // Prepare chart data (fill missing months with 0)
    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-indexed
    const chartData = monthLabels.map((month, i) => {
        const dataPoint = stats.monthlyImpact?.find(a => parseInt(a.mes) === i + 1);
        return {
            label: month,
            monthIndex: i,
            val: dataPoint ? (dataPoint.valor || 0) : 0
        };
    });
    const hasAnyImpactData = chartData.some((p) => Number(p.val || 0) > 0);
    const fullChartData = chartData.map((p, i) => {
        if (hasAnyImpactData) return p;
        const base = Number(stats.averages?.[0]?.promedio || 58);
        const wave = Math.sin((i / 12) * Math.PI * 2) * 8;
        const trend = (i - 6) * 0.6;
        const val = Math.max(5, Math.min(95, base + wave + trend));
        return { ...p, val };
    });
    // Filter by timeRange
    const demoChartData = fullChartData.filter((p) => {
        if (timeRange === '7D') return p.monthIndex === currentMonth;
        if (timeRange === '1M') return p.monthIndex >= currentMonth - 1 && p.monthIndex <= currentMonth;
        return true; // 1Y = all
    });
    const maxChartVal = Math.max(...demoChartData.map((p) => Number(p.val || 0)), 0);
    const BAR_TRACK_PX = 224; // Tailwind h-56

    const handleGenerateReport = async () => {
        if (!isAdmin) {
            navigate('/reports');
            return;
        }

        setIsGeneratingReport(true);
        try {
            await api.post('/reports/generate', { tipo: 'Analitica', periodo: 'Mayo 2026' });
            addNotification('Reporte analítico generado con éxito', 'success');
            navigate('/reports');
        } catch (error) {
            const message = error.response?.data?.error || error.message;
            addNotification(`Error generando reporte: ${message}`, 'error');
        } finally {
            setIsGeneratingReport(false);
        }
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center bg-bg-void">
            <Loader2 className="w-12 h-12 text-leaf-400 animate-spin" />
        </div>
    );

    return (
        <div className="p-10 font-body bg-bg-void min-h-screen text-text-primary relative overflow-hidden">
             {/* Bioluminescent blobs */}
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-leaf-400/5 blur-[120px] rounded-full pointer-events-none"></div>

            <header className="flex justify-between items-end mb-12 z-10 relative">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-leaf-400/60 font-bold mb-2">Inteligencia de Datos</p>
                    <h1 className="text-5xl font-display font-bold tracking-tight">Analíticas de Impacto</h1>
                </div>
                <button
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport}
                    className="bg-leaf-400 text-forest-void px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-glow active:scale-95 disabled:opacity-70"
                >
                    {isGeneratingReport ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    {isAdmin ? (isGeneratingReport ? 'Generando...' : 'Generar Reporte') : 'Ver Reportes'}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 z-10 relative">
                {kpis.map((kpi, i) => (
                    <div key={i} className="glass p-8 rounded-[40px] border border-leaf-900/20 hover:border-leaf-400/30 transition-all group">
                        <div className={`${kpi.bg} ${kpi.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border border-current/10`}>
                            <kpi.icon size={22} />
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black text-leaf-400/40 uppercase tracking-widest mb-1">{kpi.label}</p>
                                <p className="text-3xl font-display font-bold stat-value">{kpi.value}</p>
                            </div>
                            <div className="bg-leaf-400/10 text-leaf-400 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowUpRight size={16} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 z-10 relative">
                <div className="lg:col-span-2 glass p-10 rounded-[48px] border border-leaf-900/20 shadow-2xl">
                    <div className="flex justify-between items-center mb-12">
                        <div>
                            <h3 className="text-2xl font-display font-bold">Histórico Ambiental</h3>
                            <p className="text-xs text-leaf-400/40 uppercase tracking-widest mt-1">Impacto acumulado por mes (Promedio %)</p>
                        </div>
                        <div className="flex gap-2">
                            {['7D', '1M', '1Y'].map(t => (
                                <button key={t} onClick={() => setTimeRange(t)} className={`px-5 py-2 rounded-xl text-[10px] font-black border transition-all ${t === timeRange ? 'bg-leaf-400 text-forest-void border-leaf-400 shadow-glow-sm' : 'bg-forest-elevated/50 text-leaf-400/60 border-leaf-900/20 hover:border-leaf-400/30'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="h-80 flex items-end justify-between gap-4 px-4 pb-4">
                        {demoChartData.map((point, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-4 group relative">
                                <div className="absolute -top-10 bg-leaf-400 text-forest-void text-[10px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-glow">
                                    {(point.val || 0).toFixed(1)}%
                                </div>
                                <div className="w-full h-56 flex items-end">
                                    <div
                                        className={`w-full rounded-t-2xl transition-all duration-1000 ease-out group-hover:shadow-glow-sm ${point.val > 0 ? 'bg-gradient-to-t from-leaf-900/40 to-leaf-400' : 'bg-leaf-900/10'}`}
                                        style={{
                                            height: maxChartVal > 0
                                                ? `${Math.max((Number(point.val || 0) / maxChartVal) * BAR_TRACK_PX, point.val > 0 ? 10 : 6)}px`
                                                : '6px',
                                            background: Number(point.val || 0) > 0
                                                ? 'linear-gradient(to top, var(--green-900), var(--green-400))'
                                                : 'var(--green-900)',
                                        }}
                                    ></div>
                                </div>
                                <span className="text-[10px] font-black text-leaf-400/20 group-hover:text-leaf-400 transition-colors uppercase">
                                    {point.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-8 flex flex-col">
                    <div className="glass p-10 rounded-[48px] border border-leaf-900/20 shadow-xl flex-1">
                        <h3 className="text-xl font-display font-bold mb-8">Ecosistema Bio</h3>
                        <div className="space-y-8">
                            {[
                                { name: 'Energía PHA', percent: 68, color: 'bg-leaf-400' },
                                { name: 'Circularidad', percent: 42, color: 'bg-blue-400' },
                                { name: 'Logística Verde', percent: 25, color: 'bg-purple-400' },
                            ].map((item) => (
                                <div key={item.name}>
                                    <div className="flex justify-between text-[11px] font-black mb-3 uppercase tracking-tighter">
                                        <span className="text-text-secondary">{item.name}</span>
                                        <span className="text-leaf-400">{item.percent}%</span>
                                    </div>
                                    <div className="w-full bg-forest-void h-2 rounded-full overflow-hidden border border-leaf-900/10">
                                        <div className={`${item.color} h-full transition-all duration-1000 shadow-glow-sm`} style={{ width: `${item.percent}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-leaf-400 p-10 rounded-[48px] text-forest-void relative overflow-hidden group shadow-glow border border-white/20">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-4 opacity-50 flex items-center gap-2">
                            <Zap size={14} /> Recomendación Jud
                        </p>
                        <p className="text-lg font-display font-bold leading-tight">
                            "Aumentar la circularidad de BioHands optimizará el margen operativo en 4.2%."
                        </p>
                        <button className="mt-8 flex items-center gap-3 text-[11px] font-black uppercase tracking-widest hover:translate-x-2 transition-transform">
                            Implementar Estrategia <ArrowUpRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
