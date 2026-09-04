import { X, ShieldAlert, ArrowRight, CheckCircle2, Clock, MapPin, FileText, Activity, Layers } from "lucide-react";

export default function EvidenceModal({ evidence, onClose }) {
    if (!evidence) return null;

    const isCritical = evidence.severity === "CRITICAL";
    const isHigh = evidence.severity === "HIGH";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl border ${
                            isCritical
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : isHigh
                                ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        }`}>
                            <ShieldAlert size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-slate-400">{evidence.evidence_id || "EV-RECORD"}</span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                    isCritical
                                        ? "bg-red-950 text-red-300 border-red-700"
                                        : isHigh
                                        ? "bg-orange-950 text-orange-300 border-orange-700"
                                        : "bg-amber-950 text-amber-300 border-amber-700"
                                }`}>
                                    {evidence.severity || "HIGH"} SEVERITY
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">{evidence.title || "Statutory Evidence Record"}</h3>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
                    {/* Observed vs Threshold Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Observed Value</span>
                            <p className="text-lg font-black font-mono text-red-400 mt-1">
                                {evidence.observed_value !== undefined ? evidence.observed_value : "Flagged"}{" "}
                                <span className="text-xs font-semibold text-slate-400">{evidence.unit || ""}</span>
                            </p>
                        </div>
                        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Statutory Threshold</span>
                            <p className="text-lg font-black font-mono text-slate-300 mt-1">
                                {evidence.threshold_value !== undefined ? evidence.threshold_value : "Standard"}{" "}
                                <span className="text-xs font-semibold text-slate-400">{evidence.unit || ""}</span>
                            </p>
                        </div>
                        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Telemetry Source</span>
                            <p className="text-xs font-mono font-bold text-indigo-300 mt-1 break-words">
                                {evidence.source || "GST_FASTAG_REGISTRY"}
                            </p>
                        </div>
                    </div>

                    {/* Factual Description */}
                    <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                            <FileText size={13} className="text-blue-400" />
                            Factual Finding Summary
                        </span>
                        <p className="text-slate-200 leading-relaxed text-xs sm:text-sm">
                            {evidence.description || "Evidence logged from cross-referenced E-Way Bill and FASTag telemetry datasets."}
                        </p>
                    </div>

                    {/* Location & Timestamps */}
                    {evidence.location && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                            <MapPin size={15} className="text-purple-400 shrink-0" />
                            <span><strong className="text-slate-200">Location Corridor:</strong> {evidence.location}</span>
                        </div>
                    )}

                    {/* Step-by-Step Evidence Chain */}
                    {evidence.evidence_chain && evidence.evidence_chain.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                <Layers size={14} className="text-teal-400" />
                                Verifiable Evidence Chain
                            </h4>

                            <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                                {evidence.evidence_chain.map((step, idx) => (
                                    <div key={idx} className="relative flex items-start gap-2.5">
                                        <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center text-[9px] font-mono font-bold text-slate-300">
                                            {idx + 1}
                                        </div>
                                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/90 text-xs text-slate-300 w-full leading-relaxed">
                                            {step}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">
                        Audited by GST Risk Intelligence Framework
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20"
                    >
                        Dismiss Evidence
                    </button>
                </div>
            </div>
        </div>
    );
}
