import { useTheme } from "../context/ThemeContext";
import { TrendingUp, TrendingDown, Layers, Sparkles } from "lucide-react";
import FalsePositiveCostMatrix from "./FalsePositiveCostMatrix";

export default function MLRiskIntelligence({ data }) {
    const { isDark } = useTheme();
    if (!data) return null;

    const ml = data.ml_analysis || {};
    const hybrid = data.hybrid_risk || {};
    const fraudRisk = data.fraud_risk || {};

    const isAvailable = ml.status === "AVAILABLE";
    const mlScore = ml.ml_anomaly_score ?? 0;
    const anomalyLevel = ml.anomaly_level || "NORMAL";
    const modelVersion = ml.model_version || "IsolationForest v1";
    const topFeatures = ml.top_anomalous_features || [];

    const hybridScore = hybrid.score ?? fraudRisk.score ?? 0;
    const hybridLevel = hybrid.level ?? "LOW";
    const normRuleScore = hybrid.normalized_rule_score ?? 0;
    const diagSummary = hybrid.diagnostic_summary || "Standard risk baseline evaluated.";
    const diagCode = hybrid.diagnostic_code || "LOW_RULE_LOW_ML";

    // Dynamic Theme-Aware Colors
    let anomBg = isDark ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800";
    let anomTextColor = isDark ? "text-emerald-400" : "text-emerald-700";
    if (anomalyLevel === "HIGHLY_ANOMALOUS") {
        anomBg = isDark ? "bg-rose-950/40 border-rose-800/40 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800";
        anomTextColor = isDark ? "text-rose-400" : "text-rose-700";
    } else if (anomalyLevel === "UNUSUAL") {
        anomBg = isDark ? "bg-amber-950/40 border-amber-800/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800";
        anomTextColor = isDark ? "text-amber-400" : "text-amber-700";
    }

    let hybridTextColor = isDark ? "text-emerald-400" : "text-emerald-700";
    let hybridPillBg = isDark ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800";
    if (hybridLevel === "CRITICAL" || hybridLevel === "HIGH") {
        hybridTextColor = isDark ? "text-rose-400" : "text-rose-700";
        hybridPillBg = isDark ? "bg-rose-500/20 border-rose-500/30 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800";
    } else if (hybridLevel === "MEDIUM") {
        hybridTextColor = isDark ? "text-amber-400" : "text-amber-700";
        hybridPillBg = isDark ? "bg-amber-500/20 border-amber-500/30 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800";
    }

    const containerClass = isDark
        ? "bg-[#0d121f] border-slate-800/90 text-slate-100 shadow-xl"
        : "bg-white/85 backdrop-blur-md border-slate-200 text-slate-900 shadow-sm";

    const subCardClass = isDark
        ? "bg-[#111827]/70 border-slate-800"
        : "bg-slate-50/80 border-slate-200";

    return (
        <div className={`rounded-2xl border p-6 sm:p-7 space-y-6 ${containerClass}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                ML Anomaly Detection & Hybrid Risk
                            </h2>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                isDark ? "bg-blue-950/70 border-blue-700/50 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-800"
                            }`}>
                                {modelVersion}
                            </span>
                        </div>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Unsupervised Isolation Forest benchmarking vehicle behavior against fleet baselines
                        </p>
                    </div>

                <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Model Status:</span>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono border ${
                        isAvailable
                            ? isDark
                                ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-300"
                                : "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : isDark
                            ? "bg-slate-900 border-slate-800 text-slate-400"
                            : "bg-slate-100 border-slate-200 text-slate-600"
                    }`}>
                        {isAvailable ? "ONLINE (ACTIVE)" : "COLD START (FALLBACK)"}
                    </span>
                </div>
            </div>

            {/* Top Cards: ML Anomaly vs Rule Risk -> Hybrid Risk */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Rule Risk Component */}
                <div className={`rounded-xl border p-4 flex flex-col justify-between ${subCardClass}`}>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                1. Statutory Rule Risk (70%)
                            </span>
                            <span className={`text-xs font-mono font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                {fraudRisk.score ?? 0} / 130 pts
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className={`text-3xl font-black font-mono ${isDark ? "text-white" : "text-slate-900"}`}>{normRuleScore}</span>
                            <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>/ 100 normalized</span>
                        </div>
                        <div className={`w-full h-2 rounded-full overflow-hidden border ${
                            isDark ? "bg-slate-900 border-slate-800" : "bg-slate-200 border-slate-300"
                        }`}>
                            <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${normRuleScore}%` }}
                            />
                        </div>
                    </div>
                    <p className={`text-[11px] mt-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Deterministic statutory violation baseline across 6 rules.
                    </p>
                </div>

                {/* 2. ML Anomaly Component */}
                <div className={`rounded-xl border p-4 flex flex-col justify-between ${subCardClass}`}>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                2. ML Anomaly Score (30%)
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${anomBg}`}>
                                {anomalyLevel.replace("_", " ")}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className={`text-3xl font-black font-mono ${anomTextColor}`}>{mlScore}</span>
                            <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>/ 100 anomaly</span>
                        </div>
                        <div className={`w-full h-2 rounded-full overflow-hidden border ${
                            isDark ? "bg-slate-900 border-slate-800" : "bg-slate-200 border-slate-300"
                        }`}>
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    mlScore >= 75 ? "bg-rose-500" : mlScore >= 50 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${mlScore}%` }}
                            />
                        </div>
                    </div>
                    <p className={`text-[11px] mt-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Statistical outlier detection from multidimensional telemetry.
                    </p>
                </div>

                {/* 3. Combined Hybrid Risk Score */}
                <div className={`rounded-xl border p-4 flex flex-col justify-between ${
                    isDark
                        ? "bg-gradient-to-br from-[#111827] to-blue-950/40 border-blue-800/40 shadow-md"
                        : "bg-gradient-to-br from-blue-50/50 to-white border-blue-200 shadow-sm"
                }`}>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                isDark ? "text-blue-300" : "text-blue-700"
                            }`}>
                                <Sparkles size={13} />
                                Unified Hybrid Risk
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${hybridPillBg}`}>
                                {hybridLevel} RISK
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className={`text-3xl font-black font-mono ${hybridTextColor}`}>{hybridScore}</span>
                            <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>/ 100 hybrid</span>
                        </div>
                        <div className={`w-full h-2 rounded-full overflow-hidden border ${
                            isDark ? "bg-slate-900 border-slate-800" : "bg-slate-200 border-slate-300"
                        }`}>
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    hybridScore >= 85 ? "bg-rose-500" : hybridScore >= 60 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${hybridScore}%` }}
                            />
                        </div>
                    </div>
                    <p className={`text-[11px] mt-3 ${isDark ? "text-blue-200/80" : "text-blue-900/80"}`}>
                        Integrated risk assessment combining codified rules & statistical anomaly.
                    </p>
                </div>
            </div>

            {/* Diagnostic Agreement Banner */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${subCardClass}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border shrink-0 ${
                        isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200"
                    }`}>
                        <Layers size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold uppercase font-mono ${isDark ? "text-white" : "text-slate-900"}`}>
                                Rule vs ML Diagnostic Matrix
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                                isDark ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                            }`}>
                                {diagCode}
                            </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{diagSummary}</p>
                    </div>
                </div>
            </div>

            {/* Natural Language Evidence Explanation */}
            {ml.explanation && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                    isDark
                        ? "bg-blue-950/20 border-blue-900/40 text-blue-200"
                        : "bg-blue-50/70 border-blue-200 text-blue-900"
                }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    <span>
                        <strong className={isDark ? "text-white" : "text-slate-900"}>ML Observational Synthesis: </strong>
                        {ml.explanation}
                    </span>
                </div>
            )}

            {/* Top Contributing Anomalous Features Table */}
            {topFeatures.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                            Most Unusual Feature Deviations (vs Population Median)
                        </h4>
                        <span className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            Ranked by statistical departure
                        </span>
                    </div>

                    <div className={`overflow-x-auto rounded-xl border ${
                        isDark ? "border-slate-800" : "border-slate-200"
                    }`}>
                        <table className={`w-full text-left text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                            <thead className={`font-mono uppercase text-[10px] border-b ${
                                isDark ? "bg-slate-900/80 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}>
                                <tr>
                                    <th className="px-4 py-3">Feature Name</th>
                                    <th className="px-4 py-3">Vehicle Observed</th>
                                    <th className="px-4 py-3">Fleet Reference Median</th>
                                    <th className="px-4 py-3">Statistical Departure</th>
                                    <th className="px-4 py-3 text-right">Trend</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? "divide-slate-800/60 bg-slate-900/40" : "divide-slate-100 bg-white"}`}>
                                {topFeatures.map((feat, idx) => {
                                    const isElevated = feat.direction === "ELEVATED";
                                    return (
                                        <tr key={idx} className={isDark ? "hover:bg-slate-800/40 transition-colors" : "hover:bg-slate-50 transition-colors"}>
                                            <td className={`px-4 py-3 font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                                                {feat.feature_name}
                                            </td>
                                            <td className={`px-4 py-3 font-mono font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                                {feat.vehicle_value} {feat.unit}
                                            </td>
                                            <td className={`px-4 py-3 font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                {feat.population_reference} {feat.unit}
                                            </td>
                                            <td className="px-4 py-3 font-mono font-black">
                                                <span className={isElevated ? "text-rose-500" : "text-blue-500"}>
                                                    {isElevated ? "+" : ""}{feat.deviation_pct}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                    isElevated
                                                        ? isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-700"
                                                        : isDark ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"
                                                }`}>
                                                    {isElevated ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                    {feat.direction}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Track 02 Loss Economics & False Positive Cost Optimizer */}
            <div className="pt-2">
                <FalsePositiveCostMatrix />
            </div>
        </div>
    );
}
