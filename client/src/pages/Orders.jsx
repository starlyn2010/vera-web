import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUpRight, Ban, Calendar, CreditCard, Download, Loader2, Package, Plus, Search, ShoppingBag, Trash2, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import gsap from 'gsap';
import html2pdf from 'html2pdf.js';
import api from '../services/api';
import Dialog from '../components/Dialog';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { assetUrl } from '../utils/assetUrl';
import { getVerifyUrl } from '../utils/publicVerifyUrl';

const getInvoiceItemImage = (item) => {
    const imageUrl = typeof item?.imagen_url === 'string' ? item.imagen_url.trim() : '';
    if (imageUrl) {
        if (/^(https?:)?\/\//i.test(imageUrl) || /^data:/i.test(imageUrl)) return imageUrl;

        const knownUpgrades = new Set([
            'product-arroz-organico',
            'product-bata-eco',
            'product-biowrap',
            'product-cafe-agro',
            'product-compostador',
            'product-contenedor',
            'product-gel-botanico',
            'product-guantes-pha',
            'product-kit-limpieza',
            'product-mascarilla-bio',
            'product-panel-solar',
        ]);

        const match = imageUrl.match(/\/products\/(product-[a-z0-9-]+)\.png$/i);
        if (match && knownUpgrades.has(match[1])) {
            return assetUrl(`/products/${match[1]}.jpeg`);
        }

        return assetUrl(imageUrl);
    }

    const text = `${item?.categoria || ''} ${item?.producto || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const matches = (patterns) => patterns.some((p) => p.test(text));

    if (matches([/\barroz\b/, /\borganico\b/])) return assetUrl('/products/product-arroz-organico.jpeg');
    if (matches([/\bcafe\b/, /\bagro\b/, /\bgrano\b/])) return assetUrl('/products/product-cafe-agro.jpeg');
    if (matches([/\bbiowrap\b/, /\bwrap\b/, /\bempaque\b/, /\bbioplast/i])) return assetUrl('/products/product-biowrap.jpeg');
    if (matches([/\bpanel\b/, /\bsolar\b/, /\bfotovolta/i])) return assetUrl('/products/product-panel-solar.jpeg');
    if (matches([/\bsensor\b/, /\baire\b/, /\bcalidad\b/])) return assetUrl('/products/product-sensor-aire.png');
    if (matches([/\bcompost/i, /\bcompostador\b/])) return assetUrl('/products/product-compostador.jpeg');
    if (matches([/\bcontenedor\b/, /\brecicl/i])) return assetUrl('/products/product-contenedor.jpeg');
    if (matches([/\bkit\b/, /\blimpieza\b/])) return assetUrl('/products/product-kit-limpieza.jpeg');
    if (matches([/\bgel\b/, /\bbotan/i, /\bdesinfect/i])) return assetUrl('/products/product-gel-botanico.jpeg');
    if (matches([/\bmascarilla\b/, /\brespira/i])) return assetUrl('/products/product-mascarilla-bio.jpeg');
    if (matches([/\bguante/i, /\bpha\b/, /\bnitr/i])) return assetUrl('/products/product-guantes-pha.jpeg');
    if (matches([/\bbata\b/, /\bmedic/i, /\bquir/i])) return assetUrl('/products/product-bata-eco.jpeg');

    if (text.includes('medico') || text.includes('guante') || text.includes('mascarilla') || text.includes('proteccion')) {
        return assetUrl('/products/product-medical.png');
    }
    if (text.includes('energia') || text.includes('solar')) {
        return assetUrl('/products/product-energy.png');
    }
    if (text.includes('limpieza') || text.includes('residuo') || text.includes('compost')) {
        return assetUrl('/products/product-cleaning.png');
    }
    if (text.includes('arroz') || text.includes('alimento') || text.includes('food')) {
        return assetUrl('/products/product-food.png');
    }

    return assetUrl('/products/product-default.png');
};

const Orders = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const location = useLocation();
    const preselectedAppliedRef = useRef(null);
    const [orders, setOrders] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [invoiceOrder, setInvoiceOrder] = useState(null);
    const [cancellingOrderId, setCancellingOrderId] = useState(null);
    const [newOrder, setNewOrder] = useState({
        id_cliente: user?.id || null,
        items: []
    });
    const [paymentInfo, setPaymentInfo] = useState({
        cardHolder: '',
        cardNumber: '',
        expiry: '',
        cvv: '',
        phone: ''
    });

    const fetchOrders = async () => {
        try {
            const response = await api.get('/orders/history');
            setOrders(response.data);
        } catch (error) {
            const message = error.response?.data?.error || error.message;
            addNotification(`Error al cargar pedidos: ${message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchInventory = async () => {
        try {
            const response = await api.get('/inventory');
            setInventory(response.data);
        } catch (error) {
            const message = error.response?.data?.error || error.message;
            addNotification(`Error al cargar inventario: ${message}`, 'error');
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchInventory();
    }, []);

    useEffect(() => {
        if (loading || orders.length === 0) return;

        gsap.from('.order-row', {
            opacity: 0,
            x: -20,
            duration: 0.5,
            stagger: 0.05,
            ease: 'power2.out'
        });
    }, [loading, orders.length]);

    const handleAddItem = (productId) => {
        const parsedId = Number.parseInt(productId, 10);
        const product = inventory.find((item) => item.id_producto === parsedId);

        if (!product) return;
        if (product.stock <= 0) {
            addNotification('Este producto no tiene stock disponible', 'error');
            return;
        }

        setNewOrder((prev) => {
            const existingIndex = prev.items.findIndex((item) => item.id_producto === product.id_producto);
            if (existingIndex >= 0) {
                return {
                    ...prev,
                    items: prev.items.map((item, index) => (
                        index === existingIndex
                            ? { ...item, cantidad: Math.min(item.stock, item.cantidad + 1) }
                            : item
                    ))
                };
            }

            return {
                ...prev,
                id_cliente: user?.id || prev.id_cliente,
                items: [...prev.items, { ...product, cantidad: 1 }]
            };
        });
    };

    useEffect(() => {
        const productId = location.state?.productId;
        if (!productId || inventory.length === 0 || preselectedAppliedRef.current === productId) return;

        handleAddItem(productId);
        setIsModalOpen(true);
        preselectedAppliedRef.current = productId;
    }, [inventory, location.state?.productId]);

    const handleRemoveItem = (index) => {
        setNewOrder((prev) => ({
            ...prev,
            items: prev.items.filter((_, itemIndex) => itemIndex !== index)
        }));
    };

    const handleQuantityChange = (index, delta) => {
        setNewOrder((prev) => ({
            ...prev,
            items: prev.items.map((item, itemIndex) => {
                if (itemIndex !== index) return item;
                return { ...item, cantidad: Math.min(item.stock, Math.max(1, item.cantidad + delta)) };
            })
        }));
    };

    const calculateTotal = () => {
        return newOrder.items.reduce((sum, item) => sum + (Number(item.precio) * item.cantidad), 0);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (newOrder.items.length === 0) return;

        setIsSubmitting(true);
        try {
            await api.post('/orders', {
                id_cliente: user?.id || newOrder.id_cliente,
                id_empleado: user?.rol === 'admin' || user?.rol === 'empleado' ? user.id : 1,
                total: calculateTotal(),
                productos: newOrder.items.map((item) => ({
                    id_producto: item.id_producto,
                    cantidad: item.cantidad,
                    subtotal: Number((item.precio * item.cantidad).toFixed(2))
                })),
                tarjeta: paymentInfo.cardNumber,
                numero_telefono: paymentInfo.phone
            });

            setIsModalOpen(false);
            setNewOrder({ id_cliente: user?.id || null, items: [] });
            setPaymentInfo({ cardHolder: '', cardNumber: '', expiry: '', cvv: '', phone: '' });
            await Promise.all([fetchOrders(), fetchInventory()]);
            addNotification('Pedido confirmado y agregado al historial', 'success');
        } catch (error) {
            const message = error.response?.data?.error || error.message;
            addNotification(`Error al confirmar pedido: ${message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadInvoice = async (order) => {
        if (!order?.id_pedido || isDownloadingInvoice) return;

        setIsDownloadingInvoice(true);
        try {
            const response = await api.get(`/orders/${order.id_pedido}`);
            setInvoiceOrder(response.data);

            setTimeout(() => {
                const element = document.getElementById('order-invoice-template');
                const opt = {
                    // Use margin 0 so the A4-sized template isn't cropped by pdf margins.
                    margin: 0,
                    filename: `Factura_Pedido_${order.id_pedido}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                    jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['css', 'legacy'] }
                };

                html2pdf().set(opt).from(element).save().then(() => {
                    addNotification(`Factura del pedido #${order.id_pedido} descargada`, 'success');
                }).finally(() => {
                    setInvoiceOrder(null);
                    setIsDownloadingInvoice(false);
                });
            }, 400);
        } catch (error) {
            const message = error.response?.data?.error || error.message;
            addNotification(`Error descargando factura: ${message}`, 'error');
            setIsDownloadingInvoice(false);
        }
    };

    const handleCancelOrder = async (order) => {
        if (!order?.id_pedido || cancellingOrderId) return;
        const confirmed = window.confirm(`¿Estás seguro de cancelar el pedido #${order.id_pedido}?\nEl stock será restaurado al inventario.`);
        if (!confirmed) return;

        setCancellingOrderId(order.id_pedido);
        try {
            await api.delete(`/orders/${order.id_pedido}`);
            addNotification(`Pedido #${order.id_pedido} cancelado. Stock restaurado.`, 'success');
            await Promise.all([fetchOrders(), fetchInventory()]);
            if (selectedOrder?.id_pedido === order.id_pedido) setSelectedOrder(null);
        } catch (error) {
            const message = error.response?.data?.error || error.message;
            addNotification(`Error al cancelar pedido: ${message}`, 'error');
        } finally {
            setCancellingOrderId(null);
        }
    };

    const filteredOrders = useMemo(() => {
        const query = searchTerm.toLowerCase();
        return orders.filter((order) => (
            `#${order.id_pedido}`.includes(query) ||
            (order.cliente || '').toLowerCase().includes(query) ||
            (order.fecha || '').toLowerCase().includes(query)
        ));
    }, [orders, searchTerm]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-forest-void">
                <Loader2 className="w-10 h-10 text-leaf-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-10 font-body bg-forest-void min-h-screen text-text-primary relative overflow-hidden">
            <div className="absolute left-[-9999px] top-0">
                <div
                    id="order-invoice-template"
                    className="w-[19cm] min-h-[29.7cm] bg-white text-[#0D1712] p-14 flex flex-col font-sans box-border overflow-visible"
                    style={{ pageBreakInside: 'avoid' }}
                >
                    <div className="flex justify-between items-start border-b-2 border-[#52B788] pb-8 mb-10">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tighter uppercase text-[#0D1712]">Clear Path</h1>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Huella Verde</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-[#52B788] mb-1">FACTURA: CP-{invoiceOrder?.id_pedido || 'TMP'}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">
                                {invoiceOrder ? new Date(invoiceOrder.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Cliente</p>
                            <p className="text-sm font-bold">{invoiceOrder?.cliente || 'Consumidor Final'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Recibo</p>
                            <p className="text-sm font-bold">{invoiceOrder?.recibo || `REC-${invoiceOrder?.id_pedido || ''}`}</p>
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
                            {invoiceOrder?.items?.map((item, index) => (
                                <div
                                    key={`${item.id_producto || 'row'}-${index}`}
                                    className="grid grid-cols-12 px-5 py-3 text-[11px]"
                                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                                >
                                    <div className="col-span-6 flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0">
                                            <img
                                                src={getInvoiceItemImage(item)}
                                                alt={item.producto}
                                                className="w-full h-full object-cover"
                                                onError={(event) => {
                                                    event.currentTarget.src = assetUrl('/products/product-default.png');
                                                }}
                                            />
                                        </div>
                                        <div className="font-bold break-words leading-snug min-w-0">{item.producto}</div>
                                    </div>
                                    <div className="col-span-2 text-right">${Number(item.precio || 0).toFixed(2)}</div>
                                    <div className="col-span-2 text-right">{item.cantidad}</div>
                                    <div className="col-span-2 text-right font-bold">${Number(item.subtotal || 0).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-10 flex justify-end">
                        <div className="w-64 border border-gray-200 rounded-xl p-5">
                            <div className="flex justify-between text-[11px]">
                                <span className="text-gray-600 font-bold">Total</span>
                                <span className="font-black text-[#0D1712]">${Number(invoiceOrder?.total || 0).toFixed(2)}</span>
                            </div>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-2">USD</p>
                        </div>
                    </div>

                    <div
                        className="mt-auto pt-10 border-t border-gray-100 flex justify-between items-center pdf-avoid-break"
                        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                    >
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                            Factura generada por Clear Path · Huella Verde
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <QRCodeSVG
                                value={getVerifyUrl(invoiceOrder?.id_pedido || 'preview')}
                                size={60}
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

            <div className="absolute top-0 left-0 w-96 h-96 bg-leaf-400/5 blur-[120px] rounded-full pointer-events-none"></div>

            <header className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 z-10 relative">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-leaf-400/60 font-bold mb-2">Transacciones</p>
                    <h2 className="text-4xl font-display font-bold tracking-tight">Historial de Pedidos</h2>
                </div>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="bg-forest-elevated border border-leaf-900/30 p-4 rounded-2xl flex items-center gap-4 focus-within:border-leaf-400/50 transition-all">
                        <Search size={18} className="text-leaf-400/40" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Buscar pedido..."
                            className="bg-transparent outline-none text-sm w-48"
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-leaf-400 text-forest-void px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:scale-105 transition-all shadow-glow active:scale-95"
                    >
                        <Plus size={20} /> Nuevo Pedido
                    </button>
                </div>
            </header>

            <div className="glass rounded-[32px] border border-leaf-900/20 shadow-2xl overflow-x-auto z-10 relative">
                <table className="w-full min-w-[980px] text-left border-collapse">
                    <thead>
                        <tr className="bg-leaf-900/10 border-b border-leaf-900/20">
                            <th className="p-8 text-[10px] font-black text-leaf-400/60 uppercase tracking-widest">ID Pedido</th>
                            <th className="p-8 text-[10px] font-black text-leaf-400/60 uppercase tracking-widest">Cliente</th>
                            <th className="p-8 text-[10px] font-black text-leaf-400/60 uppercase tracking-widest text-center">Fecha</th>
                            <th className="p-8 text-[10px] font-black text-leaf-400/60 uppercase tracking-widest">Total</th>
                            <th className="p-8 text-[10px] font-black text-leaf-400/60 uppercase tracking-widest text-center">Estado</th>
                            <th className="p-8 text-[10px] font-black text-leaf-400/60 uppercase tracking-widest text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-leaf-900/10">
                        {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                            <tr key={order.id_pedido} className="order-row hover:bg-leaf-900/5 transition-colors group">
                                <td className="p-8">
                                    <span className="font-display font-bold text-leaf-400 text-xl tracking-tighter">#{order.id_pedido}</span>
                                </td>
                                <td className="p-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-forest-elevated border border-leaf-900/30 flex items-center justify-center text-leaf-400 group-hover:border-leaf-400/50 transition-all">
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-[16px] text-text-primary">{order.cliente || 'Consumidor Final'}</p>
                                            <p className="text-[10px] text-leaf-400/40 font-bold uppercase">Transacción Verificada</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-8 text-center">
                                    <div className="inline-flex items-center gap-2 text-[11px] font-black text-leaf-400/60 bg-forest-elevated border border-leaf-900/10 px-4 py-2 rounded-xl">
                                        <Calendar size={12} />
                                        {new Date(order.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                </td>
                                <td className="p-8">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-display font-black text-text-primary tracking-tighter">${Number(order.total || 0).toFixed(2)}</span>
                                        <span className="text-[9px] font-black text-leaf-400/40 uppercase tracking-widest">Dólares (USD)</span>
                                    </div>
                                </td>
                                <td className="p-8 text-center">
                                    <span className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-leaf-400/10 text-leaf-400 border border-leaf-400/20 shadow-glow-sm">
                                        Completado
                                    </span>
                                </td>
                                <td className="p-8 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            aria-label={`Descargar factura del pedido ${order.id_pedido}`}
                                            onClick={() => handleDownloadInvoice(order)}
                                            disabled={isDownloadingInvoice}
                                            className="p-4 bg-forest-elevated border border-leaf-900/30 text-leaf-400 rounded-2xl hover:bg-leaf-400 hover:text-forest-void transition-all active:scale-95 shadow-lg group-hover:border-leaf-400 disabled:opacity-50"
                                        >
                                            <Download size={20} />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Ver detalle del pedido ${order.id_pedido}`}
                                            onClick={() => setSelectedOrder(order)}
                                            className="p-4 bg-forest-elevated border border-leaf-900/30 text-leaf-400 rounded-2xl hover:bg-leaf-400 hover:text-forest-void transition-all active:scale-95 shadow-lg group-hover:border-leaf-400"
                                        >
                                            <ArrowUpRight size={20} />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Cancelar pedido ${order.id_pedido}`}
                                            onClick={() => handleCancelOrder(order)}
                                            disabled={cancellingOrderId === order.id_pedido}
                                            className="p-4 bg-forest-elevated border border-red-900/30 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-lg group-hover:border-red-400/50 disabled:opacity-50"
                                        >
                                            {cancellingOrderId === order.id_pedido ? <Loader2 size={20} className="animate-spin" /> : <Ban size={20} />}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="6" className="p-32 text-center">
                                    <div className="flex flex-col items-center gap-6 opacity-20">
                                        <ShoppingBag size={80} strokeWidth={1} />
                                        <p className="font-display italic text-2xl tracking-tight">No se han registrado transacciones aún.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generar Nuevo Pedido">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-leaf-400/60 uppercase tracking-widest ml-1">Seleccionar Producto</label>
                        <select
                            value=""
                            onChange={(event) => handleAddItem(event.target.value)}
                            className="w-full bg-forest-void border border-leaf-900/30 rounded-2xl p-5 text-sm outline-none focus:border-leaf-400 transition-all appearance-none cursor-pointer"
                        >
                            <option value="" disabled>Seleccione un producto del catálogo...</option>
                            {inventory.map((product) => (
                                <option key={product.id_producto} value={product.id_producto} className="bg-forest-void">
                                    {product.producto} - ${product.precio} (Stock: {product.stock})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-leaf-400/60 uppercase tracking-widest ml-1">Detalle del Pedido</p>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {newOrder.items.map((item, index) => (
                                <div key={item.id_producto} className="flex items-center justify-between p-4 bg-forest-void border border-leaf-900/20 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-leaf-400/10 flex items-center justify-center text-leaf-400">
                                            <Package size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold">{item.producto}</p>
                                            <p className="text-[10px] text-leaf-400/60">${item.precio} c/u · Stock {item.stock}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center bg-forest-void border border-leaf-900/30 rounded-xl px-2">
                                            <button type="button" onClick={() => handleQuantityChange(index, -1)} className="p-2 text-leaf-400 hover:text-white">-</button>
                                            <span className="w-8 text-center text-xs font-bold">{item.cantidad}</span>
                                            <button type="button" onClick={() => handleQuantityChange(index, 1)} className="p-2 text-leaf-400 hover:text-white">+</button>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500/50 hover:text-red-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {newOrder.items.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-leaf-900/20 rounded-3xl text-leaf-400/30 text-xs italic">
                                    Añade productos para comenzar
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-leaf-900/10">
                        <p className="text-[10px] font-black text-leaf-400/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <CreditCard size={14} /> Información de Pago
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase tracking-widest text-leaf-400/40 font-bold ml-1">Nombre en la Tarjeta</label>
                                <input 
                                    type="text" 
                                    required
                                    value={paymentInfo.cardHolder}
                                    onChange={(e) => setPaymentInfo({...paymentInfo, cardHolder: e.target.value})}
                                    placeholder="Juan Pérez"
                                    className="w-full bg-forest-void border border-leaf-900/30 rounded-2xl p-4 text-sm outline-none focus:border-leaf-400 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase tracking-widest text-leaf-400/40 font-bold ml-1">Número de Tarjeta</label>
                                <input 
                                    type="text" 
                                    required
                                    value={paymentInfo.cardNumber}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').substring(0, 16);
                                        setPaymentInfo({...paymentInfo, cardNumber: val.match(/.{1,4}/g)?.join(' ') || val});
                                    }}
                                    placeholder="0000 0000 0000 0000"
                                    className="w-full bg-forest-void border border-leaf-900/30 rounded-2xl p-4 text-sm outline-none focus:border-leaf-400 transition-all font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase tracking-widest text-leaf-400/40 font-bold ml-1">Vencimiento (MM/AA)</label>
                                <input 
                                    type="text" 
                                    required
                                    value={paymentInfo.expiry}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/\D/g, '').substring(0, 4);
                                        if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2);
                                        setPaymentInfo({...paymentInfo, expiry: val});
                                    }}
                                    placeholder="MM/AA"
                                    className="w-full bg-forest-void border border-leaf-900/30 rounded-2xl p-4 text-sm outline-none focus:border-leaf-400 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase tracking-widest text-leaf-400/40 font-bold ml-1">CVV</label>
                                <input 
                                    type="password" 
                                    required
                                    value={paymentInfo.cvv}
                                    onChange={(e) => setPaymentInfo({...paymentInfo, cvv: e.target.value.replace(/\D/g, '').substring(0, 3)})}
                                    placeholder="***"
                                    className="w-full bg-forest-void border border-leaf-900/30 rounded-2xl p-4 text-sm outline-none focus:border-leaf-400 transition-all"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[9px] uppercase tracking-widest text-leaf-400/40 font-bold ml-1">Número de Teléfono</label>
                                <input 
                                    type="tel" 
                                    required
                                    value={paymentInfo.phone}
                                    onChange={(e) => setPaymentInfo({...paymentInfo, phone: e.target.value})}
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full bg-forest-void border border-leaf-900/30 rounded-2xl p-4 text-sm outline-none focus:border-leaf-400 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-leaf-900/20 flex flex-col md:flex-row justify-between md:items-center gap-6">
                        <div>
                            <p className="text-[10px] font-black text-leaf-400/40 uppercase tracking-widest mb-1">Total del Pedido</p>
                            <p className="text-4xl font-display font-black text-leaf-400 tracking-tighter">${calculateTotal().toFixed(2)}</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-text-tertiary hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || newOrder.items.length === 0}
                                className="bg-leaf-400 text-forest-void px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-glow hover:scale-105 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
                            </button>
                        </div>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={selectedOrder ? `Pedido #${selectedOrder.id_pedido}` : 'Detalle del Pedido'}>
                {selectedOrder && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-forest-void border border-leaf-900/20 p-4 rounded-2xl">
                                <p className="text-[10px] uppercase tracking-widest text-leaf-400/50 font-black">Cliente</p>
                                <p className="font-bold text-text-primary mt-1">{selectedOrder.cliente || 'Consumidor Final'}</p>
                            </div>
                            <div className="bg-forest-void border border-leaf-900/20 p-4 rounded-2xl">
                                <p className="text-[10px] uppercase tracking-widest text-leaf-400/50 font-black">Fecha</p>
                                <p className="font-bold text-text-primary mt-1">{new Date(selectedOrder.fecha).toLocaleDateString('es-ES')}</p>
                            </div>
                            <div className="bg-forest-void border border-leaf-900/20 p-4 rounded-2xl">
                                <p className="text-[10px] uppercase tracking-widest text-leaf-400/50 font-black">Total</p>
                                <p className="font-bold text-text-primary mt-1">${Number(selectedOrder.total || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-forest-void border border-leaf-900/20 p-4 rounded-2xl">
                                <p className="text-[10px] uppercase tracking-widest text-leaf-400/50 font-black">Estado</p>
                                <p className="font-bold text-leaf-400 mt-1">Completado</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => handleDownloadInvoice(selectedOrder)}
                                disabled={isDownloadingInvoice}
                                className="flex-1 bg-leaf-400 text-forest-void font-black py-4 rounded-2xl hover:bg-leaf-300 transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                <Download size={18} /> Factura
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCancelOrder(selectedOrder)}
                                disabled={cancellingOrderId === selectedOrder.id_pedido}
                                className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 font-black py-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {cancellingOrderId === selectedOrder.id_pedido ? <Loader2 size={18} className="animate-spin" /> : <Ban size={18} />} Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    );
};

export default Orders;
