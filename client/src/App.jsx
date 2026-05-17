import React, { useContext } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Chatbot from './pages/Chatbot';
import Projects from './pages/Projects';
import Analytics from './pages/Analytics';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import PublicVerify from './pages/PublicVerify';
import PageTransition from './components/PageTransition';
import { NotificationProvider } from './context/NotificationContext';

const AppRoutes = () => {
    const { user, loading } = useAuth();

    if (loading) return <div className="h-screen flex items-center justify-center bg-forest-void text-text-primary">Cargando...</div>;

    return (
        <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
            <Route path="/verify/:reportId" element={<PublicVerify />} />
            
            <Route path="/*" element={user ? <div className="flex h-screen bg-forest-void overflow-hidden">
                <Sidebar />
                <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
                    <PageTransition>
                        <Routes>
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="chatbot" element={<Chatbot />} />
                            <Route path="projects" element={<Projects />} />
                            <Route path="analytics" element={<Analytics />} />
                            <Route path="inventory" element={<Inventory />} />
                            <Route path="orders" element={<Orders />} />
                            <Route path="settings" element={<Settings />} />
                            <Route path="reports" element={<Reports />} />
                            <Route path="*" element={<Navigate to="dashboard" />} />
                        </Routes>
                    </PageTransition>
                </main>
            </div> : <Navigate to="/login" />}>
                {/* Nested routes are handled inside the Layout div above */}
            </Route>
        </Routes>
    );
};



function App() {
  const Router = (typeof window !== 'undefined' && window.location?.protocol === 'file:')
      ? HashRouter
      : BrowserRouter;

  return (
    <AuthProvider>
        <ThemeProvider>
            <NotificationProvider>
                <ErrorBoundary>
                    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        <AppRoutes />
                    </Router>
                </ErrorBoundary>
            </NotificationProvider>
        </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
