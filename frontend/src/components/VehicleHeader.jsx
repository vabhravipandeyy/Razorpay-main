import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, FileText, CreditCard, XOctagon } from "lucide-react";

export default function VehicleHeader({ data }) {
    if (!data) return null;

    const score = data.risk_score || 0;
    const level = data.risk_level || "LOW";
    const failedRulesCount = data.rules?.filter((r) => !r.passed).length || 0;

    let badgeBg = "bg-emerald-950/60 border-emerald-700/50 text-emerald-300";
    let badgeIcon = <CheckCircle2 size={16} className="text-emerald-400" />;

    if (level === "MEDIUM") {
        badgeBg = "bg-amber-950/60 border-amber-700/50 text-amber-300";
        badgeIcon = <AlertTriangle size={16} className="text-amber-400" />;
    } else if (level === "HIGH") {
        badgeBg = "bg-red-950/60 border-red-700/50 text-red-300";
        badgeIcon = <ShieldAlert size={16} className="text-red-400" />;
    }

    const formattedDate = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left: Vehicle Identity & Risk Badge */}
                <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                            {data.vehicle_number}
                        </h1>
                        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${badgeBg}`}>
                            {badgeIcon}
                            {level} RISK ({score} / 130)
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock size={13} className="text-slate-500" />
                        <span>Last Analyzed: <strong className="text-slate-300">{formattedDate}</strong></span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">Investigation Dossier</span>
                    </div>
                </div>

                {/* Right: Key Telemetry Summary Counters */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
                    <div className="bg-slate-950/70 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
                            <FileText size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-Way Bills</p>
                            <p className="text-lg font-black text-white">{data.eway_bill_count || 0}</p>
                        </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
                            <CreditCard size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FASTags Scanned</p>
                            <p className="text-lg font-black text-white">{data.fastag_count || 0}</p>
                        </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
                        <div className={`p-2 rounded-xl border ${failedRulesCount > 0 ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                            <XOctagon size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rules Failed</p>
                            <p className={`text-lg font-black ${failedRulesCount > 0 ? "text-red-400" : "text-emerald-400"}`}>
                                {failedRulesCount} / {data.rules?.length || 6}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
