import { formatTimestamp, getRelativeTime, calculateProcessTime } from '../hooks/useMonitorData';

export default function CandidateCard({ execution, onClick, variant = 'active' }) {
    const isHistory = variant === 'history';
    const status = (execution.realStatus || '').toLowerCase();

    return (
        <div
            onClick={() => onClick(execution)}
            className={`group relative backdrop-blur-sm rounded-xl p-6 border transition-all duration-300 cursor-pointer ${
                isHistory
                    ? 'bg-cinte-card/50 hover:bg-[#152d47] border-white/5 hover:border-cinte-green/30 hover:shadow-[0_8px_30px_rgba(79,136,49,0.15)]'
                    : 'bg-cinte-card/80 hover:bg-[#1a3b5c] border-white/5 hover:border-cinte-purple/50 hover:shadow-[0_8px_30px_rgba(73,66,148,0.25)]'
            }`}
        >
            {/* Hover Glow */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none ${
                isHistory
                    ? 'bg-gradient-to-br from-cinte-green/10 via-cinte-cyan/5 to-transparent'
                    : 'bg-gradient-to-br from-cinte-cyan/10 via-cinte-purple/5 to-cinte-red/5'
            }`} />

            {/* Header */}
            <div className="flex items-start justify-between mb-5 relative">
                <div className="flex-1 min-w-0 pr-4">
                    <h3 className={`text-lg font-bold truncate transition-colors ${
                        isHistory
                            ? 'text-gray-300 group-hover:text-cinte-green'
                            : 'text-gray-100 group-hover:text-cinte-cyan'
                    }`}>
                        {execution.workflowName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded border border-zinc-800 font-mono truncate max-w-[120px]">
                            {execution.executionId.replace('+', '')}
                        </span>
                        {isHistory && (
                            <span className="text-[10px] bg-cinte-green/10 text-cinte-green px-2 py-0.5 rounded border border-cinte-green/20 font-medium uppercase tracking-wider">
                                Completado
                            </span>
                        )}
                    </div>
                </div>

                {/* Status Dot */}
                <div className="flex-shrink-0 mt-1.5 flex items-center gap-2">
                    {!isHistory && status === 'analizando' && (
                        <span className="text-[10px] text-cinte-warning font-mono animate-pulse">IA analizando...</span>
                    )}
                    <div className={`h-2 w-2 rounded-full ${
                        isHistory
                            ? 'bg-cinte-green shadow-[0_0_8px_rgba(79,136,49,0.4)]'
                            : status === 'analizando'
                                ? 'bg-cinte-warning shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-ping-slow'
                                : 'bg-cinte-cyan shadow-[0_0_8px_rgba(8,189,198,0.6)] animate-pulse'
                    }`}></div>
                </div>
            </div>

            {/* Status Badge */}
            <div className="mb-6 relative">
                <div className="inline-flex items-center gap-2.5 bg-zinc-900 rounded-lg px-3.5 py-2 border border-zinc-800 group-hover:border-zinc-700 transition-colors w-full">
                    <div className={`p-1.5 rounded-md ${isHistory ? 'bg-cinte-green/20' : 'bg-cinte-primary/20'}`}>
                        <svg className={`w-3.5 h-3.5 ${isHistory ? 'text-cinte-green' : 'text-cinte-cyan'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isHistory
                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            }
                        </svg>
                    </div>
                    <span className="text-gray-300 font-medium text-sm truncate">
                        {execution.currentNodeName}
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs pt-4 border-t border-zinc-800/50">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center text-zinc-500">
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatTimestamp(execution.timestamp)}
                    </div>
                    {(execution.fullData?.ts_documentos_recibidos && execution.fullData?.ts_validacion_completada) && (
                        <div className="inline-flex items-center text-[10px] text-cinte-green bg-cinte-green/10 px-1.5 py-0.5 rounded border border-cinte-green/20 w-fit">
                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Procesado en: {calculateProcessTime(execution.fullData.ts_documentos_recibidos, execution.fullData.ts_validacion_completada)}
                        </div>
                    )}
                </div>
                <span className="text-cinte-support font-medium">
                    {getRelativeTime(execution.timestamp)}
                </span>
            </div>

            {/* Bottom gradient line */}
            <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity ${
                isHistory
                    ? 'from-cinte-green/0 via-cinte-green/50 to-cinte-green/0'
                    : 'from-cinte-cyan/0 via-cinte-cyan/50 to-cinte-cyan/0'
            }`}></div>
        </div>
    );
}
