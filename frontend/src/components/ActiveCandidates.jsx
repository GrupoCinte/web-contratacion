import { useState, useMemo } from 'react';
import CandidateModal from './CandidateModal';
import KPICards from './KPICards';
import { formatTimestamp, getRelativeTime } from '../hooks/useMonitorData';

const STATUS_STYLES = {
    analizando: { bg: 'bg-cinte-warning/15', text: 'text-cinte-warning', dot: 'bg-cinte-warning shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse', border: 'border-cinte-warning/30' },
    comunicando: { bg: 'bg-cinte-cyan/15', text: 'text-cinte-cyan', dot: 'bg-cinte-cyan shadow-[0_0_6px_rgba(8,189,198,0.6)]', border: 'border-cinte-cyan/30' },
    'whatsapp enviado': { bg: 'bg-cinte-green/15', text: 'text-cinte-green', dot: 'bg-cinte-green shadow-[0_0_6px_rgba(79,136,49,0.6)]', border: 'border-cinte-green/30' },
    aceptado: { bg: 'bg-cinte-purple/15', text: 'text-cinte-purple', dot: 'bg-cinte-purple shadow-[0_0_6px_rgba(73,66,148,0.6)]', border: 'border-cinte-purple/30' },
    'esperando contrato': { bg: 'bg-cinte-support/15', text: 'text-cinte-support', dot: 'bg-cinte-support shadow-[0_0_6px_rgba(47,123,184,0.6)]', border: 'border-cinte-support/30' },
    cargando: { bg: 'bg-cinte-primary/15', text: 'text-cinte-primary', dot: 'bg-cinte-primary shadow-[0_0_6px_rgba(0,77,135,0.6)]', border: 'border-cinte-primary/30' },
};

const DEFAULT_STYLE = { bg: 'bg-zinc-800/50', text: 'text-zinc-400', dot: 'bg-zinc-500', border: 'border-zinc-700' };

function getStatusStyle(status) {
    const s = (status || '').toLowerCase();
    return STATUS_STYLES[s] || DEFAULT_STYLE;
}

function formatDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function ActiveCandidates({ executions, metrics, loading, error, isConnected }) {
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortField, setSortField] = useState('timestamp');
    const [sortDir, setSortDir] = useState('desc');

    const filtered = useMemo(() => {
        let results = executions.filter(ex => {
            const matchesSearch = (
                ex.workflowName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ex.executionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (ex.fullData?.puesto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                JSON.stringify(ex.fullData || {}).toLowerCase().includes(searchTerm.toLowerCase())
            );
            const matchesStatus = statusFilter === 'all'
                ? true
                : (ex.realStatus || 'unknown').toLowerCase() === statusFilter.toLowerCase();
            return matchesSearch && matchesStatus;
        });

        results.sort((a, b) => {
            let valA, valB;
            switch (sortField) {
                case 'name':
                    valA = (a.workflowName || '').toLowerCase();
                    valB = (b.workflowName || '').toLowerCase();
                    return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'status':
                    valA = (a.realStatus || '').toLowerCase();
                    valB = (b.realStatus || '').toLowerCase();
                    return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'puesto':
                    valA = (a.fullData?.puesto || '').toLowerCase();
                    valB = (b.fullData?.puesto || '').toLowerCase();
                    return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'inicio':
                    valA = new Date(a.fullData?.ts_documentos_recibidos || 0).getTime();
                    valB = new Date(b.fullData?.ts_documentos_recibidos || 0).getTime();
                    return sortDir === 'asc' ? valA - valB : valB - valA;
                case 'timestamp':
                default:
                    valA = a.timestamp || 0;
                    valB = b.timestamp || 0;
                    return sortDir === 'asc' ? valA - valB : valB - valA;
            }
        });

        return results;
    }, [executions, searchTerm, statusFilter, sortField, sortDir]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    if (loading) return <LoadingState />;
    if (error && !isConnected) return <ErrorState error={error} />;

    return (
        <div>
            <KPICards metrics={metrics} variant="active" />

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-3 border border-[#08bdc6]/30 rounded-xl leading-5 bg-[#0A1929]/80 placeholder-gray-500 focus:outline-none focus:bg-[#0F2942] focus:border-[#08bdc6] focus:ring-1 focus:ring-[#08bdc6] sm:text-sm text-white transition-all shadow-lg shadow-[#004D87]/20"
                        placeholder="Buscar por nombre, email, puesto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative min-w-[200px]">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block w-full pl-3 pr-10 py-3 text-base border border-[#08bdc6]/30 bg-[#0A1929]/80 text-white focus:outline-none focus:ring-[#08bdc6] focus:border-[#08bdc6] sm:text-sm rounded-xl appearance-none shadow-lg shadow-[#004D87]/20 cursor-pointer hover:bg-[#0F2942] transition-colors"
                    >
                        <option value="all">Todos los Estados</option>
                        <option value="cargando">Cargando</option>
                        <option value="comunicando">Comunicando</option>
                        <option value="whatsapp enviado">WhatsApp Enviado</option>
                        <option value="analizando">Analizando</option>
                        <option value="esperando contrato">Esperando Contrato</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#08bdc6]">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Results count */}
            <div className="mb-4 text-sm text-zinc-500">
                {filtered.length} de {executions.length} candidatos activos
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5 shadow-lg shadow-[#004D87]/10">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#0A1929]/90 border-b border-zinc-800">
                                <SortableHeader label="Nombre" field="name" current={sortField} dir={sortDir} onClick={handleSort} />
                                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hidden lg:table-cell">Email</th>
                                <SortableHeader label="Cargo" field="puesto" current={sortField} dir={sortDir} onClick={handleSort} className="hidden md:table-cell" />
                                <SortableHeader label="Estado" field="status" current={sortField} dir={sortDir} onClick={handleSort} />
                                <SortableHeader label="Inicio" field="inicio" current={sortField} dir={sortDir} onClick={handleSort} className="hidden sm:table-cell" />
                                <SortableHeader label="Actualización" field="timestamp" current={sortField} dir={sortDir} onClick={handleSort} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {filtered.map(ex => {
                                const style = getStatusStyle(ex.realStatus);
                                return (
                                    <tr
                                        key={ex.executionId}
                                        onClick={() => setSelectedUser(ex)}
                                        className="group bg-cinte-card/40 hover:bg-[#1a3b5c] cursor-pointer transition-colors duration-150"
                                    >
                                        {/* Nombre */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex-shrink-0 h-2 w-2 rounded-full ${style.dot}`} />
                                                <span className="text-sm font-semibold text-gray-200 group-hover:text-cinte-cyan transition-colors truncate max-w-[200px]">
                                                    {ex.workflowName}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Email */}
                                        <td className="px-4 py-3.5 hidden lg:table-cell">
                                            <span className="text-xs text-zinc-500 font-mono truncate block max-w-[200px]">
                                                {ex.executionId?.replace('+', '')}
                                            </span>
                                        </td>

                                        {/* Cargo */}
                                        <td className="px-4 py-3.5 hidden md:table-cell">
                                            <span className="text-sm text-zinc-400 truncate block max-w-[160px]">
                                                {ex.fullData?.puesto || '—'}
                                            </span>
                                        </td>

                                        {/* Estado */}
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md border ${style.bg} ${style.text} ${style.border}`}>
                                                {ex.realStatus || 'Sin Estado'}
                                            </span>
                                        </td>

                                        {/* Inicio */}
                                        <td className="px-4 py-3.5 hidden sm:table-cell">
                                            <span className="text-xs text-zinc-500">
                                                {formatDate(ex.fullData?.ts_documentos_recibidos)}
                                            </span>
                                        </td>

                                        {/* Ultima actualizacion */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-zinc-500">
                                                    {getRelativeTime(ex.timestamp)}
                                                </span>
                                                {/* Arrow icon on hover */}
                                                <svg className="w-3.5 h-3.5 text-zinc-700 group-hover:text-cinte-cyan transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            <CandidateModal selectedUser={selectedUser} onClose={() => setSelectedUser(null)} />
        </div>
    );
}

function SortableHeader({ label, field, current, dir, onClick, className = '' }) {
    const isActive = current === field;
    return (
        <th
            className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none transition-colors hover:text-cinte-cyan ${
                isActive ? 'text-cinte-cyan' : 'text-zinc-500'
            } ${className}`}
            onClick={() => onClick(field)}
        >
            <div className="flex items-center gap-1">
                {label}
                {isActive && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {dir === 'asc'
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        }
                    </svg>
                )}
            </div>
        </th>
    );
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
                <div className="h-16 w-16 border-2 border-zinc-800 rounded-full"></div>
                <div className="absolute top-0 left-0 h-16 w-16 border-2 border-cinte-cyan border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-6 text-zinc-500 text-sm uppercase tracking-widest">Cargando datos...</p>
        </div>
    );
}

function ErrorState({ error }) {
    return (
        <div className="mb-8 bg-red-950/30 backdrop-blur-md border border-red-900/50 rounded-xl p-6">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-red-900/20 rounded-lg">
                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-red-200 font-semibold mb-1">Error de Conexion</h3>
                    <p className="text-red-400/80 text-sm">{error}</p>
                </div>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-24 bg-cinte-card/30 rounded-3xl border border-cinte-cyan/20 border-dashed backdrop-blur-sm">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-cinte-primary/20 rounded-2xl mb-6 shadow-2xl border border-cinte-primary/30">
                <svg className="w-10 h-10 text-cinte-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">Sin Actividad</h3>
            <p className="text-cinte-support max-w-sm mx-auto">No hay candidatos activos que coincidan con tu busqueda.</p>
        </div>
    );
}
