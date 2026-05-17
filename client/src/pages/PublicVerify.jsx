import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, FileText, Leaf, AlertTriangle, ExternalLink } from 'lucide-react';

const PublicVerify = () => {
    const { reportId } = useParams();
    const [status, setStatus] = useState('loading'); // loading | verified | not_found

    useEffect(() => {
        // Simulate verification — in production this would call the backend
        const timer = setTimeout(() => {
            if (reportId && reportId !== 'preview') {
                setStatus('verified');
            } else {
                setStatus('not_found');
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [reportId]);

    return (
        <div className="min-h-screen bg-[#0D1712] flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md">
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
                                <p className="text-sm text-gray-400">Consultando registros del sistema Bio-Core...</p>
                            </>
                        )}

                        {status === 'verified' && (
                            <>
                                <div className="w-20 h-20 bg-[#52B788]/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-[#52B788]/30">
                                    <ShieldCheck size={40} className="text-[#52B788]" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Documento Verificado</h2>
                                <p className="text-sm text-gray-400 mb-8">
                                    Este reporte ha sido generado y validado por el motor de inteligencia Jud.
                                </p>

                                {/* Report Details */}
                                <div className="bg-[#0D1712] rounded-2xl p-6 text-left space-y-4 border border-[#52B788]/10">
                                    <div className="flex items-center gap-3">
                                        <FileText size={16} className="text-[#52B788]" />
                                        <div>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase">ID del Reporte</p>
                                            <p className="text-sm font-bold text-white font-mono">{reportId}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Leaf size={16} className="text-[#52B788]" />
                                        <div>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase">Plataforma</p>
                                            <p className="text-sm font-bold text-white">Clear Path — BioHands</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 px-4 py-3 bg-[#52B788]/5 rounded-xl border border-[#52B788]/10">
                                    <p className="text-[10px] text-[#52B788] font-bold flex items-center justify-center gap-1">
                                        <ShieldCheck size={12} />
                                        Autenticidad confirmada por Bio-Core Engine
                                    </p>
                                </div>
                            </>
                        )}

                        {status === 'not_found' && (
                            <>
                                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/30">
                                    <AlertTriangle size={40} className="text-red-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Documento No Encontrado</h2>
                                <p className="text-sm text-gray-400">
                                    No se encontró un reporte con el identificador proporcionado. 
                                    Verifique que el código QR sea válido.
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-[9px] text-gray-600 mt-6">
                    © 2026 BioHands Corporation. Sistema de verificación digital.
                </p>
            </div>
        </div>
    );
};

export default PublicVerify;
