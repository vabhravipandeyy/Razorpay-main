import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { generateAutoResponderNotice } from "../api/analytics";
import AutoResponderModal from "./AutoResponderModal";
import {
    ShieldAlert,
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileText,
    CreditCard,
    XOctagon,
    Banknote,
    Layers,
    X
} from "lucide-react";

export default function UnifiedVehicleHero({ data, onClose }) {
    const { isDark } = useTheme();
    const [modalOpen, setModalOpen] = useState(false);
    const [noticeData, setNoticeData] = useState(null);
    const [noticeLoading, setNoticeLoading] = useState(false);

    if (!data) return null;

    const handleOpenNotice = async () => {
        try {
            setNoticeLoading(true);
            const res = await generateAutoResponderNotice(data.vehicle_number);
            setNoticeData(res);
            setModalOpen(true);
        } catch (err) {
            console.error("Auto responder error:", err);
            alert("Failed to generate auto-responder statutory notice.");
        } finally {
            setNoticeLoading(false);
        }
    };

    const decision = data.decision || {};
    const exec = data.executive_summary || {};
    const fin = data.financial_context || {};
    const hybrid = data.hybrid_risk || {};
    const confidence = data.confidence || {};

    const level = data.risk_level || "LOW";
    const priorityLabel = decision.priority_label || "ROUTINE AUDIT";
    const hybridScore = hybrid.score ?? data.risk_score ?? 0;
    const confLevel = confidence.level || "HIGH CONFIDENCE";
    const formattedVal = fin.formatted_valuation || "₹0.00";
    const failedRulesCount = data.rules?.filter((r) => !r.passed).length || 0;

    const isHigh = level === "HIGH";
    const isMed = level === "MEDIUM";

    const badgeColor = isHigh
        ? isDark ? "bg-rose-950/60 text-rose-300 border-rose-800/60" : "bg-rose-100 text-rose-800 border-rose-200"
        : isMed
        ? isDark ? "bg-amber-950/60 text-amber-300 border-amber-800/60" : "bg-amber-100 text-amber-800 border-amber-200"
        : isDark ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60" : "bg-emerald-100 text-emerald-800 border-emerald-200";

    const formattedDate = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className={`rounded-2xl border transition-colors ${
            isDark ? "bg-[#0d121f] border-slate-800/90 shadow-xl shadow-black/40" : "bg-white border-slate-200 shadow-md"
        } overflow-hidden`}>
            
            {/* Top Identity & Action Header */}
            <div className={`px-6 py-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isDark ? "border-slate-800/80 bg-[#090d16]" : "border-slate-100 bg-slate-50/60"
            }`}>
                <div className="flex items-center gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                                isDark ? "text-white" : "text-slate-900"
                            }`}>
                                {data.vehicle_number}
                            </h1>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${badgeColor}`}>
                                {isHigh ? <ShieldAlert size={14} /> : isMed ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                                {level} RISK — {priorityLabel}
                            </span>
                        </div>
                        <p className={`text-xs mt-1 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            <Clock size={12} className="shrink-0" />
                            <span>Telemetry Synced: {formattedDate}</span>
                            <span>•</span>
                            <span className="font-mono">CBIC Rule 138 Audit Dossier</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                    <button
                        type="button"
                        onClick={handleOpenNotice}
                        disabled={noticeLoading}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                    >
                        <ShieldAlert size={14} />
                        <span>{noticeLoading ? "Compiling..." : "Auto-Responder (MOV-02)"}</span>
                    </button>

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                                isDark
                                    ? "bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border-slate-700"
                                    : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm"
                            }`}
                        >
                            <X size={14} />
                            <span>Close Target</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Core Telemetry & Decision Metrics Strip */}
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                
                {/* 1. Hybrid Risk */}
                <div className={`p-3.5 rounded-xl border ${
                    isDark ? "bg-[#111827]/70 border-slate-800" : "bg-slate-50/80 border-slate-200"
                }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Hybrid Risk Score
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className={`text-2xl font-black font-mono ${
                            isHigh ? "text-rose-500" : isMed ? "text-amber-500" : "text-emerald-500"
                        }`}>
                            {hybridScore}
                        </span>
                        <span className={`text-xs font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>/ 100</span>
                    </div>
                    <span className={`text-[10px] font-mono mt-0.5 block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        70% Rule + 30% ML
                    </span>
                </div>

                {/* 2. Evidence Confidence */}
                <div className={`p-3.5 rounded-xl border ${
                    isDark ? "bg-[#111827]/70 border-slate-800" : "bg-slate-50/80 border-slate-200"
                }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Evidence Confidence
                    </span>
                    <p className={`text-sm font-bold font-mono mt-2 truncate ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>
                        {confLevel}
                    </p>
                    <span className={`text-[10px] font-mono mt-0.5 block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Telemetry Coverage
                    </span>
                </div>

                {/* 3. Invoice Valuation */}
                <div className={`p-3.5 rounded-xl border ${
                    isDark ? "bg-[#111827]/70 border-slate-800" : "bg-slate-50/80 border-slate-200"
                }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Invoice Valuation
                    </span>
                    <p className={`text-sm font-black font-mono mt-2 truncate ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                        {formattedVal}
                    </p>
                    <span className={`text-[10px] font-mono mt-0.5 block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {fin.total_bills_count || 0} E-Way Bills
                    </span>
                </div>

                {/* 4. Active EWBs */}
                <div className={`p-3.5 rounded-xl border ${
                    isDark ? "bg-[#111827]/70 border-slate-800" : "bg-slate-50/80 border-slate-200"
                }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        E-Way Bills
                    </span>
                    <p className={`text-xl font-black font-mono mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>
                        {data.eway_bill_count || 0}
                    </p>
                    <span className={`text-[10px] font-mono mt-0.5 block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Declared Manifests
                    </span>
                </div>

                {/* 5. FASTag Scans */}
                <div className={`p-3.5 rounded-xl border ${
                    isDark ? "bg-[#111827]/70 border-slate-800" : "bg-slate-50/80 border-slate-200"
                }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        FASTag Toll Scans
                    </span>
                    <p className={`text-xl font-black font-mono mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>
                        {data.fastag_count || 0}
                    </p>
                    <span className={`text-[10px] font-mono mt-0.5 block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        RFID Toll Passages
                    </span>
                </div>

                {/* 6. Statutory Violations */}
                <div className={`p-3.5 rounded-xl border ${
                    isDark ? "bg-[#111827]/70 border-slate-800" : "bg-slate-50/80 border-slate-200"
                }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Statutory Rules
                    </span>
                    <p className={`text-xl font-black font-mono mt-1 ${
                        failedRulesCount > 0 ? "text-rose-500" : isDark ? "text-emerald-400" : "text-emerald-600"
                    }`}>
                        {failedRulesCount > 0 ? `${failedRulesCount} FAILED` : "6 / 6 PASSED"}
                    </p>
                    <span className={`text-[10px] font-mono mt-0.5 block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Rule Compliance
                    </span>
                </div>
            </div>

            {/* Executive Synthesis Summary */}
            <div className={`px-6 py-4 border-t text-xs ${
                isDark ? "border-slate-800 bg-[#090d16] text-slate-300" : "border-slate-100 bg-slate-50/60 text-slate-700"
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="leading-relaxed">
                        <strong className={isDark ? "text-white" : "text-slate-900"}>Executive Synthesis: </strong>
                        {decision.rationale || exec.brief || "Vehicle risk profile synthesized from deterministic statutory criteria and statistical ML anomaly models."}
                    </p>
                    {exec.confidence_assessment && (
                        <span className={`text-[11px] font-mono shrink-0 ${isDark ? "text-cyan-400" : "text-cyan-700"}`}>
                            {exec.confidence_assessment}
                        </span>
                    )}
                </div>
            </div>

            {/* Track 02 Auto-Responder Statutory Notice Modal */}
            <AutoResponderModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                noticeData={noticeData}
            />
        </div>
    );
}
