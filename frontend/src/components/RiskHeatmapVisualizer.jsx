import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { Activity, Flame, ShieldAlert, BarChart3, Gauge, Compass } from "lucide-react";

export default function RiskHeatmapVisualizer({ data }) {
    const { isDark } = useTheme();
    const [activeView, setActiveView] = useState("matrix"); // "matrix" | "vectors" | "speed"

    if (!data) return null;

    const hybridScore = data.hybrid_risk?.score ?? data.risk_score ?? 0;
    const rules = data.rules || [];
    const trips = data.trips || [];
    const compliance = data.compliance?.breakdown || {};
    const trust = data.trust?.breakdown || {};

    // 6-Dimensional Risk Vector Metrics
    const vectorMetrics = [
        { label: "Statutory Rules", value: rules.filter(r => r.passed).length * 16.6, max: 100, unit: "%" },
        { label: "Kinematic Speed", value: trust.telemetry_sanity ?? 100, max: 100, unit: "%" },
        { label: "Temporal Sanity", value: trust.movement_consistency ?? 100, max: 100, unit: "%" },
        { label: "EWB Validity", value: compliance.ewb_validity ?? 100, max: 100, unit: "%" },
        { label: "Route Alignment", value: compliance.route_compliance ?? 100, max: 100, unit: "%" },
        { label: "FASTag Integrity", value: compliance.fastag_consistency ?? 100, max: 100, unit: "%" }
    ];

    // Heatmap Grid: 7-Day / 6-Hour Interval Transit Risk Matrix
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const timeSlots = ["00-06h", "06-12h", "12-18h", "18-24h"];

    // Compute mock/real risk distribution across corridors
    const getCellIntensity = (dayIdx, slotIdx) => {
        // High risk vehicles have hot spots during late-night / transit intervals
        const baseSeed = (dayIdx * 4 + slotIdx * 7 + hybridScore) % 100;
        if (hybridScore > 60) {
            return baseSeed > 35 ? Math.min(100, baseSeed + 30) : 20;
        } else if (hybridScore > 30) {
            return baseSeed > 60 ? baseSeed : 10;
        }
        return baseSeed > 80 ? 25 : 5;
    };

    const getHeatColor = (score) => {
        if (score >= 75) return isDark ? "bg-rose-500/80 text-white" : "bg-rose-500 text-white";
        if (score >= 50) return isDark ? "bg-amber-500/70 text-slate-900" : "bg-amber-500 text-slate-900";
        if (score >= 25) return isDark ? "bg-blue-500/50 text-white" : "bg-blue-400 text-white";
        return isDark ? "bg-slate-800/60 text-slate-400" : "bg-slate-100 text-slate-600";
    };

    const containerClass = isDark
        ? "bg-[#0d121f] border-slate-800/90 text-slate-100 shadow-xl"
        : "bg-white border-slate-200 text-slate-900 shadow-sm";

    return (
        <div className={`rounded-2xl border p-5 sm:p-6 space-y-5 ${containerClass}`}>
            {/* Header & Sub-view Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div>
                    <h2 className={`text-base sm:text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                            Transit Risk & Telemetry Heatmap
                        </h2>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Visual corridor risk density & multi-vector telemetry distribution
                        </p>
                    </div>
                </div>

                {/* Switcher Buttons */}
                <div className={`flex items-center gap-1 p-1 rounded-xl border self-start sm:self-auto ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
                }`}>
                    <button
                        type="button"
                        onClick={() => setActiveView("matrix")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            activeView === "matrix"
                                ? isDark ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                                : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Corridor Heatmap
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView("vectors")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            activeView === "vectors"
                                ? isDark ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                                : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Multi-Vector Radar
                    </button>
                </div>
            </div>

            {/* VIEW 1: 7x4 HEATMAP MATRIX */}
            {activeView === "matrix" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="overflow-x-auto">
                        <div className="min-w-[480px] space-y-2">
                            {/* Time Slot Headers */}
                            <div className="grid grid-cols-5 gap-2 text-[10px] font-mono font-bold uppercase text-center">
                                <span className={isDark ? "text-slate-500" : "text-slate-400"}>Day / Window</span>
                                {timeSlots.map((slot) => (
                                    <span key={slot} className={isDark ? "text-slate-400" : "text-slate-600"}>
                                        {slot}
                                    </span>
                                ))}
                            </div>

                            {/* Heatmap Rows */}
                            {days.map((day, dIdx) => (
                                <div key={day} className="grid grid-cols-5 gap-2 items-center">
                                    <span className={`text-xs font-mono font-bold text-center ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                        {day}
                                    </span>
                                    {timeSlots.map((slot, sIdx) => {
                                        const intensity = getCellIntensity(dIdx, sIdx);
                                        const heatClass = getHeatColor(intensity);
                                        return (
                                            <div
                                                key={slot}
                                                className={`h-9 rounded-xl flex items-center justify-center font-mono text-xs font-bold transition-transform hover:scale-105 cursor-pointer shadow-sm ${heatClass}`}
                                                title={`${day} ${slot}: Risk Level ${intensity}%`}
                                            >
                                                <span>{intensity}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Heatmap Legend */}
                    <div className={`flex items-center justify-between pt-3 border-t text-[11px] font-mono ${
                        isDark ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"
                    }`}>
                        <div className="flex items-center gap-3">
                            <span className="font-semibold">Risk Gradient:</span>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-800" />
                                <span>Nominal (0-24%)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-blue-400 dark:bg-blue-500/50" />
                                <span>Low (25-49%)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-amber-500" />
                                <span>Medium (50-74%)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-rose-500" />
                                <span>Critical (75%+)</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW 2: MULTI-VECTOR RADAR BARS */}
            {activeView === "vectors" && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {vectorMetrics.map((m, idx) => {
                            const isPassing = m.value >= 80;
                            const isWarning = m.value >= 50 && m.value < 80;

                            const barColor = isPassing
                                ? "bg-emerald-500"
                                : isWarning
                                ? "bg-amber-500"
                                : "bg-rose-500";

                            return (
                                <div
                                    key={idx}
                                    className={`p-3.5 rounded-xl border ${
                                        isDark ? "bg-[#111827]/70 border-slate-800" : "bg-slate-50/80 border-slate-200"
                                    }`}
                                >
                                    <div className="flex justify-between items-center text-xs mb-1.5">
                                        <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                            {m.label}
                                        </span>
                                        <span className={`font-mono font-bold ${
                                            isPassing
                                                ? isDark ? "text-emerald-400" : "text-emerald-600"
                                                : isWarning
                                                ? "text-amber-500"
                                                : "text-rose-500"
                                        }`}>
                                            {m.value}{m.unit}
                                        </span>
                                    </div>
                                    <div className={`w-full h-2 rounded-full overflow-hidden ${
                                        isDark ? "bg-slate-800" : "bg-slate-200"
                                    }`}>
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                            style={{ width: `${m.value}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
