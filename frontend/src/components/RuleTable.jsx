import { useTheme } from "../context/ThemeContext";
import { CheckCircle2, XCircle, Shield, ChevronRight } from "lucide-react";

export default function RuleTable({ data }) {
    const { isDark } = useTheme();
    if (!data || !data.rules || data.rules.length === 0) return null;

    const getSeverity = (rule) => {
        if (rule.rule === "Impossible Average Speed") {
            return {
                label: "CRITICAL",
                color: isDark ? "text-rose-400 bg-rose-950/60 border-rose-800/50" : "text-rose-700 bg-rose-50 border-rose-200"
            };
        }
        if (rule.rule === "No FASTag Data" || rule.rule === "Route Mismatch" || rule.rule === "FASTag Outside Validity") {
            return {
                label: "HIGH",
                color: isDark ? "text-amber-400 bg-amber-950/60 border-amber-800/50" : "text-amber-700 bg-amber-50 border-amber-200"
            };
        }
        if (rule.rule === "Suspicious Time Gap" || rule.rule === "Duplicate E-Way Bill") {
            return {
                label: "MEDIUM",
                color: isDark ? "text-blue-400 bg-blue-950/60 border-blue-800/50" : "text-blue-700 bg-blue-50 border-blue-200"
            };
        }
        return {
            label: "LOW",
            color: isDark ? "text-slate-400 bg-slate-900 border-slate-800" : "text-slate-600 bg-slate-100 border-slate-200"
        };
    };

    const badge = (passed) => {
        if (passed === true) {
            return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    isDark ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/50" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                }`}>
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    Passed
                </span>
            );
        }

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isDark ? "bg-rose-950/80 text-rose-300 border-rose-800/60" : "bg-rose-50 text-rose-800 border-rose-200"
            }`}>
                <XCircle size={13} className="text-rose-500" />
                Flagged
            </span>
        );
    };

    const containerClass = isDark
        ? "bg-[#0d121f] border-slate-800/90 text-slate-100 shadow-xl"
        : "bg-white border-slate-200 text-slate-900 shadow-sm";

    return (
        <div className={`rounded-2xl border p-6 sm:p-7 space-y-5 ${containerClass}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div>
                    <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                            Evidence-First Rule Matrix
                        </h2>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Deterministic verification against 6 statutory fraud criteria
                        </p>
                    </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                }`}>
                    6 Statutory Rules Evaluated
                </span>
            </div>

            <div className={`overflow-x-auto rounded-xl border ${
                isDark ? "border-slate-800" : "border-slate-200"
            }`}>
                <table className={`w-full text-left text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    <thead>
                        <tr className={`uppercase text-[10px] tracking-wider border-b font-bold font-mono ${
                            isDark ? "bg-slate-900/80 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}>
                            <th className="px-4 py-3">Rule Criterion</th>
                            <th className="px-4 py-3 text-center">Severity</th>
                            <th className="px-4 py-3 text-center">Evaluation</th>
                            <th className="px-4 py-3 text-center">Weight</th>
                            <th className="px-4 py-3">Findings & Quantifiable Evidence</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-slate-800/80" : "divide-slate-100 bg-white"}`}>
                        {data.rules.map((rule, index) => {
                            const isPassed = rule.passed !== false;
                            const sev = getSeverity(rule);
                            return (
                                <tr key={index} className={`transition-colors ${
                                    !isPassed
                                        ? isDark ? "bg-rose-950/10 hover:bg-rose-950/20" : "bg-rose-50/50 hover:bg-rose-50"
                                        : isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"
                                }`}>
                                    <td className={`px-4 py-3.5 font-bold whitespace-nowrap ${isDark ? "text-white" : "text-slate-900"}`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[11px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                #{index + 1}
                                            </span>
                                            <span>{rule.rule}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${sev.color}`}>
                                            {sev.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-center">
                                        {badge(isPassed)}
                                    </td>
                                    <td className="px-4 py-3.5 text-center font-mono font-black">
                                        <span className={rule.score > 0 ? "text-rose-500" : "text-emerald-500"}>
                                            +{rule.score}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-xs leading-relaxed max-w-md">
                                        <div className="space-y-1.5">
                                            <p className={!isPassed ? "text-rose-600 font-medium" : isDark ? "text-slate-400" : "text-slate-600"}>
                                                {rule.reason}
                                            </p>
                                            {rule.details && rule.details.length > 0 && (
                                                <div className={`mt-2 p-2.5 rounded-lg border text-[11px] font-mono space-y-1 ${
                                                    isDark ? "bg-slate-900/80 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                                                }`}>
                                                    <p className={`text-[10px] uppercase font-bold ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                        Specific Event Telemetry:
                                                    </p>
                                                    {rule.details.slice(0, 3).map((d, dIdx) => (
                                                        <div key={dIdx} className="flex items-center gap-1.5">
                                                            <ChevronRight size={12} className="text-rose-500 shrink-0" />
                                                            {d.from && d.to ? (
                                                                <span>{d.from.name} → {d.to.name}: <strong className="text-rose-500">{d.speed} km/h</strong></span>
                                                            ) : d.overlap ? (
                                                                <span>EWB #{d.ewb1} & #{d.ewb2}: <strong className="text-amber-500">{d.overlap}% Overlap</strong></span>
                                                            ) : d.toll ? (
                                                                <span>{d.toll} at {new Date(d.time).toLocaleString()}</span>
                                                            ) : (
                                                                <span>{JSON.stringify(d)}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
