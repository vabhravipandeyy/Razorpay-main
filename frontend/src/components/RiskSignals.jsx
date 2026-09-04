import { useTheme } from "../context/ThemeContext";
import {
    Activity,
    CheckCircle2,
    XCircle,
    ShieldAlert,
    Gauge,
    Navigation,
    CalendarX,
    Copy,
    Clock,
    Layers,
    Cpu,
    AlertCircle,
    Eye
} from "lucide-react";

export default function RiskSignals({ data, onSelectEvidence }) {
    const { isDark } = useTheme();
    if (!data) return null;

    const signals = data.signals || [];
    const flaggedSignals = signals.filter((s) => s.triggered);

    const getSignalIcon = (type) => {
        switch (type) {
            case "NO_FASTAG":
                return <ShieldAlert size={16} />;
            case "DUPLICATE_EWB":
                return <Copy size={16} />;
            case "FASTAG_OUTSIDE_VALIDITY":
                return <CalendarX size={16} />;
            case "IMPOSSIBLE_SPEED":
                return <Gauge size={16} />;
            case "ROUTE_MISMATCH":
                return <Navigation size={16} />;
            case "TIME_GAP":
                return <Clock size={16} />;
            case "ML_ANOMALY":
                return <Cpu size={16} />;
            default:
                return <Layers size={16} />;
        }
    };

    const containerClass = isDark
        ? "bg-[#0d121f] border-slate-800/90 text-slate-100 shadow-xl"
        : "bg-white border-slate-200 text-slate-900 shadow-sm";

    return (
        <div className={`rounded-2xl border p-6 sm:p-7 space-y-5 ${containerClass}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div>
                    <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                            Active Risk Signals
                        </h2>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Deterministic sensor signals and anomaly flags
                        </p>
                    </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border self-start sm:self-auto ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                }`}>
                    {flaggedSignals.length} Flagged / {signals.length} Signals
                </span>
            </div>

            {/* Signals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {signals.map((signal, idx) => {
                    const isTriggered = signal.triggered;
                    const isCritical = signal.severity === "CRITICAL";

                    const cardBg = isTriggered
                        ? isCritical
                            ? isDark ? "bg-rose-950/40 border-rose-800/60" : "bg-rose-50 border-rose-200"
                            : isDark ? "bg-amber-950/30 border-amber-800/50" : "bg-amber-50 border-amber-200"
                        : isDark ? "bg-slate-900/60 border-slate-800/80" : "bg-slate-50/70 border-slate-200";

                    return (
                        <div
                            key={idx}
                            className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${cardBg}`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg border ${
                                            isTriggered
                                                ? isDark ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : "bg-rose-100 text-rose-700 border-rose-300"
                                                : isDark ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-white text-slate-500 border-slate-200"
                                        }`}>
                                            {getSignalIcon(signal.signal_type)}
                                        </div>
                                        <h4 className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{signal.title}</h4>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                        isTriggered
                                            ? isDark ? "bg-rose-950 text-rose-300 border-rose-800" : "bg-rose-100 text-rose-800 border-rose-200"
                                            : isDark ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/50" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    }`}>
                                        {isTriggered ? "Triggered" : "Normal"}
                                    </span>
                                </div>

                                <p className={`text-[11px] leading-relaxed mt-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                    {signal.description}
                                </p>
                            </div>

                            <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[10px] font-mono ${
                                isDark ? "border-slate-800/60 text-slate-400" : "border-slate-200 text-slate-500"
                            }`}>
                                <span>Risk Contribution</span>
                                <span className={`font-bold ${isTriggered ? "text-rose-500" : isDark ? "text-slate-400" : "text-slate-600"}`}>
                                    {isTriggered ? `+${signal.score_contribution} pts` : "0 pts"}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
