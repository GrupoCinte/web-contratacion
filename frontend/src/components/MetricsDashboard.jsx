import { useMemo } from 'react';
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import KPICards from './KPICards';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

const STATUS_COLORS = {
    'CARGANDO': '#08bdc6',
    'comunicando': '#494294',
    'Whatsapp Enviado': '#004D87',
    'Aceptado': '#4F8831',
    'analizando': '#F59E0B',
    'Esperando Contrato': '#2f7bb8',
    'Contrato Recibido': '#4F8831',
    'finalizado': '#22c55e',
    'rechazado': '#D21B30',
    'completado': '#4F8831',
};

const CHART_BG = 'rgba(15, 41, 66, 0.6)';

function getStatusColor(status) {
    return STATUS_COLORS[status] || '#6b7280';
}

export default function MetricsDashboard({ metrics, loading }) {
    // Doughnut: status distribution
    const statusData = useMemo(() => {
        const labels = Object.keys(metrics.statusCounts || {});
        const values = Object.values(metrics.statusCounts || {});
        const colors = labels.map(l => getStatusColor(l));
        return {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors.map(c => c + 'CC'),
                borderColor: colors,
                borderWidth: 2,
                hoverOffset: 8,
            }],
        };
    }, [metrics.statusCounts]);

    // Bar horizontal: by position
    const positionData = useMemo(() => {
        const entries = Object.entries(metrics.positionCounts || {}).sort((a, b) => b[1] - a[1]);
        return {
            labels: entries.map(([k]) => k.length > 25 ? k.slice(0, 25) + '...' : k),
            datasets: [{
                label: 'Candidatos',
                data: entries.map(([, v]) => v),
                backgroundColor: '#08bdc6CC',
                borderColor: '#08bdc6',
                borderWidth: 1,
                borderRadius: 6,
            }],
        };
    }, [metrics.positionCounts]);

    // Bar vertical: process times
    const processTimeData = useMemo(() => {
        const sorted = [...(metrics.processTimes || [])].sort((a, b) => b.minutes - a.minutes);
        return {
            labels: sorted.map(p => p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name),
            datasets: [{
                label: 'Tiempo (min)',
                data: sorted.map(p => p.minutes),
                backgroundColor: sorted.map((_, i) => {
                    const colors = ['#D21B30CC', '#F59E0BCC', '#4F8831CC', '#08bdc6CC', '#494294CC'];
                    return colors[i % colors.length];
                }),
                borderColor: sorted.map((_, i) => {
                    const colors = ['#D21B30', '#F59E0B', '#4F8831', '#08bdc6', '#494294'];
                    return colors[i % colors.length];
                }),
                borderWidth: 1,
                borderRadius: 6,
            }],
        };
    }, [metrics.processTimes]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#9ca3af', font: { size: 11 } },
            },
            tooltip: {
                backgroundColor: '#0F2942',
                borderColor: '#08bdc633',
                borderWidth: 1,
                titleColor: '#fff',
                bodyColor: '#9ca3af',
                cornerRadius: 8,
                padding: 12,
            },
        },
    };

    const barOptions = {
        ...chartOptions,
        indexAxis: 'y',
        plugins: {
            ...chartOptions.plugins,
            legend: { display: false },
        },
        scales: {
            x: { ticks: { color: '#6b7280' }, grid: { color: '#ffffff08' } },
            y: { ticks: { color: '#9ca3af', font: { size: 11 } }, grid: { display: false } },
        },
    };

    const verticalBarOptions = {
        ...chartOptions,
        plugins: {
            ...chartOptions.plugins,
            legend: { display: false },
        },
        scales: {
            x: { ticks: { color: '#9ca3af', font: { size: 10 }, maxRotation: 45 }, grid: { display: false } },
            y: { ticks: { color: '#6b7280' }, grid: { color: '#ffffff08' }, title: { display: true, text: 'Minutos', color: '#6b7280' } },
        },
    };

    const doughnutOptions = {
        ...chartOptions,
        cutout: '65%',
        plugins: {
            ...chartOptions.plugins,
            legend: {
                position: 'bottom',
                labels: { color: '#9ca3af', font: { size: 11 }, padding: 16, usePointStyle: true, pointStyleWidth: 10 },
            },
        },
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <div className="relative">
                    <div className="h-16 w-16 border-2 border-zinc-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 h-16 w-16 border-2 border-cinte-purple border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="mt-6 text-zinc-500 text-sm uppercase tracking-widest">Cargando metricas...</p>
            </div>
        );
    }

    return (
        <div>
            <KPICards metrics={metrics} variant="full" />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">

                {/* Doughnut: Status Distribution */}
                <div className="bg-[#0F2942]/60 backdrop-blur-sm border border-cinte-cyan/20 rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                        Distribucion por Estado
                    </h3>
                    <div className="h-[300px] flex items-center justify-center">
                        {Object.keys(metrics.statusCounts || {}).length > 0 ? (
                            <Doughnut data={statusData} options={doughnutOptions} />
                        ) : (
                            <p className="text-zinc-500 text-sm">Sin datos</p>
                        )}
                    </div>
                </div>

                {/* Bar: By Position */}
                <div className="bg-[#0F2942]/60 backdrop-blur-sm border border-cinte-cyan/20 rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                        Candidatos por Cargo
                    </h3>
                    <div className="h-[300px]">
                        {Object.keys(metrics.positionCounts || {}).length > 0 ? (
                            <Bar data={positionData} options={barOptions} />
                        ) : (
                            <p className="text-zinc-500 text-sm">Sin datos</p>
                        )}
                    </div>
                </div>

                {/* Bar vertical: Process Times */}
                <div className="bg-[#0F2942]/60 backdrop-blur-sm border border-cinte-cyan/20 rounded-xl p-6 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                        Tiempo de Proceso por Candidato (minutos)
                    </h3>
                    <div className="h-[300px]">
                        {(metrics.processTimes || []).length > 0 ? (
                            <Bar data={processTimeData} options={verticalBarOptions} />
                        ) : (
                            <p className="text-zinc-500 text-sm text-center py-12">No hay datos de tiempos de proceso disponibles.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
