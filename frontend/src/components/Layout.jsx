import Sidebar from './Sidebar';
import { formatTimestamp } from '../hooks/useMonitorData';

export default function Layout({ currentView, onNavigate, isConnected, lastUpdate, activeCount, historyCount, children }) {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-gray-200 selection:bg-cinte-cyan/30 overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#004D87]/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#494294]/20 rounded-full blur-[100px]"></div>
                <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-[#4F8831]/10 rounded-full blur-[80px]"></div>
                <div className="absolute bottom-[20%] left-[10%] w-[15%] h-[15%] bg-[#D21B30]/10 rounded-full blur-[80px]"></div>
            </div>

            {/* Sidebar */}
            <Sidebar
                currentView={currentView}
                onNavigate={onNavigate}
                activeCount={activeCount}
                historyCount={historyCount}
            />

            {/* Main Content */}
            <main className="ml-16 relative z-10 min-h-screen">
                {/* Top Bar */}
                <div className="sticky top-0 z-20 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-zinc-800/50 px-6 py-3">
                    <div className="flex items-center justify-between max-w-7xl mx-auto">
                        <h2 className="text-lg font-semibold text-white tracking-tight">
                            {currentView === 'active' && 'Candidatos Activos'}
                            {currentView === 'history' && 'Historico de Candidatos'}
                            {currentView === 'metrics' && 'Metricas y Analisis'}
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-cinte-green shadow-[0_0_8px_rgba(79,136,49,0.8)]' : 'bg-cinte-red'}`}></div>
                                    {isConnected && <div className="absolute inset-0 h-2 w-2 bg-cinte-green rounded-full animate-ping opacity-75"></div>}
                                </div>
                                <span className="text-xs text-zinc-400 font-medium">
                                    {isConnected ? 'En Vivo' : 'Desconectado'}
                                </span>
                            </div>
                            {lastUpdate && (
                                <span className="text-xs text-zinc-500 font-mono">
                                    {formatTimestamp(lastUpdate)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className="p-6 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
