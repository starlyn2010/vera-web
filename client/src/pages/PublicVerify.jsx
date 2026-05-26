import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, FileText, Leaf, AlertTriangle, User, Calendar, DollarSign, Package, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const PublicVerify = () => {
    const { reportId } = useParams();
    const [status, setStatus] = useState('loading'); // loading | verified | not_found
    const [docData, setDocData] = useState(null);
    const [errorDetail, setErrorDetail] = useState(null);
    const pdfRef = useRef();

    const handleDownloadPDF = () => {
        const element = pdfRef.current;
        if (!element) return;

        const opt = {
            margin: 1, // 1cm margin all around
            filename: `Verificacion_${docData?.id || 'Doc'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
    };

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
                const isToken = typeof reportId === 'string' && reportId.includes('.');
                const safeId = encodeURIComponent(reportId);
                const endpoint = isToken ? `/api/verify/token/${safeId}` : `/api/verify/${safeId}`;
                const res = await fetch(`${baseUrl}${endpoint}`);
                if (!res.ok) {
                    let detail = '';
                    try {
                        const errBody = await res.json();
                        detail = errBody?.detail || errBody?.error || '';
                    } catch {}

                    if (res.status === 404) {
                        setStatus('not_found');
                        return;
                    }

                    setErrorDetail(detail || `Error ${res.status}`);
                    setStatus('not_found');
                    return;
                }
                 
                const data = await res.json();
                setErrorDetail(null);
                setDocData(data);
                setStatus('verified');
            } catch (err) {
                console.error("Verification failed:", err);
                setErrorDetail('No se pudo conectar al servicio de verificación.');
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
                        <img src="/logo.jpeg" className="w-12 h-12 rounded-2xl object-cover shadow-lg" alt="Clear Path" />
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Clear <span className="text-[#52B788]">Path</span>
                        </h1>
                    </div>
                    <p className="text-[10px] text-[#52B788]/60 font-bold uppercase tracking-[0.3em]">
                        Verificación de Documentos
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
                                                    <p className="text-sm font-bold">{docData.payload.cl || docData.payload.cliente}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Calendar size={16} className="text-[#52B788]" />
                                                <div>
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Fecha de Emisión</p>
                                                    <p className="text-sm font-bold">{docData.payload.f || docData.payload.fecha}</p>
                                                </div>
                                            </div>
                                            <div className="border-t border-[#52B788]/10 pt-4 mt-4">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase mb-3 flex items-center gap-2">
                                                    <Package size={12} className="text-[#52B788]" /> Productos
                                                </p>
                                                <ul className="space-y-2 text-xs">
                                                    {(docData.payload.i || docData.payload.items)?.map((item, idx) => (
                                                        <li key={idx} className="flex justify-between items-center text-gray-300">
                                                            <span className="truncate pr-4">
                                                                {item.c || item.cantidad}x {item.p || item.producto || 'Producto'}
                                                            </span>
                                                            <span className="font-mono text-[#52B788]">
                                                                ${item.s || item.subtotal}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="bg-[#52B788]/10 p-4 rounded-xl flex justify-between items-center mt-2 border border-[#52B788]/20">
                                                <p className="text-[10px] text-[#52B788] font-bold uppercase tracking-widest">Total</p>
                                                <p className="text-lg font-bold text-white">
                                                    ${(docData.payload.t || docData.payload.total)?.toLocaleString()}
                                                </p>
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
                                                    <p className="text-sm font-bold">
                                                        Reporte de {docData.payload.t || docData.payload.tipo}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Calendar size={16} className="text-[#52B788]" />
                                                <div>
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Periodo Analizado</p>
                                                    <p className="text-sm font-bold">
                                                        {docData.payload.p || docData.payload.periodo}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="border-t border-[#52B788]/10 pt-4 mt-4">
                                                <p className="text-[9px] text-[#52B788] font-bold uppercase mb-2">Resumen Ejecutivo</p>
                                                <p className="text-xs text-gray-400 leading-relaxed italic border-l-2 border-[#52B788]/30 pl-3">
                                                    "{docData.payload.s || docData.payload.summary || 'Resumen disponible en el documento original.'}"
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

                        {status === 'verified' && docData && (
                            <button
                                onClick={handleDownloadPDF}
                                className="mt-6 w-full bg-[#52B788] text-[#0D1712] py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#52B788]/90 transition-colors"
                            >
                                <Download size={16} /> Descargar Comprobante PDF
                            </button>
                        )}

                        {status === 'not_found' && (
                            <div className="animate-in fade-in zoom-in duration-500">
                                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/30">
                                    <AlertTriangle size={40} className="text-red-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Documento No Encontrado</h2>
                                <p className="text-sm text-gray-400">
                                    {errorDetail || (isToken ? 
                                        'El token de verificación es inválido o ha expirado. Si el documento es reciente, intenta escanearlo de nuevo.' : 
                                        'No se encontró un registro en la base de datos asociado a este código. El documento podría no estar sincronizado o no ser auténtico.')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-[9px] text-gray-600 mt-6">
                    © 2026 Clear Path. Sistema de verificación en la nube.
                </p>
            </div>

            {/* Hidden Invoice Template for PDF Download */}
            {status === 'verified' && docData && docData.tipo === 'invoice' && docData.payload && (
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    <div
                        ref={pdfRef}
                        className="bg-white text-gray-800 p-10 mx-auto font-sans"
                        style={{ width: '19cm', minHeight: '27.7cm', padding: '40px', boxSizing: 'border-box' }}
                    >
                        <div className="flex justify-between items-start border-b-2 border-[#52B788] pb-8 mb-10">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tighter uppercase text-[#0D1712]">Clear Path</h1>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Huella Verde</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-[#52B788] mb-1">FACTURA: CP-{docData.payload.id_pedido || docData.id || 'TMP'}</p>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">
                                    {docData.payload.f || docData.payload.fecha || ''}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Cliente</p>
                                <p className="text-sm font-bold">{docData.payload.cl || docData.payload.cliente || 'Consumidor Final'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Recibo</p>
                                <p className="text-sm font-bold">{docData.payload.recibo || `REC-${docData.payload.id_pedido || docData.id || ''}`}</p>
                            </div>
                        </div>

                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="grid grid-cols-12 bg-gray-50 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                                <div className="col-span-6">Producto</div>
                                <div className="col-span-2 text-right">Precio</div>
                                <div className="col-span-2 text-right">Cant.</div>
                                <div className="col-span-2 text-right">Subtotal</div>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {(docData.payload.i || docData.payload.items)?.map((item, index) => (
                                    <div
                                        key={`row-${index}`}
                                        className="grid grid-cols-12 px-5 py-3 text-[11px]"
                                    >
                                        <div className="col-span-6 font-bold break-words leading-snug min-w-0">
                                            {item.p || item.producto}
                                        </div>
                                        <div className="col-span-2 text-right">${Number(item.pr || item.precio || 0).toFixed(2)}</div>
                                        <div className="col-span-2 text-right">{item.c || item.cantidad}</div>
                                        <div className="col-span-2 text-right font-bold">${Number(item.s || item.subtotal || 0).toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-10 flex justify-end">
                            <div className="w-64 border border-gray-200 rounded-xl p-5">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-gray-600 font-bold">Total</span>
                                    <span className="font-black text-[#0D1712]">${Number(docData.payload.t || docData.payload.total || 0).toFixed(2)}</span>
                                </div>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-2">USD</p>
                            </div>
                        </div>

                        <div className="mt-auto pt-10 border-t border-gray-100 flex justify-between items-center">
                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                Factura generada por Clear Path · Huella Verde
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicVerify;
