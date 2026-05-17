import React, { useContext, useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Share2, Search, Plus, Loader2, Leaf, ShieldCheck, Globe, Activity, Printer, TrendingUp } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import gsap from 'gsap';
import html2pdf from 'html2pdf.js';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import Dialog from '../components/Dialog';
import { getVerifyUrl } from '../utils/publicVerifyUrl';

const Reports = () => {
    const { addNotification } = useNotification();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.rol === 'admin';
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentReportData, setCurrentReportData] = useState(null);
    const [stats, setStats] = useState({ env: null, sales: null });
    const [isCustomReportOpen, setIsCustomReportOpen] = useState(false);
    const [customReportPrompt, setCustomReportPrompt] = useState("");
    const reportTemplateRef = useRef(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const results = await Promise.allSettled([
                api.get('/reports'),
                api.get('/analytics/environmental'),
                api.get('/analytics/sales')
            ]);
            
            if (results[0].status === 'fulfilled') {
                setReports(results[0].value.data);
            } else {
                console.error("Error fetching reports:", results[0].reason);
                addNotification('Error al cargar la lista de reportes', 'error');
            }

            const envData = results[1].status === 'fulfilled' ? results[1].value.data : null;
            const salesData = results[2].status === 'fulfilled' ? results[2].value.data : null;
            
            setStats({ env: envData, sales: salesData });

            if (results[1].status === 'rejected' || results[2].status === 'rejected') {
                addNotification('Algunas métricas no se pudieron sincronizar', 'warning');
            }
        } catch (err) {
            console.error("Critical error fetching report data:", err);
            addNotification('Error crítico al sincronizar centro de reportes', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleGenerate = async (tipo, periodo) => {
        setIsGenerating(true);
        try {
            const response = await api.post('/reports/generate', { tipo, periodo });
            
            // Success animation
            gsap.to(".generate-btn", { scale: 1.05, duration: 0.2, yoyo: true, repeat: 1 });
            
            addNotification(`Reporte ${tipo} generado con éxito`, 'success');
            
            // Refetch reports list
            const updated = await api.get('/reports');
            setReports(updated.data);

            // Auto-trigger download for the newly generated report
            handleDownload({
                id_reporte: response.data.reportId,
                tipo,
                periodo,
                fecha_generacion: new Date().toISOString(),
                archivo_path: response.data.path
            });
        } catch (err) {
            const message = err.response?.data?.error || err.message;
            addNotification("Error generando reporte: " + message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCustomReportSubmit = async (e) => {
        e.preventDefault();
        if (!customReportPrompt.trim()) return;

        setIsGenerating(true);
        try {
            // Ask Jud for report data
            const response = await api.post('/chatbot/message', { 
                message: `Genera un resumen técnico para un reporte sobre: ${customReportPrompt}. Por favor, responde con un párrafo de resumen ejecutivo y 3 métricas clave en formato clave:valor.`
            });

            const judReply = response.data.reply;
            
            // Simple parsing of Jud's reply for the report
            const tempReport = {
                id_reporte: 'JUD-' + Date.now().toString().slice(-6),
                tipo: 'Personalizado',
                periodo: new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
                fecha_generacion: new Date().toISOString(),
                summary: judReply
            };

            setCurrentReportData(tempReport);
            setIsCustomReportOpen(false);
            setCustomReportPrompt("");
            
            addNotification("Jud ha construido tu reporte a medida", "success");

            // Trigger download after state update
            setTimeout(() => {
                handleDownload(tempReport);
            }, 500);

        } catch (err) {
            addNotification("Jud no pudo procesar el reporte: " + err.message, "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async (report) => {
        setCurrentReportData(report);
        
        // Wait for state update and template to be ready
        setTimeout(() => {
            const element = reportTemplateRef.current;
            const opt = {
                // Use margin 0 so the A4-sized template isn't cropped by pdf margins.
                margin:       0,
                filename:     `BioHands_Report_${report.tipo}_${report.periodo}.pdf`.replace(/\s+/g, '_'),
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
                jsPDF:        { unit: 'cm', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['css', 'legacy'] }
            };

            html2pdf().set(opt).from(element).save().then(() => {
                setCurrentReportData(null);
            });
        }, 500);
    };

    const handleShare = async (report) => {
        const text = `Reporte ${report.tipo} - ${report.periodo}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: text, text });
            } else {
                await navigator.clipboard.writeText(text);
                addNotification('Referencia del reporte copiada', 'success');
            }
        } catch (err) {
            addNotification('No se pudo compartir el reporte', 'error');
        }
    };

    const filteredReports = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return reports.filter(r => {
            const tipo = (r.tipo || '').toLowerCase();
            const periodo = (r.periodo || '').toLowerCase();
            const combined = `reporte ${tipo} - ${periodo}`;
            return tipo.includes(term) || periodo.includes(term) || combined.includes(term);
        });
    }, [reports, searchTerm]);

    if (loading) return (
        <div className="h-full flex flex-col items-center justify-center bg-forest-void">
            <Loader2 className="w-10 h-10 text-leaf-400 animate-spin" aria-label="Cargando reportes" />
            <p className="mt-4 text-leaf-400 font-display animate-pulse">Sincronizando Archivos...</p>
        </div>
    );

    return (
            <div className="p-8 font-body bg-forest-void min-h-screen text-text-primary relative">
            {/* HIDDEN PDF TEMPLATE - Real Data Driven */}
            <div className="absolute left-[-9999px] top-0">
                <div
                    ref={reportTemplateRef}
                    className="w-[21cm] min-h-[29.7cm] bg-white text-[#0D1712] p-16 flex flex-col font-sans box-border"
                    style={{ pageBreakInside: 'avoid' }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-[#52B788] pb-10 mb-12">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <img src="/logo.png" className="w-10 h-10 rounded-xl object-cover" alt="Logo" />
                                <h1 className="text-2xl font-bold tracking-tighter uppercase text-[#0D1712]">BioHands <span className="text-[#52B788]">Clear Path</span></h1>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tecnología de Impacto Ambiental</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-[#52B788] mb-1">ID REPORTE: {currentReportData?.id_reporte || 'TMP-' + Date.now().toString().slice(-6)}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>

                    {/* Report Info */}
                    <div className="mb-12">
                        <div className="bg-[#f0f9f4] p-8 rounded-2xl border border-[#52B788]/20">
                            <p className="text-[10px] uppercase font-black text-[#52B788] tracking-widest mb-2">Documento Oficial</p>
                            <h2 className="text-4xl font-bold text-[#0D1712] mb-4">Reporte de {currentReportData?.tipo || 'Certificación'}</h2>
                            <div className="flex gap-10">
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-gray-400">Periodo</p>
                                    <p className="text-sm font-bold">{currentReportData?.periodo || 'Mayo 2026'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-gray-400">Generado Por</p>
                                    <p className="text-sm font-bold">Inteligencia Jud</p>
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-gray-400">Estado</p>
                                    <p className="text-xs font-bold text-white bg-[#52B788] px-3 py-1 rounded-full inline-block mt-1">VERIFICADO</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Executive Summary */}
                    <div className="mb-12">
                        <h3 className="text-sm font-black uppercase tracking-widest text-[#0D1712] mb-6 flex items-center gap-2">
                            <ShieldCheck size={16} className="text-[#52B788]" /> Resumen Ejecutivo
                        </h3>
                        <div className="text-[13px] leading-relaxed text-gray-600 whitespace-pre-wrap">
                            {currentReportData?.summary || `Este documento certifica el análisis detallado de las operaciones de Clear Path durante el periodo seleccionado. 
                            BioHands garantiza que todos los datos presentados han sido auditados por el motor de inteligencia Jud, 
                            asegurando la trazabilidad total de las métricas registradas en el sistema Bio-Core.`}
                        </div>
                    </div>

                    {/* Data Section - REAL DATA (Only for standard reports) */}
                    {currentReportData?.tipo !== 'Personalizado' && (
                        <div className="grid grid-cols-2 gap-8 mb-12">
                            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
                            <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4">Métricas de Rendimiento</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-700">Proyectos Activos</span>
                                    <span className="text-xs font-bold text-[#52B788]">{stats.env?.activeProjects || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-700">Pedidos Totales</span>
                                    <span className="text-xs font-bold text-[#52B788]">{stats.sales?.pedidos_totales || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-700">Ingresos Proyectados</span>
                                    <span className="text-xs font-bold text-[#52B788]">${(stats.sales?.ingresos_totales || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-[#0D1712] rounded-xl relative overflow-hidden">
                            <h4 className="text-[10px] font-black uppercase text-[#52B788] mb-4">Sostenibilidad</h4>
                            <div className="flex flex-col items-center justify-center h-20">
                                <Globe size={60} className="text-[#52B788] opacity-10 absolute" />
                                <span className="text-2xl font-bold text-white relative z-10">
                                    {stats.env?.averages?.[0]?.promedio?.toFixed(1) || '0.0'}%
                                </span>
                                <span className="text-[8px] font-bold text-[#52B788] uppercase tracking-widest mt-1">Bio-Eficiencia</span>
                            </div>
                            </div>
                        </div>
                    )}

                    {/* Footer with QR */}
                    <div
                        className="mt-auto pt-10 border-t border-gray-100 flex justify-between items-center pdf-avoid-break"
                        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                    >
                        <div className="text-[10px] text-gray-400 font-medium">
                            © 2026 BioHands Corporation. Reservados todos los derechos.<br />
                            Generado automáticamente por Clear Path Jud Engine.
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <QRCodeSVG
                                value={getVerifyUrl(currentReportData?.id_reporte || 'preview')}
                                size={72}
                                bgColor="#ffffff"
                                fgColor="#0D1712"
                                level="M"
                                includeMargin={true}
                            />
                            <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest">Escanear para verificar</span>
                        </div>
                    </div>
                </div>
            </div>

            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-leaf-400/60 font-bold mb-1">Documentación</p>
                    <h2 className="text-4xl font-display font-bold">Centro de Reportes</h2>
                </div>
                <div className="bg-leaf-400/10 border border-leaf-400/20 px-4 py-2 rounded-xl flex items-center gap-2">
                    <span className="w-2 h-2 bg-leaf-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-bold text-leaf-400 uppercase tracking-widest">Motor Jud Activo</span>
                </div>
            </header>

            <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-3' : ''} gap-8`}>
                <div className={`${isAdmin ? 'lg:col-span-2' : ''} space-y-6`}>
                    <div className="bg-forest-elevated/50 p-4 border border-leaf-900/30 rounded-2xl flex items-center shadow-lg backdrop-blur-sm focus-within:border-leaf-400/40 transition-all">
                        <Search className="text-leaf-400/60 ml-2" size={18} />
                        <input 
                            type="text" 
                            aria-label="Buscar reportes"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar en el archivo de reportes..." 
                            className="w-full p-3 bg-transparent outline-none text-sm ml-2 text-text-primary placeholder:text-leaf-100/20" 
                        />
                    </div>

                    <div className="glass rounded-[32px] border border-leaf-900/20 shadow-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-leaf-900/10 border-b border-leaf-900/20">
                                <tr>
                                    <th className="p-6 text-[10px] font-bold text-leaf-400/60 uppercase tracking-widest">Documento</th>
                                    <th className="p-6 text-[10px] font-bold text-leaf-400/60 uppercase tracking-widest text-center">Categoría</th>
                                    <th className="p-6 text-[10px] font-bold text-leaf-400/60 uppercase tracking-widest">Generado</th>
                                    <th className="p-6 text-[10px] font-bold text-leaf-400/60 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-leaf-900/10">
                                {filteredReports.length > 0 ? filteredReports.map((report) => (
                                    <tr key={report.id_reporte} className="hover:bg-leaf-900/5 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-leaf-900/20 text-leaf-400 p-2.5 rounded-xl border border-leaf-400/10 group-hover:scale-110 transition-transform">
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-text-primary text-[13px]">Reporte {report.tipo}</p>
                                                    <p className="text-[9px] text-leaf-400/40 font-black uppercase tracking-tighter mt-0.5">{report.periodo}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className="text-[9px] font-bold uppercase text-leaf-300 bg-leaf-400/10 border border-leaf-400/20 px-3 py-1 rounded-full">
                                                {report.tipo}
                                            </span>
                                        </td>
                                        <td className="p-6 text-[11px] text-text-secondary font-medium">
                                            {new Date(report.fecha_generacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleDownload(report)} 
                                                    aria-label={`Descargar ${report.tipo}`}
                                                    className="p-2 bg-leaf-400/10 text-leaf-400 rounded-lg hover:bg-leaf-400 hover:text-forest-void transition-all border border-leaf-400/20"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleShare(report)}
                                                    aria-label="Compartir reporte"
                                                    className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20"
                                                >
                                                    <Share2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="p-20 text-center text-leaf-400/20 font-display italic text-sm">
                                            No se han encontrado reportes coincidentes.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isAdmin && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-bg-elevated to-bg-void p-10 rounded-[40px] text-text-primary shadow-2xl border border-leaf-900/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-leaf-glow/5 blur-[60px] group-hover:bg-leaf-glow/10 transition-colors"></div>
                        <h3 className="text-xl font-display font-bold mb-4 relative z-10 flex items-center gap-3">
                            <Plus size={20} className="text-leaf-400" /> Nuevo Reporte
                        </h3>
                        <p className="text-[11px] text-text-secondary mb-8 leading-relaxed relative z-10">Genera documentación técnica instantánea con el motor Jud.</p>
                        
                        <div className="space-y-4 relative z-10">
                            {[
                                { name: 'Impacto Ambiental', type: 'Ambiental', icon: Activity },
                                { name: 'Resumen de Ventas', type: 'Ventas', icon: Printer },
                                { name: 'Analítica Avanzada', type: 'Analitica', icon: TrendingUp },
                            ].map((btn, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleGenerate(btn.type, 'Mayo 2026')}
                                    disabled={isGenerating}
                                    className="w-full bg-forest-void/50 hover:bg-forest-void border border-leaf-900/30 p-4 rounded-2xl flex justify-between items-center transition-all group/btn hover:border-leaf-400/30 generate-btn"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-leaf-900/20 rounded-lg text-leaf-400">
                                            <btn.icon size={14} />
                                        </div>
                                        <span className="font-bold text-[11px]">{btn.name}</span>
                                    </div>
                                    {isGenerating ? <Loader2 size={14} className="animate-spin text-leaf-400" /> : <Plus size={14} className="text-leaf-400 group-hover/btn:rotate-90 transition-transform" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass p-10 rounded-[40px] border border-leaf-900/20 text-center relative group">
                        <div className="w-16 h-16 bg-leaf-900/20 text-leaf-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-leaf-400/20 shadow-glow group-hover:scale-110 transition-transform">
                            <FileText size={32} />
                        </div>
                        <h4 className="text-lg font-display font-bold text-text-primary">¿Reporte a Medida?</h4>
                        <p className="text-[10px] text-text-secondary mt-3 mb-8 leading-relaxed px-4">Describe los datos específicos que necesitas y Jud construirá el documento para ti.</p>
                        <button
                            onClick={() => setIsCustomReportOpen(true)}
                            className="w-full bg-leaf-400 text-forest-void font-bold py-4 rounded-2xl hover:bg-leaf-300 transition-all shadow-glow active:scale-95"
                        >
                            Consultar con Jud
                        </button>
                    </div>
                </div>
                )}
            </div>

            {/* CUSTOM REPORT MODAL */}
            <Dialog 
                isOpen={isCustomReportOpen} 
                onClose={() => setIsCustomReportOpen(false)} 
                title="Reporte a Medida"
            >
                <form onSubmit={handleCustomReportSubmit} className="space-y-6">
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                        Selecciona un análisis predefinido o describe qué datos específicos necesitas. Jud procesará tu solicitud y construirá el documento PDF.
                    </p>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-leaf-400/60 tracking-widest ml-1">Análisis Rápidos</label>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                "Análisis de eficiencia del inventario actual y rotación de stock.",
                                "Proyección de ventas e ingresos para el próximo trimestre.",
                                "Auditoría detallada de las métricas de impacto ambiental y bio-eficiencia."
                            ].map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setCustomReportPrompt(suggestion)}
                                    className="text-left px-4 py-3 bg-leaf-900/10 hover:bg-leaf-900/20 border border-leaf-900/20 hover:border-leaf-400/30 rounded-xl text-xs text-text-secondary hover:text-leaf-300 transition-all"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-leaf-400/60 tracking-widest ml-1">Tu requerimiento</label>
                        <textarea 
                            required
                            rows={4}
                            className="w-full bg-forest-void border border-leaf-900/30 p-4 rounded-xl outline-none text-text-primary focus:border-leaf-400/50 transition-all resize-none text-sm"
                            placeholder="Ej: Necesito un análisis de los productos con mayor impacto ambiental vendidos en el último mes..."
                            value={customReportPrompt}
                            onChange={(e) => setCustomReportPrompt(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit"
                        disabled={isGenerating}
                        className="w-full bg-leaf-400 text-forest-void font-bold py-4 rounded-2xl hover:bg-leaf-300 transition-all shadow-glow flex items-center justify-center gap-2"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" size={20} /> : 'Construir Reporte'}
                    </button>
                </form>
            </Dialog>
        </div>
    );
};

export default Reports;
