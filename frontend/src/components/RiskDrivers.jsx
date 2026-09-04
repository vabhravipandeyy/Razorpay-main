import { useTheme } from "../context/ThemeContext";
import { AlertCircle, ShieldAlert, Gauge, Navigation, CalendarX, Copy, Clock, CheckCircle2, Eye } from "lucide-react";

export default function RiskDrivers({ data, onSelectEvidence }) {
    const { isDark } = useTheme();
    if (!data) return null;

    const drivers = data.risk_drivers || [];
    const allEvidence = data.evidence || [];

    const getDriverIcon = (ruleId) => {
        switch (ruleId) {
            case "R4":
                return <Gauge size={16} />;
            case "R5":
                return <Navigation size={16} />;
            case "R3":
                return <CalendarX size={16} />;
            case "R2":
                return <Copy size={16} />;
            case "R6":
                return <Clock size={16} />;
            case "R1":
                return <ShieldAlert size={16} />;
            default:
                return <AlertCircle size={16} />;
        }
    };

    const handleOpenEvidence = (ruleId) => {
        if (!onSelectEvidence) return;
        const matched = allEvidence.find(
            (e) =>
                (ruleId === "R4" && e.category === "KINEMATIC_VIOLATION") ||
                (ruleId === "R5" && e.category === "ROUTE_DIVERSION") ||
                (ruleId === "R3" && e.category === "DOCUMENTATION_MISMATCH") ||
                (ruleId === "R2" && e.category === "BILLING_ANOMALY") ||
                (ruleId === "R1" && e.category === "TELEMETRY_DEFICIENCY") ||
                (ruleId === "R6" && e.category === "TEMPORAL_ANOMALY") ||
                (ruleId === "ML_ANOMALY" && e.category === "STATISTICAL_ML_OUTLIER")
        ) || allEvidence[0];

        if (matched) {
            onSelectEvidence(matched);
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
                            Primary Risk Drivers & Evidence Chains
                        </h2>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Prioritized statutory infractions with traceable factual evidence
                        </p>
                    </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border self-start sm:self-auto ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                }`}>
                    {drivers.length} Flagged Signal(s)
                </span>
            </div>

            {/* Drivers List */}
            {drivers.length > 0 ? (
                <div className="space-y-3">
                    {drivers.map((driver, index) => {
                        const isCritical = driver.severity === "CRITICAL";
                        const isHigh = driver.severity === "HIGH";

                        const driverCardBg = isCritical
                            ? isDark ? "bg-rose-950/40 border-rose-800/60" : "bg-rose-50 border-rose-200"
                            : isHigh
                            ? isDark ? "bg-amber-950/30 border-amber-800/50" : "bg-amber-50 border-amber-200"
                            : isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200";

                        return (
                            <div
                                key={index}
                                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${driverCardBg}`}
                            >
                                <div className="flex items-start sm:items-center gap-3.5">
                                    <div className={`p-2 rounded-lg border shrink-0 ${
                                        isCritical
                                            ? isDark ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : "bg-rose-100 text-rose-700 border-rose-300"
                                            : isHigh
                                            ? isDark ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-amber-100 text-amber-700 border-amber-300"
                                            : isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-white text-slate-700 border-slate-200"
                                    }`}>
                                        {getDriverIcon(driver.rule_id)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-mono font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                Driver #{index + 1} ({driver.rule_id})
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                                isCritical
                                                    ? isDark ? "bg-rose-950 text-rose-300 border-rose-700" : "bg-rose-100 text-rose-800 border-rose-200"
                                                    : isHigh
                                                    ? isDark ? "bg-amber-950 text-amber-300 border-amber-700" : "bg-amber-100 text-amber-800 border-amber-200"
                                                    : isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200"
                                            }`}>
                                                {driver.severity} SEVERITY
                                            </span>
                                        </div>
                                        <h4 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{driver.title}</h4>
                                        <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>{driver.evidence}</p>
                                    </div>
                                </div>

                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 border-slate-800/40 pt-3 sm:pt-0 gap-2">
                                    <div className="text-left sm:text-right">
                                        <span className={`text-[10px] uppercase font-bold block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Risk Weight</span>
                                        <span className="text-base font-black font-mono text-rose-500">
                                            +{driver.score_impact} pts
                                        </span>
                                    </div>

                                    {onSelectEvidence && (
                                        <button
                                            onClick={() => handleOpenEvidence(driver.rule_id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-all ${
                                                isDark
                                                    ? "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700"
                                                    : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm"
                                            }`}
                                        >
                                            <Eye size={13} className="text-cyan-600" />
                                            <span>Inspect Chain</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className={`p-8 rounded-xl border text-center ${
                    isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/70 border-slate-200"
                }`}>
                    <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
                    <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>No Flagged Risk Drivers</h3>
                    <p className={`text-xs mt-1 max-w-md mx-auto ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        This vehicle passed all 6 statutory fraud criteria. No anomalous transit velocities, bearing deviations, or unrecorded movements were detected.
                    </p>
                </div>
            )}
        </div>
    );
}
