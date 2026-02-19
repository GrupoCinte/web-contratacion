import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useMonitorData from './hooks/useMonitorData';
import Layout from './components/Layout';
import ActiveCandidates from './components/ActiveCandidates';
import HistoryCandidates from './components/HistoryCandidates';
import MetricsDashboard from './components/MetricsDashboard';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import RequestAccess from './pages/RequestAccess';

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

function App() {
    const isLoggedIn = localStorage.getItem('token');

    // Función para proteger rutas
    const ProtectedRoute = ({ children }) => {
        if (!isLoggedIn) {
            return <Navigate to="/login" />;
        }
        return children;
    };

    return (
        <Router>
            <Routes>
                {/* Rutas públicas */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/request-access" element={<RequestAccess />} />

                {/* Ruta del dashboard (protegida) */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Redirecciones */}
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
    );
}

export default App;