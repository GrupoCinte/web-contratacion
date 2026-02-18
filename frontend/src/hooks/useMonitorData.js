import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ACTIVE_STATUSES = ['cargando', 'comunicando', 'whatsapp enviado', 'aceptado', 'analizando', 'esperando contrato'];
const TERMINAL_STATUSES = ['finalizado', 'contrato recibido', 'rechazado', 'completado'];

function isActiveStatus(status) {
    const s = (status || '').toLowerCase();
    if (TERMINAL_STATUSES.includes(s)) return false;
    return true;
}

export default function useMonitorData() {
    const [executions, setExecutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);

    // Fetch executions from API
    const fetchExecutions = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/monitor`);
            if (response.data.success) {
                setExecutions(response.data.executions);
                setLastUpdate(new Date());
                setError(null);
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching executions:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    // WebSocket connection
    useEffect(() => {
        fetchExecutions();

        const connectWebSocket = () => {
            const wsUrl = API_BASE_URL.replace(/^http/, 'ws');
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Connected to WebSocket');
                setIsConnected(true);
                setError(null);
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    const { type, data } = message;

                    setExecutions(prev => {
                        let next = [...prev];
                        if (type === 'DELETE' || type === 'REMOVE') {
                            next = next.filter(ex => ex.executionId !== data.executionId);
                        } else {
                            const index = next.findIndex(ex => ex.executionId === data.executionId);
                            if (index > -1) {
                                next[index] = data;
                            } else {
                                next.unshift(data);
                            }
                        }
                        return next;
                    });

                    setLastUpdate(new Date());
                } catch (e) {
                    console.error('Error parsing WebSocket message:', e);
                }
            };

            ws.onclose = () => {
                console.log('Disconnected from WebSocket');
                setIsConnected(false);
                setTimeout(() => {
                    if (wsRef.current?.readyState === WebSocket.CLOSED) {
                        connectWebSocket();
                    }
                }, 3000);
            };

            ws.onerror = () => {
                setIsConnected(false);
            };
        };

        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    // Derived: active vs history
    const activeExecutions = useMemo(() =>
        executions.filter(e => isActiveStatus(e.realStatus)),
        [executions]
    );

    const historyExecutions = useMemo(() =>
        executions.filter(e => !isActiveStatus(e.realStatus)),
        [executions]
    );

    // Metrics
    const metrics = useMemo(() => {
        const total = executions.length;
        const active = activeExecutions.length;
        const history = historyExecutions.length;
        const contacted = executions.filter(e => (e.realStatus || '').toLowerCase() === 'contactado').length;
        const finalized = executions.filter(e => (e.realStatus || '').toLowerCase() === 'finalizado').length;
        const conversionRate = total > 0 ? Math.round(((contacted + finalized) / total) * 100) : 0;

        const HUMAN_PROCESS_TIME_MS = 783.5 * 60 * 1000;
        const HUMAN_HOUR_COST_COP = 20000;
        const AUTO_COST_USD = 0.45;
        const TRM = 4200;

        let totalAutoTimeMs = 0;
        let totalWaitTimeMs = 0;
        let totalHumanTimeSavedMs = 0;
        let countWithAutoTime = 0;
        let countWithWaitTime = 0;

        executions.forEach(e => {
            const fd = e.fullData || {};
            const tsStart = fd.ts_documentos_recibidos;
            const tsIaDone = fd.ts_analisis_ia_completado;
            const tsEnd = fd.ts_validacion_completada;

            if (tsStart && tsIaDone) {
                const start = new Date(tsStart).getTime();
                const iaDone = new Date(tsIaDone).getTime();
                const autoDiff = iaDone - start;
                if (autoDiff > 0) {
                    totalAutoTimeMs += autoDiff;
                    countWithAutoTime++;
                }
            }

            if (tsIaDone && tsEnd) {
                const iaDone = new Date(tsIaDone).getTime();
                const end = new Date(tsEnd).getTime();
                const waitDiff = end - iaDone;
                if (waitDiff > 0) {
                    totalWaitTimeMs += waitDiff;
                    countWithWaitTime++;
                }
            }

            if (tsStart && tsEnd) {
                const start = new Date(tsStart).getTime();
                const end = new Date(tsEnd).getTime();
                const fullDiff = end - start;
                if (fullDiff > 0) {
                    totalHumanTimeSavedMs += (HUMAN_PROCESS_TIME_MS - fullDiff);
                }
            }
        });

        const formatDuration = (ms) => {
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            if (hours > 0) return `${hours}h ${minutes}m`;
            if (minutes > 0) return `${minutes}m ${seconds}s`;
            return `${seconds}s`;
        };

        let averageTime = 'N/A';
        if (countWithAutoTime > 0) {
            averageTime = formatDuration(totalAutoTimeMs / countWithAutoTime);
        }

        let avgWaitTime = 'N/A';
        if (countWithWaitTime > 0) {
            avgWaitTime = formatDuration(totalWaitTimeMs / countWithWaitTime);
        }

        let humanTimeSaved = 'N/A';
        let efficiencyPercent = 0;
        const countWithFullTime = executions.filter(e =>
            e.fullData?.ts_documentos_recibidos && e.fullData?.ts_validacion_completada
        ).length;

        if (countWithFullTime > 0) {
            const savedHours = Math.floor(totalHumanTimeSavedMs / (1000 * 60 * 60));
            const savedMinutes = Math.floor((totalHumanTimeSavedMs % (1000 * 60 * 60)) / (1000 * 60));
            humanTimeSaved = savedHours > 0 ? `${savedHours}h ${savedMinutes}m` : `${savedMinutes}m`;

            if (countWithAutoTime > 0) {
                const avgAutoMs = totalAutoTimeMs / countWithAutoTime;
                efficiencyPercent = Math.round(((HUMAN_PROCESS_TIME_MS - avgAutoMs) / HUMAN_PROCESS_TIME_MS) * 100);
            }
        }

        let costSaved = 'N/A';
        let costSavedSubtext = '';
        let autoCost = 'N/A';
        let autoCostSubtext = '';

        if (countWithFullTime > 0) {
            const humanHours = HUMAN_PROCESS_TIME_MS / (1000 * 60 * 60);
            const humanCostPerCandidate = humanHours * HUMAN_HOUR_COST_COP;
            const autoCostPerCandidateCOP = AUTO_COST_USD * TRM;
            const totalHumanCost = humanCostPerCandidate * countWithFullTime;
            const totalAutoCostCOP = autoCostPerCandidateCOP * countWithFullTime;
            const totalSavedCOP = totalHumanCost - totalAutoCostCOP;

            if (totalSavedCOP >= 1000000) {
                costSaved = `$${(totalSavedCOP / 1000000).toFixed(2)}M`;
            } else if (totalSavedCOP >= 1000) {
                costSaved = `$${new Intl.NumberFormat('es-CO').format(Math.round(totalSavedCOP))}`;
            } else {
                costSaved = `$${Math.round(totalSavedCOP)}`;
            }
            costSavedSubtext = `vs $${new Intl.NumberFormat('es-CO').format(Math.round(totalHumanCost))} manual`;

            if (totalAutoCostCOP >= 1000000) {
                autoCost = `$${(totalAutoCostCOP / 1000000).toFixed(2)}M`;
            } else if (totalAutoCostCOP >= 1000) {
                autoCost = `$${new Intl.NumberFormat('es-CO').format(Math.round(totalAutoCostCOP))}`;
            } else {
                autoCost = `$${Math.round(totalAutoCostCOP)}`;
            }
            autoCostSubtext = `$${new Intl.NumberFormat('es-CO').format(autoCostPerCandidateCOP)}/ejec · ${countWithFullTime} procesados`;
        }

        // Status distribution for charts
        const statusCounts = {};
        executions.forEach(e => {
            const s = e.realStatus || 'Sin Estado';
            statusCounts[s] = (statusCounts[s] || 0) + 1;
        });

        // Position distribution for charts
        const positionCounts = {};
        executions.forEach(e => {
            const p = e.puesto || 'Sin Puesto';
            positionCounts[p] = (positionCounts[p] || 0) + 1;
        });

        // Per-candidate process times for charts
        const processTimes = [];
        executions.forEach(e => {
            const fd = e.fullData || {};
            if (fd.ts_documentos_recibidos && fd.ts_validacion_completada) {
                const start = new Date(fd.ts_documentos_recibidos).getTime();
                const end = new Date(fd.ts_validacion_completada).getTime();
                const diffMin = (end - start) / (1000 * 60);
                if (diffMin > 0) {
                    processTimes.push({
                        name: e.workflowName || 'N/A',
                        minutes: Math.round(diffMin)
                    });
                }
            }
        });

        return {
            total, active, history, contacted, finalized, conversionRate,
            averageTime, avgWaitTime, humanTimeSaved, efficiencyPercent,
            countWithTime: countWithFullTime, costSaved, costSavedSubtext,
            autoCost, autoCostSubtext, statusCounts, positionCounts, processTimes
        };
    }, [executions, activeExecutions, historyExecutions]);

    return {
        executions,
        activeExecutions,
        historyExecutions,
        loading,
        error,
        lastUpdate,
        isConnected,
        metrics,
    };
}

// Utility functions exported for use in components
export function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

export function getRelativeTime(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `hace ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `hace ${hours}h`;
}

export function calculateProcessTime(start, end) {
    if (!start || !end) return null;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diff = endTime - startTime;
    if (diff < 0) return null;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
