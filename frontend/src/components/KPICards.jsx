export default function KPICards({ metrics, variant = 'full' }) {
    if (variant === 'active') {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <KPI value={metrics.active} label="Activos" borderColor="border-[#08bdc6]/20" hoverColor="hover:border-[#08bdc6]/50" textColor="text-white" labelColor="text-[#08bdc6]" />
                <KPI value={metrics.contacted} label="Contactados" borderColor="border-[#4F8831]/20" hoverColor="hover:border-[#4F8831]/50" textColor="text-[#4F8831]" labelColor="text-[#4F8831]/80" />
                <KPI value={metrics.averageTime} label="Tiempo Prom. IA" borderColor="border-cinte-cyan/20" hoverColor="hover:border-cinte-cyan/50" textColor="text-cinte-cyan" labelColor="text-cinte-cyan/80" small />
                <KPI value={metrics.avgWaitTime} label="Espera Candidato" borderColor="border-[#494294]/20" hoverColor="hover:border-[#494294]/50" textColor="text-[#494294]" labelColor="text-[#494294]/80" small />
            </div>
        );
    }

    if (variant === 'history') {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <KPI value={metrics.history} label="Total Procesados" borderColor="border-[#4F8831]/20" hoverColor="hover:border-[#4F8831]/50" textColor="text-[#4F8831]" labelColor="text-[#4F8831]/80" />
                <KPI value={metrics.finalized} label="Finalizados" borderColor="border-[#494294]/20" hoverColor="hover:border-[#494294]/50" textColor="text-[#494294]" labelColor="text-[#494294]/80" />
                <KPI value={metrics.conversionRate + '%'} label="Tasa de Exito" borderColor="border-[#2f7bb8]/20" hoverColor="hover:border-[#2f7bb8]/50" textColor="text-[#2f7bb8]" labelColor="text-[#2f7bb8]/80" />
                <KPI value={metrics.humanTimeSaved} label="Tiempo Ahorrado" borderColor="border-cinte-cyan/20" hoverColor="hover:border-cinte-cyan/50" textColor="text-cinte-cyan" labelColor="text-cinte-cyan/80" small />
            </div>
        );
    }

    // Full variant (all KPIs)
    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <KPI value={metrics.total} label="Total Candidatos" borderColor="border-[#08bdc6]/20" hoverColor="hover:border-[#08bdc6]/50" textColor="text-white" labelColor="text-[#08bdc6]" />
                <KPI value={metrics.contacted} label="Contactados" borderColor="border-[#4F8831]/20" hoverColor="hover:border-[#4F8831]/50" textColor="text-[#4F8831]" labelColor="text-[#4F8831]/80" />
                <KPI value={metrics.finalized} label="Finalizados" borderColor="border-[#494294]/20" hoverColor="hover:border-[#494294]/50" textColor="text-[#494294]" labelColor="text-[#494294]/80" />
                <KPI value={metrics.conversionRate + '%'} label="Efectividad" borderColor="border-[#D21B30]/20" hoverColor="hover:border-[#D21B30]/50" textColor="text-[#2f7bb8]" labelColor="text-[#2f7bb8]/80" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <KPIExtended value={metrics.averageTime} label="Tiempo Prom. Automatizado" color="#08bdc6" />
                <KPIExtended value={metrics.avgWaitTime} label="Espera Respuesta Candidato" color="#494294" />
                <KPIExtended value={metrics.humanTimeSaved} label="Tiempo Humano Ahorrado" color="#4F8831"
                    subtext={metrics.efficiencyPercent > 0 ? `${metrics.efficiencyPercent}% mas rapido · ${metrics.countWithTime} proc.` : null} />
                <KPIExtended value={metrics.costSaved} label="Costo Ahorrado" color="#F5A623" subtext={metrics.costSavedSubtext} />
                <KPIExtended value={metrics.autoCost} label="Costo Automatizacion" color="#08bdc6" subtext={metrics.autoCostSubtext} />
            </div>
        </>
    );
}

function KPI({ value, label, borderColor, hoverColor, textColor, labelColor, small }) {
    return (
        <div className={`bg-[#0F2942]/60 backdrop-blur-sm border ${borderColor} p-4 rounded-xl flex flex-col items-center justify-center ${hoverColor} transition-colors`}>
            <span className={`${small ? 'text-2xl' : 'text-3xl'} font-bold ${textColor}`}>{value}</span>
            <span className={`text-xs uppercase tracking-wider ${labelColor} ${small ? 'text-[10px] text-center leading-tight' : ''}`}>{label}</span>
        </div>
    );
}

function KPIExtended({ value, label, color, subtext }) {
    return (
        <div className={`bg-[#0F2942]/60 backdrop-blur-sm border p-4 rounded-xl flex flex-col items-center justify-center transition-colors relative overflow-hidden`}
            style={{ borderColor: `${color}33` }}
            onMouseEnter={e => e.currentTarget.style.borderColor = `${color}80`}
            onMouseLeave={e => e.currentTarget.style.borderColor = `${color}33`}
        >
            <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to bottom right, ${color}0D, transparent)` }}></div>
            <span className="text-2xl font-bold relative" style={{ color }}>{value}</span>
            <span className="text-[10px] uppercase tracking-wider text-center leading-tight relative" style={{ color: `${color}CC` }}>{label}</span>
            {subtext && (
                <span className="text-[10px] font-mono mt-1 relative" style={{ color: `${color}99` }}>{subtext}</span>
            )}
        </div>
    );
}
