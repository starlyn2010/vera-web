import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowRight,
    Box,
    DollarSign,
    Eye,
    Filter,
    Loader2,
    Package,
    Plus,
    Search,
    ShoppingCart,
    Tag,
    Printer,
    CheckSquare,
    Square,
    Leaf
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import Dialog from '../components/Dialog';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import html2pdf from 'html2pdf.js';
import { assetUrl } from '../utils/assetUrl';

const formatPrice = (price) => {
    return Number(price).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getProductImage = (product) => {
    const imageUrl = typeof product?.imagen_url === 'string' ? product.imagen_url.trim() : '';
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

    const text = `${product?.categoria || ''} ${product?.producto || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const matches = (patterns) => patterns.some((p) => p.test(text));

    // Specific product matches (more "real" product shots)
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

const emptyProduct = {
    producto: '',
    categoria: 'Guantes',
    imagen_url: '',
    precio: '',
    stock: '',
    impacto_ambiental: ''
};

const Inventory = () => {
    const { addNotification } = useNotification();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.rol === 'admin';
    const LOW_STOCK_THRESHOLD = 10;
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [isPrintingInvoice, setIsPrintingInvoice] = useState(false);
    const [newProduct, setNewProduct] = useState(emptyProduct);
    const [invoiceData, setInvoiceData] = useState(null);
    const [stockFilter, setStockFilter] = useState('all'); // all | low | out
    const [productAnalysis, setProductAnalysis] = useState('');
    const [isAnalyzingProduct, setIsAnalyzingProduct] = useState(false);
    const lastStockAlertKeyRef = useRef('');

    const toggleSelected = (productId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });
    };

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const response = await api.get('/inventory');
            setProducts(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            setError('No se pudo cargar el inventario. Verifica la conexión con el servidor.');
            addNotification('Error de conexión con el bio-inventario', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handleCreate = async (event) => {
        event.preventDefault();

        if (!isAdmin) {
            addNotification('Solo un administrador puede crear productos', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/inventory', {
                ...newProduct,
                imagen_url: newProduct.imagen_url?.trim() || null,
                precio: Number(newProduct.precio),
                stock: Number.parseInt(newProduct.stock, 10),
                impacto_ambiental: Number(newProduct.impacto_ambiental || 0)
            });
            await fetchInventory();
            setIsModalOpen(false);
            setNewProduct(emptyProduct);
            addNotification('Producto añadido con éxito al catálogo', 'success');
        } catch (err) {
            const message = err.response?.data?.error || err.message;
            addNotification(`Error al registrar producto: ${message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddToCart = (product, event) => {
        event?.stopPropagation();

        if (product.stock <= 0) {
            addNotification('Este producto no tiene stock disponible', 'error');
            return;
        }

        navigate('/orders', { state: { productId: product.id_producto } });
        addNotification(`${product.producto} agregado al nuevo pedido`, 'info');
    };

    const stockAlerts = useMemo(() => {
        const outOfStock = products.filter((p) => Number(p.stock || 0) <= 0);
        const lowStock = products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= LOW_STOCK_THRESHOLD);
        return { outOfStock, lowStock };
    }, [products]);

    useEffect(() => {
        if (!products || products.length === 0) return;
        if (!isAdmin) return;

        const lowIds = stockAlerts.lowStock.map((p) => p.id_producto).sort((a, b) => a - b);
        const outIds = stockAlerts.outOfStock.map((p) => p.id_producto).sort((a, b) => a - b);
        const key = `${lowIds.join(',')}|${outIds.join(',')}`;
        if (key === lastStockAlertKeyRef.current) return;
        lastStockAlertKeyRef.current = key;

        if (outIds.length > 0) {
            addNotification(`Alerta: ${outIds.length} producto(s) sin stock`, 'error');
        }
        if (lowIds.length > 0) {
            addNotification(`Alerta: ${lowIds.length} producto(s) con stock bajo (≤ ${LOW_STOCK_THRESHOLD})`, 'info');
        }
    }, [products, isAdmin, stockAlerts.lowStock, stockAlerts.outOfStock]);

    const filteredProducts = useMemo(() => {
        const query = searchTerm.toLowerCase();
        return products.filter((product) => {
            const matchesQuery = (
                product.producto.toLowerCase().includes(query) ||
                product.categoria.toLowerCase().includes(query)
            );
            if (!matchesQuery) return false;
            const stock = Number(product.stock || 0);
            if (stockFilter === 'out') return stock <= 0;
            if (stockFilter === 'low') return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
            return true;
        });
    }, [products, searchTerm, stockFilter, LOW_STOCK_THRESHOLD]);

    const selectedProducts = products.filter((p) => selectedIds.has(p.id_producto));

    const handlePrintInvoice = async (mode) => {
        const items = mode === 'single' && selectedProduct ? [selectedProduct] : selectedProducts;
        if (!items || items.length === 0) {
            addNotification('Selecciona al menos un producto para imprimir', 'error');
            return;
        }

        setIsPrintingInvoice(true);
        setInvoiceData({
            id: `INV-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString(),
            customer: user?.nombre || 'Consumidor Final',
            items: items.map((p) => ({ ...p, cantidad: 1, subtotal: Number(p.precio) })),
        });

        setTimeout(() => {
            const element = document.getElementById('invoice-template');
            const opt = {
                // Use margin 0 so the A4-sized template isn't cropped by pdf margins.
                margin: 0,
                filename: `Factura_${items.length === 1 ? items[0].producto : 'Seleccion'}.pdf`.replace(/\s+/g, '_'),
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            };

            html2pdf().set(opt).from(element).save().finally(() => {
                setIsPrintingInvoice(false);
                setInvoiceData(null);
            });
        }, 400);
    };

    const handleViewProduct = async (product) => {
        setSelectedProduct(product);
        setProductAnalysis('');
        setIsAnalyzingProduct(true);
        try {
            const prompt = `Actúa como Especialista en Productos Eco. Escribe una ficha técnica breve (máximo 4 líneas) para el producto "${product.producto}" de la categoría "${product.categoria}". Precio: $${product.precio}, Stock: ${product.stock} unidades, Impacto ambiental: ${product.impacto_ambiental}kg CO2. Describe para qué se usa, sus beneficios ambientales y una recomendación de uso.`;
            const response = await api.post('/chatbot/message', { message: prompt });
            setProductAnalysis(response.data.reply);
        } catch (error) {
            console.error(error);
            setProductAnalysis(`${product.producto} es una solución ecológica de la línea ${product.categoria}. Con un impacto de ${product.impacto_ambiental}kg CO2 y ${product.stock} unidades disponibles. (Error de conexión con Jud)`);
        } finally {
            setIsAnalyzingProduct(false);
        }
    };

    if (loading && products.length === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center h-[80vh] bg-forest-void">
                <div className="w-16 h-16 border-4 border-leaf-900 border-t-leaf-400 rounded-full animate-spin" aria-label="Cargando"></div>
                <p className="mt-6 text-leaf-400 font-display animate-pulse">Cargando Bio-Inventario...</p>
            </div>
        );
    }

    return (
        <div className="p-10 font-body min-h-screen bg-forest-void">
            {/* Hidden invoice template */}
            <div className="absolute left-[-9999px] top-0">
                <div
                    id="invoice-template"
                    className="w-[19cm] min-h-[29.7cm] bg-white text-[#0D1712] p-14 flex flex-col font-sans box-border overflow-visible"
                    style={{ pageBreakInside: 'avoid' }}
                >
                    <div className="flex justify-between items-start border-b-2 border-[#52B788] pb-8 mb-10">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tighter uppercase text-[#0D1712]">Clear Path</h1>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Factura de Productos</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Huella Verde</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-[#52B788] mb-1">FACTURA: {invoiceData?.id || 'INV-TMP'}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">
                                {invoiceData ? new Date(invoiceData.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                            </p>
                        </div>
                    </div>

                    <div className="mb-8">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Cliente</p>
                        <p className="text-sm font-bold">{invoiceData?.customer || ''}</p>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="grid grid-cols-12 bg-gray-50 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                            <div className="col-span-6">Producto</div>
                            <div className="col-span-2 text-right">Precio</div>
                            <div className="col-span-2 text-right">Cant.</div>
                            <div className="col-span-2 text-right">Subtotal</div>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {invoiceData?.items?.map((item) => (
                                <div
                                    key={item.id_producto}
                                    className="grid grid-cols-12 px-5 py-3 text-[11px]"
                                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                                >
                                    <div className="col-span-6 flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0">
                                            <img
                                                src={getProductImage(item)}
                                                alt={item.producto}
                                                className="w-full h-full object-cover"
                                                onError={(event) => {
                                                    event.currentTarget.src = assetUrl('/products/product-default.png');
                                                }}
                                            />
                                        </div>
                                        <div className="font-bold break-words leading-snug min-w-0">{item.producto}</div>
                                    </div>
                                    <div className="col-span-2 text-right">${Number(item.precio).toFixed(2)}</div>
                                    <div className="col-span-2 text-right">{item.cantidad}</div>
                                    <div className="col-span-2 text-right font-bold">${Number(item.subtotal).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-10 flex justify-end">
                        <div className="w-64 border border-gray-200 rounded-xl p-5">
                            <div className="flex justify-between text-[11px]">
                                <span className="text-gray-600 font-bold">Total</span>
                                <span className="font-black text-[#0D1712]">
                                    ${invoiceData?.items?.reduce((sum, it) => sum + Number(it.subtotal || 0), 0).toFixed(2) || '0.00'}
                                </span>
                            </div>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-2">USD</p>
                        </div>
                    </div>

                    <div
                        className="mt-auto pt-10 text-[9px] text-gray-400 font-bold uppercase tracking-widest pdf-avoid-break"
                        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                    >
                        Documento generado por Clear Path
                    </div>
                </div>
            </div>

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="text-leaf-400" size={16} />
                        <p className="text-[10px] uppercase tracking-[0.3em] text-leaf-400/60 font-bold">Catálogo de Sostenibilidad</p>
                    </div>
                    <h2 className="text-4xl font-display font-bold text-text-primary">Inventario BioHands</h2>
                </motion.div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => handlePrintInvoice('multi')}
                        disabled={isPrintingInvoice || selectedIds.size === 0}
                        className="glass px-6 py-3 rounded-xl font-bold text-[13px] text-text-primary flex items-center gap-2 hover:bg-forest-hover transition-all disabled:opacity-50"
                        aria-label="Imprimir factura de productos seleccionados"
                    >
                        <Printer size={18} /> Imprimir Factura
                    </button>
                    <button
                        type="button"
                        aria-label="Mostrar todos los productos"
                        onClick={() => setStockFilter('all')}
                        className={`glass px-6 py-3 rounded-xl font-bold text-[13px] text-text-primary flex items-center gap-2 transition-all ${
                            stockFilter === 'all' ? 'border border-leaf-400/30 shadow-glow-sm' : 'hover:bg-forest-hover'
                        }`}
                    >
                        <Filter size={18} /> Todos
                    </button>
                    <button
                        type="button"
                        aria-label="Ver productos con stock bajo"
                        onClick={() => setStockFilter('low')}
                        className={`glass px-6 py-3 rounded-xl font-bold text-[13px] text-text-primary flex items-center gap-2 transition-all ${
                            stockFilter === 'low' ? 'border border-yellow-400/40' : 'hover:bg-forest-hover'
                        }`}
                    >
                        <AlertTriangle size={18} className="text-yellow-400" />
                        Stock bajo
                        {stockAlerts.lowStock.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-[10px] font-black text-yellow-400">
                                {stockAlerts.lowStock.length}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        aria-label="Ver productos agotados"
                        onClick={() => setStockFilter('out')}
                        className={`glass px-6 py-3 rounded-xl font-bold text-[13px] text-text-primary flex items-center gap-2 transition-all ${
                            stockFilter === 'out' ? 'border border-red-400/40' : 'hover:bg-forest-hover'
                        }`}
                    >
                        <AlertTriangle size={18} className="text-red-400" />
                        Sin stock
                        {stockAlerts.outOfStock.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 rounded-full bg-red-400/10 border border-red-400/30 text-[10px] font-black text-red-400">
                                {stockAlerts.outOfStock.length}
                            </span>
                        )}
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            aria-label="Añadir nuevo producto"
                            className="bg-leaf-400 text-forest-void px-6 py-3 rounded-xl font-bold text-[13px] flex items-center gap-2 hover:scale-105 transition-all shadow-glow"
                        >
                            <Plus size={18} /> Nuevo Producto
                        </button>
                    )}
                </div>
            </header>

            {(stockAlerts.outOfStock.length > 0 || stockAlerts.lowStock.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                    {stockAlerts.outOfStock.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/25 rounded-[28px] p-6 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="text-red-400" size={22} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-400/70">Alerta</p>
                                <p className="text-base font-black text-text-primary mt-1">Productos agotados</p>
                                <p className="text-xs text-text-secondary mt-2">
                                    {stockAlerts.outOfStock.length} producto(s) sin stock. Filtra para reabastecer.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setStockFilter('out')}
                                    className="mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-red-300 hover:text-red-200 transition-colors"
                                >
                                    Ver sin stock
                                </button>
                            </div>
                        </div>
                    )}
                    {stockAlerts.lowStock.length > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-400/20 rounded-[28px] p-6 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                                <AlertTriangle className="text-yellow-300" size={22} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300/70">Aviso</p>
                                <p className="text-base font-black text-text-primary mt-1">Stock bajo</p>
                                <p className="text-xs text-text-secondary mt-2">
                                    {stockAlerts.lowStock.length} producto(s) con stock ≤ {LOW_STOCK_THRESHOLD}.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setStockFilter('low')}
                                    className="mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-yellow-200 hover:text-yellow-100 transition-colors"
                                >
                                    Ver stock bajo
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="relative mb-12 group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                    <Search className="text-leaf-400/40 group-focus-within:text-leaf-400 transition-colors" size={20} />
                </div>
                <input
                    type="text"
                    aria-label="Buscar productos"
                    placeholder="Buscar por nombre de producto o categoría..."
                    className="w-full bg-forest-elevated border border-leaf-900/30 p-5 pl-16 rounded-2xl outline-none text-text-primary focus:border-leaf-400/50 focus:shadow-glow transition-all"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                />
            </div>

            {error && (
                <div role="alert" className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl flex items-center gap-4 mb-10 text-red-400 animate-reveal">
                    <AlertTriangle size={24} />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredProducts.map((product, index) => (
                    <motion.div
                        key={product.id_producto}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleViewProduct(product)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') setSelectedProduct(product);
                        }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-forest-elevated border border-leaf-900/30 rounded-[24px] overflow-hidden hover:border-leaf-400/30 transition-all duration-500 group shadow-lg hover:shadow-glow cursor-pointer"
                    >
                        <div className="h-44 bg-forest-primary relative overflow-hidden">
                             <img
                                 src={getProductImage(product)}
                                 alt={product.producto}
                                 className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                                 onError={(event) => {
                                     event.currentTarget.src = assetUrl('/products/product-default.png');
                                 }}
                             />
                            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent"></div>
                            <div className="absolute top-4 right-4 glass px-3 py-1.5 rounded-full text-[9px] font-black text-leaf-400 uppercase tracking-widest border border-leaf-400/20">
                                Impacto: {product.impacto_ambiental}kg
                            </div>
                        </div>

                        <div className="p-6">
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    toggleSelected(product.id_producto);
                                }}
                                aria-label={selectedIds.has(product.id_producto) ? `Quitar ${product.producto} de selección` : `Seleccionar ${product.producto} para factura`}
                                className="mb-4 w-full bg-forest-primary border border-leaf-900/30 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest text-leaf-400 flex items-center justify-between hover:border-leaf-400/30 transition-all"
                            >
                                <span>Factura</span>
                                {selectedIds.has(product.id_producto) ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>

                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-bold uppercase text-leaf-400/60 tracking-widest">{product.categoria}</span>
                                <span
                                    className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${
                                        product.stock > 50 ? 'bg-leaf-700/20 text-leaf-400' : 'bg-red-500/10 text-red-400'
                                    }`}
                                >
                                    {product.stock > 0 ? `${product.stock} Disponibles` : 'Sin Stock'}
                                </span>
                            </div>

                            <h3 className="text-lg font-display font-bold text-text-primary mb-6 line-clamp-1 group-hover:text-leaf-400 transition-colors">
                                {product.producto}
                            </h3>

                            <div className="flex items-center justify-between mt-auto gap-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-text-tertiary font-bold uppercase">Precio Unit.</span>
                                    <span className="text-2xl font-display font-black text-text-primary">${formatPrice(product.precio)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        handleViewProduct(product);
                                    }}
                                    aria-label={`Ver detalles de ${product.producto}`}
                                    className="w-12 h-12 bg-forest-primary text-leaf-400 rounded-xl border border-leaf-900/30 flex items-center justify-center hover:bg-forest-hover hover:border-leaf-400/40 transition-all duration-300"
                                >
                                    <Eye size={19} />
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => handleAddToCart(product, event)}
                                    aria-label={`Añadir ${product.producto} al carrito`}
                                    className="w-12 h-12 bg-forest-primary text-leaf-400 rounded-xl border border-leaf-900/30 flex items-center justify-center hover:bg-leaf-400 hover:text-forest-void hover:border-leaf-400 transition-all duration-300"
                                >
                                    <ShoppingCart size={20} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {filteredProducts.length === 0 && !loading && (
                <div className="mt-20 flex flex-col items-center justify-center text-leaf-400/30">
                    <Package size={80} className="mb-4 opacity-20" />
                    <p className="text-xl font-display italic">No se encontraron productos en el bio-catálogo.</p>
                </div>
            )}

            <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Bio-Producto">
                <form onSubmit={handleCreate} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="prod-name" className="text-[10px] font-bold uppercase text-leaf-400/60 tracking-widest ml-1 flex items-center gap-2">
                            <Tag size={12} /> Nombre del Producto
                        </label>
                        <input
                            id="prod-name"
                            required
                            type="text"
                            className="w-full bg-forest-void border border-leaf-900/30 p-4 rounded-xl outline-none text-text-primary focus:border-leaf-400/50 transition-all"
                            placeholder="Ej: Guantes BioHands Nitrilo"
                            value={newProduct.producto}
                            onChange={(event) => setNewProduct({ ...newProduct, producto: event.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="prod-cat" className="text-[10px] font-bold uppercase text-leaf-400/60 tracking-widest ml-1 flex items-center gap-2">
                                <Box size={12} /> Categoría
                            </label>
                            <select
                                id="prod-cat"
                                className="w-full bg-forest-void border border-leaf-900/30 p-4 rounded-xl outline-none text-text-primary focus:border-leaf-400/50 transition-all"
                                value={newProduct.categoria}
                                onChange={(event) => setNewProduct({ ...newProduct, categoria: event.target.value })}
                            >
                                <option>Guantes</option>
                                <option>Mascarillas</option>
                                <option>Protección</option>
                                <option>Limpieza</option>
                                <option>Alimentos</option>
                                <option>Energía</option>
                                <option>Analitica</option>
                                <option>Empaques</option>
                                <option>Gestion Residuos</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="prod-price" className="text-[10px] font-bold uppercase text-leaf-400/60 tracking-widest ml-1 flex items-center gap-2">
                                <DollarSign size={12} /> Precio Unitario
                            </label>
                            <input
                                id="prod-price"
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full bg-forest-void border border-leaf-900/30 p-4 rounded-xl outline-none text-text-primary focus:border-leaf-400/50 transition-all"
                                placeholder="0.00"
                                value={newProduct.precio}
                                onChange={(event) => setNewProduct({ ...newProduct, precio: event.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="prod-stock" className="text-[10px] font-bold uppercase text-leaf-400/60 tracking-widest ml-1">Stock Inicial</label>
                            <input
                                id="prod-stock"
                                required
                                type="number"
                                min="0"
                                className="w-full bg-forest-void border border-leaf-900/30 p-4 rounded-xl outline-none text-text-primary focus:border-leaf-400/50 transition-all"
                                placeholder="0"
                                value={newProduct.stock}
                                onChange={(event) => setNewProduct({ ...newProduct, stock: event.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="prod-impact" className="text-[10px] font-bold uppercase text-leaf-400/60 tracking-widest ml-1">Impacto (kg CO2)</label>
                            <input
                                id="prod-impact"
                                required
                                type="number"
                                min="0"
                                step="0.1"
                                className="w-full bg-forest-void border border-leaf-900/30 p-4 rounded-xl outline-none text-text-primary focus:border-leaf-400/50 transition-all"
                                placeholder="0.0"
                                value={newProduct.impacto_ambiental}
                                onChange={(event) => setNewProduct({ ...newProduct, impacto_ambiental: event.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="prod-image" className="text-[10px] font-bold uppercase text-leaf-400/60 tracking-widest ml-1">Imagen URL</label>
                        <input
                            id="prod-image"
                            type="text"
                            className="w-full bg-forest-void border border-leaf-900/30 p-4 rounded-xl outline-none text-text-primary focus:border-leaf-400/50 transition-all"
                            placeholder="/products/product-biowrap.jpeg"
                            value={newProduct.imagen_url}
                            onChange={(event) => setNewProduct({ ...newProduct, imagen_url: event.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-leaf-400 text-forest-void font-bold py-4 rounded-2xl hover:bg-leaf-300 transition-all shadow-glow mt-4 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Añadir al Bio-Catálogo'}
                    </button>
                </form>
            </Dialog>

            <Dialog isOpen={!!selectedProduct} onClose={() => { setSelectedProduct(null); setProductAnalysis(''); }} title={selectedProduct?.producto || 'Detalle del Producto'}>
                {selectedProduct && (
                    <div className="space-y-6">
                        <img
                            src={getProductImage(selectedProduct)}
                            alt={selectedProduct.producto}
                            className="w-full h-56 rounded-2xl object-cover border border-leaf-900/30"
                            onError={(event) => {
                                event.currentTarget.src = assetUrl('/products/product-default.png');
                            }}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-forest-primary/40 border border-leaf-400/10 p-4 rounded-2xl">
                                <p className="text-[10px] uppercase tracking-widest text-leaf-400/60 font-black">Categoría</p>
                                <p className="font-bold text-text-primary mt-1">{selectedProduct.categoria}</p>
                            </div>
                            <div className="bg-forest-primary/40 border border-leaf-400/10 p-4 rounded-2xl">
                                <p className="text-[10px] uppercase tracking-widest text-leaf-400/60 font-black">Stock</p>
                                <p className="font-bold text-text-primary mt-1">{selectedProduct.stock} unidades</p>
                            </div>
                            <div className="bg-forest-primary/40 border border-leaf-400/10 p-4 rounded-2xl">
                                <p className="text-[10px] uppercase tracking-widest text-leaf-400/60 font-black">Precio</p>
                                <p className="font-bold text-text-primary mt-1">${formatPrice(selectedProduct.precio)}</p>
                            </div>
                            <div className="bg-forest-primary/40 border border-leaf-400/10 p-4 rounded-2xl">
                                <p className="text-[10px] uppercase tracking-widest text-leaf-400/60 font-black">Impacto</p>
                                <p className="font-bold text-text-primary mt-1">{selectedProduct.impacto_ambiental}kg CO2</p>
                            </div>
                        </div>
                        
                        <div className="bg-forest-primary/30 border border-leaf-400/10 p-5 rounded-2xl min-h-[100px]">
                            <p className="text-[10px] uppercase tracking-widest text-leaf-400/60 font-black mb-3 flex items-center gap-2">
                                <Leaf size={14} /> Análisis Jud Engine
                            </p>
                            {isAnalyzingProduct ? (
                                <div className="flex items-center gap-3 text-leaf-400/60 animate-pulse">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="text-xs font-bold">Jud está analizando {selectedProduct.producto}...</span>
                                </div>
                            ) : (
                                <p className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                                    {productAnalysis}
                                </p>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="bg-leaf-400/10 text-leaf-400 border border-leaf-400/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Sustentable</span>
                                <span className="bg-blue-400/10 text-blue-400 border border-blue-400/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Baja Huella</span>
                                <span className="bg-purple-400/10 text-purple-400 border border-purple-400/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Certificado</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={(event) => handleAddToCart(selectedProduct, event)}
                            className="w-full bg-leaf-400 text-forest-void font-black py-4 rounded-2xl hover:bg-leaf-300 transition-all shadow-glow flex items-center justify-center gap-2"
                        >
                            Crear pedido <ArrowRight size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePrintInvoice('single')}
                            disabled={isPrintingInvoice}
                            className="w-full bg-forest-primary text-leaf-400 font-black py-4 rounded-2xl border border-leaf-900/30 hover:bg-forest-hover transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            <Printer size={18} /> Imprimir factura
                        </button>
                        {isAdmin && (
                        <button
                            type="button"
                            onClick={async () => {
                                if (!window.confirm(`¿Eliminar "${selectedProduct.producto}" del inventario?`)) return;
                                try {
                                    await api.delete(`/inventory/${selectedProduct.id_producto}`);
                                    addNotification(`"${selectedProduct.producto}" eliminado del inventario`, 'success');
                                    setSelectedProduct(null);
                                    await fetchInventory();
                                } catch (err) {
                                    const msg = err.response?.data?.detail || err.response?.data?.error || err.message;
                                    addNotification(`Error al eliminar: ${msg}`, 'error');
                                }
                            }}
                            className="w-full bg-red-500/10 text-red-400 font-black py-4 rounded-2xl border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <AlertTriangle size={18} /> Eliminar Producto
                        </button>
                        )}
                    </div>
                )}
            </Dialog>
        </div>
    );
};

export default Inventory;
