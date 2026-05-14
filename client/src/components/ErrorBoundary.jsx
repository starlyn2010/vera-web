import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-forest-void flex items-center justify-center p-6 font-body">
                    <div className="glass p-12 rounded-[40px] border border-red-500/20 max-w-md text-center">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
                            <AlertTriangle size={32} />
                        </div>
                        <h1 className="text-2xl font-display font-bold text-text-primary mb-4">Ups, algo salió mal</h1>
                        <p className="text-sm text-text-secondary mb-8 leading-relaxed">
                            Jud ha detectado una anomalía en el sistema. Hemos registrado el error y estamos trabajando en ello.
                        </p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="flex items-center justify-center gap-2 w-full bg-leaf-400 hover:bg-leaf-300 text-forest-void font-bold py-4 rounded-2xl transition-all shadow-glow"
                        >
                            <RefreshCcw size={18} /> Reintentar Conexión
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
