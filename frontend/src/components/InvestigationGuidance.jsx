import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { CheckSquare, Square, ArrowUpRight, CheckCircle2 } from "lucide-react";

export default function InvestigationGuidance({ data }) {
    const { isDark } = useTheme();
    if (!data) return null;

    const guidance = data.guidance || {};
    const steps = guidance.steps || [];
    const recommendedAction = guidance.recommended_action || "ROUTINE_MONITORING";

    const [checkedSteps, setCheckedSteps] = useState({});

    const toggleStep = (index) => {
        setCheckedSteps((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
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
                            Targeted Investigation Action Checklist
                        </h2>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Prescriptive next-step recommendations derived from statutory evidence findings
                        </p>
                    </div>
                </div>

                <Link
                    to={`/investigations?vehicle=${data.vehicle_number || ""}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors self-start sm:self-auto shadow-sm"
                >
                    <span>Open Formal Case Docket</span>
                    <ArrowUpRight size={14} />
                </Link>
            </div>

            {/* Steps Checklist */}
            <div className="space-y-2.5">
                {steps.length > 0 ? (
                    steps.map((step, idx) => {
                        const isDone = !!checkedSteps[idx];
                        const isHigh = step.priority === "HIGH";

                        return (
                            <div
                                key={idx}
                                onClick={() => toggleStep(idx)}
                                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                    isDone
                                        ? isDark ? "bg-slate-950/40 border-slate-800 opacity-60" : "bg-slate-50 border-slate-200 opacity-60"
                                        : isDark ? "bg-slate-900/60 border-slate-800 hover:border-slate-700" : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
                                }`}
                            >
                                <button type="button" className="mt-0.5 shrink-0">
                                    {isDone ? (
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                    ) : (
                                        <Square size={16} className={isDark ? "text-slate-500" : "text-slate-400"} />
                                    )}
                                </button>

                                <div className="space-y-0.5 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-mono uppercase font-bold ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                            Step {idx + 1}
                                        </span>
                                        <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase border ${
                                            isHigh
                                                ? isDark ? "bg-rose-950/80 text-rose-300 border-rose-800" : "bg-rose-100 text-rose-800 border-rose-200"
                                                : isDark ? "bg-blue-950/80 text-blue-300 border-blue-800" : "bg-blue-100 text-blue-800 border-blue-200"
                                        }`}>
                                            {step.priority || "NORMAL"} Priority
                                        </span>
                                    </div>
                                    <h4 className={`text-xs font-bold ${isDone ? "line-through text-slate-500" : isDark ? "text-white" : "text-slate-900"}`}>
                                        {step.action}
                                    </h4>
                                    <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                        {step.details}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className={`p-4 rounded-xl border text-center text-xs ${
                        isDark ? "bg-slate-950/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}>
                        Standard statutory compliance maintained. No specific escalation actions required.
                    </div>
                )}
            </div>
        </div>
    );
}
