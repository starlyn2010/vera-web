import React, { createContext, useContext, useState, useCallback } from 'react';

const translations = {
  es: {
    // Sidebar
    'sidebar.dashboard': 'Panel Principal',
    'sidebar.assistant': 'Asistente Jud',
    'sidebar.inventory': 'Inventario',
    'sidebar.projects': 'Proyectos',
    'sidebar.analytics': 'Analíticas',
    'sidebar.reports': 'Reportes',
    'sidebar.orders': 'Órdenes',
    'sidebar.settings': 'Configuración',
    'sidebar.partner': 'Socio Ambiental',
    'sidebar.explorer': 'Explorador',
    'sidebar.logout': 'Cerrar Sesión',
    'sidebar.darkMode': 'Cambiar a modo claro',
    'sidebar.lightMode': 'Cambiar a modo oscuro',

    // Roles
    'role.admin': 'Administrador',
    'role.notAdmin': 'No admin',

    // Login
    'login.platform': 'Plataforma Clear Path',
    'login.welcome': 'Bienvenido de nuevo',
    'login.subtitle': 'Ingresa tus credenciales para acceder al bio-sistema.',
    'login.username': 'Usuario',
    'login.password': 'Contraseña',
    'login.submit': 'Acceder al Sistema',
    'login.loading': 'Verificando...',
    'login.noAccount': '¿No tienes cuenta?',
    'login.register': 'Registrarse',

    // Register
    'register.title': 'Registro',
    'register.subtitle': 'Crea tu cuenta corporativa.',
    'register.name': 'Nombre Completo',
    'register.email': 'Correo Electrónico',
    'register.username': 'Nombre de Usuario',
    'register.password': 'Contraseña',
    'register.confirmPassword': 'Confirmar Contraseña',
    'register.submit': 'Crear Cuenta',
    'register.loading': 'Registrando...',
    'register.hasAccount': '¿Ya tienes cuenta?',
    'register.login': 'Iniciar Sesión',

    // Dashboard
    'dashboard.greeting': 'Buenos días',
    'dashboard.subtitle': 'Tu resumen de impacto ambiental está actualizado.',
    'dashboard.totalOrders': 'Pedidos Totales',
    'dashboard.totalRevenue': 'Ingresos Totales',
    'dashboard.products': 'Productos',
    'dashboard.clients': 'Clientes',
    'dashboard.recentOrders': 'Pedidos Recientes',
    'dashboard.quickActions': 'Acciones Rápidas',
    'dashboard.newOrder': 'Nueva Orden',
    'dashboard.viewReports': 'Ver Reportes',
    'dashboard.envMetrics': 'Métricas Ambientales',
    'dashboard.loading': 'Cargando...',

    // Inventory
    'inventory.title': 'Inventario',
    'inventory.search': 'Buscar productos...',
    'inventory.addProduct': 'Agregar Producto',
    'inventory.product': 'Producto',
    'inventory.category': 'Categoría',
    'inventory.price': 'Precio',
    'inventory.stock': 'Stock',
    'inventory.impact': 'Impacto',
    'inventory.actions': 'Acciones',
    'inventory.noProducts': 'No se encontraron productos.',

    // Orders
    'orders.title': 'Gestión de Órdenes',
    'orders.newOrder': 'Nueva Orden',
    'orders.search': 'Buscar pedidos...',
    'orders.order': 'Pedido',
    'orders.date': 'Fecha',
    'orders.total': 'Total',
    'orders.status': 'Estado',
    'orders.noOrders': 'No hay pedidos registrados.',
    'orders.confirmOrder': 'Confirmar Pedido',
    'orders.cancel': 'Cancelar',

    // Projects
    'projects.title': 'Proyectos Ambientales',
    'projects.search': 'Buscar proyectos...',
    'projects.department': 'Departamento',
    'projects.status': 'Estado',
    'projects.startDate': 'Fecha de Inicio',

    // Analytics
    'analytics.title': 'Analíticas',
    'analytics.environmental': 'Métricas Ambientales',
    'analytics.sales': 'Ventas',

    // Reports
    'reports.title': 'Centro de Reportes',
    'reports.search': 'Buscar en el archivo de reportes...',
    'reports.document': 'Documento',
    'reports.category': 'Categoría',
    'reports.generated': 'Generado',
    'reports.actions': 'Acciones',
    'reports.newReport': 'Nuevo Reporte',
    'reports.generate': 'Generar',
    'reports.envImpact': 'Impacto Ambiental',
    'reports.salesSummary': 'Resumen de Ventas',
    'reports.advancedAnalytics': 'Analítica Avanzada',
    'reports.customReport': '¿Reporte a Medida?',
    'reports.customDesc': 'Describe los datos específicos que necesitas y Jud construirá el documento para ti.',
    'reports.askJud': 'Consultar con Jud',
    'reports.noReports': 'No se han encontrado reportes coincidentes.',
    'reports.judActive': 'Motor Jud Activo',
    'reports.documentation': 'Documentación',
    'reports.buildReport': 'Construir Reporte',
    'reports.quickAnalysis': 'Análisis Rápidos',
    'reports.yourRequest': 'Tu requerimiento',

    // Settings
    'settings.title': 'Panel de Control',
    'settings.preferences': 'Preferencias',
    'settings.profile': 'Perfil de Usuario',
    'settings.fullName': 'Nombre Completo',
    'settings.email': 'Correo Electrónico',
    'settings.systemRole': 'Rol del Sistema',
    'settings.currentAccess': 'Acceso actual',
    'settings.notifications': 'Notificaciones',
    'settings.impactAlerts': 'Alertas de Impacto',
    'settings.judUpdates': 'Actualizaciones de Jud AI',
    'settings.autoReports': 'Reportes Automáticos',
    'settings.system': 'Sistema',
    'settings.language': 'Idioma',
    'settings.deleteAccount': 'Eliminar Cuenta',
    'settings.deleteWarning': 'Acción irreversible',
    'settings.saveChanges': 'Guardar Cambios',
    'settings.saving': 'Guardando...',
    'settings.saved': 'Configuración guardada con éxito',

    // Chatbot
    'chatbot.title': 'Jud — Asistente IA',
    'chatbot.placeholder': 'Escribe tu mensaje...',
    'chatbot.send': 'Enviar',
    'chatbot.thinking': 'Jud está pensando...',

    // Common
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.search': 'Buscar',
    'common.noData': 'Sin datos',
    'common.syncing': 'Sincronizando...',
  },
  en: {
    // Sidebar
    'sidebar.dashboard': 'Dashboard',
    'sidebar.assistant': 'Jud Assistant',
    'sidebar.inventory': 'Inventory',
    'sidebar.projects': 'Projects',
    'sidebar.analytics': 'Analytics',
    'sidebar.reports': 'Reports',
    'sidebar.orders': 'Orders',
    'sidebar.settings': 'Settings',
    'sidebar.partner': 'Environmental Partner',
    'sidebar.explorer': 'Explorer',
    'sidebar.logout': 'Sign Out',
    'sidebar.darkMode': 'Switch to light mode',
    'sidebar.lightMode': 'Switch to dark mode',

    // Roles
    'role.admin': 'Administrator',
    'role.notAdmin': 'Not admin',

    // Login
    'login.platform': 'Clear Path Platform',
    'login.welcome': 'Welcome back',
    'login.subtitle': 'Enter your credentials to access the bio-system.',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.submit': 'Access System',
    'login.loading': 'Verifying...',
    'login.noAccount': "Don't have an account?",
    'login.register': 'Register',

    // Register
    'register.title': 'Register',
    'register.subtitle': 'Create your corporate account.',
    'register.name': 'Full Name',
    'register.email': 'Email',
    'register.username': 'Username',
    'register.password': 'Password',
    'register.confirmPassword': 'Confirm Password',
    'register.submit': 'Create Account',
    'register.loading': 'Registering...',
    'register.hasAccount': 'Already have an account?',
    'register.login': 'Sign In',

    // Dashboard
    'dashboard.greeting': 'Good morning',
    'dashboard.subtitle': 'Your environmental impact summary is up to date.',
    'dashboard.totalOrders': 'Total Orders',
    'dashboard.totalRevenue': 'Total Revenue',
    'dashboard.products': 'Products',
    'dashboard.clients': 'Clients',
    'dashboard.recentOrders': 'Recent Orders',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.newOrder': 'New Order',
    'dashboard.viewReports': 'View Reports',
    'dashboard.envMetrics': 'Environmental Metrics',
    'dashboard.loading': 'Loading...',

    // Inventory
    'inventory.title': 'Inventory',
    'inventory.search': 'Search products...',
    'inventory.addProduct': 'Add Product',
    'inventory.product': 'Product',
    'inventory.category': 'Category',
    'inventory.price': 'Price',
    'inventory.stock': 'Stock',
    'inventory.impact': 'Impact',
    'inventory.actions': 'Actions',
    'inventory.noProducts': 'No products found.',

    // Orders
    'orders.title': 'Order Management',
    'orders.newOrder': 'New Order',
    'orders.search': 'Search orders...',
    'orders.order': 'Order',
    'orders.date': 'Date',
    'orders.total': 'Total',
    'orders.status': 'Status',
    'orders.noOrders': 'No orders registered.',
    'orders.confirmOrder': 'Confirm Order',
    'orders.cancel': 'Cancel',

    // Projects
    'projects.title': 'Environmental Projects',
    'projects.search': 'Search projects...',
    'projects.department': 'Department',
    'projects.status': 'Status',
    'projects.startDate': 'Start Date',

    // Analytics
    'analytics.title': 'Analytics',
    'analytics.environmental': 'Environmental Metrics',
    'analytics.sales': 'Sales',

    // Reports
    'reports.title': 'Reports Center',
    'reports.search': 'Search report archive...',
    'reports.document': 'Document',
    'reports.category': 'Category',
    'reports.generated': 'Generated',
    'reports.actions': 'Actions',
    'reports.newReport': 'New Report',
    'reports.generate': 'Generate',
    'reports.envImpact': 'Environmental Impact',
    'reports.salesSummary': 'Sales Summary',
    'reports.advancedAnalytics': 'Advanced Analytics',
    'reports.customReport': 'Custom Report?',
    'reports.customDesc': 'Describe the specific data you need and Jud will build the document for you.',
    'reports.askJud': 'Ask Jud',
    'reports.noReports': 'No matching reports found.',
    'reports.judActive': 'Jud Engine Active',
    'reports.documentation': 'Documentation',
    'reports.buildReport': 'Build Report',
    'reports.quickAnalysis': 'Quick Analysis',
    'reports.yourRequest': 'Your request',

    // Settings
    'settings.title': 'Control Panel',
    'settings.preferences': 'Preferences',
    'settings.profile': 'User Profile',
    'settings.fullName': 'Full Name',
    'settings.email': 'Email',
    'settings.systemRole': 'System Role',
    'settings.currentAccess': 'Current access',
    'settings.notifications': 'Notifications',
    'settings.impactAlerts': 'Impact Alerts',
    'settings.judUpdates': 'Jud AI Updates',
    'settings.autoReports': 'Automatic Reports',
    'settings.system': 'System',
    'settings.language': 'Language',
    'settings.deleteAccount': 'Delete Account',
    'settings.deleteWarning': 'Irreversible action',
    'settings.saveChanges': 'Save Changes',
    'settings.saving': 'Saving...',
    'settings.saved': 'Settings saved successfully',

    // Chatbot
    'chatbot.title': 'Jud — AI Assistant',
    'chatbot.placeholder': 'Type your message...',
    'chatbot.send': 'Send',
    'chatbot.thinking': 'Jud is thinking...',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.noData': 'No data',
    'common.syncing': 'Syncing...',
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('app_lang') || 'es';
    }
    return 'es';
  });

  const setLanguage = useCallback((newLang) => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] || translations['es']?.[key] || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
