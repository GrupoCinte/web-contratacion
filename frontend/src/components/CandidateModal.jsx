import { calculateProcessTime } from '../hooks/useMonitorData';

export default function CandidateModal({ selectedUser, onClose }) {
    if (!selectedUser) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>
            <div className="relative bg-[#09090b] border border-cinte-cyan/30 rounded-2xl p-0 max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl shadow-cinte-primary/20 flex flex-col">

                {/* Header */}
                <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{selectedUser.workflowName}</h2>
                        <p className="text-zinc-500 text-sm font-mono mt-0.5">{selectedUser.executionId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white hover:bg-zinc-800 p-2 rounded-lg transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Status Banner */}
                <div className="bg-zinc-900/50 px-6 py-3 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${
                            selectedUser.realStatus === 'finalizado' ? 'bg-cinte-green shadow-[0_0_8px_rgba(79,136,49,0.5)]' :
                            selectedUser.realStatus === 'contactado' ? 'bg-cinte-primary shadow-[0_0_8px_rgba(0,77,135,0.5)]' :
                            selectedUser.realStatus === 'analizando' ? 'bg-cinte-warning shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse' :
                            'bg-cinte-red shadow-[0_0_8px_rgba(210,27,48,0.5)]'
                        }`}></div>
                        <span className={`text-sm font-medium uppercase tracking-wide ${
                            selectedUser.realStatus === 'analizando' ? 'text-cinte-warning' : 'text-gray-200'
                        }`}>
                            {selectedUser.realStatus === 'analizando' ? 'IA Analizando Documentos...' : (selectedUser.realStatus || 'Sin Estado')}
                        </span>
                    </div>
                    {(selectedUser.fullData?.ts_documentos_recibidos && selectedUser.fullData?.ts_validacion_completada) && (
                        <div className="text-xs font-mono text-cinte-green border border-cinte-green/30 bg-cinte-green/10 px-2 py-1 rounded">
                            {calculateProcessTime(selectedUser.fullData.ts_documentos_recibidos, selectedUser.fullData.ts_validacion_completada)}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedUser.fullData ? (
                            Object.entries(selectedUser.fullData).map(([key, value]) => (
                                <div key={key} className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/60 hover:border-zinc-700/80 transition-colors">
                                    <div className="text-cinte-cyan text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                        {key.replace(/_/g, ' ')}
                                    </div>
                                    <div className="text-gray-300 font-medium text-sm break-words leading-relaxed">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-2 text-zinc-500 italic text-center py-8">
                                No hay detalles adicionales.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
