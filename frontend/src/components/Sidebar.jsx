import { useState } from 'react';

const NAV_ITEMS = [
    {
        id: 'active',
        label: 'Activos',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
    },
    {
        id: 'history',
        label: 'Historicos',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
        ),
    },
    {
        id: 'metrics',
        label: 'Metricas',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
];

export default function Sidebar({ currentView, onNavigate, activeCount, historyCount }) {
    const [collapsed, setCollapsed] = useState(true);

    return (
        <>
            {/* Mobile overlay */}
            {!collapsed && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setCollapsed(true)}
                />
            )}

            <aside className={`fixed top-0 left-0 h-full z-40 flex flex-col bg-[#060d18] border-r border-cinte-cyan/10 transition-all duration-300 ${
                collapsed ? 'w-16' : 'w-60'
            }`}>
                {/* Logo / Toggle */}
                <div className="flex items-center h-16 px-4 border-b border-cinte-cyan/10">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2 rounded-lg hover:bg-cinte-primary/20 transition-colors text-cinte-cyan"
                    >
                        <svg className={`w-5 h-5 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    {!collapsed && (
                        <span className="ml-3 text-lg font-bold text-white tracking-tight whitespace-nowrap overflow-hidden">
                            CINTE <span className="text-cinte-cyan font-light">Monitor</span>
                        </span>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
                    {NAV_ITEMS.map(item => {
                        const isActive = currentView === item.id;
                        const badge = item.id === 'active' ? activeCount : item.id === 'history' ? historyCount : null;

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onNavigate(item.id);
                                    if (window.innerWidth < 1024) setCollapsed(true);
                                }}
                                title={collapsed ? item.label : undefined}
                                className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                                    isActive
                                        ? 'bg-cinte-primary/20 text-cinte-cyan border-l-2 border-cinte-cyan'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                                }`}
                            >
                                <div className="flex-shrink-0">{item.icon}</div>
                                {!collapsed && (
                                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                                        {item.label}
                                    </span>
                                )}
                                {badge != null && badge > 0 && (
                                    <span className={`flex-shrink-0 text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                                        collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'
                                    } ${
                                        isActive ? 'bg-cinte-cyan/20 text-cinte-cyan' : 'bg-zinc-800 text-zinc-400'
                                    }`}>
                                        {badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-cinte-cyan/10">
                    {!collapsed ? (
                        <div className="text-[10px] text-zinc-600 text-center">
                            Capital Humano v1.0
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <div className="h-2 w-2 rounded-full bg-cinte-cyan/30"></div>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
