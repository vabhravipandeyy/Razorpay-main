import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { getCostRoiMatrix } from "../api/analytics";
import { 
    Sliders, 
    ShieldCheck, 
    AlertOctagon, 
    CheckCircle2, 
    Scale, 
    ArrowUpRight, 
    Info, 
    RefreshCw 
} from "lucide-react";

export default function FalsePositiveCostMatrix() {
    const { isDark } = useTheme();

    const [threshold, setThreshold] = useState(0.50);
    const [costFp, setCostFp] = useState(4500); // ₹4,500 demurrage
    const [costFn, setCostFn] = useState(280000); // ₹2,80,000 avg tax leakage
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showParams, setShowParams] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await getCostRoiMatrix(threshold, costFp, costFn);
            setData(res);
        } catch (err) {
            console.error("Cost-ROI fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 150);
        return () => clearTimeout(timer);
    }, [threshold, costFp, costFn]);

    const cardClass = isDark
        ? "bg-slate-900 border-slate-800 text-slate-100 shadow-lg"
        : "bg-white border-slate-200 text-slate-900 shadow-sm";

    const subCardClass = isDark
        ? "bg-slate-950/60 border-slate-800"
        : "bg-slate-50 border-slate-200";

    const formatINR = (val) => {
        if (!val && val !== 0) return "₹0";
        if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
        if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
        return `₹${Math.round(val).toLocaleString("en-IN")}`;
    };

    return (
        <div className={`rounded-2xl border p-5 sm:p-6 space-y-5 ${cardClass}`}>
            
            {/* 1. Header with Compact Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border bg-blue-950/60 text-blue-300 border-blue-800/60">
                            Track 02 Defense
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border bg-emerald-950/60 text-emerald-300 border-emerald-800/60">
                            Loss Economics
                        </span>
                    </div>
                    <h2 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                        False-Positive Cost & ROI Optimizer
                    </h2>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Carrier friction cost vs. unrecovered tax leakage trade-off
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowParams(!showParams)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            showParams 
                                ? "bg-blue-600 text-white border-blue-500"
                                : isDark ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                        <Sliders size={12} />
                        <span>{showParams ? "Hide Parameters" : "Parameters"}</span>
                    </button>
                    <button
                        onClick={fetchData}
                        className={`p-2 rounded-xl border text-xs transition-colors ${
                            isDark ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* 2. Adjustable Parameters (Collapsible) */}
            {showParams && (
                <div className={`p-4 rounded-xl border space-y-3 ${subCardClass}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span className={isDark ? "text-slate-400" : "text-slate-600"}>Carrier Detention Friction (FP):</span>
                                <span className="font-mono font-bold text-rose-400">₹{costFp.toLocaleString("en-IN")}</span>
                            </div>
                            <input
                                type="range"
                                min="1000"
                                max="15000"
                                step="500"
                                value={costFp}
                                onChange={(e) => setCostFp(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span className={isDark ? "text-slate-400" : "text-slate-600"}>Fraud Leakage per Case (FN):</span>
                                <span className="font-mono font-bold text-blue-400">₹{costFn.toLocaleString("en-IN")}</span>
                            </div>
                            <input
                                type="range"
                                min="50000"
                                max="1000000"
                                step="10000"
                                value={costFn}
                                onChange={(e) => setCostFn(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Slider & Presets */}
            <div className={`p-4 rounded-xl border space-y-3 ${subCardClass}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Scale size={14} className="text-blue-400" />
                        <span className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                            Decision Cutoff: <span className="font-mono text-blue-400">{Math.round(threshold * 100)}%</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setThreshold(0.70)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                                threshold === 0.70
                                    ? "bg-emerald-600 text-white border-emerald-500"
                                    : isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-600"
                            }`}
                        >
                            Low Delay (70%)
                        </button>
                        <button
                            onClick={() => setThreshold(0.50)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                                threshold === 0.50
                                    ? "bg-blue-600 text-white border-blue-500"
                                    : isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-600"
                            }`}
                        >
                            Standard (50%)
                        </button>
                        <button
                            onClick={() => setThreshold(0.30)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                                threshold === 0.30
                                    ? "bg-rose-600 text-white border-rose-500"
                                    : isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-600"
                            }`}
                        >
                            Catch All (30%)
                        </button>
                    </div>
                </div>

                <input
                    type="range"
                    min="0.10"
                    max="0.90"
                    step="0.05"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>

            {/* 4. Four Core Economic Metrics */}
            {data && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className={`p-3.5 rounded-xl border space-y-0.5 ${subCardClass}`}>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Loss Prevented</span>
                        <p className="text-lg font-black font-mono text-emerald-400">
                            {formatINR(data.financial_roi.gross_fraud_prevented_inr)}
                        </p>
                        <span className="text-[10px] text-slate-400 block">
                            {data.confusion_matrix.true_positives} intercepted
                        </span>
                    </div>

                    <div className={`p-3.5 rounded-xl border space-y-0.5 ${subCardClass}`}>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Friction Cost</span>
                        <p className="text-lg font-black font-mono text-rose-400">
                            {formatINR(data.financial_roi.merchant_friction_cost_inr)}
                        </p>
                        <span className="text-[10px] text-slate-400 block">
                            {data.confusion_matrix.false_positives} carrier delays
                        </span>
                    </div>

                    <div className={`p-3.5 rounded-xl border space-y-0.5 ${subCardClass}`}>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Saved</span>
                        <p className={`text-lg font-black font-mono ${isDark ? "text-white" : "text-slate-900"}`}>
                            {formatINR(data.financial_roi.net_capital_preserved_inr)}
                        </p>
                        <span className="text-[10px] text-slate-400 block">
                            Prevented - Friction
                        </span>
                    </div>

                    <div className={`p-3.5 rounded-xl border space-y-0.5 ${subCardClass}`}>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Defense ROI</span>
                        <p className="text-lg font-black font-mono text-blue-400 flex items-center gap-1">
                            {data.financial_roi.roi_multiplier}x
                            <ArrowUpRight size={14} />
                        </p>
                        <span className="text-[10px] text-slate-400 block">
                            Return per ₹1 spent
                        </span>
                    </div>
                </div>
            )}

            {/* 5. 2x2 Economic Confusion Matrix (Streamlined Text) */}
            {data && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="uppercase font-bold">Confusion Matrix (450 Samples)</span>
                        <div className="flex gap-3">
                            <span>Precision: <strong className="text-emerald-400">{(data.performance_metrics.precision * 100).toFixed(1)}%</strong></span>
                            <span>Recall: <strong className="text-blue-400">{(data.performance_metrics.recall * 100).toFixed(1)}%</strong></span>
                            <span>ROC-AUC: <strong className="text-slate-300">{(data.performance_metrics.roc_auc * 100).toFixed(1)}%</strong></span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* True Negatives */}
                        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                            isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
                        }`}>
                            <div className="space-y-0.5">
                                <span className="font-bold text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 size={13} /> True Negatives (Compliant Pass)
                                </span>
                                <p className="text-[11px] text-slate-400">Zero detention • Unhindered commercial transit</p>
                            </div>
                            <span className="font-mono font-bold text-sm text-emerald-400">
                                {data.confusion_matrix.true_negatives}
                            </span>
                        </div>

                        {/* False Positives */}
                        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                            isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
                        }`}>
                            <div className="space-y-0.5">
                                <span className="font-bold text-rose-400 flex items-center gap-1">
                                    <AlertOctagon size={13} /> False Positives (Friction Delay)
                                </span>
                                <p className="text-[11px] text-slate-400">Innocent carrier check • {formatINR(data.financial_roi.merchant_friction_cost_inr)} demurrage</p>
                            </div>
                            <span className="font-mono font-bold text-sm text-rose-400">
                                {data.confusion_matrix.false_positives}
                            </span>
                        </div>

                        {/* False Negatives */}
                        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                            isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
                        }`}>
                            <div className="space-y-0.5">
                                <span className="font-bold text-slate-300 flex items-center gap-1">
                                    <Info size={13} /> False Negatives (Leakage)
                                </span>
                                <p className="text-[11px] text-slate-400">Uncaught evasion • {formatINR(data.financial_roi.unrecovered_leakage_inr)} lost</p>
                            </div>
                            <span className="font-mono font-bold text-sm text-slate-300">
                                {data.confusion_matrix.false_negatives}
                            </span>
                        </div>

                        {/* True Positives */}
                        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                            isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
                        }`}>
                            <div className="space-y-0.5">
                                <span className="font-bold text-blue-400 flex items-center gap-1">
                                    <ShieldCheck size={13} /> True Positives (Intercepted)
                                </span>
                                <p className="text-[11px] text-slate-400">Confirmed violations • {formatINR(data.financial_roi.gross_fraud_prevented_inr)} saved</p>
                            </div>
                            <span className="font-mono font-bold text-sm text-blue-400">
                                {data.confusion_matrix.true_positives}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. Concise Summary (1 Line) */}
            {data && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    isDark ? "bg-slate-950/40 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                }`}>
                    <span className="font-bold font-mono text-blue-400 shrink-0">Summary:</span>
                    <p className="truncate text-[11px]">
                        At {Math.round(threshold * 100)}% cutoff: {(data.performance_metrics.recall * 100).toFixed(1)}% fraud caught, {((data.confusion_matrix.false_positives / (data.confusion_matrix.total_vehicles_evaluated || 450)) * 100).toFixed(1)}% false delay • {data.financial_roi.roi_multiplier}x ROI per ₹1 inspection.
                    </p>
                </div>
            )}
        </div>
    );
}
