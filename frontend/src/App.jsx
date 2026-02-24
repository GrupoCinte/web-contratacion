import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useMonitorData from './hooks/useMonitorData';
import Layout from './components/Layout';
import ActiveCandidates from './components/ActiveCandidates';
import HistoryCandidates from './components/HistoryCandidates';
import MetricsDashboard from './components/MetricsDashboard';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import RequestAccess from './pages/RequestAccess';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

if (!API_BASE_URL && import.meta.env.PROD) {
    console.error('SEGURIDAD: VITE_API_URL no está configurada en producción.');
}

axios.defaults.withCredentials = true;

function Dashboard() {
    const [currentView, setCurrentView] = useState('active');
    const data = useMonitorData();

    return (
        <Layout
            currentView={currentView}
            onNavigate={setCurrentView}
            isConnected={data.isConnected}
            lastUpdate={data.lastUpdate}
            activeCount={data.activeExecutions.length}
            historyCount={data.historyExecutions.length}
        >
            {currentView === 'active' && (
                <ActiveCandidates
                    executions={data.activeExecutions}
                    metrics={data.metrics}
                    loading={data.loading}
                    error={data.error}
                    isConnected={data.isConnected}
                />
            )}
            {currentView === 'history' && (
                <HistoryCandidates
                    executions={data.historyExecutions}
                    metrics={data.metrics}
                    loading={data.loading}
                />
            )}
            {currentView === 'metrics' && (
                <MetricsDashboard
                    metrics={data.metrics}
                    loading={data.loading}
                />
            )}
        </Layout>
    );
}

function ProtectedRoute({ children, requiredRole }) {
    const [authState, setAuthState] = useState('loading');

    useEffect(() => {
        const controller = new AbortController();

        axios.get(`${API_BASE_URL}/api/verify`, { signal: controller.signal })
            .then((response) => {
                const user = response.data.user;
                if (requiredRole && user.role !== requiredRole) {
                    sessionStorage.removeItem('wsToken');
                    setAuthState('forbidden');
                } else {
                    setAuthState('authorized');
                }
            })
            .catch((error) => {
                if (!axios.isCancel(error)) {
                    sessionStorage.removeItem('wsToken');
                    setAuthState('unauthorized');
                }
            });

        return () => controller.abort();
    }, [requiredRole]);

    if (authState === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cinte-dark">
                <div className="animate-spin h-8 w-8 border-4 border-cinte-cyan border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (authState === 'forbidden') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cinte-dark">
                <div className="text-center">
                    <h1 className="text-2xl text-red-400 font-bold mb-2">Acceso Denegado</h1>
                    <p className="text-gray-400">No tienes permisos para acceder a este recurso.</p>
                </div>
            </div>
        );
    }

    if (authState === 'unauthorized') {
        return <Navigate to="/login" />;
    }

    return children;
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/request-access" element={<RequestAccess />} />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute requiredRole="ADMIN">
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
    );
}

export default App;
