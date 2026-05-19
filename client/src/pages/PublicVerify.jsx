import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, FileText, Leaf, AlertTriangle, User, Calendar, DollarSign, Package } from 'lucide-react';

const PublicVerify = () => {
    const { reportId } = useParams();
    const [status, setStatus] = useState('loading'); // loading | verified | not_found
    const [docData, setDocData] = useState(null);

    useEffect(() => {
        const verifyDoc = async () => {
            if (!reportId || reportId === 'preview') {
                setStatus('not_found');
                return;
            }
            try {
                // Always use current origin — the API lives on the same domain as the page.
                // Do NOT use VITE_PUBLIC_BASE_URL here since it may be misconfigured.
                const baseUrl = window.location.origin;
                const res = await fetch(`${baseUrl}/api/verify/${reportId}`);
                if (!res.ok) throw new Error("Not found");
                
                const data = await res.json();
                setDocData(data);
                setStatus('verified');
            } catch (err) {
                console.error("Verification failed:", err);
                setStatus('not_found');
            }
        };
        verifyDoc();
    }, [reportId]);

    return (
        <div className="min-h-screen bg-[#0D1712] flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md my-auto">
                {/* Logo Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-3">
                        <img src="/logo.png" className="w-12 h-12 rounded-2xl object-cover shadow-lg" alt="Logo" />
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Bio<span className="text-[#52B788]">Hands</span>
                        </h1>
                    </div>
                    <p className="text-[10px] text-[#52B788]/60 font-bold uppercase tracking-[0.3em]">
                        Sistema de Verificación Digital
                    </p>
                </div>

                {/* Verification Card */}
                <div className="bg-[#1a2b22] rounded-3xl border border-[#52B788]/20 overflow-hidden shadow-2xl shadow-[#52B788]/5">
                    {/* Status Bar */}
                    <div className={`h-1 w-full ${
                        status === 'loading' ? 'bg-yellow-500 animate-pulse' :
                        status === 'verified' ? 'bg-[#52B788]' : 'bg-red-500'
                    }`} />

                    <div className="p-8 text-center">
                        {status === 'loading' && (
                            <>
                                <div className="w-16 h-16 border-4 border-[#52B788]/20 border-t-[#52B788] rounded-full animate-spin mx-auto mb-6" />
                                <h2 className="text-lg font-bold text-white mb-2">Verificando Documento</h2>
                                <p className="text-sm text-gray-400">Consultando registros seguros en la nube...</p>
                            </>
                        )}

                        {status === 'verified' && docData && (
                            <div className="animate-in fade-in zoom-in duration-500">
                                <div className="w-20 h-20 bg-[#52B788]/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-[#52B788]/30">
                                    <ShieldCheck size={40} className="text-[#52B788]" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">
                                    {docData.tipo === 'invoice' ? 'Factura Verificada' : 'Reporte Verificado'}
                                </h2>
                                <p className="text-sm text-gray-400 mb-8">
                                    Documento validado criptográficamente por Clear Path.
                                </p>

                                {/* Dynamic Details Section */}
                                <div className="bg-[#0D1712] rounded-2xl p-6 text-left border border-[#52B788]/10 text-white space-y-5">
                                    
                                    {/* Invoice View */}
                                    {docData.tipo === 'invoice' && docData.payload && (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <User size={16} className="text-[#52B788]" />
                                                <div>
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Cliente</p>
                                                    <p className="text-sm font-bold">{docData.payload.cliente}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Calendar size={16} className="text-[#52B788]" />
                                                <div>
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Fecha de Emisión</p>
                                                    <p className="text-sm font-bold">{docData.payload.fecha}</p>
                                                </div>
                                            </div>
                                            <div className="border-t border-[#52B788]/10 pt-4 mt-4">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase mb-3 flex items-center gap-2">
                                                    <Package size={12} className="text-[#52B788]" /> Productos
                                                </p>
                                                <ul className="space-y-2 text-xs">
                                                    {docData.payload.items?.map((item, idx) => (
                                                        <li key={idx} className="flex justify-between items-center text-gray-300">
                                                            <span className="truncate pr-4">{item.cantidad}x {item.producto || 'Producto'}</span>
                                                            <span className="font-mono text-[#52B788]">${item.subtotal}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="bg-[#52B788]/10 p-4 rounded-xl flex justify-between items-center mt-2 border border-[#52B788]/20">
                                                <p className="text-[10px] text-[#52B788] font-bold uppercase tracking-widest">Total</p>
                                                <p className="text-lg font-bold text-white">${docData.payload.total?.toLocaleString()}</p>
                                            </div>
                                        </>
                                    )}

                                    {/* Report View */}
                                    {docData.tipo === 'report' && docData.payload && (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <FileText size={16} className="text-[#52B788]" />
                                                <div>
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Clasificación</p>
                                                    <p className="text-sm font-bold">Reporte de {docData.payload.tipo}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Calendar size={16} className="text-[#52B788]" />
                                                <div>
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Periodo Analizado</p>
                                                    <p className="text-sm font-bold">{docData.payload.periodo}</p>
                                                </div>
                                            </div>
                                            <div className="border-t border-[#52B788]/10 pt-4 mt-4">
                                                <p className="text-[9px] text-[#52B788] font-bold uppercase mb-2">Resumen Ejecutivo</p>
                                                <p className="text-xs text-gray-400 leading-relaxed italic border-l-2 border-[#52B788]/30 pl-3">
                                                    "{docData.payload.summary}"
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    {/* Common ID */}
                                    <div className="flex items-center gap-3 pt-2">
                                        <Leaf size={16} className="text-gray-500" />
                                        <div>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase">Referencia Unica</p>
                                            <p className="text-xs font-bold text-gray-400 font-mono">{docData.id}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 px-4 py-3 bg-[#52B788]/5 rounded-xl border border-[#52B788]/10">
                                    <p className="text-[10px] text-[#52B788] font-bold flex items-center justify-center gap-1">
                                        <ShieldCheck size={12} />
                                        Documento inalterado y certificado
                                    </p>
                                </div>
                            </div>
                        )}

                        {status === 'not_found' && (
                            <div className="animate-in fade-in zoom-in duration-500">
                                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/30">
                                    <AlertTriangle size={40} className="text-red-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Documento No Encontrado</h2>
                                <p className="text-sm text-gray-400">
                                    No se encontró un registro válido asociado a este código QR. El documento podría no ser auténtico.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-[9px] text-gray-600 mt-6">
                    © 2026 BioHands Corporation. Sistema de Verificación en la Nube.
                </p>
            </div>
        </div>
    );
};

export default PublicVerify;

