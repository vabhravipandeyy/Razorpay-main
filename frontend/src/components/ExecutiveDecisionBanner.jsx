import { ShieldAlert, AlertTriangle, CheckCircle2, Eye, Banknote, Sparkles, ArrowUpRight, Scale } from "lucide-react";

export default function ExecutiveDecisionBanner({ data }) {
    if (!data) return null;

    const decision = data.decision || {};
    const exec = data.executive_summary || {};
    const fin = data.financial_context || {};
    const hybrid = data.hybrid_risk || {};
    const confidence = data.confidence || {};

    const priority = decision.priority || "NORMAL";
    const priorityLabel = decision.priority_label || "ROUTINE AUDIT";
    const hybridScore = hybrid.score ?? data.risk_score ?? 0;
    const confLevel = confidence.level || "HIGH CONFIDENCE";
    const formattedVal = fin.formatted_valuation || "₹0.00";

    let priorityBadgeClass = "bg-emerald-950/80 border-emerald-700/80 text-emerald-300";
    let pulseClass = "";
    if (priority === "URGENT_REVIEW") {
        priorityBadgeClass = "bg-rose-950/80 border-rose-700 text-rose-200 shadow-rose-900/40";
        pulseClass = "animate-pulse";
    } else if (priority === "INVESTIGATE") {
        priorityBadgeClass = "bg-red-950/80 border-red-700 text-red-200 shadow-red-900/40";
    } else if (priority === "REVIEW") {
        priorityBadgeClass = "bg-amber-950/80 border-amber-700 text-amber-200";
    } else if (priority === "MONITOR") {
        priorityBadgeClass = "bg-yellow-950/80 border-yellow-700 text-yellow-200";
    }

    return (
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
            {/* Background Glow */}
            <div className={`absolute -right-10 -top-10 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20 ${
                priority === "URGENT_REVIEW" ? "bg-rose-500" : priority === "INVESTIGATE" ? "bg-red-500" : "bg-blue-500"
            }`} />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left Side: Priority & Overview */}
                <div className="space-y-3 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                            Investigation Decision Intelligence
                        </span>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-md ${priorityBadgeClass}`}>
                            <span className={`w-2 h-2 rounded-full ${pulseClass} ${
                                priority === "URGENT_REVIEW" ? "bg-rose-400" : priority === "INVESTIGATE" ? "bg-red-400" : priority === "REVIEW" ? "bg-amber-400" : "bg-emerald-400"
                            }`} />
                            {priorityLabel}
                        </div>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {exec.headline || `${hybridScore}/100 Hybrid Risk Profile`}
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {decision.rationale || exec.brief || "Vehicle risk profile synthesized from statutory criteria and statistical anomaly models."}
                    </p>

                    {exec.confidence_assessment && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                            <Eye size={14} className="text-teal-400 shrink-0" />
                            <span>{exec.confidence_assessment}</span>
                        </div>
                    )}
                </div>

                {/* Right Side: Key Metrics Trio */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 shrink-0">
                    <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Hybrid Risk</span>
                        <p className="text-2xl font-black font-mono text-white mt-1">
                            {hybridScore} <span className="text-xs font-semibold text-slate-400">/ 100</span>
                        </p>
                    </div>

                    <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Evidence Confidence</span>
                        <p className="text-xs font-bold font-mono text-teal-300 mt-2">
                            {confLevel}
                        </p>
                    </div>

                    <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between col-span-2 sm:col-span-1 lg:col-span-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                            <span className="flex items-center gap-1">
                                <Banknote size={13} className="text-emerald-400" />
                                Associated Valuation
                            </span>
                            <span className="font-mono text-slate-500">{fin.total_bills_count || 0} bills</span>
                        </div>
                        <p className="text-base font-black font-mono text-emerald-400 mt-1">
                            {formattedVal}
                        </p>
                        <span className="text-[9px] text-slate-400 mt-0.5">
                            Transaction value subject to audit review
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
