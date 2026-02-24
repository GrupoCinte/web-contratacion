import { useState, useMemo } from 'react';
import CandidateModal from './CandidateModal';
import KPICards from './KPICards';
import { getRelativeTime, calculateProcessTime, normalizeStatus } from '../hooks/useMonitorData';

const STATUS_STYLES = {
    finalizado: { bg: 'bg-cinte-green/15', text: 'text-cinte-green', border: 'border-cinte-green/30' },
    completado: { bg: 'bg-cinte-green/15', text: 'text-cinte-green', border: 'border-cinte-green/30' },
    'contrato recibido': { bg: 'bg-cinte-cyan/15', text: 'text-cinte-cyan', border: 'border-cinte-cyan/30' },
    rechazado: { bg: 'bg-cinte-red/15', text: 'text-cinte-red', border: 'border-cinte-red/30' },
};

const DEFAULT_STYLE = { bg: 'bg-zinc-800/50', text: 'text-zinc-400', border: 'border-zinc-700' };

function getStatusStyle(status) {
    const s = normalizeStatus(status);
    return STATUS_STYLES[s] || DEFAULT_STYLE;
}

function formatDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryCandidates({ executions, metrics, loading }) {
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortField, setSortField] = useState('timestamp');
    const [sortDir, setSortDir] = useState('desc');

    const filtered = useMemo(() => {
        let results = executions.filter(ex => {
            const matchesSearch = !searchTerm || (
                ex.workflowName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ex.executionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (ex.fullData?.puesto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                JSON.stringify(ex.fullData || {}).toLowerCase().includes(searchTerm.toLowerCase())
            );
            const matchesStatus = statusFilter === 'all'
                ? true
                : normalizeStatus(ex.realStatus) === normalizeStatus(statusFilter);
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
                    valA = normalizeStatus(a.realStatus);
                    valB = normalizeStatus(b.realStatus);
                    return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'puesto':
                    valA = (a.fullData?.puesto || '').toLowerCase();
                    valB = (b.fullData?.puesto || '').toLowerCase();
                    return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'duracion':
                    valA = getDurationMs(a);
                    valB = getDurationMs(b);
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <div className="relative">
                    <div className="h-16 w-16 border-2 border-zinc-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 h-16 w-16 border-2 border-cinte-green border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="mt-6 text-zinc-500 text-sm uppercase tracking-widest">Cargando historicos...</p>
            </div>
        );
    }

    return (
        <div>
            <KPICards metrics={metrics} variant="history" />

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
                        className="block w-full pl-10 pr-3 py-3 border border-cinte-green/30 rounded-xl leading-5 bg-[#0A1929]/80 placeholder-gray-500 focus:outline-none focus:bg-[#0F2942] focus:border-cinte-green focus:ring-1 focus:ring-cinte-green sm:text-sm text-white transition-all shadow-lg shadow-[#004D87]/20"
                        placeholder="Buscar por nombre, email, puesto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative min-w-[200px]">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block w-full pl-3 pr-10 py-3 text-base border border-cinte-green/30 bg-[#0A1929]/80 text-white focus:outline-none focus:ring-cinte-green focus:border-cinte-green sm:text-sm rounded-xl appearance-none shadow-lg shadow-[#004D87]/20 cursor-pointer hover:bg-[#0F2942] transition-colors"
                    >
                        <option value="all">Todos los Estados</option>
                        <option value="finalizado">Finalizado</option>
                        <option value="completado">Completado</option>
                        <option value="contrato recibido">Contrato Recibido</option>
                        <option value="rechazado">Rechazado</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-cinte-green">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Results count */}
            <div className="mb-4 text-sm text-zinc-500">
                {filtered.length} candidatos en el historico
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="text-center py-24 bg-cinte-card/30 rounded-3xl border border-cinte-green/20 border-dashed backdrop-blur-sm">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-cinte-green/10 rounded-2xl mb-6 border border-cinte-green/20">
                        <svg className="w-10 h-10 text-cinte-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Sin Historicos</h3>
                    <p className="text-cinte-support max-w-sm mx-auto">No hay candidatos finalizados aun.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5 shadow-lg shadow-[#004D87]/10">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#0A1929]/90 border-b border-zinc-800">
                                <SortableHeader label="Nombre" field="name" current={sortField} dir={sortDir} onClick={handleSort} />
                                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hidden lg:table-cell">Email</th>
                                <SortableHeader label="Cargo" field="puesto" current={sortField} dir={sortDir} onClick={handleSort} className="hidden md:table-cell" />
                                <SortableHeader label="Estado" field="status" current={sortField} dir={sortDir} onClick={handleSort} />
                                <SortableHeader label="Duracion" field="duracion" current={sortField} dir={sortDir} onClick={handleSort} className="hidden sm:table-cell" />
                                <SortableHeader label="Finalizado" field="timestamp" current={sortField} dir={sortDir} onClick={handleSort} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {filtered.map(ex => {
                                const style = getStatusStyle(ex.realStatus);
                                const duration = calculateProcessTime(
                                    ex.fullData?.ts_documentos_recibidos,
                                    ex.fullData?.ts_validacion_completada
                                );
                                return (
                                    <tr
                                        key={ex.executionId}
                                        onClick={() => setSelectedUser(ex)}
                                        className="group bg-cinte-card/40 hover:bg-[#1a3b5c] cursor-pointer transition-colors duration-150"
                                    >
                                        {/* Nombre */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 h-2 w-2 rounded-full bg-cinte-green shadow-[0_0_6px_rgba(79,136,49,0.4)]" />
                                                <span className="text-sm font-semibold text-gray-300 group-hover:text-cinte-green transition-colors truncate max-w-[200px]">
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

                                        {/* Duracion */}
                                        <td className="px-4 py-3.5 hidden sm:table-cell">
                                            {duration ? (
                                                <span className="text-xs text-cinte-green font-mono bg-cinte-green/10 px-2 py-0.5 rounded border border-cinte-green/20">
                                                    {duration}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-zinc-600">—</span>
                                            )}
                                        </td>

                                        {/* Finalizado */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-zinc-500">
                                                    {formatDate(ex.fullData?.ts_validacion_completada)}
                                                </span>
                                                <svg className="w-3.5 h-3.5 text-zinc-700 group-hover:text-cinte-green transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

            <CandidateModal selectedUser={selectedUser} onClose={() => setSelectedUser(null)} />
        </div>
    );
}

function getDurationMs(ex) {
    const start = ex.fullData?.ts_documentos_recibidos;
    const end = ex.fullData?.ts_validacion_completada;
    if (!start || !end) return 0;
    return new Date(end).getTime() - new Date(start).getTime();
}

function SortableHeader({ label, field, current, dir, onClick, className = '' }) {
    const isActive = current === field;
    return (
        <th
            className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none transition-colors hover:text-cinte-green ${isActive ? 'text-cinte-green' : 'text-zinc-500'
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
