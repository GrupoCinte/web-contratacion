import { useState } from 'react';
import useMonitorData from './hooks/useMonitorData';
import Layout from './components/Layout';
import ActiveCandidates from './components/ActiveCandidates';
import HistoryCandidates from './components/HistoryCandidates';
import MetricsDashboard from './components/MetricsDashboard';

function App() {
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

export default App;
