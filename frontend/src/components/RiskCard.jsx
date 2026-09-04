import { AlertTriangle, CheckCircle, ShieldAlert, FileText, CreditCard } from "lucide-react";

export default function RiskCard({ data }) {
    if (!data) return null;

    const score = data.risk_score;
    const level = data.risk_level;

    let color = "text-emerald-400";
    let bg = "bg-emerald-950/40 border-emerald-800/40";
    let strokeColor = "#10b981";
    let icon = <CheckCircle size={32} className="text-emerald-400" />;

    if (level === "MEDIUM") {
        color = "text-amber-400";
        bg = "bg-amber-950/40 border-amber-800/40";
        strokeColor = "#f59e0b";
        icon = <AlertTriangle size={32} className="text-amber-400" />;
    }

    if (level === "HIGH") {
        color = "text-red-400";
        bg = "bg-red-950/40 border-red-800/40";
        strokeColor = "#ef4444";
        icon = <ShieldAlert size={32} className="text-red-400" />;
    }

    const progress = Math.min(score, 100);

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Risk Assessment Report</h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Vehicle: <strong className="text-white font-bold">{data.vehicle_number}</strong></p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Circular Risk Score Gauge */}
                <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle
                            cx="60"
                            cy="60"
                            r="52"
                            fill="none"
                            stroke="#1e293b"
                            strokeWidth="10"
                        />
                        <circle
                            cx="60"
                            cy="60"
                            r="52"
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={327}
                            strokeDashoffset={327 - (327 * progress) / 100}
                            className="transition-all duration-700 ease-out"
                        />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">{score}</h1>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Score / 100</span>
                    </div>
                </div>

                {/* Details & Summary Cards */}
                <div className="flex-1 w-full space-y-6">
                    <div className={`p-4 rounded-2xl border flex items-center gap-4 ${bg}`}>
                        {icon}
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Threat Level</p>
                            <h3 className={`text-2xl font-black ${color}`}>{level} RISK</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
                            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">E-Way Bills</p>
                                <h3 className="text-2xl font-bold text-white mt-0.5">{data.eway_bill_count}</h3>
                            </div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
                            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">FASTags Scanned</p>
                                <h3 className="text-2xl font-bold text-white mt-0.5">{data.fastag_count}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}